/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Disable ESLint blocking production builds so CI/deploys don't fail
  // on non-critical lint warnings. We still recommend fixing issues locally.
  eslint: {
    ignoreDuringBuilds: true
  },
  images: {
    unoptimized: true
  }
};

module.exports = nextConfig;
