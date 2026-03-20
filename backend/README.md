# Backend

This service is **developed and run with [Bun](https://bun.sh/)** (`packageManager` is pinned in `package.json`).

## Setup

```bash
bun install
```

Bun loads `.env` automatically for `bun dev` / `bun run`. Prisma CLI still uses `prisma.config.ts` and `dotenv` for commands you run explicitly.

## Scripts

| Command | Purpose |
|--------|---------|
| `bun run dev` | Hot-reload `index.ts` |
| `bun run build` | `prisma generate` + `tsc` |
| `bun run start` | Run compiled `dist/index.js` |

## Prisma

Use Bun’s runner so the local CLI matches this repo:

```bash
bunx prisma validate
bunx prisma generate
bunx prisma migrate dev
```

## Deploy (e.g. Vercel)

Serverless handlers still run on **Node.js**; keep **Node ≥ 20.19** (see `engines` + Prisma 7).

`postinstall` / `vercel-build` call `prisma generate` so **`npm install` on CI** (default on Vercel) still works without Bun. Optionally set Vercel’s **Install Command** to `bun install` if you want the same package manager as locally.
