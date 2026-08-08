import { z } from 'zod';

export const updateProfileSchema = z.object({
  name: z.string().trim().min(1, 'Nama wajib diisi').optional(),
  phone: z.string().trim().min(1, 'Nomor telepon wajib diisi').optional(),
  whatsappNumber: z.string().trim().min(1, 'Nomor WhatsApp wajib diisi').optional(),
});

const receiverFields = {
  label: z.string().trim().min(1, 'Label wajib diisi'),
  name: z.string().trim().min(1, 'Nama wajib diisi'),
  phone: z.string().trim().min(1, 'Nomor telepon wajib diisi'),
  email: z.string().trim().email('Format email tidak valid').optional(),
  address: z.string().trim().min(1, 'Alamat wajib diisi'),
  cityId: z.string().uuid('Kota tidak valid'),
  isDefault: z.boolean().optional(),
};

export const createReceiverSchema = z.object(receiverFields);
export const updateReceiverSchema = z.object(receiverFields).partial();
