# QRGO

Static, privacy-friendly QR code generator. No backend, no accounts, no analytics.

## Features
Types: website/social/shop links, text, phone, email, SMS, WhatsApp, Wi-Fi, vCard, geo, map link, calendar event, custom payload.
Styling: colours, size (256-2048), error correction, module/corner styles, quiet zone, centre logo. Export PNG/SVG, copy payload/image, print.
Bulk CSV to ZIP, local history (never stores Wi-Fi passwords), JSON config export/import.

## Commands
    npm install
    npm run dev       # local dev server
    npm test          # Vitest unit tests
    npm run build     # output in dist/
    npm run preview   # serve dist/ locally

## Deploy (GitHub Pages)
1. Create a GitHub repo and push this project to `main`.
2. Repo Settings > Pages > Source: **GitHub Actions**.
3. The included workflow tests, builds and deploys. `vite.config.js` uses `base: './'`, so no repository-name change is needed.
Any other static host: upload the contents of `dist/`.

## Owner configuration
Replace the placeholder contact line in `index.html` ("About, Terms & Contact"). Review the Privacy/Terms text before publishing; it makes no legal-compliance claims.

## Privacy model
QR data, logos and CSV files never leave the browser. History uses localStorage on that device only. Libraries are bundled at build time.

## Limitations
Static codes only: no dynamic redirects, scan analytics or sync. Events use floating local time. Always test-scan printed codes.

## Third-party
qr-code-styling (MIT), JSZip (MIT or GPLv3), Vite and Vitest (MIT).

## Photo / video upload (optional, Supabase)
A QR code cannot hold a photo or video, so QRGO can upload the file to **your** Supabase Storage bucket and encode its public link.
1. Create a Supabase project and a **public** bucket named `qrgo` (set a file size limit of 50 MB and allowed MIME types: image/jpeg, image/png, image/webp, image/gif, video/mp4, video/webm).
2. Allow anonymous uploads with this SQL policy:
       create policy "anon upload" on storage.objects for insert to anon with check (bucket_id = 'qrgo');
3. Copy `.env.example` to `.env`, fill in the values, then `npm run build`. For GitHub Actions, add the three values as repository variables/secrets and pass them as `env` to the build step.
Important: the anon key ships inside the built site, so anyone can upload to that bucket within the limits above. Files are public and permanent until you delete them in Supabase. Add your own abuse controls (size limits, rate limits, a Turnstile/captcha or a serverless proxy) before heavy public use. Without these variables the upload card is disabled.
