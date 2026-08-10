import { z } from 'zod';

export const createPaymentSchema = z.object({
  orderId: z.string().uuid('orderId tidak valid'),
});

export const midtransWebhookSchema = z.object({
  order_id: z.string().min(1),
  status_code: z.string().min(1),
  gross_amount: z.string().min(1),
  signature_key: z.string().min(1),
  transaction_status: z.string().min(1),
  transaction_id: z.string().min(1),
  fraud_status: z.string().optional(),
  va_numbers: z.array(z.object({ bank: z.string(), va_number: z.string() })).optional(),
});
