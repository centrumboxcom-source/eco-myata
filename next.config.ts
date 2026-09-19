import type { NextConfig } from 'next';
const config: NextConfig = { output: 'standalone', distDir: process.env.NODE_ENV === 'development' ? '.next-dev' : '.next', images: { remotePatterns: [{ protocol: 'https', hostname: 'images.unsplash.com' },{ protocol: 'https', hostname: '*.supabase.co' }] } };
export default config;
