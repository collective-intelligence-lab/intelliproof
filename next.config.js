/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/ai/:path*',
        destination: process.env.NODE_ENV === 'production' 
          ? 'https://intelliproofbackend.vercel.app/api/ai/:path*'
          : 'http://host.docker.internal:8000/api/ai/:path*',
      },
      {
        source: '/api/audio/:path*',
        destination: process.env.NODE_ENV === 'production' 
          ? 'https://intelliproofbackend.vercel.app/api/audio/:path*'
          : 'http://host.docker.internal:8000/api/audio/:path*',
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