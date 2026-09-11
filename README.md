# AURA ESTATES — real backend

This version turns the original static AURA ESTATES site into a small full-stack real-estate site.

## Included
- Real Node.js + Express backend
- SQLite database
- Admin login at `/admin.html`
- Add property with image upload and full details
- Remove properties, including the seeded demo properties
- Dynamic property listing and property detail pages
- Contact/enquiry form stored in the database
- Basic analytics: page views, property views, total enquiries
- Client/leads table in the admin dashboard
- Password and JWT session handled server-side

## Run locally

1. Install Node.js 20+.
2. Open a terminal in this folder.
3. Run:
   ```bash
   npm install
   ```
4. Copy `.env.example` to `.env`.
5. Change `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `JWT_SECRET`.
6. Run:
   ```bash
   npm start
   ```
7. Open:
   `http://localhost:3000`
8. Admin:
   `http://localhost:3000/admin.html`

## Important production note

The included SQLite + local image storage is suitable for a small server or a deployment with a persistent disk. If you deploy on a server where the filesystem is ephemeral, use PostgreSQL for the database and object storage (such as S3/Supabase Storage/Cloudinary) for images.

Do not commit `.env`, `data/`, or `uploads/` to GitHub.

The analytics intentionally stores basic website activity rather than silently collecting sensitive personal information. Enquiry information is visible only in the authenticated admin dashboard.
