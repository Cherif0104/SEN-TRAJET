import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  async redirects() {
    return [
      { source: "/restaurants", destination: "/app", permanent: false },
      { source: "/restaurants/:path*", destination: "/app", permanent: false },
      { source: "/food/:path*", destination: "/app", permanent: false },
      { source: "/partner/food", destination: "/driver", permanent: false }
    ];
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" }
        ]
      },
      {
        source: "/manifest.webmanifest",
        headers: [{ key: "Cache-Control", value: "public, max-age=3600" }]
      }
    ];
  }
};

export default nextConfig;
