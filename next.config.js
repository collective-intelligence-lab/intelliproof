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
  // Vercel-specific optimizations
  experimental: {
    serverComponentsExternalPackages: [],
  },
  // Configure server timeout
  serverRuntimeConfig: {
    apiTimeout: 30000, // 30 seconds
  },
  // Vercel deployment optimizations
  output: 'standalone',
  poweredByHeader: false,
};

module.exports = nextConfig; 