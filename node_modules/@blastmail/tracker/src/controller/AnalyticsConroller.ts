import { Request, Response } from 'express'
import { AnalyticsService } from '../service/analyticsService'
import {getStatsParamSchema} from '../schema/schema'
import { HttpError } from '../utils/HttpError'
import {StatusCodes} from 'http-status-codes'
const analyticsService =  new AnalyticsService()


export class AnalyticsController{
    async getCampaignAnalytics(req:Request, res:Response): Promise<Response>{
        try{

            const parseData = getStatsParamSchema.safeParse(req.params);
              if (!parseData.success) {
                        console.warn('Validation Error:', parseData.error.message);
                        throw new HttpError(StatusCodes.BAD_REQUEST, "Invalid tracking parameters");
                    }
            const analytics =  await analyticsService.getCampaignAnalytics(parseData.data.campaignId);
            if(!analytics){
                throw new HttpError(StatusCodes.BAD_REQUEST, "Campaign Not Found");

            }
            return res.status(StatusCodes.OK).json(analytics);

        } catch(error){
            console.error('Get analytics error:', error);
            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({error:'Failed to fetch analytics'});

        }
    }

    async getAllCampaignAnalytics(req:Request,res:Response): Promise<Response>{
        try{
            const analytics = await analyticsService.getAllCampaignsAnalytics();
            return res.status(StatusCodes.OK).json(analytics)
        } catch(error){
            console.error('Get all analytics error:', error);
            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                error: 'Failed to fetch analytics'
            })

        }
    }
}