import { Outfit } from 'next/font/google';
import { redirect } from 'next/navigation';

import { AdminLoginForm } from '@/components/admin/AdminLoginForm';
import { getAdminSessionUser } from '@/server/auth';

const outfit = Outfit({ subsets: ['latin'] });

export default async function AdminLoginPage() {
  const user = await getAdminSessionUser();

  if (user && user.role === 'ADMIN') {
    redirect('/admin');
  }

  return (
    <div
      className={`flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-12 ${outfit.className}`}
    >
      <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <p className="text-lg font-bold text-brand">GenSa Admin</p>
          <h1 className="mt-3 text-xl font-bold text-foreground">Masuk ke Panel Admin</h1>
          <p className="mt-1 text-sm text-neutral-500">Kelola toko GenSa Berilmu</p>
        </div>
        <AdminLoginForm />
      </div>
    </div>
  );
}
