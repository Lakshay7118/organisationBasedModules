/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['172.16.1.98', '192.168.29.140', '10.132.51.60'],  // ← add this
  // ...your other config
};

export default nextConfig;