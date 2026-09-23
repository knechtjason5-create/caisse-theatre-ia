import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// Seules origines externes autorisées : l'API et le temps réel (websocket) Supabase.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseWs = supabaseUrl.replace(/^http/, "ws");

// CSP sans nonce (voir node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md) :
// garde les pages statiques. 'unsafe-eval' n'est nécessaire qu'en dev (React), et
// upgrade-insecure-requests casserait l'accès en http depuis le VLAN du bar en dev.
const csp = `
  default-src 'self';
  script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""};
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data:;
  font-src 'self';
  connect-src 'self' ${supabaseUrl} ${supabaseWs};
  manifest-src 'self';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  ${isDev ? "" : "upgrade-insecure-requests;"}
`
  .replace(/\s{2,}/g, " ")
  .trim();

const nextConfig: NextConfig = {
  // Autorise l'accès en dev depuis les appareils du bar (tablette, téléphone)
  // sur le VLAN du lieu. À mettre à jour si l'IP de ce PC change.
  allowedDevOrigins: ["192.168.30.139"],

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
