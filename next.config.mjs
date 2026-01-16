/** @type {import('next').NextConfig} */
const nextConfig = {
  // Note: The "Skipping auto-scroll behavior due to position: sticky or position: fixed" warning
  // is informational and harmless. Next.js correctly skips auto-scroll when sticky/fixed elements
  // are present to prevent layout issues. This is expected behavior with sticky headers.
  onDemandEntries: {
    // Keep pages in memory for longer
    maxInactiveAge: 60 * 1000,
    pagesBufferLength: 5,
  },
  // Logging configuration
  logging: {
    fetches: {
      fullUrl: false,
    },
  },
  // Production optimizations
  reactStrictMode: true,
  swcMinify: true,
  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },
  // Environment variables that should be available at build time
  env: {
    // These are already available via process.env, but explicitly listed for clarity
  },
  // Output configuration for Vercel (production only)
  // Note: 'standalone' output is for production builds, not dev server
  // Vercel will use this automatically in production
  // Experimental features
  experimental: {
    // Enable server actions if needed in the future
  },
};

// Only add 'standalone' output in production (for Vercel deployment)
if (process.env.NODE_ENV === 'production') {
  nextConfig.output = 'standalone';
}

export default nextConfig;
