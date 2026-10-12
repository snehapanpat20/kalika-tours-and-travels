# Kalika Yatra: API

All endpoints live under the same domain as the website, at `/api`.
Requests and responses are JSON (`Content-Type: application/json`).

## Response format

Every response has the same shape.

**Success**

```json
{ "success": true, "message": "Optional human message.", "...": "endpoint data" }
```

**Failure**

```json
{
  "success": false,
  "code": "VALIDATION",
  "message": "Please check the highlighted fields.",
  "errors": [{ "field": "phone", "message": "Enter a valid 10-digit Indian mobile number." }]
}
```

`errors` lists problems with individual fields and is empty otherwise.
Responses never contain stack traces, SQL or internal paths. Every response has an
`X-Request-Id` header; the same id appears in the server log for that request.

| HTTP | `code` | Meaning |
|---|---|---|
| 400 | `BAD_REQUEST` | Body is empty, not valid JSON, or not a JSON object |
| 401 | `UNAUTHENTICATED` | Not signed in, wrong password, invalid or expired session |
| 403 | `FORBIDDEN` | Request came from a website origin that is not allowed |
| 404 | `NOT_FOUND` | Enquiry does not exist (or was deleted) |
| 405 | – | Method not supported on that path |
| 413 | `PAYLOAD_TOO_LARGE` | Body larger than allowed (8 KB for enquiries) |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | Body is not `application/json` |
| 422 | `VALIDATION` | One or more fields are invalid; see `errors` |
| 429 | `RATE_LIMITED` | Too many requests; wait `Retry-After` seconds |
| 500 | `INTERNAL` / `CONFIG` | Unexpected error; details are only in the server log |

---

## Public

### `POST /api/enquiries`

Submit a travel enquiry. **No authentication.** An enquiry is a request, not a booking.

**Request**

```json
{
  "fullName": "Example User",
  "phone": "9876543210",
  "email": "example@email.com",
  "travelType": "FAMILY",
  "destination": "Goa",
  "travelDate": "2026-11-15",
  "returnDate": "2026-11-20",
  "passengerCount": 8,
  "message": "Need a comfortable Traveller for family trip.",
  "locale": "en"
}
```

| Field | Required | Rules |
|---|---|---|
| `fullName` | yes | 2–80 characters, letters (English or Marathi), spaces, `.` `'` `-` |
| `phone` | yes | Indian mobile. Accepts `9876543210`, `+91 98765 43210`, `098765-43210`. Stored as `+919876543210` |
| `email` | no | Valid email, stored lower-case. Empty or omitted is fine |
| `travelType` | yes | `OUTSTATION`, `FAMILY`, `GROUP`, `PILGRIMAGE`, `CORPORATE` |
| `destination` | yes | 2–120 characters |
| `travelDate` | yes | `YYYY-MM-DD`, a real date, today or later (India time), within 2 years |
| `returnDate` | yes | `YYYY-MM-DD`, on or after `travelDate` (round trips only) |
| `passengerCount` | yes | Whole number 1–20 (the Traveller's 20 passenger seats) |
| `message` | no | Up to 1000 characters, no links. Control characters are removed |
| `locale` | no | `en` (default) or `mr` |

Other fields (for example `status` or `source`) are ignored: a visitor cannot set them.

**Response `201 Created`**

```json
{
  "success": true,
  "message": "Your enquiry has been submitted successfully.",
  "enquiryId": "8d0e9783-516e-4b18-a63d-5ed9c6582194"
}
```

If the same phone number sends the same destination and dates again within 10 minutes
(a double click or refresh), the earlier enquiry's id is returned with `200 OK` and nothing new is stored.

After responding, the server emails the business (see *Email notifications* in
`BACKEND_SETUP.md`). Email problems never cause the enquiry to fail.

**Errors:** `400`, `413`, `415`, `422` (field errors), `429`.

**Rate limits:** 5 per 10 minutes and 20 per day per visitor IP; 5 per day per phone
number; 100 per hour across the whole site.

### `POST /api/reviews`

A customer review from the website. **No authentication.** Send `multipart/form-data`
(JSON is refused with `415`):

| Field | Rules |
|---|---|
| `customerName` | Required, 2–60 characters, letters only |
| `destination` | Required, 2–120 characters |
| `rating` | Required, whole number 1–5 |
| `reviewText` | Required, 10–1500 characters, no links |
| `tripType` | Optional: `OUTSTATION`, `FAMILY`, `GROUP`, `PILGRIMAGE`, `CORPORATE` |
| `locale` | `en` or `mr` |
| `photo` | Optional JPEG/PNG/WebP/AVIF, max 5 MB. Re-saved as WebP, location data removed. Only when uploads are enabled |
| `website` | Honeypot: must be empty |

The review is **always stored as `PENDING`**; any `status` sent is ignored.
`201` → `{ "success": true, "status": "PENDING", "message": "Thank you for sharing your experience. Your review has been received and will be reviewed before being published." }`

**Errors:** `411`, `413`, `415`, `422` (field errors), `429`, `503` (photo sent while uploads are off).
**Rate limits:** 3 per hour and 6 per day per visitor IP; 30 per hour across the site.

### `GET /media/:folder/:file`

Serves uploaded photos (`gallery/…webp`, `reviews/…webp`) with a long cache. Anything else is `404`.

### `GET /api/health`

For uptime monitors. **No authentication.**

`200` → `{ "success": true, "status": "ok", "database": "up" }`
`503` → database unreachable.

---

## Admin

Admin endpoints need a signed-in admin. Sign in with `POST /api/admin/auth/login`;
the server replies with an **HttpOnly** session cookie that the browser sends
automatically. Sessions last **2 hours**.

For scripts or tools, the same token may be sent as `Authorization: Bearer <token>`
(it is the value of the session cookie).

Requests that change data with the cookie (`POST`, `PUT`, `PATCH`, `DELETE`) must come from
the site itself: the `Origin` header must be the site's address or one listed in
`ALLOWED_ORIGINS`. Otherwise the response is `403`.

**Roles.** Each endpoint needs a permission (see `lib/auth/permissions.ts`). Signed out gives `401`; signed in without
the permission gives `403`. *Content Admin* has every permission except `users.*`, `settings.*` and `audit.read`.
An admin who must change their password gets `403` everywhere except their own account endpoints.

### `POST /api/admin/auth/login`

```json
{ "email": "owner@example.com", "password": "••••••••••••" }
```

`200` → sets the `kalika_admin` cookie (`__Host-kalika_admin` in production):

```json
{
  "success": true,
  "message": "Signed in.",
  "admin": { "id": "…", "email": "owner@example.com", "name": "Umesh Panpat" },
  "expiresAt": "2026-10-01T12:00:00.000Z"
}
```

The token is never included in the body. **Errors:** `401` *Incorrect email or password.*
(same message whether the email exists or not), `403` (wrong origin), `422`, `429` after
5 failed attempts per account or 10 per IP in 15 minutes. While locked, even the correct password is refused.

### `POST /api/admin/auth/logout`

Clears the cookie. `200` → `{ "success": true, "message": "Signed out." }`

### `GET /api/admin/auth/me`

`200` → `{ "success": true, "admin": { "id", "email", "name" } }` · `401` if not signed in.

### `GET /api/admin/dashboard`

Also includes `pendingReviews` and `publishedPhotos`.


```json
{
  "success": true,
  "totalEnquiries": 120,
  "newEnquiries": 18,
  "contactedEnquiries": 34,
  "confirmedEnquiries": 12,
  "completedEnquiries": 50,
  "cancelledEnquiries": 6,
  "recentEnquiries": [ { "...": "five most recent, same shape as below" } ]
}
```

Deleted enquiries are not counted.

### `GET /api/admin/enquiries`

List enquiries, newest first by default.

| Query | Default | Description |
|---|---|---|
| `page` | `1` | Page number |
| `pageSize` | `20` | 1–100 |
| `status` | – | `NEW`, `CONTACTED`, `CONFIRMED`, `COMPLETED`, `CANCELLED` |
| `travelType` | – | `OUTSTATION`, `FAMILY`, `GROUP`, `PILGRIMAGE`, `CORPORATE` |
| `from`, `to` | – | `YYYY-MM-DD`: date the enquiry was **received** (India time). `to` includes the whole day |
| `search` | – | Matches name, destination, email, or phone digits (`98765 43210` finds `+919876543210`) |
| `sort` | `newest` | `newest`, `oldest`, `travelDate` |

Example: `GET /api/admin/enquiries?status=NEW&search=goa&page=2&pageSize=10`

```json
{
  "success": true,
  "enquiries": [
    {
      "id": "8d0e9783-516e-4b18-a63d-5ed9c6582194",
      "fullName": "Example User",
      "phone": "+919876543210",
      "email": "example@email.com",
      "travelType": "FAMILY",
      "destination": "Goa",
      "travelDate": "2026-11-15",
      "returnDate": "2026-11-20",
      "passengerCount": 8,
      "message": "Need a comfortable Traveller for family trip.",
      "locale": "en",
      "status": "NEW",
      "source": "WEBSITE",
      "notificationStatus": "SENT",
      "notifiedAt": "2026-10-01T08:22:49.466Z",
      "createdAt": "2026-10-01T08:22:49.400Z",
      "updatedAt": "2026-10-01T08:22:49.466Z"
    }
  ],
  "pagination": { "page": 1, "pageSize": 20, "total": 1, "totalPages": 1 }
}
```

`notificationStatus` shows whether the business email went out: `PENDING`, `SENT`,
`FAILED` (check the email settings), or `SKIPPED` (email not configured).

**Errors:** `401`, `422` for invalid filters (for example `pageSize=500` or `from` after `to`).

### `GET /api/admin/enquiries/:id`

`200` → `{ "success": true, "enquiry": { ...same fields as above } }` · `404` if not found or deleted.

### `PATCH /api/admin/enquiries/:id/status`

```json
{ "status": "CONTACTED" }
```

Allowed: `NEW`, `CONTACTED`, `CONFIRMED`, `COMPLETED`, `CANCELLED`.
`200` → `{ "success": true, "message": "Status updated.", "enquiry": { ... } }` · `404` · `422`.

### `DELETE /api/admin/enquiries/:id`

**Soft delete.** The enquiry disappears from every admin endpoint and from the dashboard counts,
but the record stays in the database with `deletedAt` set, so customer history is never lost by
accident. `200` → `{ "success": true, "message": "Enquiry deleted." }` · `404` if already deleted.

### `GET /api/admin/gallery`

Query: `search`, `visibility` (`published`|`draft`), `featured=yes`, `tripType`, `sort`
(`order`|`newest`|`tripDate`), `page`, `pageSize` (max 100, default 24).
`200` → `{ "success": true, "items": [...], "counts": { "published": 3 }, "pagination": {...} }`

Each item: `id`, `imageUrl`, `width`, `height`, `title`, `caption`, `destination`, `tripType`,
`tripDate` (`YYYY-MM-DD`), `featured`, `published`, `sortOrder`, `uploaded`, `createdAt`, `updatedAt`.

### `POST /api/admin/gallery`

`multipart/form-data`: `title` (required, ≤120), `caption` (≤500), `destination`, `tripType`, `tripDate`,
`sortOrder`, `published` / `featured` (`true`/`false`), and **either** `image` (file, max 12 MB, resized to
2400 px and saved as WebP) **or** `imagePath` (an existing `/images/...` file in `public/`).
`201` → `{ "success": true, "item": {...} }` · `422` · `503` if a file is sent while uploads are off.

### `GET /api/admin/gallery/:id` · `PATCH /api/admin/gallery/:id` · `DELETE /api/admin/gallery/:id`

`PATCH` takes the same multipart fields; **only the fields sent are changed**. A new `image` replaces the
old upload, whose file is deleted. `DELETE` removes the item and its uploaded file (website images are kept).

### `GET /api/admin/reviews`

Query: `status` (`PENDING`|`APPROVED`|`REJECTED`), `search`, `page`, `pageSize` (default 20).
`200` → `{ "success": true, "reviews": [...], "counts": { "PENDING": 2, "APPROVED": 5, "REJECTED": 1 }, "pagination": {...} }`

### `PATCH /api/admin/reviews/:id`

JSON. Moderate: `{ "status": "APPROVED" }` (or `REJECTED`, `PENDING`). Correct details:
`customerName`, `destination`, `tripType`, `"removePhoto": true`. The review text cannot be changed.
`200` → `{ "success": true, "review": {...} }` · `404` · `422`.

### `DELETE /api/admin/reviews/:id`

Permanently deletes the review and its photo. To hide a review but keep it, reject it instead.

---

## Admin: website content (CMS)

Text fields have optional Marathi versions (`...Mr`); empty means "use the English text". Links are
`page:<name>` (e.g. `page:plan`), `https://...`, `tel:` or `mailto:`. Dates are `YYYY-MM-DDTHH:mm` in India time.
Every change is written to the audit log.

| Endpoint | Permission | Notes |
|---|---|---|
| `GET /api/admin/offers`, `POST` (multipart) | `offers.read` / `offers.write` | `?status=DRAFT,SCHEDULED,ACTIVE,EXPIRED&search=&sort=order,newest,startsAt&page=` |
| `GET`, `PATCH`, `DELETE /api/admin/offers/:id` | `offers.read` / `.write` / `.delete` | PATCH changes only the fields sent; `image`, `imagePath` or `removeImage=true` |
| `GET /api/admin/announcements`, `POST` (JSON) | `announcements.read` / `.write` | `message`, `type` (INFO, OFFER, IMPORTANT, FESTIVE), `ctaText`, `ctaLink`, `startsAt`, `endsAt`, `published` |
| `GET`, `PATCH`, `DELETE /api/admin/announcements/:id` | `announcements.*` | |
| `GET /api/admin/destinations`, `POST` (multipart) | `destinations.read` / `.write` | `?category=&visibility=&search=` |
| `GET`, `PATCH`, `DELETE /api/admin/destinations/:id` | `destinations.*` | Optional `slug` (web address; made from the name when empty, unique: `409` with `errors[0].field = "slug"` if taken, `422` if malformed), `seoTitle` (≤70), `seoDescription` (≤170) |
| `POST /api/admin/destinations/import` | `destinations.write` | Copies the built-in destinations; `409` if any exist |
| `GET /api/admin/services`, `POST` (multipart) | `services.read` / `.write` | `enquiryType` is one of the five enquiry trip types |
| `GET`, `PATCH`, `DELETE /api/admin/services/:id` | `services.*` | |
| `POST /api/admin/services/import` | `services.write` | Copies the five built-in services; `409` if any exist |
| `GET /api/admin/content` | signed in | Sections this admin may read, with draft, live version and built-in text |
| `GET`, `PUT /api/admin/content/:key` | `content.read/write` (`traveller.*` for `traveller`) | PUT (multipart): `data` JSON plus image files; saves a **draft** |
| `POST /api/admin/content/:key/publish`, `/discard` | as above | Make the draft live, or throw it away |
| `GET /api/admin/preview?path=/en/...`, `GET /api/admin/preview/exit` | `content.read`, none | Turn website preview of drafts on or off |

Section keys: `hero`, `journeys`, `why`, `destinations`, `gallery`, `reviews`, `cta`, `traveller`, `seo`
(`seo` needs `settings.read` / `settings.write`, i.e. Super Admin; it is edited at `/admin/seo`).

## Admin: users, account and activity log

| Endpoint | Permission | Notes |
|---|---|---|
| `GET /api/admin/users`, `POST` | `users.read` / `users.write` | POST `{ name, email, role, password }`; the password is temporary |
| `PATCH /api/admin/users/:id` | `users.write` | `{ name?, email?, role?, isActive? }`; can't change own role or disable self; role, disable or email change signs them out |
| `POST /api/admin/users/:id/password` | `users.write` | `{ password }`: temporary password, signs them out |
| `GET`, `PATCH /api/admin/account` | own account | PATCH `{ name }` |
| `POST /api/admin/account/password` | own account | `{ currentPassword, newPassword }` (12+ characters); signs out other sessions |
| `GET /api/admin/audit-logs` | `audit.read` | `?entityType=&action=&actorId=&from=&to=&search=&page=` |

`GET /api/admin/enquiries` also accepts `travelFrom` and `travelTo` (travel date range). `GET /api/admin/dashboard`
also returns `activeOffers`, `upcomingTrips`, `reviewsAwaiting` and `currentOffers`.

## Quick test with curl

```bash
curl -X POST http://localhost:3000/api/enquiries -H "Content-Type: application/json" -d "{\"fullName\":\"Test User\",\"phone\":\"9876543210\",\"travelType\":\"FAMILY\",\"destination\":\"Goa\",\"travelDate\":\"2026-12-15\",\"returnDate\":\"2026-12-20\",\"passengerCount\":8}"
```

```bash
curl -c cookies.txt -X POST http://localhost:3000/api/admin/auth/login -H "Content-Type: application/json" -H "Origin: http://localhost:3000" -d "{\"email\":\"you@example.com\",\"password\":\"your-password\"}"
```

```bash
curl -b cookies.txt "http://localhost:3000/api/admin/enquiries?status=NEW"
```
