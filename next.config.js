/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['typeorm'],
  staticPageGenerationTimeout: 300,
}

module.exports = nextConfig
