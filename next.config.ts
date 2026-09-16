import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Autorise l'accès en dev depuis les appareils du bar (tablette, téléphone)
  // sur le VLAN du lieu. À mettre à jour si l'IP de ce PC change.
  allowedDevOrigins: ["192.168.30.139"],
};

export default nextConfig;
