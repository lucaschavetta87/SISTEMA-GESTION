/** @type {import('next').NextConfig} */
const nextConfig = {
  /* Estas son las opciones correctas para tu versión */
  devIndicators: {
    appIsrStatus: false,
  },
  // Ponemos la IP conflictiva aquí directamente
  allowedDevOrigins: ['192.168.56.1', 'localhost:3000'],
};

export default nextConfig;