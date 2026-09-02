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

export const homepageSectionSchema = z.object({
  id: z.string().uuid().optional(),
  key: z
    .string()
    .trim()
    .min(1)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, {
      message: 'Key hanya boleh huruf kecil, angka, dan tanda hubung',
    }),
  title: z.string().trim().min(1),
  subtitle: z.string().trim().min(1),
  promoImageUrl: z.string().trim().url().optional().or(z.literal('')),
  position: z.number().int().min(0).default(0),
  isEnabled: z.boolean().default(true),
  backgroundColor: hexColorSchema,
  titleColor: hexColorSchema,
  productIds: z.array(z.string().uuid()),
});

export const homepageBannersUpdateSchema = z.object({
  banners: z.object({
    HERO_MAIN: z.array(bannerImageSchema),
    HERO_SIDE_1: z.array(bannerImageSchema),
    HERO_SIDE_2: z.array(bannerImageSchema),
  }),
});

export const homepageSectionsUpdateSchema = z.object({
  sections: z.array(homepageSectionSchema),
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
