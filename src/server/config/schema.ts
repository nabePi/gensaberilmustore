import { z } from 'zod';

export const bannerImageSchema = z.object({
  id: z.string().uuid().optional(),
  imageUrl: z.string().trim().min(1),
  linkUrl: z.string().trim().url().optional().or(z.literal('')).nullable(),
  position: z.number().int().min(0).default(0),
});

const hexColorSchema = z
  .string()
  .trim()
  .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, {
    message: 'Warna harus dalam format hex, mis. #dc2626',
  })
  .optional()
  .or(z.literal(''))
  .nullable();

export const HOMEPAGE_SECTION_TYPES = ['REGULAR', 'PROMO'] as const;

const sectionKeySchema = z
  .string()
  .trim()
  .min(1)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, {
    message: 'Key hanya boleh huruf kecil, angka, dan tanda hubung',
  });

export const homepageSectionListItemSchema = z.object({
  id: z.string().uuid(),
  key: sectionKeySchema,
  title: z.string().trim().min(1),
  position: z.number().int().min(0).default(0),
  isEnabled: z.boolean().default(true),
});

export const homepageSectionsUpdateSchema = z.object({
  sections: z.array(homepageSectionListItemSchema),
});

export const createHomepageSectionSchema = z.object({
  title: z.string().trim().min(1),
  key: sectionKeySchema,
});

const dateInputSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Format tanggal tidak valid' });

export const homepageSectionProductSchema = z.object({
  productId: z.string().uuid(),
  discountPercent: z.number().int().min(1).max(90).optional(),
  discountEndDate: dateInputSchema.optional(),
});

export const homepageSectionDetailUpdateSchema = z
  .object({
    title: z.string().trim().min(1),
    subtitle: z.string().trim().min(1),
    promoImageUrl: z.string().trim().url().optional().or(z.literal('')),
    isEnabled: z.boolean().default(true),
    backgroundColor: hexColorSchema,
    titleColor: hexColorSchema,
    type: z.enum(HOMEPAGE_SECTION_TYPES).default('REGULAR'),
    products: z.array(homepageSectionProductSchema).default([]),
  })
  .superRefine((data, ctx) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const seen = new Set<string>();

    data.products.forEach((product, index) => {
      if (seen.has(product.productId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['products', index, 'productId'],
          message: 'Produk duplikat',
        });
      }
      seen.add(product.productId);

      if (data.type !== 'PROMO') return;

      if (product.discountPercent == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['products', index, 'discountPercent'],
          message: 'Diskon promo wajib diisi',
        });
      }

      if (!product.discountEndDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['products', index, 'discountEndDate'],
          message: 'Tanggal berakhir wajib diisi',
        });
      } else if (new Date(`${product.discountEndDate}T00:00:00`) < today) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['products', index, 'discountEndDate'],
          message: 'Tanggal berakhir tidak boleh sebelum hari ini',
        });
      }
    });
  });

export const homepageBannersUpdateSchema = z.object({
  banners: z.object({
    HERO_MAIN: z.array(bannerImageSchema),
    HERO_SIDE_1: z.array(bannerImageSchema),
    HERO_SIDE_2: z.array(bannerImageSchema),
  }),
});

export const KIDS_SECTION_THEMES = ['CREAM', 'MINT', 'CORAL', 'YELLOW', 'LAVENDER'] as const;

export const kidsSectionSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(1),
  subtitle: z.string().trim().default(''),
  badge: z.string().trim().default(''),
  theme: z.enum(KIDS_SECTION_THEMES).default('MINT'),
  showDiscountTag: z.boolean().default(false),
  position: z.number().int().min(0).default(0),
  productIds: z.array(z.string().uuid()),
});

export const kidsConfigUpdateSchema = z.object({
  heroBadge: z.string().trim().min(1),
  heroTitle: z.string().trim().min(1),
  heroDescription: z.string().trim().min(1),
  heroImageUrl: z.string().trim().min(1),
  promoBadge: z.string().trim().min(1),
  promoTitle: z.string().trim().min(1),
  promoDescription: z.string().trim().min(1),
  promoImageUrl: z.string().trim().min(1),
  banners: z.array(bannerImageSchema),
});

export const kidsSectionsUpdateSchema = z.object({
  sections: z.array(kidsSectionSchema),
});
