import {RedisClientType} from 'redis'

export class TrackingService{

    private redisClient:RedisClientType
    constructor(redisClient:RedisClientType){
        this.redisClient = redisClient
    }
    private async recordOpen(campaign_id:number,subscriber_id:number): Promise<void>{
        try{
            const timeStamp = Date.now();
            await this.redisClient.incr(`campaign:${campaign_id}:open`);
            const subscriberKey = `campaign:${campaign_id}:subscriber:${subscriber_id}`;
            await this.redisClient.set(subscriberKey, timeStamp.toString(), {
                EX: 60*60*24*30,
            });
        } catch(eror){}

    }
}