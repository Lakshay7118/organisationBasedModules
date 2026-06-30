/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',

  allowedDevOrigins: [
    '172.16.1.98',
    '192.168.29.140',
    '10.132.51.60',
  ],
};

export default nextConfig;