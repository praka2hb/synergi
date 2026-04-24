/** @type {import('next').NextConfig} */
const nextConfig = {
  // Suppress non-critical type errors during Vercel builds
  typescript: {
    ignoreBuildErrors: true,
  },

  // Remove powered-by header for security
  poweredByHeader: false,

  // Allow images from any remote host (Vercel Image Optimization is enabled by default)
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },

  // Proxy /api/* calls to the backend during production
  // Set NEXT_PUBLIC_API_URL in the Vercel dashboard to your deployed backend URL
  async rewrites() {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
