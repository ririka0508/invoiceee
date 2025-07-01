/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'https://invoiceee-production.up.railway.app',
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    API_URL: process.env.API_URL || 'https://invoiceee-production.up.railway.app',
  },
  async rewrites() {
    return [
      {
        source: '/api/server/:path*',
        destination: '/api/:path*',
      },
    ];
  },
}

module.exports = nextConfig;