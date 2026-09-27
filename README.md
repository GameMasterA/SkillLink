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

For static hosting on Render, keep this project as a pure frontend app:
- Create a new Static Site in Render
- Connect your GitHub repo
- Set the Root Directory to the project folder that contains `index.html` (for this repo, that is `SkillLink` if the repo includes the app folder)
- Leave the build command empty
- Set the Publish Directory to `.`
- Deploy

Recommended Render settings:
- Framework: Static Site
- Build command: blank
- Publish directory: `.`
- No Node.js runtime
- No Python or Django runtime

A sample `render.yaml` for this project is included in the app root:

```yaml
services:
  - type: web
    name: skilllink
    runtime: static
    buildCommand: ""
    staticPublishPath: ./
```

## Notes
- This app still uses localStorage as a fallback when Supabase is not configured.
- Your future upgrade path can include Supabase Auth, database writes, and protected rows.

## Demo credentials
- Freelancer: `freelancer@skilllink.com` / `password123`
- Client: `client@skilllink.com` / `password123`
- Admin: `admin@skilllink.com` / `admin123`
