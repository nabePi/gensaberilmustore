import { readLandingFile } from '@/server/landing/github';
import { landingContentSchema } from '@/server/landing/schema';
import type { LandingContent } from '@/server/landing/schema';

export class InvalidLiveContentError extends Error {}

/** Live content.json from GitHub, validated. `sha` is the optimistic-lock token. */
export async function loadLiveLanding(): Promise<{
  content: LandingContent;
  sha: string;
  raw: string;
}> {
  const file = await readLandingFile();

  let json: unknown;
  try {
    json = JSON.parse(file.content);
  } catch {
    throw new InvalidLiveContentError('src/content.json di repo landing bukan JSON yang valid');
  }

  const parsed = landingContentSchema.safeParse(json);
  if (!parsed.success) {
    throw new InvalidLiveContentError(
      'src/content.json di repo landing tidak sesuai skema editor. Perbaiki manual di repo.',
    );
  }

  return { content: parsed.data, sha: file.sha, raw: file.content };
}
