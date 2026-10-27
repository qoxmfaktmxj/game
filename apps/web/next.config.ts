import type { NextConfig } from "next";
import { resolve } from "node:path";
const config: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: resolve(process.cwd(), "../.."),
  outputFileTracingIncludes: {
    "/*": ["../../node_modules/@img/sharp*/**/*"],
  },
  transpilePackages: ["@moyeotable/contracts"],
  poweredByHeader: false,
  images: { qualities: [75, 85] },
  async headers() {
    return ["/optimized/:path*", "/fonts/subsets/:path*"].map((source) => ({
      source,
      headers: [
        { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
      ],
    }));
  },
  reactStrictMode: true,
  devIndicators: false,
};
export default config;
