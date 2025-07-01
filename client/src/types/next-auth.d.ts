import NextAuth from 'next-auth';

declare module 'next-auth' {
  interface Session {
    apiToken?: string;
    userId?: string;
  }

  interface User {
    apiToken?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    apiToken?: string;
    userId?: string;
  }
}