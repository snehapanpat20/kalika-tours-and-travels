/**
 * Builds the hero collages from the website's own photographs, in the Kalika
 * brand palette: a deep forest-green sky easing through teal to a warm glow,
 * photos blended side by side with a light brand colour grade.
 *
 *   node scripts/build-hero-collage.mjs            (every collage)
 *   node scripts/build-hero-collage.mjs services   (one collage)
 *
 * The homepage collage ends in ivory mist that settles into the page; the inner
 * page collages end in deep forest green, so their white headlines stay readable.
 * Output: public/images/hero/<file>.jpg (Next.js serves smaller sizes as needed).
 */
import sharp from "sharp"

/** Brand colours (see app/globals.css). */
const brand = { forestDeep: "#072a24", forest: "#0B3D35", tealDeep: "#0E7469", tealLight: "#8FD8CB", coral: "#F26B5B", ivory: "#F7F8F4" }

/**
 * Each collage: canvas size, the bottom ("ivory" mist or "forest" shade) and its
 * photos from left to right as [image under public/images, crop position].
 * The homepage keeps hand-placed panels; inner pages are spread evenly.
 */
const presets = {
  home: {
    file: "hero-india-brand",
    width: 2560,
    height: 1600,
    bottom: "ivory",
    panels: [
      ["destinations/kerala-boat", -60, 760, "centre", 0.5],
      ["destinations/maharashtra-waterfall", 520, 640, "centre", 0.54],
      ["destinations/north-india-rishikesh", 1000, 640, "centre", 0.57],
      ["destinations/madhya-pradesh-khajuraho", 1420, 600, "centre", 0.55],
      ["destinations/karnataka-mysore-palace", 1800, 560, "left", 0.55],
      ["destinations/rajasthan-hawa-mahal", 2120, 520, "centre", 0.5],
    ],
  },
  about: {
    file: "page-about",
    bottom: "forest",
    photos: [
      ["traveller/kalika-traveller", "centre"],
      ["traveller/interior-kalika", "centre"],
      ["hero/hero", "centre"],
      ["traveller/monsoon-front", "centre"],
      ["services/family", "left"],
    ],
  },
  services: {
    file: "page-services",
    bottom: "forest",
    photos: [
      ["services/family", "left"],
      ["services/group", "centre"],
      ["services/pilgrimage", "centre"],
      ["services/corporate", "centre"],
      ["services/outstation", "centre"],
    ],
  },
  destinations: {
    file: "page-destinations",
    bottom: "forest",
    photos: [
      ["destinations/place-mumbai", "centre"],
      ["destinations/lonavala-tiger-point", "centre"],
      ["destinations/goa-baga", "centre"],
      ["destinations/rajasthan-hawa-mahal", "centre"],
      ["destinations/place-varanasi", "centre"],
      ["destinations/kerala-boat", "centre"],
      ["destinations/place-jyotirlinga", "centre"],
    ],
  },
  gallery: {
    file: "page-gallery",
    bottom: "forest",
    photos: [
      ["gallery/road", "centre"],
      ["traveller/monsoon-side", "centre"],
      ["destinations/kerala-boat", "centre"],
      ["gallery/place", "left"],
      ["services/outstation", "centre"],
    ],
  },
  reviews: {
    file: "page-reviews",
    bottom: "forest",
    photos: [
      ["hero/hero", "centre"],
      ["destinations/place-vrindavan", "centre"],
      ["services/group", "centre"],
      ["destinations/goa-baga", "centre"],
      ["gallery/departure", "centre"],
    ],
  },
}

/** A smooth 0 → 1 ramp. */
const ease = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t))

/** Alpha mask: soft left/right edges and a long fade at the top, so each photo's own sky melts into ours. */
function panelMask(width, height, side = 0.28, top = 0.62) {
  const data = Buffer.alloc(width * height)
  for (let y = 0; y < height; y++) {
    const vy = ease(y / (height * top))
    for (let x = 0; x < width; x++) {
      const edge = Math.min(x, width - 1 - x) / (width * side)
      data[y * width + x] = Math.round(255 * vy * ease(edge))
    }
  }
  return sharp(data, { raw: { width, height, channels: 1 } }).png().toBuffer()
}

/** Sky: forest green at the top, teal through the middle, a warm glow on the horizon. */
function sky(W, H) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${brand.forestDeep}"/>
        <stop offset="0.3" stop-color="${brand.forest}"/>
        <stop offset="0.55" stop-color="${brand.tealDeep}"/>
        <stop offset="0.72" stop-color="#3f9d8f"/>
        <stop offset="1" stop-color="#e9c9b1"/>
      </linearGradient>
      <radialGradient id="glow" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stop-color="#f6a37a" stop-opacity="0.32"/>
        <stop offset="0.5" stop-color="${brand.coral}" stop-opacity="0.14"/>
        <stop offset="1" stop-color="${brand.coral}" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="mint" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stop-color="${brand.tealLight}" stop-opacity="0.35"/>
        <stop offset="1" stop-color="${brand.tealLight}" stop-opacity="0"/>
      </radialGradient>
      <filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="42"/></filter>
    </defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <ellipse cx="${W * 0.55}" cy="${H * 0.58}" rx="${W * 0.75}" ry="${H * 0.2}" fill="url(#glow)"/>
    <ellipse cx="${W * 0.18}" cy="${H * 0.3}" rx="${W * 0.27}" ry="${H * 0.16}" fill="url(#mint)"/>
    <ellipse cx="${W * 0.82}" cy="${H * 0.26}" rx="${W * 0.25}" ry="${H * 0.15}" fill="url(#mint)"/>
    <g filter="url(#soft)" fill="#ffffff">
      ${[
        [0.14, 0.24, 0.12, 0.022, 0.12], [0.3, 0.3, 0.1, 0.019, 0.1],
        [0.7, 0.2, 0.125, 0.024, 0.12], [0.86, 0.28, 0.094, 0.019, 0.1],
      ].map(([x, y, rx, ry, o]) => `<ellipse cx="${W * x}" cy="${H * y}" rx="${W * rx}" ry="${H * ry}" opacity="${o}"/>`).join("")}
    </g>
  </svg>`
  return sharp(Buffer.from(svg)).png().toBuffer()
}

/** Bottom of the collage: ivory mist (homepage) or deep forest shade behind the page headline. */
function bottomLayer(W, H, kind) {
  const svg =
    kind === "ivory"
      ? `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <defs>
      <linearGradient id="m" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0.8" stop-color="${brand.ivory}" stop-opacity="0"/>
        <stop offset="0.93" stop-color="${brand.ivory}" stop-opacity="0.8"/>
        <stop offset="1" stop-color="${brand.ivory}" stop-opacity="1"/>
      </linearGradient>
      <radialGradient id="puff" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stop-color="${brand.ivory}" stop-opacity="0.7"/>
        <stop offset="1" stop-color="${brand.ivory}" stop-opacity="0"/>
      </radialGradient>
    </defs>
    ${[0.06, 0.24, 0.42, 0.6, 0.78, 0.95].map((x, i) => `<ellipse cx="${W * x}" cy="${H * (0.93 + (i % 2) * 0.02)}" rx="${W * 0.164}" ry="${H * 0.069}" fill="url(#puff)"/>`).join("")}
    <rect width="100%" height="100%" fill="url(#m)"/>
  </svg>`
      : `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <defs>
      <linearGradient id="m" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0.7" stop-color="${brand.forestDeep}" stop-opacity="0"/>
        <stop offset="1" stop-color="${brand.forestDeep}" stop-opacity="0.45"/>
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#m)"/>
  </svg>`
  return sharp(Buffer.from(svg)).png().toBuffer()
}

/** Brand colour grade: teal in the shadows, a little warmth in the highlights, calmer blues. */
async function grade(buffer, width, height, vivid) {
  // Inner pages keep more of each photo's own colour; the homepage is graded a little deeper
  const tint = await sharp({ create: { width, height, channels: 4, background: { r: 14, g: 116, b: 105, alpha: vivid ? 0.14 : 0.32 } } }).png().toBuffer()
  const warm = await sharp({ create: { width, height, channels: 4, background: { r: 242, g: 140, b: 100, alpha: vivid ? 0.1 : 0.14 } } }).png().toBuffer()
  return sharp(buffer)
    .modulate({ saturation: vivid ? 1.18 : 0.95, brightness: vivid ? 1.06 : 1.02 })
    .composite([
      { input: tint, blend: "soft-light" },
      { input: warm, blend: "soft-light" },
    ])
    .toBuffer()
}

/** Inner pages: photos spread evenly across the width, overlapping so the soft edges blend. */
function spread(photos, W) {
  const step = W / photos.length
  const width = Math.round(step * 1.45)
  return photos.map(([image, position], index) => {
    const centre = step * (index + 0.5)
    // Alternate heights a little, like a skyline
    const top = index % 2 === 0 ? 0.2 : 0.26
    return [image, Math.round(centre - width / 2), width, position, top]
  })
}

async function build(name) {
  const preset = presets[name]
  const W = preset.width ?? 2560
  const H = preset.height ?? 1280
  const panels = preset.panels ?? spread(preset.photos, W)
  const layers = []
  for (const [image, x, width, position, topShare] of panels) {
    const top = Math.round(H * topShare)
    const height = H - top
    const resized = await sharp(`public/images/${image}.jpg`).resize(width, height, { fit: "cover", position }).toBuffer()
    const vivid = preset.bottom === "forest"
    const photo = await grade(resized, width, height, vivid)
    // Drop the grade's alpha first (sharp would otherwise remove the mask we add next)
    const opaque = await sharp(photo).removeAlpha().toBuffer()
    const masked = await sharp(opaque).joinChannel(await panelMask(width, height, vivid ? 0.24 : 0.28, vivid ? 0.4 : 0.62)).png().toBuffer()
    // Panels that run off either edge are cut to fit
    const left = Math.max(0, x)
    const cutLeft = Math.max(0, -x)
    const visible = Math.min(width - cutLeft, W - left)
    const input = cutLeft || visible < width ? await sharp(masked).extract({ left: cutLeft, top: 0, width: visible, height }).toBuffer() : masked
    layers.push({ input, left, top })
  }
  const out = `public/images/hero/${preset.file}.jpg`
  await sharp(await sky(W, H))
    .composite([...layers, { input: await bottomLayer(W, H, preset.bottom), left: 0, top: 0 }])
    .jpeg({ quality: 86, mozjpeg: true })
    .toFile(out)
  console.log(`Collage written: ${out}`)
}

const requested = process.argv[2]
if (requested && !presets[requested]) {
  console.error(`Unknown collage "${requested}". Choose one of: ${Object.keys(presets).join(", ")}`)
  process.exit(1)
}
for (const name of requested ? [requested] : Object.keys(presets)) await build(name)
