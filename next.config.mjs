/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  serverExternalPackages: ["mammoth", "pdf-parse", "pg", "xlsx"],
  experimental: {
    webpackBuildWorker: false
  }
};

export default nextConfig;
