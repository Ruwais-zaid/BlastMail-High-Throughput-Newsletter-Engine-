import express, { Express, NextFunction, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import responseTime from 'response-time';
import compression from 'compression';
import cron from 'node-cron';
import {
    getStatsParamSchema,
    getTrackerQuerySchema
} from './schema/schema';
import helmet from 'helmet';
import timeout from 'connect-timeout';
import { StatusCodes } from 'http-status-codes';
import { RedisConnection } from "@blastmail/redis";
import { TrackingService } from './service/trackingService';
import { SyncService } from './service/syncService';
import { TRANSPARENT_PIXEL } from './pixel';
import { CORS_CONFIG } from './utils/config';
import { HttpError } from './utils/HttpError';

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 3002;

const redisConnection = new RedisConnection();
let trackingService: TrackingService;
let syncService: SyncService;
app.use(responseTime());
app.use(cors(CORS_CONFIG));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(helmet());
app.use(timeout('20s'));
app.use(compression());
app.use((req: Request, _res: Response, next:NextFunction) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});
app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'tracker', timestamp: new Date().toISOString() });
});
app.get('/track', async (req: Request, res: Response) => {
    try {
        const parseData = getTrackerQuerySchema.safeParse(req.query);
        
        if (!parseData.success) {
            console.warn('Validation Error:', parseData.error.message);
            throw new HttpError(StatusCodes.BAD_REQUEST, "Invalid tracking parameters");
        }

        const { campaignId, subscriberId } = parseData.data;
        res.set({
            'Content-Type': 'image/gif',
            'Content-Length': TRANSPARENT_PIXEL.length.toString(),
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            'Surrogate-Control': 'no-store'
        });
        res.status(StatusCodes.OK).send(TRANSPARENT_PIXEL);
        if (campaignId && subscriberId) {
            const cid = Number(campaignId);
            const sid = Number(subscriberId);
            
            if (!isNaN(cid) && !isNaN(sid)) {
                trackingService.recordOpen(cid, sid).catch((error: Error) => {
                    console.error('Error recording open:', error.message);
                });
            }
        }
    } catch (error) {
        console.error('Tracking endpoint error:', error);
        res.set({
            'Content-Type': 'image/gif',
            'Content-Length': TRANSPARENT_PIXEL.length.toString()
        });
        res.status(StatusCodes.OK).send(TRANSPARENT_PIXEL);
    }
});
app.get('/stats/:campaignId', async (req: Request, res: Response) => {
    try {
        const parseData = getStatsParamSchema.safeParse(req.params);
        
        if (!parseData.success) {
            console.warn('Validation Error:', parseData.error.message);
            throw new HttpError(StatusCodes.BAD_REQUEST, "Invalid campaign ID");
        }

        const campaignId = parseData.data.campaignId;
        const stats = await trackingService.getCampaignStats(campaignId);

        res.status(StatusCodes.OK).json({
            success: true,
            data: stats,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error getting stats:', error);
        
        if (error instanceof HttpError) {
            res.status(error.status).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        } else {
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                error: 'Internal server error',
                timestamp: new Date().toISOString()
            });
        }
    }
});
app.use((_req: Request, res: Response) => {
    res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        error: 'Endpoint not found',
        timestamp: new Date().toISOString()
    });
});
app.use((error: Error, _req: Request, res: Response) => {
    console.error('Unhandled error:', error);
    
    if (error instanceof HttpError) {
        res.status(error.status).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    } else {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            error: 'Internal server error',
            timestamp: new Date().toISOString()
        });
    }
});

const startServer = async () => {
    try {
        console.log('Starting Tracking Service...\n');
        const client = await redisConnection.getClient();
        if (!client) {
            throw new Error('Redis client is not connected');
        }
        
        trackingService = new TrackingService(client);
        syncService = new SyncService(client);

        console.log('Service Initialized\n');
        cron.schedule('*/5 * * * *', async () => {
            try {
                console.log(`${new Date().toISOString()} - Sync Job Running`);
                await syncService.syncEvents();
                await syncService.syncCounter();
                console.log(`${new Date().toISOString()} - Sync Job Completed`);
            } catch (error) {
                console.error(`${new Date().toISOString()} - Sync Job Failed:`, error);
            }
        });
        
        console.log('Sync job scheduled (every 5 minutes)\n');
        const server = app.listen(PORT, () => {
            console.log(`Tracker Service running on http://localhost:${PORT}`);
            console.log(`Health endpoint: http://localhost:${PORT}/health`);
            console.log(`Track endpoint: http://localhost:${PORT}/track?campaignId=X&subscriberId=Y`);
            console.log('Ready to track email opens!\n');
        });
        const gracefulShutdown = async () => {
            console.log('\nShutting down Tracker Service gracefully...');
            
            server.close(async () => {
                console.log('HTTP server closed');
                await redisConnection.close();
                console.log('Redis connection closed');
                process.exit(0);
            });
            setTimeout(() => {
                console.error('Could not close connections in time, forcefully shutting down');
                process.exit(1);
            }, 10000);
        };
        process.on('SIGTERM', gracefulShutdown);
        process.on('SIGINT', gracefulShutdown);
        process.on('uncaughtException', (error) => {
            console.error('Uncaught Exception:', error);
            gracefulShutdown();
        });

        process.on('unhandledRejection', (reason, promise) => {
            console.error('Unhandled Rejection at:', promise, 'reason:', reason);
        });

    } catch (error) {
        console.error('Failed to start Tracker Service:', error);
        process.exit(1);
    }
};
startServer();