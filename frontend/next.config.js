// Where this Next.js server reaches the NestJS API (server-side). In Docker this
// is the backend container; locally it is the dev API.
const API_INTERNAL_URL = process.env.API_INTERNAL_URL || "http://localhost:3001";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Self-contained server (.next/standalone) for the Docker image.
  output: "standalone",
  // Browser API calls go to /api on this site and are forwarded to the API, so
  // only the frontend has to be reachable in production.
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API_INTERNAL_URL}/api/:path*` }];
  },
};

module.exports = nextConfig;
