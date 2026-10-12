# Backend setup: Kalika Yatra

This guide takes you from a fresh copy of the project to a running, deployed backend.
Every command is run from the project folder in a terminal.

## How it fits together

```
Visitor → enquiry form (website) → POST /api/enquiries → validation → PostgreSQL
                                                              ↓
                              "Your journey enquiry has been received."  →  email to the business
```

- **One app.** The website and its API are the same Next.js project. The API lives in
  `app/api/`, so there is one thing to run and one thing to deploy. There is no separate
  Express server, and no cross-origin setup is needed for the website itself.
- **Database.** PostgreSQL, accessed through Prisma. The schema is in `prisma/schema.prisma`,
  and the change history is in `prisma/migrations/`.
- **An enquiry is not a booking.** The business contacts the customer and confirms availability
  first. A future `Booking` table can point at an `Enquiry` without changing it.

| Folder | What it holds |
|---|---|
| `app/api/` | The API endpoints (see `API.md`) |
| `server/` | Backend logic: database, auth, email, rate limits, logging |
| `lib/validation/enquiry.ts` | Enquiry rules shared by the form and the API |
| `lib/api/` | The website's API client (`submitEnquiry`) |
| `prisma/` | Database schema, migrations, development seed |
| `scripts/` | `create-admin` and the test-server launcher |
| `tests/api/` | Automated API tests |

---

## 1. Install

You need **Node.js 20.19 or newer** (check with `node -v`).

```bash
npm install
```

This also generates the Prisma database client automatically.

## 2. Create a PostgreSQL database

Choose **one**:

**A. Free cloud database (easiest, also what you'll use in production)**

1. Sign up at [neon.tech](https://neon.tech) (free tier).
2. Create a project and choose the region closest to India (for example Singapore).
3. Copy the **connection string**. It looks like
   `postgresql://user:password@ep-xxxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require`

Supabase, Railway and Render also offer free PostgreSQL; any connection string works.

**B. PostgreSQL on your own computer**

Install PostgreSQL from [postgresql.org](https://www.postgresql.org/download/), then, in **SQL Shell (psql)**:

```sql
CREATE USER kalika WITH PASSWORD 'choose-a-password';
CREATE DATABASE kalika_dev OWNER kalika;
```

Your connection string is then `postgresql://kalika:choose-a-password@localhost:5432/kalika_dev`.

## 3. Create `.env.local`

Copy the example file and fill it in:

```bash
cp .env.example .env.local
```

(On Windows PowerShell: `Copy-Item .env.example .env.local`)

Set at least:

| Variable | Value |
|---|---|
| `DATABASE_URL` | The connection string from step 2 |
| `JWT_SECRET` | Output of the command below |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` |
| `EMAIL_TRANSPORT` | `log` while developing (emails are printed in the terminal) |

Generate a secret with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

`.env.local` is ignored by git, so it is never committed. **Never put real passwords in `.env.example`.**

## 4. Create the database tables

```bash
npm run db:migrate
```

This applies everything in `prisma/migrations/`. You can browse the data any time with `npm run db:studio`.

Optional: add three clearly-marked sample enquiries for development (refuses to run in production):

```bash
npm run db:seed
```

## 5. Create the admin login

```bash
npm run admin:create
```

Enter the owner's email, name, and a password of **at least 12 characters**. You type the
password at a hidden prompt; only a scrypt hash is stored, never the password itself. Run
the same command again to reset a password, which also signs that admin out everywhere.

## 6. Start the development server

```bash
npm run dev
```

Open <http://localhost:3000>, fill in the **Plan your trip** form, and send it. You should see
*"Your journey enquiry has been received."* With `EMAIL_TRANSPORT=log`, the notification email
is printed in the terminal.

## 7. Test the API

Quick check by hand (see `API.md` for more):

```bash
curl http://localhost:3000/api/health
```

**Automated tests** (58 tests: validation, auth, admin, rate limits, security). They need a
**separate** database whose name ends in `_test`, because they empty its tables:

1. Create a database, for example `kalika_test` (same way as step 2).
2. `cp .env.test.example .env.test` and fill in its `DATABASE_URL` and `JWT_SECRET`.
3. In one terminal: `npm run test:server` (migrates the test database, then starts on port 3200).
4. In a second terminal: `npm run test:api`

## 8. The website is already connected

The **Plan your trip** form (`components/home/plan-form.tsx`) calls `submitEnquiry()` from
`lib/api/enquiries.ts`, which posts to `/api/enquiries`. It:

- checks the fields in the browser with the same rules as the server (`lib/validation/enquiry.ts`)
- disables the button and shows *Sending…* while waiting, so it can't be sent twice
- shows the server's field errors next to the right fields, in English or Marathi
- on success, clears the form, confirms receipt, and offers an optional pre-filled WhatsApp message

Nothing else on the site needed to change: WhatsApp, call and email buttons work as before.

## 9. Email notifications

Each new enquiry emails `NOTIFY_EMAIL` (default `kalikatourstravels15@gmail.com`) with every
detail, plus one-tap *Call* and *WhatsApp* buttons. Replying to the email replies to the
customer when they gave an email address.

The email goes out **after** the enquiry is saved and the visitor has their confirmation.
If sending fails, the enquiry is still saved: the admin API shows it with
`notificationStatus: "FAILED"`, and the server log records why.

Set `EMAIL_TRANSPORT=smtp` and **one** of these:

**Gmail (free)**: the business Gmail account sends to itself.

1. Turn on 2-Step Verification: Google Account → Security.
2. Create an **App password**: Google Account → Security → 2-Step Verification → App passwords.
3. Set:
   ```
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=kalikatourstravels15@gmail.com
   EMAIL_PASSWORD=the 16-character app password (no spaces)
   ```

**Brevo (free, 300 emails a day)**: better for deliverability if Gmail limits you.

1. Sign up at [brevo.com](https://www.brevo.com) and verify a sender address.
2. SMTP & API → SMTP: copy the login and generate an SMTP key.
3. Set `EMAIL_HOST=smtp-relay.brevo.com`, `EMAIL_PORT=587`, `EMAIL_USER` and `EMAIL_PASSWORD` to those values, and `EMAIL_FROM` to the verified sender.

## 9b. Gallery photos and customer reviews

The admin panel has **Gallery** and **Reviews** under *Content* (`/admin/gallery`, `/admin/reviews`).

- **Reviews** are sent from the website's Reviews page (`POST /api/reviews`). Every review is
  saved as *Pending* and appears on the website only after you approve it. You can reject,
  move back to pending, correct the name/destination/trip type, remove a photo, or delete.
  The customer's own words cannot be edited. No reviews are seeded or invented: the site shows
  "Your journey could be our next story." until you approve real ones, and an average rating
  appears only once there are at least 5 approved reviews.
- **Gallery** photos are either uploaded, or chosen from images already in `public/images`.
  Only *Published* photos appear on `/gallery`; *Featured* ones also appear on the homepage.

### Where uploaded photos are stored

Uploads go through a small storage layer (`server/storage`). Today it has one driver, **local
disk**: files are resized, re-saved as WebP (removing phone location data) and written to
`UPLOAD_DIR` (default `storage/uploads`, outside `public/`), then served at `/media/...`.

| Where you run the site | Uploads |
|---|---|
| Your computer (`npm run dev`) | On by default |
| A VPS, or Render/Railway **with a persistent disk** | Set `STORAGE_DRIVER=local` and point `UPLOAD_DIR` at the disk. Back the folder up with the database |
| Vercel / Netlify | **Not possible with local disk**: files vanish between requests, so uploads are refused. Gallery photos can still use images committed to `public/images`, and the review form hides its photo field |

In production uploads are **off** unless `STORAGE_DRIVER=local` is set. **Settings** in the
admin panel shows the current state. A free cloud provider (for example Cloudinary or Supabase
Storage) can be added later as a second driver behind the same interface; that is not built yet.

## 9c. Roles and the CMS

There are two roles:

- **Super Admin**: everything, including **Admin Users**, **Settings** and the **Activity Log**.
- **Content Admin**: enquiries, gallery, reviews and all website content (hero, offers, announcements, destinations,
  services, Our Traveller). No admin users, settings or system controls.

Admins that existed before roles were added became **Super Admin**.

**Create the business owner's account (Content Admin):** sign in as Super Admin, open **Admin Users**, choose **Add admin**,
pick *Content Admin*, and pass the generated temporary password on in person or by phone. At first sign-in they must
choose their own password. Or from the project folder:

```bash
npm run admin:create -- --email owner@example.com --name "Umesh Panpat" --role CONTENT_ADMIN
```

**Your own Super Admin login** stays as it was. To create another Super Admin from the command line use
`--role SUPER_ADMIN`; running the command again for an existing email resets that password (and re-enables the account).

**How content reaches the website:** published text is applied over the built-in copy for each field; offers,
announcements, destinations, services and gallery photos are read from the database. Pages refresh straight after a
change, and at least every 5 minutes, so scheduled offers and announcements start and end on time. **Preview** shows
drafts only to a signed-in admin (Next.js Draft Mode plus the admin session). If the database is unreachable, the
website shows its built-in content rather than an error.

**Not editable by design:** layout, styles, routes, contact numbers and email (used in WhatsApp links, structured data
and notifications, so they stay in `data/business.ts`), and the enquiry form's five trip types.

## 10. Build for production

```bash
npm run build
npm run start
```

`npm run lint` and `npm run typecheck` should both pass before deploying.

## 11. Deploy

**Recommended (free tier): Vercel for the app + Neon for the database.**

1. Push the project to GitHub. Check that `.env.local` and `.env.test` are **not** in the commit
   (`git status` must not list them).
2. On [vercel.com](https://vercel.com), choose **Add New → Project** and import the repository.
   The framework is detected as Next.js.
3. Before the first deploy, add the environment variables from step 12.
4. Deploy.
5. Apply the database migrations to the production database **once**, and again after any future
   schema change. From your computer, with `DATABASE_URL` set to the production string:
   ```bash
   npx prisma migrate deploy
   ```
   To have Vercel do this on every deploy instead, set the build command to
   `prisma migrate deploy && next build`.
6. Create the admin login on production: run `npm run admin:create` with `DATABASE_URL`
   pointing at the production database.
7. Open `https://your-domain/api/health`. It should report `"database": "up"`.

**Render or Railway** work the same way: build command `npm install && npx prisma migrate deploy && npm run build`,
start command `npm run start`, plus the same environment variables.

## 12. Production environment variables

| Variable | Production value |
|---|---|
| `DATABASE_URL` | Production connection string (Neon etc.), with `?sslmode=require` |
| `JWT_SECRET` | A **new** random 48-byte secret, not the development one |
| `NEXT_PUBLIC_SITE_URL` | `https://your-domain.com` (no trailing slash) |
| `ALLOWED_ORIGINS` | Leave empty unless another site must call the API. Never `*` |
| `TRUSTED_PROXY_COUNT` | `1` on Vercel, Render or Railway |
| `NOTIFY_EMAIL` | `kalikatourstravels15@gmail.com` |
| `EMAIL_TRANSPORT` | `smtp` |
| `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASSWORD`, `EMAIL_FROM` | From step 9 |
| `STORAGE_DRIVER`, `UPLOAD_DIR` | Only on a host with a persistent disk: `local` and the disk path. Otherwise leave empty (uploads off). See step 9b |

The host sets `NODE_ENV=production` itself. In production the admin cookie becomes
`Secure` with the `__Host-` prefix, and HTTPS is enforced with HSTS.

---

## Security in place

| Area | How |
|---|---|
| Secrets | Only in environment variables. `.env*` is git-ignored except the examples |
| Passwords | scrypt hash (memory-hard, OWASP-recommended); raw passwords never stored or logged |
| Admin sessions | Signed token, 2 hours, HttpOnly + SameSite=Strict cookie (Secure + `__Host-` in production); revocable |
| Admin access | Every admin endpoint checks the session; changes also require a trusted `Origin` |
| Validation | Same zod rules in the browser and on the server; database CHECK constraints as a last line |
| SQL injection | Prisma parameterises every query; the one raw query uses tagged parameters |
| XSS | Input is stored as plain text and escaped on output (React, and the email template) |
| Spam | Rate limits per IP, per phone and site-wide (stored in Postgres, so they hold on every server), hidden honeypot field, duplicate detection, link blocking |
| Request size | JSON bodies capped (8 KB for enquiries) while streaming, even without `Content-Length` |
| CORS | Only the site and listed origins; never `*` |
| Headers | `nosniff`, frame protection, `Referrer-Policy`, `Permissions-Policy`, COOP, HSTS in production; API responses also `no-store` and a locked-down CSP |
| Errors | One response shape; details (stacks, SQL) only in server logs |
| Logging | One JSON line per request: method, path, status, time. No bodies, query strings, passwords, tokens or customer details |

**Adding CAPTCHA later:** if spam gets past the honeypot and rate limits, add a widget such as
Cloudflare Turnstile to the form and verify its token at the top of `POST` in
`app/api/enquiries/route.ts`, before the enquiry is parsed. Nothing else needs to change.

## Troubleshooting

| Problem | Fix |
|---|---|
| `The server is not configured correctly` | The terminal names the missing or invalid variable. Check `.env.local` |
| `Can't reach database server` | Check `DATABASE_URL`, and that PostgreSQL is running (or the Neon project is awake) |
| `notificationStatus: "FAILED"` | Check `EMAIL_*`. For Gmail, use an **app password**, not the normal password |
| `notificationStatus: "SKIPPED"` | Email isn't configured (`EMAIL_HOST`/`USER`/`PASSWORD` empty) or `EMAIL_TRANSPORT=none` |
| Admin login returns 403 | The request didn't come from the site. Use the site's address, or add the origin to `ALLOWED_ORIGINS` |
| Admin login returns 429 | Too many wrong passwords. Wait 15 minutes |
| Changed `schema.prisma` | Run `npm run db:migrate -- --name describe-the-change`, then commit the new migration folder |
