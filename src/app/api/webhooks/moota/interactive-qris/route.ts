import { handleMootaWebhook } from '@/server/payment/moota';

export async function POST(request: Request) {
  return handleMootaWebhook(request, 'interactive-qris');
}
