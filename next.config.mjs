/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['192.168.0.132', '192.168.29.140'],  // ← add this
  // ...your other config
};

export default nextConfig;