import NextAuth, { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import axios from 'axios';

const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google') {
        try {
          // バックエンドAPIにユーザー情報を送信
          const response = await axios.post(`${process.env.API_URL}/api/auth/google`, {
            email: user.email,
            name: user.name,
            image: user.image,
            sub: account.providerAccountId,
          });

          if (response.data.success) {
            // JWTトークンをユーザーオブジェクトに保存
            user.apiToken = response.data.token;
            user.id = response.data.user.id;
            return true;
          }
        } catch (error) {
          console.error('Backend authentication failed:', error);
          return false;
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      // 初回ログイン時にバックエンドのJWTトークンを保存
      if (user?.apiToken) {
        token.apiToken = user.apiToken;
        token.userId = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      // セッションにAPIトークンとユーザーIDを含める
      session.apiToken = token.apiToken as string;
      session.userId = token.userId as string;
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };