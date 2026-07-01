import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: '*.amazonaws.com' },
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },
  async rewrites() {
    const bucketUrl = process.env.NEXT_PUBLIC_AWS_BUCKET_URL;
    if (!bucketUrl) return [];
    return [
      {
        source: '/media/:path*',
        destination: `${bucketUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
