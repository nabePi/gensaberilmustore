import { PrismaClient, Role } from '@prisma/client';
import { describe, it, expect, beforeEach, afterAll } from 'vitest';

const prisma = new PrismaClient();

const TEST_EMAILS = [
  'schema-test-buyer@example.com',
  'schema-test-unique@example.com',
  'schema-test-session@example.com',
  'schema-test-token@example.com',
];

async function cleanTestData() {
  await prisma.passwordResetToken.deleteMany({
    where: { user: { email: { in: TEST_EMAILS } } },
  });
  await prisma.session.deleteMany({
    where: { user: { email: { in: TEST_EMAILS } } },
  });
  await prisma.user.deleteMany({
    where: { email: { in: TEST_EMAILS } },
  });
}

describe('prisma schema', () => {
  beforeEach(cleanTestData);
  afterAll(async () => {
    await cleanTestData();
    await prisma.$disconnect();
  });

  describe('User', () => {
    it('creates a user with default role BUYER', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'schema-test-buyer@example.com',
          passwordHash: 'hashed-password',
        },
      });

      expect(user.role).toBe(Role.BUYER);
    });

    it('enforces unique email', async () => {
      const email = 'schema-test-unique@example.com';

      await prisma.user.create({
        data: {
          email,
          passwordHash: 'hashed-password',
        },
      });

      await expect(
        prisma.user.create({
          data: {
            email,
            passwordHash: 'another-hash',
          },
        }),
      ).rejects.toThrow();
    });
  });

  describe('Session', () => {
    it('creates a session linked to a user', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'schema-test-session@example.com',
          passwordHash: 'hashed-password',
        },
      });

      const session = await prisma.session.create({
        data: {
          userId: user.id,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          ipAddress: '127.0.0.1',
          userAgent: 'vitest',
        },
        include: { user: true },
      });

      expect(session.user.id).toBe(user.id);
      expect(session.user.role).toBe(Role.BUYER);
    });
  });

  describe('PasswordResetToken', () => {
    it('creates a password reset token linked to a user', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'schema-test-token@example.com',
          passwordHash: 'hashed-password',
        },
      });

      const token = await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: 'token-hash',
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
        include: { user: true },
      });

      expect(token.user.id).toBe(user.id);
      expect(token.usedAt).toBeNull();
    });
  });
});
