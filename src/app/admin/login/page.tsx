import { redirect } from 'next/navigation';

import { AdminLoginForm } from '@/components/admin/AdminLoginForm';
import { getAdminSessionUser } from '@/server/auth';

export default async function AdminLoginPage() {
  const user = await getAdminSessionUser();

  if (user && user.role === 'ADMIN') {
    redirect('/admin');
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-12">
      <div className="w-full max-w-sm rounded-lg border border-neutral-200 bg-white p-8 shadow-md">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-bold text-foreground">Admin Panel</h1>
          <p className="mt-1 text-sm text-neutral-500">Masuk ke panel manajemen GenSa Berilmu</p>
        </div>
        <AdminLoginForm />
      </div>
    </div>
  );
}
