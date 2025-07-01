'use client';

import { signIn, getSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function SignIn() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // 既にログインしている場合はダッシュボードにリダイレクト
    getSession().then((session) => {
      if (session) {
        router.push('/dashboard');
      }
    });
  }, [router]);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const result = await signIn('google', {
        callbackUrl: '/dashboard',
        redirect: false,
      });
      
      if (result?.ok) {
        router.push('/dashboard');
      } else {
        console.error('Sign in failed:', result?.error);
      }
    } catch (error) {
      console.error('Sign in error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-20 h-20 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-2xl font-bold text-white">📄</span>
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          invoiceee
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          自動請求書ダウンロードツール
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 text-center mb-6">
                アカウントにサインイン
              </h3>
              
              <button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full flex justify-center items-center px-4 py-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-3" />
                ) : (
                  <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                )}
                {loading ? 'サインイン中...' : 'Googleでサインイン'}
              </button>
            </div>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">機能</span>
                </div>
              </div>

              <div className="mt-6 space-y-3 text-sm text-gray-600">
                <div className="flex items-center">
                  <span className="mr-2">✓</span>
                  自動請求書ダウンロード
                </div>
                <div className="flex items-center">
                  <span className="mr-2">✓</span>
                  複数ポータル対応
                </div>
                <div className="flex items-center">
                  <span className="mr-2">✓</span>
                  ダウンロード履歴管理
                </div>
                <div className="flex items-center">
                  <span className="mr-2">✓</span>
                  セキュアなクラウド保存
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}