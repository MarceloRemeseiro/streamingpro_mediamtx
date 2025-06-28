/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Evitar que socket.io-client se incluya en el bundle del servidor
    if (isServer) {
      config.externals.push('socket.io-client');
    }
    return config;
  },
};

export default nextConfig; 