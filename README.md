# AirBooks

Free ebook library frontend. Connects to your TGDrive / Beyonddrive backend and uses the dedicated `BOOKS_CHANNEL` for storage.

## Features

- Beautiful dark catalog with search & tags
- Book detail pages
- Upload PDFs / EPUBs (goes only to `BOOKS_CHANNEL`)
- Download / open in browser
- Fully free — deploy on Vercel

## Setup

1. Copy env file:

```bash
cp .env.example .env.local
```

2. Set your backend URL:

```env
NEXT_PUBLIC_API_URL=https://your-backend.onrender.com
```

3. Install & run locally:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy on Vercel

1. Push this folder to a GitHub repo.
2. Import the repo in [Vercel](https://vercel.com).
3. Add environment variable:

| Name | Value |
|------|--------|
| `NEXT_PUBLIC_API_URL` | `https://your-backend.onrender.com` |

4. Deploy.

## Backend requirements

Your Beyonddrive backend must have:

- `BOOKS_CHANNEL` set to your books Telegram channel ID
- Bots added as admins of that channel
- The books API routes (`/api/books/*`) from the modified project

See `BOOKS_API.md` in the backend repo for full API docs.
