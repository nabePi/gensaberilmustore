import { z } from 'zod';

// Mirrors content.schema.json in the genstorelanding repo. Keep both in sync.

export const LANDING_ICONS = [
  'ShoppingCart',
  'Baby',
  'Broadcast',
  'BookOpenText',
  'Check',
  'LinkSimple',
  'ShareNetwork',
] as const;

const text = (max: number) => z.string().trim().max(max);
const requiredText = (max: number) => z.string().trim().min(1, 'Wajib diisi').max(max);

const assetPath = z
  .string()
  .trim()
  .max(256)
  .regex(/^\/[\w./-]+$/, 'Path aset harus diawali "/"');

// Only http(s) or a site-relative path. Blocks javascript:, data:, etc.
const url = z
  .string()
  .trim()
  .max(2048)
  .regex(/^(https?:\/\/[^\s]+|\/[^\s]*)$/, 'URL harus diawali http://, https://, atau "/"');

const linkItem = z
  .object({
    id: requiredText(64),
    label: requiredText(80),
    description: text(140).optional(),
    href: url,
    icon: z.enum(LANDING_ICONS).optional(),
    iconSrc: assetPath.optional(),
    featured: z.boolean().optional(),
    visible: z.boolean(),
  })
  .strict();

const uniqueIds = <T extends { id: string }>(items: T[]) =>
  new Set(items.map((item) => item.id)).size === items.length;

const linkList = (max: number) =>
  z.array(linkItem).max(max).refine(uniqueIds, { message: 'ID item harus unik' });

export const landingContentSchema = z
  .object({
    hero: z
      .object({
        logo: assetPath,
        logoAlt: text(120),
        eyebrow: text(80),
        title: requiredText(80),
        tagline: text(140),
      })
      .strict(),
    background: z
      .object({ poster: assetPath, videoDesktop: assetPath, videoMobile: assetPath })
      .strict(),
    quickActions: z
      .object({
        saveContact: z
          .object({
            label: requiredText(40),
            toast: text(100),
            vcard: z
              .object({
                name: requiredText(80),
                org: text(80),
                phone: z
                  .string()
                  .trim()
                  .regex(/^\+?[0-9]{6,20}$/, 'Nomor telepon tidak valid'),
                url,
                instagram: url,
              })
              .strict(),
          })
          .strict(),
        share: z
          .object({
            label: requiredText(40),
            title: text(80),
            text: text(200),
            toastShared: text(100),
            toastCopied: text(100),
            toastFallback: text(100),
          })
          .strict(),
      })
      .strict(),
    links: linkList(20),
    social: linkList(8),
    marketplace: z.object({ heading: text(120), items: linkList(12) }).strict(),
    footer: z.object({ text: text(200), siteUrl: url, icon: assetPath }).strict(),
  })
  .strict();

export type LandingContent = z.infer<typeof landingContentSchema>;

export const landingDraftSchema = z.object({
  content: landingContentSchema,
  baseSha: z.string().min(1),
});

export const landingPublishSchema = z.object({
  content: landingContentSchema,
  baseSha: z.string().min(1),
  message: z.string().trim().min(3, 'Pesan commit minimal 3 karakter').max(200).optional(),
});

/** Same formatting as the file in the landing repo, so diffs stay minimal. */
export function serializeLandingContent(content: LandingContent): string {
  return `${JSON.stringify(content, null, 2)}\n`;
}
