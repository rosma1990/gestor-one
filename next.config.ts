import type { NextConfig } from "next";
import os from "os";

// Obtener la IP local de red dinámica para permitir conexiones websocket HMR sin bloqueos de seguridad de Next.js
function getLocalIp(): string {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return "localhost";
}

const localIp = getLocalIp();

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: [localIp, "localhost:3000", `${localIp}:3000`]
};

export default nextConfig;
