import type { NextConfig } from "next"

// Security headers for every response (the Next.js equivalent of Helmet).
// API routes add their own stricter Content-Security-Policy and no-store caching.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  // HTTPS only, once deployed. Not sent in development so http://localhost keeps working.
  ...(process.env.NODE_ENV === "production"
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]
    : []),
]

const nextConfig: NextConfig = {
  // Lets the API test server run beside `npm run dev` without sharing build files
  distDir: process.env.NEXT_DIST_DIR || ".next",
  poweredByHeader: false,
  experimental: {
    // forbidden() in admin pages: a real 403 page when a role lacks permission
    authInterrupts: true,
  },
  serverExternalPackages: ["pg", "@prisma/adapter-pg", "nodemailer"],
  images: {
    // AVIF first (smallest), WebP as the fallback
    formats: ["image/avif", "image/webp"],
    // Only bundled images and uploaded media may be optimised
    localPatterns: [
      { pathname: "/images/**", search: "" },
      { pathname: "/media/**", search: "" },
    ],
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ]
  },
}

export default nextConfig
