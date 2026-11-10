# Artora Beauty Bar — Next Level (`artorabeautybar.com`)

Website for **Artora Beauty Bar**, the private hair studio of master colorist **Ayfer Deniz** in Tenafly, NJ (formerly Ayfer Salon in Closter).

This is a redesign of the original site. Same content, booking links and photos; new presentation.

## The idea

The page is a balayage. It starts at an espresso root and lifts, shade by shade, to platinum ends:
espresso → dark chocolate → chestnut → honey → champagne → platinum, finished with a rose-pearl gloss in the footer.
Each section owns one shade and melts into the next. A small gauge on the right edge shows the current shade.

## What's in it

- **Hero** — the ARTORA wordmark is cut out of an espresso field and filled with three looping hair reels (brunette, caramel, blonde). Scrolling zooms through the letter T until the reels fill the screen, then the *People* quote lights up word by word.
- **Philosophy** — a picture that stays put while the three ideas scroll past it, changing with each one.
- **Meet Ayfer** — biography, credentials and press.
- **The menu** — services as an accordion (one open at a time); on desktop a photo trails the pointer.
- **Lookbook** — filterable masonry of photos and reels. Each piece tilts and catches a band of light under the pointer; selecting one opens a full-screen viewer (arrow keys, swipe, Esc).
- **Visit** — address, contact and hours, with a live "open now" status in New York time.
- **Book now** — in the header, in every section, and as a floating badge on every screen.
- **Sound** — an optional generated ambient pad (button, bottom left). It is off until a visitor turns it on, and it brightens as the page lightens. No audio files are downloaded.
- **Welcome splash** — visitors arriving from `ayfersalon.com` (or with `?from=ayfersalon`) see "Ayfer Salon is now Artora Beauty Bar". Set `WELCOME_ALWAYS = true` in `js/site.js` to preview it.

Visitors who prefer reduced motion get a still version: no zoom, no parallax, no autoplaying video. The page also works without JavaScript.

## Files

```
index.html          the page
404.html            not-found page (self-contained)
css/site.css        all styles
js/site.js          all behaviour, no dependencies
fonts/              Bodoni Moda + Jost (variable, Latin subset, SIL Open Font License)
assets/images/      photos, posters, logo, grain texture
assets/videos/      reel-*.mp4 (lookbook) and hero-*.mp4 (hero loops made from three of the reels)
_headers            Cloudflare Pages caching rules
```

## Editing

- **Add a lookbook piece:** copy one `<a class="look">…</a>` block in `index.html`. Use `class="look look--reel"` for a 9:16 video and set `data-tags` to any of `blonde`, `brunette`, `cuts`, `video`.
- **Change hours:** edit the table in the Visit section, the `HOURS` object in `js/site.js` (minutes from midnight) and the `openingHoursSpecification` block at the top of `index.html`.
- **Swap a hero reel:** replace a `hero-*.mp4` and its poster in `assets/images/posters/`. Portrait 9:16, no audio, around 1 MB or less. Rename the file when you replace it (see `_headers`).
- **Colours:** the shade chart is the first block of `css/site.css`.

## Deployment

Zero-build static site. Serve the root directory from **Cloudflare Pages**, GitHub Pages, Netlify, or any web host.

To preview locally:

```bash
python3 -m http.server 4173
```

Then open `http://localhost:4173`.
