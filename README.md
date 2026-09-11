# Samba

Couple social space built with **Next.js**, **Convex**, **Clerk**, and **Cloudinary**.

One account seat pair: create a couple, invite your partner with a link/code, then chat, play Would You Rather, share moments (private or public), and browse the Public Wall.

## Setup

1. **Install**

```bash
npm install
```

2. **Clerk** — create an app at [dashboard.clerk.com](https://dashboard.clerk.com), enable the Convex integration, copy keys.

3. **Convex**

```bash
npx convex dev
```

Set on the Convex dashboard (or CLI):

```bash
npx convex env set CLERK_JWT_ISSUER_DOMAIN "https://YOUR_CLERK_FRONTEND_API.clerk.accounts.dev"
npx convex env set CLOUDINARY_CLOUD_NAME "..."
npx convex env set CLOUDINARY_API_KEY "..."
npx convex env set CLOUDINARY_API_SECRET "..."
```

4. **Env** — copy `.env.local.example` to `.env.local` and fill values (`NEXT_PUBLIC_CONVEX_URL` is written by `convex dev`).

5. **Run**

```bash
npm run dev
# in another terminal, if not already running:
npx convex dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Next.js app |
| `npm run build` | Production build |
| `npx convex dev` | Sync Convex backend + codegen |

## App routes

- `/` — marketing
- `/onboarding` — create or join couple
- `/invite/[code]` — partner invite
- `/home` — couple hub
- `/chat` — private DM + images
- `/play` — Would You Rather
- `/moments` — private moments + public toggle
- `/wall` — public feed
