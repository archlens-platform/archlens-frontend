import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    // Rewrites run on the server (Node), so when this app is dockerized the
    // hostnames must resolve inside the compose network. When running locally
    // (next dev outside Docker) the env vars are unset and we fall back to
    // localhost. The gateway has an internal hostname so reuse it the same way.
    const gateway = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:5080";
    const jaeger = process.env.INTERNAL_JAEGER_URL || "http://localhost:16686";
    // /api/prometheus is implemented as a Next.js API route (app/api/prometheus/route.ts)
    // which takes precedence over rewrites, so no proxy rule is needed for it here.
    return [
      {
        source: "/api/jaeger/:path*",
        destination: `${jaeger}/:path*`,
      },
      {
        source: "/api/:path*",
        destination: `${gateway}/api/:path*`,
      },
      {
        source: "/auth/:path*",
        destination: `${gateway}/auth/:path*`,
      },
    ];
  },
};

export default nextConfig;
