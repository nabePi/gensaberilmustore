import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { configDefaults, defineConfig } from 'vitest/config';

function loadEnvFile(filePath: string) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    for (const rawLine of content.split('\n')) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;

      const separatorIndex = line.indexOf('=');
      if (separatorIndex === -1) continue;

      const key = line.slice(0, separatorIndex).trim();
      let value = line.slice(separatorIndex + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      if (key && process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  } catch {
    // .env may not exist in CI or other environments; env vars are expected to be set externally.
  }
}

loadEnvFile('.env');

const homepageTests = ['src/app/api/admin/config/homepage/**/*.test.ts'];

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    projects: [
      {
        extends: true,
        test: {
          name: 'default',
          exclude: [...configDefaults.exclude, '**/.next/**', ...homepageTests],
        },
      },
      {
        extends: true,
        test: {
          name: 'homepage',
          include: homepageTests,
          // Section-list PUT replaces the shared table. Run these files serially
          // so a snapshot/save cannot delete a different test's new section.
          fileParallelism: false,
          sequence: { groupOrder: 1 },
        },
      },
    ],
  },
  resolve: {
    alias: {
      '@': resolve(import.meta.dirname, 'src'),
    },
  },
});
