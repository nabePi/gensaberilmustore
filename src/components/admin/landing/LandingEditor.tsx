'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { HistoryTab } from '@/components/admin/landing/HistoryTab';
import { LandingPreview } from '@/components/admin/landing/LandingPreview';
import { LinkListEditor } from '@/components/admin/landing/LinkListEditor';
import { PublishDialog } from '@/components/admin/landing/PublishDialog';
import { TextFields } from '@/components/admin/landing/TextFields';
import { Card } from '@/components/admin/ui/Card';
import { PageHeader } from '@/components/admin/ui/PageHeader';
import {
  adminBtnOutline,
  adminBtnOutlineSm,
  adminBtnPrimary,
  adminBtnPrimarySm,
  adminErrorText,
  adminInputBase,
  adminLabelBase,
} from '@/lib/admin/styles';
import { diffLanding } from '@/lib/landing/diff';
import { landingContentSchema } from '@/server/landing/schema';
import type { LandingContent } from '@/server/landing/schema';

type Tab = 'tautan' | 'teks' | 'sosial' | 'riwayat';

const TABS: { id: Tab; label: string }[] = [
  { id: 'tautan', label: 'Tautan' },
  { id: 'teks', label: 'Header & Teks' },
  { id: 'sosial', label: 'Sosial & Marketplace' },
  { id: 'riwayat', label: 'Riwayat' },
];

type LoadResponse = {
  live: { content: LandingContent; sha: string };
  draft: { content: LandingContent; baseSha: string; updatedAt: string; stale: boolean } | null;
};

type Notice = { tone: 'success' | 'error'; text: string; href?: string };

const snapshot = (content: LandingContent) => JSON.stringify(content);

async function readError(response: Response, fallback: string): Promise<string> {
  const data = (await response.json().catch(() => null)) as { error?: string } | null;
  return data?.error ?? fallback;
}

type LoadResult = { ok: true; data: LoadResponse } | { ok: false; error: string };

async function fetchLanding(): Promise<LoadResult> {
  const response = await fetch('/api/admin/landing', { cache: 'no-store' }).catch(() => null);
  if (!response) return { ok: false, error: 'Gagal terhubung ke server' };
  if (!response.ok) {
    return { ok: false, error: await readError(response, 'Gagal memuat landing page') };
  }
  return { ok: true, data: (await response.json()) as LoadResponse };
}

export function LandingEditor() {
  const [live, setLive] = useState<{ content: LandingContent; sha: string } | null>(null);
  const [content, setContent] = useState<LandingContent | null>(null);
  const [baseSha, setBaseSha] = useState('');
  const [saved, setSaved] = useState('');
  const [staleDraft, setStaleDraft] = useState<LandingContent | null>(null);

  const [tab, setTab] = useState<Tab>('tautan');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const load = useCallback(
    () =>
      fetchLanding().then((result) => {
        if (!result.ok) {
          setLoadError(result.error);
          return;
        }

        const data = result.data;
        setLoadError(null);
        setLive(data.live);
        setBaseSha(data.live.sha);
        setConflict(false);

        if (data.draft && !data.draft.stale) {
          setContent(data.draft.content);
          setSaved(snapshot(data.draft.content));
          setStaleDraft(null);
        } else {
          setContent(data.live.content);
          setSaved(snapshot(data.live.content));
          setStaleDraft(data.draft ? data.draft.content : null);
        }
      }),
    [],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const unsaved = content !== null && snapshot(content) !== saved;

  useEffect(() => {
    if (!unsaved) return;
    const handler = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [unsaved]);

  const errors = useMemo(() => {
    const map: Record<string, string> = {};
    if (!content) return map;
    const result = landingContentSchema.safeParse(content);
    if (!result.success) {
      for (const issue of result.error.issues) {
        const key = issue.path.join('.');
        map[key] ??= issue.message;
      }
    }
    return map;
  }, [content]);
  const errorCount = Object.keys(errors).length;

  const changes = useMemo(
    () => (live && content && errorCount === 0 ? diffLanding(live.content, content) : []),
    [live, content, errorCount],
  );

  if (loadError) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm text-red" role="alert">
          {loadError}
        </p>
        <button
          type="button"
          className={adminBtnOutline}
          onClick={() => {
            setLoadError(null);
            void load();
          }}
        >
          Coba lagi
        </button>
      </div>
    );
  }

  if (!live || !content) {
    return <p className="text-sm text-neutral-500">Memuat landing page…</p>;
  }

  const current = content;

  async function putDraft(next: LandingContent, sha: string): Promise<boolean> {
    const response = await fetch('/api/admin/landing/draft', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content: next, baseSha: sha }),
    }).catch(() => null);
    return !!response?.ok;
  }

  async function saveDraft() {
    setSaving(true);
    setNotice(null);
    const ok = await putDraft(current, baseSha);
    if (ok) {
      setSaved(snapshot(current));
      setNotice({ tone: 'success', text: 'Draft tersimpan. Belum dikirim ke GitHub.' });
    } else {
      setNotice({
        tone: 'error',
        text: 'Gagal menyimpan draft. Periksa isian yang ditandai merah.',
      });
    }
    setSaving(false);
  }

  async function publish(message: string) {
    setPublishing(true);
    setDialogError(null);
    const response = await fetch('/api/admin/landing/publish', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content: current, baseSha, message }),
    }).catch(() => null);

    if (response?.ok) {
      const data = (await response.json()) as { commit: { url: string }; sha: string };
      setLive({ content: current, sha: data.sha });
      setBaseSha(data.sha);
      setSaved(snapshot(current));
      setDialogOpen(false);
      setNotice({
        tone: 'success',
        text: 'Commit terkirim. Deploy berjalan otomatis, perubahan tampil dalam beberapa menit.',
        href: data.commit.url,
      });
    } else if (response?.status === 409) {
      setDialogOpen(false);
      setConflict(true);
    } else {
      setDialogError(
        response ? await readError(response, 'Gagal commit') : 'Gagal terhubung ke server',
      );
    }
    setPublishing(false);
  }

  async function reloadAfterConflict() {
    // Keep the user's edits as a draft; after reload it is offered as a stale draft.
    if (unsaved && errorCount === 0) await putDraft(current, baseSha);
    await load();
  }

  async function discardDraft() {
    await fetch('/api/admin/landing/draft', { method: 'DELETE' });
    setStaleDraft(null);
  }

  const hasChanges = snapshot(current) !== snapshot(live.content);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Landing Page"
        description="Atur tautan dan teks di gensaberilmu.com. Perubahan baru tampil di situs setelah Commit & Push."
        action={
          <div className="flex gap-2">
            <button
              type="button"
              className={adminBtnOutline}
              disabled={!unsaved || saving || errorCount > 0}
              onClick={() => void saveDraft()}
            >
              {saving ? 'Menyimpan…' : 'Simpan Draft'}
            </button>
            <button
              type="button"
              className={adminBtnPrimary}
              disabled={!hasChanges || errorCount > 0}
              onClick={() => {
                setDialogError(null);
                setDialogOpen(true);
              }}
            >
              Commit & Push
            </button>
          </div>
        }
      />

      {notice ? (
        <div
          role="status"
          className={`rounded-lg px-4 py-3 text-sm ${
            notice.tone === 'success' ? 'bg-green/10 text-green' : 'bg-red/10 text-red'
          }`}
        >
          {notice.text}{' '}
          {notice.href ? (
            <a
              href={notice.href}
              target="_blank"
              rel="noreferrer"
              className="font-medium underline"
            >
              Lihat commit
            </a>
          ) : null}
        </div>
      ) : null}

      {conflict ? (
        <div
          role="alert"
          className="flex flex-col gap-2 rounded-lg bg-amber-100 px-4 py-3 text-sm text-amber-700"
        >
          <p>
            Konten di GitHub sudah berubah sejak editor dibuka (misalnya diedit langsung di repo).
            Commit dibatalkan agar tidak menimpa perubahan itu.
          </p>
          <div>
            <button
              type="button"
              className={adminBtnPrimarySm}
              onClick={() => void reloadAfterConflict()}
            >
              Muat ulang dari GitHub
            </button>
          </div>
        </div>
      ) : null}

      {staleDraft ? (
        <div
          role="alert"
          className="flex flex-col gap-2 rounded-lg bg-amber-100 px-4 py-3 text-sm text-amber-700"
        >
          <p>
            Ada draft lama yang dibuat dari versi sebelumnya. Isinya bisa menimpa perubahan terbaru
            di GitHub.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              className={adminBtnOutlineSm}
              onClick={() => {
                setContent(staleDraft);
                setStaleDraft(null);
              }}
            >
              Lanjutkan draft lama
            </button>
            <button type="button" className={adminBtnOutlineSm} onClick={() => void discardDraft()}>
              Buang draft
            </button>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_520px]">
        <Card padded={false}>
          <div
            role="tablist"
            aria-label="Bagian landing page"
            className="flex gap-1 overflow-x-auto border-b border-neutral-200 px-3 pt-2"
          >
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                id={`tab-${item.id}`}
                aria-selected={tab === item.id}
                aria-controls={`panel-${item.id}`}
                onClick={() => setTab(item.id)}
                className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                  tab === item.id
                    ? 'border-brand text-brand'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div
            role="tabpanel"
            id={`panel-${tab}`}
            aria-labelledby={`tab-${tab}`}
            className="p-4 sm:p-6"
          >
            {errorCount > 0 ? (
              <p className={`${adminErrorText} mb-4`} role="alert">
                {errorCount} isian belum valid. Perbaiki dulu sebelum menyimpan atau commit.
              </p>
            ) : null}

            {tab === 'tautan' ? (
              <LinkListEditor
                items={current.links}
                onChange={(links) => setContent({ ...current, links })}
                path="links"
                errors={errors}
                maxItems={20}
                noun="tautan"
                withDescription
                withFeatured
              />
            ) : null}

            {tab === 'teks' ? (
              <TextFields content={current} onChange={setContent} errors={errors} />
            ) : null}

            {tab === 'sosial' ? (
              <div className="flex flex-col gap-8">
                <section className="flex flex-col gap-3">
                  <h3 className="text-sm font-semibold text-foreground">Media sosial</h3>
                  <LinkListEditor
                    items={current.social}
                    onChange={(social) => setContent({ ...current, social })}
                    path="social"
                    errors={errors}
                    maxItems={8}
                    noun="akun sosial"
                  />
                </section>
                <section className="flex flex-col gap-3">
                  <h3 className="text-sm font-semibold text-foreground">Marketplace</h3>
                  <label className="flex flex-col gap-1.5">
                    <span className={adminLabelBase}>Judul bagian</span>
                    <input
                      className={adminInputBase}
                      value={current.marketplace.heading}
                      maxLength={120}
                      onChange={(event) =>
                        setContent({
                          ...current,
                          marketplace: { ...current.marketplace, heading: event.target.value },
                        })
                      }
                    />
                    {errors['marketplace.heading'] ? (
                      <span className={adminErrorText}>{errors['marketplace.heading']}</span>
                    ) : null}
                  </label>
                  <LinkListEditor
                    items={current.marketplace.items}
                    onChange={(items) =>
                      setContent({ ...current, marketplace: { ...current.marketplace, items } })
                    }
                    path="marketplace.items"
                    errors={errors}
                    maxItems={12}
                    noun="marketplace"
                  />
                </section>
              </div>
            ) : null}

            {tab === 'riwayat' ? <HistoryTab /> : null}
          </div>
        </Card>

        <div className="lg:sticky lg:top-4">
          <Card title="Preview">
            <LandingPreview content={current} />
          </Card>
        </div>
      </div>

      {dialogOpen ? (
        <PublishDialog
          changes={changes}
          publishing={publishing}
          error={dialogError}
          onCancel={() => setDialogOpen(false)}
          onConfirm={(message) => void publish(message)}
        />
      ) : null}
    </div>
  );
}
