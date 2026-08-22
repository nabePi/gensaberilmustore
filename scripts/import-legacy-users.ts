import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { prisma } from '@/lib/db';

/**
 * Import legacy users from the previous store.
 *
 * Usage: pnpm db:import-legacy <file.csv>
 *
 * Expected CSV columns (header names are matched case-insensitively):
 *   Nama Member | email | password (MD5 hex) | No. Handphone | Waktu Daftar
 *
 * Legacy users are created with `passwordmd5` set and `passwordHash` null.
 * They authenticate with MD5 and are transparently upgraded to bcrypt on
 * their first successful login or password reset. Existing emails are skipped.
 */

type LegacyRow = {
  name: string | null;
  email: string;
  passwordmd5: string;
  phone: string | null;
  createdAt: Date | null;
};

const HEADER_ALIASES: Record<keyof LegacyRow, string[]> = {
  name: ['nama member', 'nama', 'name'],
  email: ['email', 'e-mail'],
  passwordmd5: ['password', 'passwordmd5', 'password_md5', 'md5'],
  phone: ['no. handphone', 'no handphone', 'no hp', 'phone', 'handphone', 'hp'],
  createdAt: ['waktu daftar', 'createdat', 'created_at', 'tanggal daftar'],
};

function parseCsv(content: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < content.length; i += 1) {
    const char = content[i];

    if (inQuotes) {
      if (char === '"') {
        if (content[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && content[i + 1] === '\n') {
        i += 1;
      }
      row.push(field);
      field = '';
      if (row.some((value) => value.trim() !== '')) {
        rows.push(row);
      }
      row = [];
    } else {
      field += char;
    }
  }

  row.push(field);
  if (row.some((value) => value.trim() !== '')) {
    rows.push(row);
  }

  return rows;
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function resolveColumnIndexes(header: string[]): Partial<Record<keyof LegacyRow, number>> {
  const indexes: Partial<Record<keyof LegacyRow, number>> = {};

  header.forEach((column, index) => {
    const normalized = normalizeHeader(column);
    for (const [key, aliases] of Object.entries(HEADER_ALIASES) as [keyof LegacyRow, string[]][]) {
      if (indexes[key] === undefined && aliases.includes(normalized)) {
        indexes[key] = index;
      }
    }
  });

  return indexes;
}

function parseCreatedAt(raw: string): Date | null {
  const value = raw.trim();
  if (!value) {
    return null;
  }

  const parsed = new Date(value.replace(' ', 'T'));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toLegacyRow(
  cells: string[],
  indexes: Partial<Record<keyof LegacyRow, number>>,
): LegacyRow {
  const get = (key: keyof LegacyRow): string => {
    const index = indexes[key];
    return index === undefined ? '' : (cells[index] ?? '').trim();
  };

  return {
    name: get('name') || null,
    email: get('email').toLowerCase(),
    passwordmd5: get('passwordmd5').toLowerCase(),
    phone: get('phone') || null,
    createdAt: parseCreatedAt(get('createdAt')),
  };
}

async function main() {
  const fileArg = process.argv[2];
  if (!fileArg) {
    // eslint-disable-next-line no-console
    console.error('Usage: pnpm db:import-legacy <file.csv>');
    process.exit(1);
  }

  const filePath = resolve(process.cwd(), fileArg);
  const content = await readFile(filePath, 'utf8');
  const rows = parseCsv(content);

  if (rows.length === 0) {
    // eslint-disable-next-line no-console
    console.log('File kosong, tidak ada yang diimport.');
    return;
  }

  let indexes = resolveColumnIndexes(rows[0] ?? []);
  let dataRows = rows;

  if (indexes.email === undefined || indexes.passwordmd5 === undefined) {
    // No recognizable header: assume positional order
    // [Nama Member, email, password, No. Handphone, Waktu Daftar]
    indexes = { name: 0, email: 1, passwordmd5: 2, phone: 3, createdAt: 4 };
  } else {
    dataRows = rows.slice(1);
  }

  let imported = 0;
  let skippedExisting = 0;
  let invalid = 0;

  for (const cells of dataRows) {
    const row = toLegacyRow(cells, indexes);

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email) || !/^[0-9a-f]{32}$/.test(row.passwordmd5)) {
      invalid += 1;
      // eslint-disable-next-line no-console
      console.warn(`  dilewati (email/md5 tidak valid): ${row.email || cells.join(', ')}`);
      continue;
    }

    const existing = await prisma.user.findUnique({ where: { email: row.email } });
    if (existing) {
      skippedExisting += 1;
      continue;
    }

    await prisma.user.create({
      data: {
        email: row.email,
        name: row.name,
        phone: row.phone,
        passwordmd5: row.passwordmd5,
        passwordHash: null,
        role: 'BUYER',
        ...(row.createdAt ? { createdAt: row.createdAt } : {}),
      },
    });
    imported += 1;
  }

  // eslint-disable-next-line no-console
  console.log(
    `Selesai: ${imported} diimport, ${skippedExisting} dilewati (email sudah ada), ${invalid} tidak valid.`,
  );
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
