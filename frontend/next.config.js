/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  swcMinify: true,
  
  async rewrites() {
    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://zeropass-backend.onrender.com';
    console.log('🔧 Next.js Rewrites - Backend URL:', BACKEND_URL);
    
    return [
      {
        source: '/api/:path*',
        destination: `${BACKEND_URL}/:path*`,
      },
    ];
  },
  
  // Enable CORS for development and production
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods', 
            value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, X-User-ID',
          }
        ]
      }
    ]
  },
}

module.exports = nextConfig 