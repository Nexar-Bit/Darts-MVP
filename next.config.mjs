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
};

export default nextConfig;
