import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  landingDraft: { findUnique: vi.fn(), upsert: vi.fn(), deleteMany: vi.fn() },
  landingPublishLog: { create: vi.fn() },
  $transaction: vi.fn(async (ops: unknown[]) => Promise.all(ops)),
}));
const githubMock = vi.hoisted(() => ({
  readLandingFile: vi.fn(),
  commitLandingFile: vi.fn(),
  listLandingCommits: vi.fn(),
}));

vi.mock('@/lib/db', () => ({ prisma: prismaMock }));
vi.mock('@/server/auth', () => ({
  withAuth:
    (handler: (req: NextRequest, ctx: unknown) => unknown) => (req: NextRequest, ctx?: object) =>
      handler(req, { ...ctx, user: { id: 'admin-1', name: 'Siti', email: 'siti@example.com' } }),
}));
vi.mock('@/server/landing/github', async () => {
  const actual =
    await vi.importActual<typeof import('@/server/landing/github')>('@/server/landing/github');
  return { ...actual, ...githubMock };
});

import { PUT as putDraft } from '@/app/api/admin/landing/draft/route';
import { POST as publish } from '@/app/api/admin/landing/publish/route';
import { GET as getLanding } from '@/app/api/admin/landing/route';
import fixture from '@/server/landing/fixture.content.json';
import { GithubError } from '@/server/landing/github';

const rawLive = `${JSON.stringify(fixture, null, 2)}\n`;

function edited() {
  const content = structuredClone(fixture);
  content.hero.tagline = 'Tagline baru';
  return content;
}

function request(url: string, method: string, body?: unknown) {
  return new NextRequest(`http://localhost/api/admin/landing${url}`, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  githubMock.readLandingFile.mockResolvedValue({ sha: 'sha-live', content: rawLive });
  githubMock.commitLandingFile.mockResolvedValue({
    commitSha: 'commit1',
    commitUrl: 'https://github.com/x/y/commit/commit1',
    blobSha: 'sha-new',
  });
});

describe('GET /api/admin/landing', () => {
  it('returns live content and flags a stale draft', async () => {
    prismaMock.landingDraft.findUnique.mockResolvedValue({
      content: edited(),
      baseSha: 'sha-old',
      updatedAt: new Date(),
    });

    const response = await getLanding(request('', 'GET'));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.live.sha).toBe('sha-live');
    expect(json.draft.stale).toBe(true);
  });

  it('reports a missing token as 503 without leaking details', async () => {
    githubMock.readLandingFile.mockRejectedValue(new GithubError('NOT_CONFIGURED', 'belum diisi'));
    prismaMock.landingDraft.findUnique.mockResolvedValue(null);

    const response = await getLanding(request('', 'GET'));
    expect(response.status).toBe(503);
  });

  it('reports invalid live content as 502', async () => {
    githubMock.readLandingFile.mockResolvedValue({ sha: 's', content: '{"hero":{}}' });
    prismaMock.landingDraft.findUnique.mockResolvedValue(null);

    const response = await getLanding(request('', 'GET'));
    expect(response.status).toBe(502);
    expect((await response.json()).code).toBe('INVALID_LIVE');
  });
});

describe('PUT /api/admin/landing/draft', () => {
  it('rejects invalid content', async () => {
    const content = edited();
    content.links[0]!.href = 'javascript:alert(1)';

    const response = await putDraft(request('/draft', 'PUT', { content, baseSha: 'sha-live' }));
    expect(response.status).toBe(400);
    expect(prismaMock.landingDraft.upsert).not.toHaveBeenCalled();
  });

  it('saves a valid draft', async () => {
    prismaMock.landingDraft.upsert.mockResolvedValue({
      baseSha: 'sha-live',
      updatedAt: new Date(),
    });

    const response = await putDraft(
      request('/draft', 'PUT', { content: edited(), baseSha: 'sha-live' }),
    );
    expect(response.status).toBe(200);
    expect(prismaMock.landingDraft.upsert).toHaveBeenCalledOnce();
  });
});

describe('POST /api/admin/landing/publish', () => {
  it('commits the file, logs it and clears the draft', async () => {
    const response = await publish(
      request('/publish', 'POST', {
        content: edited(),
        baseSha: 'sha-live',
        message: 'content(landing): ganti tagline',
      }),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.commit.sha).toBe('commit1');

    const call = githubMock.commitLandingFile.mock.calls[0]![0] as {
      content: string;
      baseSha: string;
      message: string;
    };
    expect(call.baseSha).toBe('sha-live');
    expect(call.content).toContain('Tagline baru');
    expect(call.content.endsWith('}\n')).toBe(true);
    expect(call.message).toContain('ganti tagline');
    expect(call.message).toContain('Siti');
    expect(prismaMock.landingPublishLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'SUCCESS' }) }),
    );
    expect(prismaMock.landingDraft.deleteMany).toHaveBeenCalled();
  });

  it('refuses with 409 when GitHub moved on, without committing', async () => {
    const response = await publish(
      request('/publish', 'POST', { content: edited(), baseSha: 'sha-stale' }),
    );

    expect(response.status).toBe(409);
    expect(githubMock.commitLandingFile).not.toHaveBeenCalled();
  });

  it('refuses a no-op commit', async () => {
    const response = await publish(
      request('/publish', 'POST', { content: structuredClone(fixture), baseSha: 'sha-live' }),
    );

    expect(response.status).toBe(400);
    expect(githubMock.commitLandingFile).not.toHaveBeenCalled();
  });

  it('refuses invalid content before touching GitHub', async () => {
    const content = edited();
    content.links[0]!.label = '';

    const response = await publish(request('/publish', 'POST', { content, baseSha: 'sha-live' }));

    expect(response.status).toBe(400);
    expect(githubMock.readLandingFile).not.toHaveBeenCalled();
  });

  it('logs and maps a GitHub auth failure', async () => {
    githubMock.commitLandingFile.mockRejectedValue(new GithubError('AUTH', 'Token kedaluwarsa'));

    const response = await publish(
      request('/publish', 'POST', { content: edited(), baseSha: 'sha-live' }),
    );

    expect(response.status).toBe(502);
    expect(prismaMock.landingPublishLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'FAILED' }) }),
    );
    expect(prismaMock.landingDraft.deleteMany).not.toHaveBeenCalled();
  });
});
