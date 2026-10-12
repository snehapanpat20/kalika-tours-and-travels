/**
 * Builds every brand image from the official Kalika Yatra logo and the
 * homepage collage. Text on the sharing image uses only verified business facts.
 *
 *   node scripts/build-brand-images.mjs
 *
 * Source:
 *   assets/brand/kalika-yatra-logo.webp     the logo exactly as supplied (square, white background)
 *
 * Output:
 *   public/images/brand/kalika-yatra-logo.png           full logo: emblem, name and tagline (footer, sign-in, structured data)
 *   public/images/brand/kalika-yatra-logo-compact.png   emblem and name, without the tagline (header, admin sidebar)
 *   public/images/brand/kalika-yatra-logo-mark.png      emblem only (icons and other very small spaces)
 *   public/og/kalika-yatra.jpg                          1200×630 default sharing image (Open Graph / X)
 *   app/icon.png                                        512×512 site icon (favicon)
 *   app/apple-icon.png                                  180×180 home-screen icon
 *
 * The logo is only cropped between its own rows (emblem / name / tagline) and
 * scaled in proportion: it is never redrawn, stretched or recoloured.
 */
import { mkdirSync } from "node:fs"
import sharp from "sharp"

const source = "assets/brand/kalika-yatra-logo.webp"
const collage = "public/images/hero/hero-india-brand.jpg"
const brandDir = "public/images/brand"
const shareImage = "public/og/kalika-yatra.jpg"
const files = { full: "kalika-yatra-logo.png", compact: "kalika-yatra-logo-compact.png", mark: "kalika-yatra-logo-mark.png" }
const brand = { forestDeep: "#072a24", tealLight: "#8FD8CB", coral: "#F26B5B", ivory: "#F7F8F4" }

/** Rows of the 1254×1254 source, measured from the artwork (left, top, right, bottom of the ink). */
const SOURCE_SIZE = 1254
const emblem = { left: 152, top: 224, right: 1120, bottom: 740 }
const name = { left: 46, top: 789, right: 1217, bottom: 908 }
const tagline = { left: 61, top: 949, right: 1193, bottom: 1003 }
const MARGIN = 20

function box(...rows) {
  const left = Math.min(...rows.map((row) => row.left)) - MARGIN
  const top = Math.min(...rows.map((row) => row.top)) - MARGIN
  const right = Math.max(...rows.map((row) => row.right)) + MARGIN
  const bottom = Math.max(...rows.map((row) => row.bottom)) + MARGIN
  return { left, top, width: right - left + 1, height: bottom - top + 1 }
}

/** A crop of the source. The supplied file's background is 254/255 white, so it is lifted to pure white to sit flush on white plates. */
function crop(region) {
  return sharp(source).removeAlpha().extract(region).linear(1.02, 0)
}

async function logos() {
  const { width, height } = await sharp(source).metadata()
  if (width !== SOURCE_SIZE || height !== SOURCE_SIZE) {
    throw new Error(`${source} is ${width}×${height}; the crop rows in this script were measured on a ${SOURCE_SIZE}×${SOURCE_SIZE} file and must be re-measured.`)
  }
  mkdirSync(brandDir, { recursive: true })
  const variants = { [files.full]: box(emblem, name, tagline), [files.compact]: box(emblem, name), [files.mark]: box(emblem) }
  for (const [file, region] of Object.entries(variants)) {
    await crop(region).png({ compressionLevel: 9, palette: true, colours: 256 }).toFile(`${brandDir}/${file}`)
    console.log(`Logo: ${brandDir}/${file} (${region.width}×${region.height})`)
  }
}

/** A logo variant fitted, in proportion, inside a white rounded plate. */
async function plate(file, width, height, padding) {
  const inner = await sharp(`${brandDir}/${file}`)
    .resize(width - padding * 2, height - padding * 2, { fit: "contain", background: "#ffffff" })
    .toBuffer()
  const radius = Math.round(Math.min(width, height) * 0.18)
  const mask = Buffer.from(`<svg width="${width}" height="${height}"><rect width="${width}" height="${height}" rx="${radius}" fill="#fff"/></svg>`)
  return sharp({ create: { width, height, channels: 4, background: "#ffffff" } })
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
      .line { font: 600 34px 'Segoe UI', Arial, sans-serif; fill: ${brand.tealLight}; }
      .place { font: 600 26px 'Segoe UI', Arial, sans-serif; fill: ${brand.ivory}; opacity: 0.9; }
    </style>
    <text x="72" y="448" class="line">Tours &amp; 20+1 seater Traveller for groups</text>
    <rect x="72" y="496" width="8" height="40" rx="4" fill="${brand.coral}"/>
    <text x="96" y="526" class="place">Hadapsar, Pune, Maharashtra</text>
  </svg>`)
  mkdirSync("public/og", { recursive: true })
  // The name and tagline come from the logo itself, so the image carries no retyped brand text
  await sharp(background)
    .composite([{ input: shade }, { input: await plate(files.full, 420, 300, 18), left: 72, top: 84 }, { input: text }])
    .jpeg({ quality: 88, mozjpeg: true })
    .toFile(shareImage)
  console.log(`Sharing image: ${shareImage}`)
}

async function icons() {
  // The emblem alone: the name is unreadable at favicon sizes
  await sharp(await plate(files.mark, 512, 512, 40)).toFile("app/icon.png")
  // Home-screen icons are masked by the device, so use a full white square
  const apple = await sharp(`${brandDir}/${files.mark}`).resize(156, 156, { fit: "contain", background: "#ffffff" }).toBuffer()
  await sharp({ create: { width: 180, height: 180, channels: 3, background: "#ffffff" } })
    .composite([{ input: apple, left: 12, top: 12 }])
    .png()
    .toFile("app/apple-icon.png")
  console.log("Icons: app/icon.png, app/apple-icon.png")
}

await logos()
await sharingImage()
await icons()
