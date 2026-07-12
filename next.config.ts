import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingIncludes: {
    "/api/setup/isc-sp-config/**": ["./config/isc/**/*"],
    "/api/setup/isc-sp-config/apply-privilege-classification/route": [
      "./config/isc/golden/privilege-classification.*.json",
      "./config/isc/manifest.json",
    ],
  },
};

export default nextConfig;
