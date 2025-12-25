import z from  'zod'

export const getTrackerQuerySchema = z.object({
    campaignId: z.coerce.number().int().positive(),
    subscriberId: z.coerce.number().int().positive()
});

export const getStatsParamSchema = z.object({
    campaignId: z.coerce.number().int().positive()

});