'use client';

import { adminErrorText, adminHelpText, adminInputBase, adminLabelBase } from '@/lib/admin/styles';
import type { LandingContent } from '@/server/landing/schema';

type Props = {
  content: LandingContent;
  onChange: (content: LandingContent) => void;
  errors: Record<string, string>;
};

function TextField({
  label,
  path,
  value,
  errors,
  onChange,
  maxLength,
  help,
}: {
  label: string;
  path: string;
  value: string;
  errors: Record<string, string>;
  onChange: (value: string) => void;
  maxLength?: number;
  help?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className={adminLabelBase}>{label}</span>
      <input
        className={adminInputBase}
        value={value}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
      />
      {help ? <span className={adminHelpText}>{help}</span> : null}
      {errors[path] ? <span className={adminErrorText}>{errors[path]}</span> : null}
    </label>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="mb-1 text-sm font-semibold text-foreground">{title}</legend>
      {children}
    </fieldset>
  );
}

export function TextFields({ content, onChange, errors }: Props) {
  const { hero, quickActions, footer } = content;

  return (
    <div className="flex flex-col gap-8">
      <Group title="Header">
        <TextField
          label="Teks kecil di atas judul"
          path="hero.eyebrow"
          value={hero.eyebrow}
          maxLength={80}
          errors={errors}
          onChange={(eyebrow) => onChange({ ...content, hero: { ...hero, eyebrow } })}
        />
        <TextField
          label="Judul"
          path="hero.title"
          value={hero.title}
          maxLength={80}
          errors={errors}
          onChange={(title) => onChange({ ...content, hero: { ...hero, title } })}
        />
        <TextField
          label="Tagline"
          path="hero.tagline"
          value={hero.tagline}
          maxLength={140}
          errors={errors}
          onChange={(tagline) => onChange({ ...content, hero: { ...hero, tagline } })}
        />
      </Group>

      <Group title="Tombol Simpan Kontak">
        <TextField
          label="Teks tombol"
          path="quickActions.saveContact.label"
          value={quickActions.saveContact.label}
          maxLength={40}
          errors={errors}
          onChange={(label) =>
            onChange({
              ...content,
              quickActions: {
                ...quickActions,
                saveContact: { ...quickActions.saveContact, label },
              },
            })
          }
        />
        <TextField
          label="Notifikasi setelah disimpan"
          path="quickActions.saveContact.toast"
          value={quickActions.saveContact.toast}
          maxLength={100}
          errors={errors}
          onChange={(toast) =>
            onChange({
              ...content,
              quickActions: {
                ...quickActions,
                saveContact: { ...quickActions.saveContact, toast },
              },
            })
          }
        />
        <TextField
          label="Nomor telepon di kontak"
          path="quickActions.saveContact.vcard.phone"
          value={quickActions.saveContact.vcard.phone}
          help="Format internasional, contoh +6281384804494"
          errors={errors}
          onChange={(phone) =>
            onChange({
              ...content,
              quickActions: {
                ...quickActions,
                saveContact: {
                  ...quickActions.saveContact,
                  vcard: { ...quickActions.saveContact.vcard, phone },
                },
              },
            })
          }
        />
      </Group>

      <Group title="Tombol Bagikan">
        <TextField
          label="Teks tombol"
          path="quickActions.share.label"
          value={quickActions.share.label}
          maxLength={40}
          errors={errors}
          onChange={(label) =>
            onChange({
              ...content,
              quickActions: { ...quickActions, share: { ...quickActions.share, label } },
            })
          }
        />
        <TextField
          label="Pesan yang dibagikan"
          path="quickActions.share.text"
          value={quickActions.share.text}
          maxLength={200}
          errors={errors}
          onChange={(text) =>
            onChange({
              ...content,
              quickActions: { ...quickActions, share: { ...quickActions.share, text } },
            })
          }
        />
      </Group>

      <Group title="Footer">
        <TextField
          label="Teks footer"
          path="footer.text"
          value={footer.text}
          maxLength={200}
          errors={errors}
          onChange={(text) => onChange({ ...content, footer: { ...footer, text } })}
        />
      </Group>

      <p className={adminHelpText}>Logo, poster, dan video latar belum bisa diganti dari sini.</p>
    </div>
  );
}
