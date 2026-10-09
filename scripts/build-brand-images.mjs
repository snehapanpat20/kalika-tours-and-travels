/**
 * Builds the sharing image and site icons from the real Kalika logo and the
 * homepage collage. Text on the sharing image uses only verified business facts.
 *
 *   node scripts/build-brand-images.mjs
 *
 * Output:
 *   public/og/kalika-tours-and-travels.jpg  1200×630 default sharing image (Open Graph / X)
 *   app/icon.png                            512×512 site icon (favicon)
 *   app/apple-icon.png                      180×180 home-screen icon
 */
import { mkdirSync } from "node:fs"
import sharp from "sharp"

const logo = "public/images/brand/logo.png"
const collage = "public/images/hero/hero-india-brand.jpg"
const brand = { forestDeep: "#072a24", tealLight: "#8FD8CB", coral: "#F26B5B", ivory: "#F7F8F4" }

/** The logo on a white rounded plate, as it appears in the site header. */
async function logoPlate(size, padding) {
  const inner = await sharp(logo).resize(size - padding * 2, size - padding * 2, { fit: "contain", background: "#ffffff" }).toBuffer()
  const radius = Math.round(size * 0.18)
  const mask = Buffer.from(`<svg width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${radius}" fill="#fff"/></svg>`)
  return sharp({ create: { width: size, height: size, channels: 4, background: "#ffffff" } })
    .composite([{ input: inner, left: padding, top: padding }, { input: mask, blend: "dest-in" }])
    .png()
    .toBuffer()
}

async function sharingImage() {
  const W = 1200
  const H = 630
  const background = await sharp(collage).resize(W, H, { fit: "cover", position: "bottom" }).toBuffer()
  const shade = Buffer.from(`<svg width="${W}" height="${H}">
    <defs>
      <linearGradient id="l" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="${brand.forestDeep}" stop-opacity="0.92"/>
        <stop offset="0.6" stop-color="${brand.forestDeep}" stop-opacity="0.55"/>
        <stop offset="1" stop-color="${brand.forestDeep}" stop-opacity="0.1"/>
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#l)"/>
  </svg>`)
  const text = Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <style>
      .name { font: 800 64px 'Segoe UI', Arial, sans-serif; fill: #ffffff; }
      .line { font: 600 34px 'Segoe UI', Arial, sans-serif; fill: ${brand.tealLight}; }
      .place { font: 600 26px 'Segoe UI', Arial, sans-serif; fill: ${brand.ivory}; opacity: 0.9; }
    </style>
    <text x="72" y="330" class="name">Kalika Tours and Travels</text>
    <text x="72" y="390" class="line">Tours &amp; 20+1 seater Traveller for groups</text>
    <rect x="72" y="438" width="8" height="40" rx="4" fill="${brand.coral}"/>
    <text x="96" y="468" class="place">Hadapsar, Pune, Maharashtra</text>
  </svg>`)
  mkdirSync("public/og", { recursive: true })
  await sharp(background)
    .composite([
      { input: shade },
      { input: await logoPlate(170, 14), left: 72, top: 92 },
      { input: text },
    ])
    .jpeg({ quality: 88, mozjpeg: true })
    .toFile("public/og/kalika-tours-and-travels.jpg")
  console.log("Sharing image: public/og/kalika-tours-and-travels.jpg")
}

async function icons() {
  await sharp(await logoPlate(512, 36)).toFile("app/icon.png")
  // Home-screen icons are masked by the device, so use a full white square
  const apple = await sharp(logo).resize(160, 160, { fit: "contain", background: "#ffffff" }).toBuffer()
  await sharp({ create: { width: 180, height: 180, channels: 3, background: "#ffffff" } })
    .composite([{ input: apple, left: 10, top: 10 }])
    .png()
    .toFile("app/apple-icon.png")
  console.log("Icons: app/icon.png, app/apple-icon.png")
}

await sharingImage()
await icons()
