Kalika Yatra

Website and enquiry backend for Kalika Yatra (Next.js 16, PostgreSQL, Prisma).
Visitors send trip enquiries from the website; the business is emailed and manages them through the admin API.

- **Setting up, testing and deploying the backend:** [BACKEND_SETUP.md](BACKEND_SETUP.md)
- **API reference:** [API.md](API.md)

## Scripts

```bash
npm run dev            # website + API on http://localhost:3000
npm run lint
npm run typecheck
npm run build
npm run db:migrate     # apply database migrations (development)
npm run db:deploy      # apply database migrations (production)
npm run admin:create   # create the admin login or reset its password
npm run test:server    # start the API test server (separate *_test database)
npm run test:api       # run the API tests against it
```

## Environment

Copy `.env.example` to `.env.local` and fill it in. `DATABASE_URL` and `JWT_SECRET` are required.

## Layout

- `app/(site)/[locale]`: English (`/en`) and Marathi (`/mr`) customer-facing routes
- `app/(admin)/admin`: admin route boundary
- `app/api`: API endpoints (enquiries, admin, health)
- `components`: UI, layout, customer and admin pieces
- `lib`: config, i18n, validation (shared with the API), API client, SEO, errors
- `server`: backend logic: database client, auth, email, rate limits, logging
- `prisma`: database schema, migrations, development seed
- `data`: supplied business facts only
- `types`: domain contracts
- `tests/api`: automated API tests
- `public/images`: brand logo, and separate folders for hero, traveller, service, destination and gallery photographs

The official logo is kept exactly as supplied at `assets/brand/kalika-yatra-logo.webp`. `node scripts/build-brand-images.mjs`
cuts the files the website uses from it: `public/images/brand/kalika-yatra-logo.png` (full logo), `kalika-yatra-logo-compact.png`
(without the tagline, for the header) and `kalika-yatra-logo-mark.png` (emblem only), plus the site icons (`app/icon.png`, `app/apple-icon.png`)
and the default sharing image (`public/og/kalika-yatra.jpg`). To change the logo, replace the source file and run the
script again. The brand name and tagline are defined once, in `data/business.ts`. The logo is the brand mark, not a
content photograph.

## Pages

`/en` and `/mr` each have: home, `about`, `services`, `destinations`, `traveller`, `gallery`, `reviews`, `contact`
and `plan-your-trip`. Paths are built with `pagePath()` / `planPath()` in `lib/routes.ts`; page copy lives under
`pages` in the dictionaries. The Plan Your Trip page uses the same enquiry form and `POST /api/enquiries` as before.
Gallery photos and reviews come from the database and are managed in the admin panel.
A destination with a full English write-up (200+ characters) also gets its own page at `/[locale]/destinations/[slug]`.
Search-engine setup (titles, structured data, sitemap, robots, Search Console) is described in [docs/SEO.md](docs/SEO.md).

## Admin panel (Business Manager)

One admin panel at `/admin` with two roles. Every request is checked on the server (`lib/auth/permissions.ts`);
the menu only hides what the server would refuse anyway.

| Role | Can use |
|---|---|
| **Super Admin** | Everything: Dashboard, Enquiries, Gallery, Reviews, Website Content, Offers, Announcements, Destinations, Services, Our Traveller, **Admin Users, Settings, Activity Log** |
| **Content Admin** | Dashboard, Enquiries, Gallery, Reviews, Website Content, Offers, Announcements, Destinations, Services, Our Traveller |

- **Website Content** and **Our Traveller** edit fixed fields (text in English and Marathi, photos, button links) over the
  built-in copy: Save draft, Preview, Publish. Empty fields keep the built-in text, so the design can't be broken.
- **Offers** and **Announcements** are scheduled (start/end in India time) and switch on and off by themselves.
- **Destinations** and **Services** start empty; *Import current destinations/services* copies what the site shows today.
  Until something is published there, the website shows its built-in content.
- Important actions are recorded in the **Activity Log** (no passwords or secrets).
- **SEO** (Super Admin): page titles, meta descriptions and the sharing image. Destinations have their own optional
  web address, SEO title and meta description, which Content Admins may edit.

See *9c. Roles and the CMS* in [BACKEND_SETUP.md](BACKEND_SETUP.md) for creating accounts. Pages live in `app/(admin)/admin`,
components in `components/admin`, CMS logic in `server/cms` and `lib/cms`.

## Homepage

- Design tokens (colours, type scale, radii, shadows, motion easing) live in `app/globals.css`.
- Section components are in `components/home`. Which photograph and icon go with each item is set in `components/home/home-content.ts`. All wording is in `lib/i18n/messages/{en,mr}.ts`.
- To replace a photograph, overwrite the file with the same name in `public/images/<folder>/`. If a file is missing, a labelled placeholder frame is shown instead.
- Animations use `motion` (Framer Motion) and respect the visitor's reduced-motion setting.
