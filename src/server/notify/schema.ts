import { z } from 'zod';

export const listAdminNotificationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(60).default(20),
  status: z.enum(['PENDING', 'SENT', 'FAILED']).optional(),
  channel: z.enum(['EMAIL', 'WHATSAPP']).optional(),
});
