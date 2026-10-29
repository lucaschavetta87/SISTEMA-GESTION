/** @type {import('next').NextConfig} */
const nextConfig = {
  /* devIndicators.appIsrStatus fue eliminado en Next 16, solo admite position */
  devIndicators: false,
  // Orígenes permitidos para el dev server (Next 16 no acepta el puerto en allowedDevOrigins)
  allowedDevOrigins: ['192.168.100.6', '192.168.56.1'],
};

export default nextConfig;