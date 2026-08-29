/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [],
  },
  webpack: (config) => {
    // pdfjs-dist (used by react-pdf) probes for the Node "canvas" package in
    // some code paths that never actually run in the browser. Without this
    // alias, webpack still tries to bundle it and the build fails.
    config.resolve.alias.canvas = false;
    return config;
  },
};

module.exports = nextConfig;
