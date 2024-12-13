/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "r3bel-gifs-prod.s3.us-east-2.amazonaws.com",
        port: "",
        pathname: "/chimpers-main-portrait/**",
      },
    ],
  },
};

export default nextConfig;
