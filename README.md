# SkillLink

SkillLink is a frontend marketplace prototype for freelancers and clients. It uses static HTML/CSS/JS and connects to Supabase for data storage, without Python or Django.

## Stack
- Frontend: HTML, CSS, JavaScript
- Database: Supabase PostgreSQL
- Hosting: Render
- Auth: Supabase Auth (optional later) or local demo mode

## Setup

1. Create a Supabase project.
2. Open the SQL editor in Supabase and run the schema from `supabase-schema.sql`.
3. Open `js/config.js` and replace:
   - `https://your-project-id.supabase.co`
   - `your-anon-key`
4. Save the file.
5. Open the project in a browser or deploy it to Render as a static site.

## Render hosting

For static hosting on Render:
- Create a new Static Site
- Connect your GitHub repo
- Set the root directory to the project folder
- Publish the site

## Notes
- This app still uses localStorage as a fallback when Supabase is not configured.
- Your future upgrade path can include Supabase Auth, database writes, and protected rows.

## Demo credentials
- Freelancer: `freelancer@skilllink.com` / `password123`
- Client: `client@skilllink.com` / `password123`
- Admin: `admin@skilllink.com` / `admin123`
