import { z } from 'zod';

export const homepageConfigUpdateSchema = z.object({
  heroMainImageUrl: z.string().trim().min(1),
  heroSideImage1Url: z.string().trim().min(1),
  heroSideImage2Url: z.string().trim().min(1),
  sectionNewestPromoImageUrl: z.string().trim().min(1),
  sectionBestsellerPromoImageUrl: z.string().trim().min(1),
  sectionInternationalPromoImageUrl: z.string().trim().min(1),
  sectionKiwariPromoImageUrl: z.string().trim().min(1),
  sectionKlasikPromoImageUrl: z.string().trim().min(1),
  sections: z.object({
    NEWEST: z.array(z.string().uuid()),
    BESTSELLER: z.array(z.string().uuid()),
    INTERNATIONAL: z.array(z.string().uuid()),
    KIWARI: z.array(z.string().uuid()),
    KLASIK: z.array(z.string().uuid()),
    OTHERS: z.array(z.string().uuid()),
  }),
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
  sections: z.object({
    POPULAR: z.array(z.string().uuid()),
    DISCOUNT: z.array(z.string().uuid()),
  }),
});
