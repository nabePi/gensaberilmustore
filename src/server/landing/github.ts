import { env } from '@/env';

export const LANDING_CONTENT_PATH = 'src/content.json';

export type GithubErrorCode =
  'NOT_CONFIGURED' | 'AUTH' | 'NOT_FOUND' | 'CONFLICT' | 'RATE_LIMIT' | 'UNKNOWN';

export class GithubError extends Error {
  constructor(
    readonly code: GithubErrorCode,
    message: string,
  ) {
    super(message);
  }
}

export type LandingFile = { sha: string; content: string };
export type LandingCommit = {
  sha: string;
  message: string;
  author: string;
  date: string;
  url: string;
};

function config() {
  if (!env.githubLandingToken) {
    throw new GithubError(
      'NOT_CONFIGURED',
      'GITHUB_LANDING_TOKEN belum diisi di environment server',
    );
  }
  return {
    token: env.githubLandingToken,
    repo: env.githubLandingRepo,
    branch: env.githubLandingBranch,
  };
}

async function github(path: string, init: RequestInit = {}): Promise<Response> {
  const { token } = config();
  const response = await fetch(`https://api.github.com${path}`, {
    ...init,
    cache: 'no-store',
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${token}`,
      'x-github-api-version': '2022-11-28',
      'user-agent': 'gensa-admin-landing',
      ...(init.body ? { 'content-type': 'application/json' } : {}),
    },
  });

  if (response.ok) {
    return response;
  }

  if (response.status === 401) {
    throw new GithubError('AUTH', 'Token GitHub tidak valid atau kedaluwarsa. Hubungi developer.');
  }
  if (response.status === 403 || response.status === 429) {
    const remaining = response.headers.get('x-ratelimit-remaining');
    if (remaining === '0' || response.status === 429) {
      throw new GithubError(
        'RATE_LIMIT',
        'Batas request GitHub tercapai, coba lagi sebentar lagi.',
      );
    }
    throw new GithubError(
      'AUTH',
      'Token GitHub tidak punya izin "Contents: Read and write" ke repo landing.',
    );
  }
  if (response.status === 404) {
    throw new GithubError('NOT_FOUND', 'Repo, branch, atau file landing tidak ditemukan.');
  }
  if (response.status === 409 || response.status === 422) {
    throw new GithubError(
      'CONFLICT',
      'Konten di GitHub sudah berubah sejak Anda membuka editor. Muat ulang dulu.',
    );
  }
  throw new GithubError('UNKNOWN', `GitHub membalas ${response.status}`);
}

/** Reads the live src/content.json from the landing repo. */
export async function readLandingFile(): Promise<LandingFile> {
  const { repo, branch } = config();
  const response = await github(
    `/repos/${repo}/contents/${LANDING_CONTENT_PATH}?ref=${encodeURIComponent(branch)}`,
  );
  const data = (await response.json()) as { sha: string; content: string; encoding: string };

  if (data.encoding !== 'base64') {
    throw new GithubError('UNKNOWN', 'Format file dari GitHub tidak dikenali');
  }

  return { sha: data.sha, content: Buffer.from(data.content, 'base64').toString('utf-8') };
}

/**
 * Commits src/content.json. GitHub rejects the write (409) when `baseSha` is no
 * longer the file's current blob SHA, so edits made elsewhere are never overwritten.
 */
export async function commitLandingFile(params: {
  content: string;
  baseSha: string;
  message: string;
}): Promise<{ commitSha: string; commitUrl: string; blobSha: string }> {
  const { repo, branch } = config();
  const response = await github(`/repos/${repo}/contents/${LANDING_CONTENT_PATH}`, {
    method: 'PUT',
    body: JSON.stringify({
      message: params.message,
      content: Buffer.from(params.content, 'utf-8').toString('base64'),
      sha: params.baseSha,
      branch,
    }),
  });
  const data = (await response.json()) as {
    content: { sha: string };
    commit: { sha: string; html_url: string };
  };

  return { commitSha: data.commit.sha, commitUrl: data.commit.html_url, blobSha: data.content.sha };
}

/** Recent commits that touched src/content.json. */
export async function listLandingCommits(limit = 20): Promise<LandingCommit[]> {
  const { repo, branch } = config();
  const query = new URLSearchParams({
    sha: branch,
    path: LANDING_CONTENT_PATH,
    per_page: String(limit),
  });
  const response = await github(`/repos/${repo}/commits?${query.toString()}`);
  const data = (await response.json()) as Array<{
    sha: string;
    html_url: string;
    commit: { message: string; author: { name: string; date: string } };
  }>;

  return data.map((item) => ({
    sha: item.sha,
    message: item.commit.message.split('\n')[0] ?? '',
    author: item.commit.author.name,
    date: item.commit.author.date,
    url: item.html_url,
  }));
}
