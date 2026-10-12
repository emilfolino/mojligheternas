# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Projekt

"Möjligheternas" is an interactive teaching platform for a university teacher who teaches maths and programming to **pupils in årskurs 3–4 (ages ~9–10)**. It has three parts:

1. **Caesarchiffer** – Caesar cipher
2. **Publik/privat nyckel** – public/private key encryption
3. **Blickmatte** – answering maths problems using eye tracking (webgazer.js)

The project is a greenfield repo; this file records the decisions made up front.

## Hard requirements

- **All user-visible text is Swedish**: UI, hints, error messages, code comments shown to students, page titles, `lang="sv"`. Code identifiers, file names and developer comments may stay English, but anything a pupil can read in the browser must be Swedish. Use simple language suited to 9–10-year-olds.
- **Bright and colourful design**: playful, high-contrast, large type and large click/gaze targets. Keep one shared stylesheet/theme (CSS custom properties) so all three parts look like one product.
- **Privacy**: no accounts, no backend, nothing saved, no analytics. Webcam video for eye tracking must never leave the browser (see Part 3).
- **Target devices**: laptops/Chromebooks with a webcam, mouse and keyboard. Layout need not be touch-first.

## Tech stack and commands

- Plain **HTML/CSS/JavaScript, no framework, no build step**. Use ES modules (`<script type="module">`).
- Hosted as **static files** (GitHub Pages/Netlify). The site must work when served over HTTPS (needed for `getUserMedia`).
- Third-party libraries (Monaco, webgazer.js) are loaded as static assets. Prefer vendoring them under `vendor/` over relying on a CDN at runtime, so the site works on restricted school networks; pin versions.
- No package manager, lint or test commands exist yet. To run locally, serve the directory over HTTP (`python -m http.server`); `file://` will not work for modules or the webcam. Update this section if tooling is added.

## Part 1 – Caesarchiffer

- **Alphabet: the Swedish 29 letters** `ABCDEFGHIJKLMNOPQRSTUVWXYZÅÄÖ`; the shift wraps modulo 29. Handle upper/lower case and leave characters that are not in the alphabet (spaces, punctuation) unchanged.
- Flow: first the pupils turn a **physical cipher wheel by hand** (the teacher already has one; do not build or print a wheel). Then the digital part:
  - **Top:** input field for the message.
  - **Middle:** a **Monaco editor** with a short, heavily commented JavaScript encrypt function that pupils can change – e.g. the shift, or the string of characters (the alphabet).
  - **Bottom:** the encrypted message.
- **Live updating**: re-run the code when it changes, but only update the output when the code runs **without errors**; while the code is broken (half-typed), keep showing the last good result. Run it in the background (debounced) so typing never blocks.
- **Run pupil code in a sandbox** (Web Worker or sandboxed iframe) with a timeout, so infinite loops or bad code cannot freeze the page.
- **Errors are shown as friendly Swedish messages** (e.g. "Hoppsan! Kolla att du har citattecken runt bokstäverna.") – never raw JS errors. Map common error types to hints, and provide a **"Börja om" button** that resets the editor to the original code.
- The starter code uppercases the message (simple for pupils) and leaves non-alphabet characters unchanged.
- The Monaco and RSA code boxes (Part 2) share one reusable editor/sandbox module: `js/kodruta.js` (`skapaKodruta`). Monaco is vendored in `vendor/monaco/vs` (v0.52.2, trimmed to JavaScript only). Shared theme: `css/tema.css`.
- Status: landing page and all three parts are built (none has been tested in a real browser/with a real webcam yet).

## Part 2 – Publik och privat nyckel

- Two layers, in this order:
  1. **Metaphor first**: a padlock-and-key story. Anyone can lock a box with the owner's *public* padlock; only the owner's *private* key opens it. Make it visual and interactive.
  2. **Optional extra: tiny RSA** with small numbers, presented as **editable JavaScript in the same Monaco code-box format as Part 1** (same live-update, sandbox and friendly-error behaviour). Keep it clearly marked as a challenge ("Utmaning") for advanced pupils.
- Implemented in `nyckel/`: the metaphor is a stepper (Olle, Maja, Tjuven, box). The RSA challenge uses n=33, e=3, d=7 with a 30-symbol alphabet (space=0, A=1 … Ö=29); an encrypt box feeds its output into a decrypt box. Use small numbers and `BigInt`-free arithmetic; use a modulo-power helper so values stay small. This is for teaching, not real security – say so where appropriate, and never present it as secure.

## Part 3 – Blickmatte (webgazer.js)

- Uses **webgazer.js** for eye tracking. All processing is local: do not record, upload or persist webcam frames or gaze data (disable/avoid webgazer's data-saving features, e.g. `saveDataAcrossSessions(false)`).
- **Answer mechanism: dwell time.** Show 2–4 **large answer boxes**; looking at one for ~1 second fills a progress ring, and when it is full the answer is locked in. Looking away resets the ring. Make the dwell time a named constant.
- **Math content:** addition/subtraction and multiplication tables. Keep problem generation in its own module with ranges per type. There is no teacher-configuration UI planned.
- **Scoring: streaks** ("rätt i rad"). Show the current streak prominently with a celebratory Swedish message; a wrong answer resets it. No points or stars.
- **Calibration** is required before play: a friendly Swedish calibration step (click dots while looking at them) with clear instructions about webcam permission, lighting and sitting still. Handle webcam denied/missing with a clear Swedish message.
- Eye tracking from a webcam is imprecise: keep answer boxes large and well separated, show a visible gaze dot (optionally), and offer recalibration at any time.
- Provide a mouse fallback (hover/click) for testing and for machines without a webcam.
- Implemented in `blickmatte/`: `blick.js` wraps webgazer (vendored 3.5.3 in `vendor/webgazer`, GPLv3 – license file included; MediaPipe face-mesh files are served locally via `faceMeshSolutionPath`), `uppgifter.js` generates questions (3 choices), `blickmatte.js` does calibration (9 dots × 5 clicks), the dwell loop (smoothed gaze, hit margin, ring/fill) and streaks. Tunable constants are at the top of `blickmatte.js`. The mouse mode uses the same dwell logic with the pointer as the "gaze".

## Landing page

A start page with **three large, colourful cards**, one per part, linking to each part.
