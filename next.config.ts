import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Bu klasörü proje kökü olarak sabitle (ev dizinindeki başka lockfile'lar karışmasın)
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
