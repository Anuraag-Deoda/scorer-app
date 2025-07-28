import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  devIndicators: {
    buildActivity: false
  },
  experimental: {
    allowedDevOrigins: [
        "*.cluster-qxqlf3vb3nbf2r42l5qfoebdry.cloudworkstations.dev"
    ]
  }
};

export default nextConfig;
