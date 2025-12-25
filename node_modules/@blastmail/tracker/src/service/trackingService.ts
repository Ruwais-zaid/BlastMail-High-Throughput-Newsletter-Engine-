import {RedisClientType} from 'redis'

export class TrackingService{

    private redisClient:RedisClientType
    constructor(redisClient:RedisClientType){
        this.redisClient = redisClient
    }
     async recordOpen(campaign_id:number,subscriber_id:number): Promise<void>{
        try{
            const timeStamp = Date.now();
            await this.redisClient.incr(`campaign:${campaign_id}:open`);
            const subscriberKey = `campaign:${campaign_id}:subscriber:${subscriber_id}`;
            await this.redisClient.set(subscriberKey, timeStamp.toString(), {
                EX: 60*60*24*30,
            });
            const event_key = `event:${campaign_id}:${subscriber_id}:${timeStamp}`
            await this.redisClient.set(
                event_key,
                JSON.stringify({
                    campaign_id,
                    subscriber_id,
                    eventType: 'opened',
                    timeStamp
                }),
                {EX: 60*60*24}
            )
            console.log(`Tracker opened: CampaignId ${campaign_id}, Subscriber ${subscriber_id}`)

        } catch(error){
            console.error('Error recording open:', error)
        }

    }

     async getCampaignStats(campaign_id:number): Promise<{opens: Number; uniqueOpen: Number}>{
        try{
            const openStr = await this.redisClient.get(`campaign:${campaign_id}:opens`);
            const opens = openStr ? parseInt(openStr) : 0;
            const pattern = `campaign:${campaign_id}:subscriber:*`;
            const keys  = await this.redisClient.keys(pattern);
            const uniqueOpen = keys.length;
            return {
                opens,
                uniqueOpen
            }

        } catch(error){
            console.log('Error getting stats',error);
            return {
                opens:0,
                uniqueOpen:0
            }
        }
    }

}