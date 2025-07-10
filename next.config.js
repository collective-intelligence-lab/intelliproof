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
  // Temporarily disable TypeScript errors during build
  typescript: {
    ignoreBuildErrors: true,
  },
  // Disable ESLint during builds
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig; 