# SEO guide: Kalika Yatra

How the website is set up for search engines, what the owner can edit, and the manual steps that only the
business can do. Nothing here guarantees rankings. Google decides that from the quality of the content,
the business's reputation and its Google Business Profile.

## 1. Before going live

1. The canonical address is `https://www.kalikayatra.com` (`productionSiteUrl` in `lib/config/site.ts`). Canonical URLs,
   the sitemap, robots.txt, Open Graph images and structured data all come from it. A production build uses
   `NEXT_PUBLIC_SITE_URL` only when it is a real domain; when it is missing, `localhost` or a Vercel deployment
   address (`*.vercel.app`), it uses `https://www.kalikayatra.com` and prints a `[seo]` warning at start-up.
2. Make that host name the primary domain and redirect the other one to it (in Vercel: Settings › Domains, with
   `kalikayatra.com` redirecting to `www.kalikayatra.com`). Submit `https://www.kalikayatra.com/sitemap.xml` to
   Search Console, in a property that covers `https://www.kalikayatra.com` (a Domain property covers both).
3. Serve the site over HTTPS only.
4. Run `npx prisma migrate deploy` so destinations get their web-address (`slug`) and SEO columns.

## 2. Pages and keyword intent

Each page targets one main intent, so pages don't compete with each other. Titles and descriptions are in
`lib/i18n/messages/{en,mr}.ts` → `pages.meta`, and can be changed in **Admin → SEO** (Super Admin).

| Page | Main intent (search phrases it should answer) | Title |
|---|---|---|
| `/en` | Brand + "tours and travels in Pune", "Traveller on rent Pune" | Kalika Yatra \| Tours & Traveller Rental in Pune |
| `/en/about` | "Kalika Yatra Hadapsar", who runs it | About Kalika Yatra \| Hadapsar, Pune |
| `/en/services` | "family / group / pilgrimage / corporate / outstation trips from Pune" | Tour & Travel Services in Pune \| Kalika Yatra |
| `/en/destinations` | "trips from Pune", "places to visit from Pune" | Travel Destinations from Pune \| Kalika Yatra |
| `/en/destinations/[slug]` | "[place] trip from Pune" (only places with a full write-up) | [Place] Trip from Pune \| Kalika Yatra (or the admin's SEO title) |
| `/en/traveller` | "20+1 seater Traveller rental Pune", "Tempo Traveller hire Pune" | 20+1 Seater Traveller Rental in Pune \| Kalika Yatra |
| `/en/gallery` | Trip photos | Travel Photos \| Kalika Yatra, Pune |
| `/en/reviews` | "Kalika Yatra reviews" | Customer Reviews \| Kalika Yatra, Pune |
| `/en/contact` | Phone, email, location | Contact Kalika Yatra \| Hadapsar, Pune |
| `/en/plan-your-trip` | "book a trip from Pune", enquiry | Plan a Trip from Pune \| Kalika Yatra |

The Marathi pages (`/mr/...`) have their own Marathi titles and descriptions and are linked to the English ones
with `hreflang` (`en-IN`, `mr-IN`, `x-default` → English).

Writing rules: titles of 50–60 characters (at most 70), descriptions of 120–160 characters (at most 170). Describe
the page honestly. Don't repeat keywords, and don't claim ratings, awards, years in business or fleet size that
aren't true.

## 3. What is built in

- **Metadata** (`lib/seo/metadata.ts`): a unique title, description and canonical URL per page, language
  alternates, Open Graph and X (Twitter) cards, and the sharing image `public/og/kalika-yatra.jpg`
  (1200×630; rebuild it with `node scripts/build-brand-images.mjs`).
- **Structured data** (`lib/seo/structured-data.ts`, JSON-LD on every page):
  - `TravelAgency`, a kind of LocalBusiness, with name, logo, email, both phone numbers, Hadapsar/Pune address,
    area served, Instagram and services;
  - `WebSite`;
  - per page, `WebPage` / `AboutPage` / `ContactPage` / `CollectionPage`, plus `BreadcrumbList`;
  - `Service` on the Services and Traveller pages, and `TouristDestination` on destination pages.
  - **Deliberately left out:** ratings, review counts, `Review` markup, opening hours, price range and map
    coordinates (the business hasn't confirmed them, and self-written review stars break Google's rules), and
    `FAQPage` (Google shows FAQ results only for government and health sites now). The FAQs are still visible on
    the page.
- **Breadcrumbs**: visible on every inner page (`components/seo/breadcrumbs.tsx`), matching the `BreadcrumbList`.
- **Homepage H1**: "Kalika Yatra" (the brand name, set large). The line "Every road has a story. Let us be part of yours." follows as a paragraph.
- **FAQs**: on the Traveller and Services pages (`components/seo/faq-section.tsx`). Answers use only confirmed facts:
  seats, AC, driver, the trip rules in `rules`, and the services.
- **Internal links**: every page leads to Plan Your Trip, including Gallery and Reviews; destination cards link to
  their own page when they have one; the 404 page links to Services, Destinations, Our Traveller and Plan Your Trip.
- **robots.txt** (`app/robots.ts`): allows the site and blocks `/admin`, `/api/`, `/[locale]/account` and
  `/[locale]/design-system`. These private pages also send `noindex`.
- **sitemap.xml** (`app/sitemap.ts`): the 9 pages in both languages, plus every **published** destination that has
  its own page. Drafts are never listed. It refreshes when content changes in the admin panel, and at least hourly.
- **Icons**: `app/icon.png` and `app/apple-icon.png`, made from the logo.

## 4. Destination pages (and why most destinations don't have one yet)

A destination gets `/destinations/[slug]` only when it is **published** and its English **More details** has at
least **200 characters**. This avoids thin, near-identical "doorway" pages, which Google treats as spam. Until then,
the destination stays a card that links to Plan Your Trip.

To create a page, go to **Admin → Destinations → Edit**:

- write a genuine paragraph or two in **More details**: what the place is, when to go, how long the trip takes from
  Pune, and who it suits;
- optionally set the **Search engines** fields: the web address (made from the name when empty), SEO title and
  meta description (the defaults are shown as placeholders).

The web address must be unique; the editor says so if it's already taken. Changing it later breaks links people
have already shared, so set it once.

## 5. Google Search Console (free)

1. Go to <https://search.google.com/search-console> and add a **Domain** property for the domain.
2. Verify it with the DNS TXT record Google gives you (at the domain registrar).
3. Under **Sitemaps**, submit `https://YOUR-DOMAIN/sitemap.xml`.
4. Use **URL inspection** on the homepage and on `/en/traveller`, then **Request indexing**.
5. Over the next weeks, check **Pages** (indexing problems), **Core Web Vitals** and **Enhancements → Breadcrumbs**.
6. Optionally, add the site to **Bing Webmaster Tools** too (it can import from Search Console).

Indexing takes days to weeks. Whether a page is indexed can only be confirmed in Search Console.

## 6. Google Business Profile checklist (most important for local searches)

- [ ] Create or claim the profile at <https://business.google.com> as **Kalika Yatra**, exactly as on
      the website.
- [ ] Category: *Travel agency* (optionally add *Tour operator*, or *Bus charter* / *Van rental service* if those
      match what you offer).
- [ ] Address in Hadapsar, Pune. If customers don't come to an office, use a **service area** (Pune, Maharashtra)
      and hide the address.
- [ ] Phone 8329042510 as the main number (the same as the website); website = the live domain.
- [ ] Opening hours: only the real ones. When they are confirmed, they can also be added to the website's
      structured data.
- [ ] Add real photos: the Traveller outside and inside, and trips you have done.
- [ ] Describe the services (outstation, family, group, pilgrimage, corporate) and the 20+1 seater Traveller.
- [ ] Ask happy customers for Google reviews and reply to them. Never buy or write reviews.
- [ ] Keep the name, address and phone **identical** on the website, the profile, Instagram and any directories.
- [ ] Post updates or offers on the profile now and then.

## 7. Ongoing

- Add genuine photos to the gallery, with a short description of each photo in the admin panel.
- Write full descriptions for your main destinations so they get their own pages (section 4).
- Keep titles and descriptions honest in **Admin → SEO** when your services change.
- Each month, look at Search Console's **Performance** report to see which searches find the site.
