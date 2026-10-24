import type { NextConfig } from "next";
import { resolve } from "node:path";
const config: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: resolve(process.cwd(), "../.."),
  transpilePackages: ["@moyeotable/contracts"],
  poweredByHeader: false,
  reactStrictMode: true,
  devIndicators: false,
};
export default config;
