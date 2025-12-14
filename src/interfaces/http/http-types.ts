import { z } from 'zod';

export const PostTelemetryBody = z.object({
  id: z.string().optional(),
  spacecraftId: z.string().min(1),
  timestamp: z.coerce.date(),
  parameters: z.record(z.union([z.number(), z.string(), z.boolean()])),
});
export type PostTelemetryBodyType = z.infer<typeof PostTelemetryBody>;

export const BatchTelemetryBody = z.object({
  spacecraftId: z.string().min(1),
  snapshots: z.array(PostTelemetryBody),
});
export type BatchTelemetryBodyType = z.infer<typeof BatchTelemetryBody>;

export const GetTelemetryQuery = z.object({
  spacecraftId: z.string().min(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
export type GetTelemetryQueryType = z.infer<typeof GetTelemetryQuery>;

export const AnalyzeTelemetryQuery = z.object({
  spacecraftId: z.string().min(1),
  limit: z.coerce.number().int().positive().max(100).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});
export type AnalyzeTelemetryQueryType = z.infer<typeof AnalyzeTelemetryQuery>;

export const GetEventsQuery = z.object({
  spacecraftId: z.string().min(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
export type GetEventsQueryType = z.infer<typeof GetEventsQuery>;

export const CreateOpsDocumentInput = z.object({
  id: z.string().optional(),
  spacecraftId: z.string().min(1),
  title: z.string().min(1),
  body: z.string().min(1),
  tags: z.array(z.string()).default([]),
  category: z.string().optional(),
  publishedAt: z.coerce.date().optional(),
});
export type CreateOpsDocumentInputType = z.infer<typeof CreateOpsDocumentInput>;

export const SearchDocsQuery = z.object({
  q: z.string().min(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
});
export type SearchDocsQueryType = z.infer<typeof SearchDocsQuery>;

export const GetAnomaliesQuery = z.object({
  spacecraftId: z.string().min(1),
  limit: z.coerce.number().int().positive().max(200).default(20),
});
export type GetAnomaliesQueryType = z.infer<typeof GetAnomaliesQuery>;

export const GetAnomaliesTimelineQuery = z.object({
  spacecraftId: z.string().min(1),
  from: z.coerce.date(),
  to: z.coerce.date(),
});
export type GetAnomaliesTimelineQueryType = z.infer<typeof GetAnomaliesTimelineQuery>;
