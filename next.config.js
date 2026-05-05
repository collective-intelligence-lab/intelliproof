/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
        return [
          // AI & Audio (Wildcards are safe here)
          {
            source: '/api/ai/:path*',
            destination: 'http://127.0.0.1:8000/api/ai/:path*',
          },
          {
            source: '/api/audio/:path*',
            destination: 'http://127.0.0.1:8000/api/audio/:path*',
          },
          
          // Exact match for Python Auth endpoints
          {
            source: '/api/signin', 
            destination: 'http://127.0.0.1:8000/api/signin',
          },
          {
            source: '/api/signup', 
            destination: 'http://127.0.0.1:8000/api/signup',
          },
          {
            source: '/api/signout', 
            destination: 'http://127.0.0.1:8000/api/signout',
          },
          
          // Exact match for Python User Data endpoint (Protects /api/user/me)
          {
            source: '/api/user/data', 
            destination: 'http://127.0.0.1:8000/api/user/data',
          }
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