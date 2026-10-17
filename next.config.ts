import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ["pdf-lib", "@pdf-lib/fontkit"],
  outputFileTracingIncludes: {
    "/api/**/*": [
      "./public/branding/v1/**/*",
      "./server-assets/branding/v1/**/*",
    ],
  },
};
export default nextConfig;
