'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return; // まだ読み込み中

    if (session) {
      // ログイン済みの場合はダッシュボードにリダイレクト
      router.push('/dashboard');
    } else {
      // 未ログインの場合はサインインページにリダイレクト
      router.push('/auth/signin');
    }
  }, [session, status, router]);

  // ローディング表示
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600">読み込み中...</p>
      </div>
    </div>
  );
}
