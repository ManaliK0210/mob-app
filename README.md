# Forkcast — save, plan and shop your recipes

A Recime-inspired Android app built with React Native (Expo SDK 54).
Paste a TikTok, Instagram, YouTube or recipe-blog link and Forkcast turns it into a clean recipe card,
drops it into your week, and builds one merged grocery list sorted by aisle.

## Features

| Area | What it does |
| --- | --- |
| **Import** | Paste a link or raw text. Recipe blogs are read from their schema.org recipe data (works offline from any AI). TikTok captions come via oEmbed, YouTube titles via oEmbed, other pages via Open Graph. Optional AI extraction (Gemini, through a proxy) handles messy captions. Every import opens a review screen before saving. |
| **Recipe library** | Grid of recipe tiles, search by name, tag or ingredient, favourites, tag filters. |
| **Recipe view** | Servings scaler (amounts rescale with nice fractions: ⅓ → ⅔), tick-off ingredients, numbered method, link back to the source, edit and delete. |
| **Cook mode** | Full-screen, large-type, one step at a time; screen stays awake; ingredient peek. |
| **Meal planner** | Week view with previous/next week, add meals per day, per-meal servings, one tap to build the week's grocery list. |
| **Grocery list** | Merges duplicates across recipes (garlic from four recipes becomes "16 cloves"), scales by planned servings, groups by aisle, check off, add your own items in plain language ("2 lemons"), share as text. |
| **Offline-first** | Everything is stored on the device (AsyncStorage). Nine sample recipes with photos and a planned week load on first launch. |

## Get the APK (no Android Studio needed)

The repo includes a GitHub Actions workflow that builds a signed, installable APK on GitHub's servers.

1. Create a new **public** repository on GitHub (e.g. `forkcast`).
2. Push this folder to it (GitHub Desktop or the commands below). Make sure the hidden `.github` folder is included.
   ```bash
   git init && git add . && git commit -m "Forkcast app"
   git branch -M main
   git remote add origin https://github.com/<you>/forkcast.git
   git push -u origin main
   ```
3. Open the repo's **Actions** tab. The *Build Android APK* run takes about 10–15 minutes.
4. When it's green, open **Releases** — `forkcast.apk` is attached. Share that release link with reviewers.
5. On an Android phone: download the APK, open it, allow "Install unknown apps" when prompted.

Alternative: `npx eas-cli build -p android --profile preview` builds the same APK on Expo's servers (free account).

## Turn on AI import (optional, ~5 minutes, free)

Recipe blogs import without AI. For social captions, deploy the tiny proxy in `worker/` so the API key never ships in the app:

```bash
npm i -g wrangler
cd worker
wrangler deploy
wrangler secret put GEMINI_API_KEY   # free key: https://aistudio.google.com/apikey
```

Then either paste the printed `https://forkcast-ai.<you>.workers.dev` URL into **Settings → AI import** in the app,
or add it as a repository secret named `AI_PROXY_URL` (Settings → Secrets and variables → Actions) and re-run the
workflow so it's baked into the APK for reviewers.

## Run it locally (development)

```bash
npm install
npx expo install --fix
npx expo run:android      # needs Android Studio / an emulator or a USB-connected phone
npm test                  # logic tests: parsing, scaling, grocery merge, import
```

## Project structure

```
App.js                    tab bar + lightweight stack navigation, Android back button
src/store.js              app state (reducer) persisted to AsyncStorage
src/lib/ingredients.js    ingredient parser, scaler, fraction formatter, aisle sorter, grocery merge
src/lib/importer.js       URL / text import: JSON-LD, oEmbed, Open Graph, AI proxy, heuristic parser
src/lib/dates.js          week helpers
src/screens/              Library, Recipe, CookMode, Import, EditRecipe, Planner, Grocery, Settings, Onboarding
src/data/seed.js          sample recipes
worker/                   Cloudflare Worker AI proxy (Gemini structured output)
scripts/test-logic.mjs    unit tests, also run in CI before every build
.github/workflows/        APK build + GitHub Release
```

## Design

Clean white, native Android look with a single tangerine accent and real food photography.
Sample recipe photos are from [Unsplash](https://unsplash.com) (free under the Unsplash License); CI checks every photo URL loads before building.
