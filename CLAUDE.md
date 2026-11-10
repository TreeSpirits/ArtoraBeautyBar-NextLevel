# Notes for Claude

Website for Artora Beauty Bar, a private hair studio in Tenafly NJ run by master colorist Ayfer Deniz.
The repo owner is her sibling, not a web designer; they hand design decisions to Claude and want the site
to feel special (motion, video, sound), not like a template. Most visitors come to book or to look at hair,
so Book now and the lookbook must always stay easy to reach.

This repo is a redesign of `TreeSpirits/ArtoraBeautyBar` (the live site at artorabeautybar.com, Cloudflare Pages).
The first commit is that original site, imported unchanged; `git diff 76b57fd` shows everything the redesign did.
README.md describes the features and how to edit content. Read it before this file's details.

## Design system (keep to it)

Concept: the page is a balayage. It lifts from an espresso root to platinum ends, one shade per section,
each melting into the next (`.shade` + `--from`/`--bg`/`--melt` in `css/site.css`). Light moving across colour
is the recurring motif: glints on headings, gloss on lookbook tiles, the sweep on the footer wordmark.

- Shades: espresso `#1B100A`, cocoa `#26170F`, chestnut `#5A311D`, honey `#D2A56A`, champagne `#EBDDC6`,
  platinum `#F6F0E6`, rose `#EDD2CA`. Text/accent colours come from `[data-tone="dark|light"]`.
- Type: Bodoni Moda (display, echoes the heavy serif AB logo) and Jost (text). Self-hosted variable fonts.
- The hero band through the wordmark copies the logo's band through "AB". The curtain parts along the same line.
- Copy style: plain, sentence case, no florid phrasing. Keep facts (hours, address, phone, credentials,
  the photo credit on "Runway curls") exactly as they are. Do not invent claims, prices or testimonials.
- Avoid: all-caps eyebrow labels over headings, one-italic-word headline accents, arrows on buttons,
  fade-up-on-everything. Motion should answer scrolling or the pointer.

## How it is built

Zero-build static site, no dependencies. `index.html`, `css/site.css`, `js/site.js`.
`js/site.js` is one IIFE of `init*` functions; a single `requestAnimationFrame` loop runs `frameTasks(now, moved)`.

- Hero: three portrait videos sit under an SVG whose mask cuts out the word ARTORA. `initHero` measures the
  text with a hidden SVG, lays it out (one line on wide screens, ART/ORA stacked when width/height < 0.8),
  and on scroll scales the mask about the stem of the T. Hero height (330vh) sets how long the scroll lasts.
- Header, Book badge, sound button and shade gauge each take their tone from the section under them (`initShades`).
- Lookbook grid is CSS-only masonry: row unit = column width / 8; photos span 10 rows, reels 14, square 8.
- Sound is generated with Web Audio (`Sound` in `js/site.js`); no audio files.
- The welcome splash for `?from=ayfersalon` visitors is business-critical. Keep it working.

## Things that already bit me

- An element with `clip-path: inset(100% ...)` on itself never fires IntersectionObserver. Put the clip on
  a child (see `[data-reveal="wipe"] > *` and `.look-media`).
- Do not add a blanket `* { transition-duration: ... }` rule for reduced motion. It turns every scripted style
  change into a transition, so measurements read stale values and the hero wordmark comes out the wrong size.
- Bodoni Moda gets wider at small optical sizes. Anything sized to fit a width needs
  `font-variation-settings: 'opsz' 96` (see `.footer-word`).
- `/assets/*` is cached for 30 days (`_headers`). Rename a replaced image or video rather than overwriting it.
  CSS and JS live outside `/assets` on purpose so edits show up immediately.
- Text set with `background-clip: text` disappears wherever it overflows its box.

## Working in a cloud session

- Instagram is blocked by the network policy. New photos and videos must be uploaded to the repo by the owner
  (they were told to use an `incoming/` folder). Accounts: @artorabeautybar (salon), @ayfer_hair (Ayfer's own).
- The session cannot create GitHub repos; the owner creates them, then `add_repo` attaches them.
- `ffmpeg`, ImageMagick, Pillow and Playwright (Chromium) are available. npm works, so fonts can be fetched
  from `@fontsource-variable/*`.
- New media: photos as `.webp` at full, 800 and 480 widths; reels as H.264 9:16 without audio, plus a `.webp`
  poster. Hero loops are 576x1024, 24 fps, played forward then reversed so they loop cleanly, about 1 MB or less.
- To check work: `python3 -m http.server 4173` in the repo, then Playwright screenshots at 1440x900, 390x844,
  820x1180 and 844x390. Also run once with `reducedMotion: 'reduce'` and once with `javaScriptEnabled: false`.
  Scroll the hero to fractions of `(hero.offsetHeight - innerHeight)` to see the zoom stages. Look at the
  screenshots; several bugs here were only visible, not thrown as errors.

## Open items (as of 2026-11-10)

- Not yet tested in Safari or on a real iPhone (video autoplay and the hero zoom are the risks).
- Nobody has listened to the ambient sound yet; it has only been confirmed to start and stop without errors.
- Not deployed. The owner still has to connect this repo to Cloudflare Pages.
- The photo shown beside each service in the menu is Claude's pick, not confirmed by Ayfer (extensions especially).
- Waiting on the owner: more photos/videos from Instagram, and Ayfer's reaction to the trimmed copy.
