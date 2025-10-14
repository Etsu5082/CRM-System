import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/router';
import Navigation from '@/components/Navigation';
import dynamic from 'next/dynamic';

const CustomerList = dynamic(() => import('customer/CustomerList'), {
  ssr: false,
  loading: () => <div className="text-center py-8">読み込み中...</div>,
});

export default function CustomersPage() {
  const { user, token, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !token) {
      router.push('/login');
    }
  }, [isLoading, token, router]);

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!token) {
    return null;
  }

  return (
    <>
      <Navigation />
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <CustomerList token={token} />
      </main>
    </>
  );
}
