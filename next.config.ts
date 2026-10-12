import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "vyxkjqpgtxotoslqhcpv.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  serverExternalPackages: ["@imgly/background-removal", "onnxruntime-web"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
