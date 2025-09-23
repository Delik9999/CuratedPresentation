# Curated Showroom Presentation

A production-ready first draft of a curated B2B showroom experience built with Next.js (App Router), TypeScript, Tailwind CSS, and Zustand. The app spotlights collections, market recommendations, and collaborative selection tools without transactional flows.

## Features

- **Curated showroom layout** with collection hero videos, dense SKU grids, and market recommendation rows.
- **Persistent selection panel** that tracks quantities, notes, collaborators, favorites, and provides export/share actions.
- **Collaboration tools** including attribution prompts, favorite limits per collection, and a favorites leaderboard.
- **Dealer personalization** via `?dealer=` param that adjusts pricing tier, previous purchases, starter selections, and on-display badges.
- **Shareable selections** through generated tokens that open a read-only view with a duplicate-and-edit flow.
- **Exports** for PDF (via `@react-pdf/renderer`) and CSV summary downloads.
- **Local JSON fallback** powered by Lib&Co spec files so the repo runs without Supabase credentials.

## Getting started

```bash
npm install
npm run dev
```

The development server starts at [http://localhost:3000](http://localhost:3000).

### Demo routes

- Landing page: `/`
- Dealer experience: `/showroom?dealer=robinson`
- Demo dealer: `/showroom?dealer=demo`
- Shared read-only example (after generating a share token): `/showroom?share=<token>`

### Data seeding

Sample datasets live under `/data`:

- `libspecs.json` – primary product spec source (SKU, description, pricing, flags)
- `libcoststockYYYYMMDD.json` – latest cost/stock snapshot (the loader grabs the alphabetically last file)
- `dealers.json`

When Supabase is not configured, the data client transforms `libspecs.json` (+ the most recent `libcoststock*.json`) into the internal product and collection models on the fly. Selections and share tokens persist only in memory in this mode and reset when the dev server restarts.

Product imagery resolves to `https://libandco.com/cdn/shop/files/<SKU>.jpg`. If a record in `libspecs.json` includes an `imageVersion`, that value is appended as `?v=<version>`.

## Supabase (optional)

If you prefer using Supabase, provide the environment variables before running:

```
NEXT_PUBLIC_SUPABASE_URL=<your-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-key>
```

With these set, the data client switches to Supabase tables (`products`, `collections`, `dealers`, `selections`, `selection_lines`).

## Tests & linting

The project relies on Next.js defaults. Run `npm run lint` to execute ESLint.

## Export endpoints

- `POST /api/export/pdf` – returns a PDF summary
- `POST /api/export/csv` – returns a CSV summary

Both endpoints expect `{ "selectionId": "..." }` in the request body.

## Notes

- Share links are stored in-memory when using the JSON fallback and reset when the server restarts.
- Collection videos stream from Lib&Co-hosted MP4 loops and load lazily when the section enters the viewport.
- Tailwind CSS handles styling; adjust `tailwind.config.ts` for theme extensions.
