import { getClient} from '@blastmail/db'
import { RedisClientType } from 'redis'

export class SyncService{
    private redisClient: RedisClientType;

    constructor(redisClient: RedisClientType){
        this.redisClient = redisClient;
    }
    async syncEvents():Promise<void>{
        console.log(`\n Starting event sync (Redis -> PostgreSQL)...`)
        try{
            const eventKeys = await this.redisClient.keys('event:*');
            if(eventKeys.length === 0){
                console.log(' No event to sync ');

            }
            console.log(`Found ${eventKeys.length} events to sync`);
            const client = await getClient();
            let synced = 0;
            let failed = 0;
            try{
                await client.query('BEGIN');
                for (const key of eventKeys){
                    try{
                        const eventData = await this.redisClient.get(key);
                        if(!eventData) continue;
                        const event = JSON.parse(eventData);
                        await client.query(
                            `INSERT INTO tracking_events (campaign_id,subscriber_id,event_type,timestamp)
                            VALUES ($1,$2,$3,to_timestamp($4/1000.0) ON CONFLICT DO NOTHING)`,[
                                event.campaign_id,
                                event.subscriber_id,
                                event.event_type,
                                event.timestamp
                            ]
                        );

                        await this.redisClient.del(key);
                        synced++;
                    } catch(error){
                        console.log(`Failed to sync event ${key}:`, error);
                        failed++;
                    }
                }
                await client.query('COMMIT');
                console.log(`Synced ${synced} events, ${failed} failed`);
            } catch(error){
                await client.query('ROLLBACK');
                throw error;


            } finally {
                client.release();
            }
        } catch(error){
            console.log(' Error syncing events:',error);
        }
    }

    async syncCounter(): Promise<void>{
        console.log('\n Syncing counters...');
        try{
            const counterKeys = await this.redisClient.keys('campaign:*:opens');
            if(counterKeys.length === 0){
                console.log('No counter to sync');
                return;
            }
            console.log(`Found ${counterKeys.length} campaign counters`);
            for(const key of counterKeys){
                const match = key.match('/campaign:(\d+):opens/');
                if(!match) continue;
                const campaignId = parseInt(match[1]);
                const openStr = await this.redisClient.get(key);
                const opens = openStr ? parseInt(openStr) : 0;
                console.log(`Campaign ${campaignId}: ${opens} open in cache`);
            }
            console.log('Counter synced');
        } catch(error){
            console.log('Error syncing counter', error);
        }

    }
}