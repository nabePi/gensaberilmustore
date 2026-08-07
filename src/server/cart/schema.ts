import { z } from 'zod';

export const addCartItemSchema = z.object({
  productId: z.string().uuid('productId tidak valid'),
  quantity: z.number().int('Jumlah harus bilangan bulat').positive('Jumlah harus lebih dari 0'),
});

export const updateCartItemQuantitySchema = z.object({
  quantity: z.number().int('Jumlah harus bilangan bulat').min(1, 'Jumlah minimal 1'),
});

export type AddCartItemInput = z.infer<typeof addCartItemSchema>;
export type UpdateCartItemQuantityInput = z.infer<typeof updateCartItemQuantitySchema>;
