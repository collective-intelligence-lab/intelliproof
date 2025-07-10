/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/ai/:path*',
        destination: process.env.NODE_ENV === 'production' 
          ? 'https://intelliproofbackend.vercel.app/api/ai/:path*'
          : 'http://localhost:8000/api/ai/:path*',
      },
    ];
  },
};

module.exports = nextConfig; 