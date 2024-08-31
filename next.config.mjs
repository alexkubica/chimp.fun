/** @type {import('next').NextConfig} */
const nextConfig = {
  // reactStrictMode: true,
  // async headers() {
  //   return [
  //     {
  //       source: '/',
  //       headers: [
  //         {
  //           key: 'Cross-Origin-Embedder-Policy',
  //           value: 'require-corp',
  //         },
  //         {
  //           key: 'Cross-Origin-Opener-Policy',
  //           value: 'same-origin',
  //         },
  //       ],
  //     },
  //   ];
  // },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'r3bel-gifs-prod.s3.us-east-2.amazonaws.com',
        port: '',
        pathname: '/chimpers-main-portrait/**',
      },
    ],
  },
};

export default nextConfig;
