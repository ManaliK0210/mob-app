// Recipe import: URL (schema.org JSON-LD, TikTok/YouTube oEmbed, Open Graph) and pasted text.
// AI extraction is optional and goes through a small proxy (see /worker) so no API key ships in the APK.
// Pure JS (uses global fetch) — unit-testable in Node.

import { parseIngredient } from './ingredients';

const UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36';

// ---------- helpers ----------

export function decodeEntities(str) {
  if (!str) return '';
  return String(str)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&frac12;/g, '½')
    .replace(/&frac14;/g, '¼')
    .replace(/&frac34;/g, '¾')
    .replace(/&deg;/g, '°')
    .replace(/\s+/g, ' ')
    .trim();
}

/** "PT1H30M" -> 90 */
export function isoDurationToMinutes(iso) {
  if (!iso || typeof iso !== 'string') return null;
  const m = iso.match(/P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?/i);
  if (!m) return null;
  const mins = Number(m[1] || 0) * 1440 + Number(m[2] || 0) * 60 + Number(m[3] || 0);
  return mins || null;
}

function asArray(v) {
  if (v === undefined || v === null) return [];
  return Array.isArray(v) ? v : [v];
}

function hasType(node, type) {
  return asArray(node && node['@type']).some((t) => String(t).toLowerCase() === type.toLowerCase());
}

function findRecipeNode(data) {
  const stack = asArray(data);
  while (stack.length) {
    const node = stack.shift();
    if (!node || typeof node !== 'object') continue;
    if (hasType(node, 'Recipe')) return node;
    if (node['@graph']) stack.push(...asArray(node['@graph']));
    if (node.mainEntity) stack.push(...asArray(node.mainEntity));
    if (Array.isArray(node)) stack.push(...node);
  }
  return null;
}

function flattenInstructions(ins) {
  const out = [];
  const walk = (node) => {
    if (!node) return;
    if (typeof node === 'string') {
      // Some sites put all steps in one string separated by newlines / numbers
      node
        .split(/\n+|(?:^|\s)(?=\d+\.\s)/)
        .map((s) => decodeEntities(s).replace(/^\d+\.\s*/, ''))
        .filter((s) => s.length > 2)
        .forEach((s) => out.push(s));
      return;
    }
    if (Array.isArray(node)) return node.forEach(walk);
    if (hasType(node, 'HowToSection') || node.itemListElement) return walk(node.itemListElement);
    if (node.text) return out.push(decodeEntities(node.text));
    if (node.name) out.push(decodeEntities(node.name));
  };
  walk(ins);
  return out;
}

function pickImage(img) {
  const first = asArray(img)[0];
  if (!first) return null;
  if (typeof first === 'string') return first;
  return first.url || first.contentUrl || null;
}

function parseServings(y) {
  const first = asArray(y)[0];
  if (first === undefined || first === null) return null;
  const n = parseInt(String(first).match(/\d+/)?.[0] || '', 10);
  return Number.isFinite(n) && n > 0 && n < 100 ? n : null;
}

function splitTags(v) {
  return asArray(v)
    .flatMap((x) => String(x).split(','))
    .map((x) => x.trim().toLowerCase())
    .filter((x) => x && x.length < 24);
}

export function recipeFromJsonLd(node, sourceUrl) {
  const ingredients = asArray(node.recipeIngredient || node.ingredients)
    .map((x) => decodeEntities(x))
    .filter(Boolean)
    .map(parseIngredient);
  const steps = flattenInstructions(node.recipeInstructions);
  const tags = [
    ...new Set([...splitTags(node.recipeCategory), ...splitTags(node.recipeCuisine), ...splitTags(node.keywords).slice(0, 4)]),
  ].slice(0, 6);
  return {
    title: decodeEntities(node.name) || 'Untitled recipe',
    description: decodeEntities(node.description).slice(0, 280),
    image: pickImage(node.image),
    servings: parseServings(node.recipeYield) || 4,
    totalMinutes:
      isoDurationToMinutes(node.totalTime) ||
      (isoDurationToMinutes(node.prepTime) || 0) + (isoDurationToMinutes(node.cookTime) || 0) ||
      null,
    ingredients,
    steps,
    tags,
    sourceUrl,
    sourceName: hostName(sourceUrl),
  };
}

export function extractJsonLdRecipe(html, sourceUrl) {
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    const raw = m[1].trim();
    let data;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      try {
        data = JSON.parse(raw.replace(/[\u0000-\u001f]+/g, ' '));
      } catch (e2) {
        continue;
      }
    }
    const node = findRecipeNode(data);
    if (node) return recipeFromJsonLd(node, sourceUrl);
  }
  return null;
}

function metaContent(html, prop) {
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${prop}["'][^>]*content=["']([^"']*)["']|<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${prop}["']`,
    'i',
  );
  const m = html.match(re);
  return m ? decodeEntities(m[1] || m[2]) : '';
}

export function hostName(url) {
  try {
    const h = String(url).match(/^https?:\/\/([^/?#]+)/i)?.[1] || '';
    return h.replace(/^www\.|^m\./, '');
  } catch (e) {
    return '';
  }
}

async function fetchWithTimeout(url, opts = {}, ms = 15000) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...opts, signal: controller.signal });
  } finally {
    clearTimeout(t);
  }
}

// ---------- heuristic text parser (offline fallback) ----------

const ING_HEADER = /^\s*(ingredients?|what you('|’)?ll need|you('|’)?ll need|shopping list)\s*:?\s*$/i;
const STEP_HEADER = /^\s*(instructions?|directions?|method|steps?|preparation|how to make( it)?)\s*:?\s*$/i;
const HASHTAG_LINE = /^(#\w+\s*)+$/;

function looksLikeIngredient(line) {
  const p = parseIngredient(line);
  return line.length < 80 && (p.qty !== null || p.unit !== null || /^[-•*▢]/.test(line));
}

export function parseRecipeText(text, { title: titleHint, sourceUrl, image } = {}) {
  const lines = String(text || '')
    .replace(/\r/g, '')
    .replace(/\.\s+(?=\d+[.)]\s)/g, '.\n')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !HASHTAG_LINE.test(l));

  let mode = null;
  const ingredients = [];
  const steps = [];
  const other = [];
  let sawHeaders = false;

  for (const line of lines) {
    if (ING_HEADER.test(line)) {
      mode = 'ing';
      sawHeaders = true;
      continue;
    }
    if (STEP_HEADER.test(line)) {
      mode = 'step';
      sawHeaders = true;
      continue;
    }
    const clean = line.replace(/^(\d+[.)]|step \d+:?)\s*/i, '').replace(/^[-•*▢]\s*/, '');
    if (mode === 'ing') ingredients.push(clean);
    else if (mode === 'step') steps.push(clean);
    else other.push(line);
  }

  if (!sawHeaders) {
    // Guess: short quantity-led lines are ingredients, longer sentences are steps.
    for (const line of other.slice(1)) {
      const clean = line.replace(/^[-•*▢]\s*/, '');
      if (looksLikeIngredient(line)) ingredients.push(clean);
      else if (line.length > 25) steps.push(line.replace(/^(\d+[.)]|step \d+:?)\s*/i, ''));
    }
  }

  const firstLine = (other[0] || '').replace(/[#@]\S+/g, '').trim();
  const title = titleHint || (firstLine && firstLine.length < 70 ? firstLine : 'Imported recipe');

  return {
    title,
    description: '',
    image: image || null,
    servings: 4,
    totalMinutes: null,
    ingredients: ingredients.map(parseIngredient),
    steps,
    tags: [],
    sourceUrl: sourceUrl || null,
    sourceName: sourceUrl ? hostName(sourceUrl) : 'Pasted text',
  };
}

// ---------- AI proxy ----------

export async function aiExtract(aiUrl, { text, url }) {
  const res = await fetchWithTimeout(
    aiUrl,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: String(text || '').slice(0, 12000), url }),
    },
    30000,
  );
  if (!res.ok) throw new Error(`AI service returned ${res.status}`);
  const data = await res.json();
  if (!data || !data.title) throw new Error('AI could not find a recipe');
  return {
    title: data.title,
    description: data.description || '',
    image: data.image || null,
    servings: Number(data.servings) || 4,
    totalMinutes: Number(data.totalMinutes) || null,
    ingredients: asArray(data.ingredients).map((x) => parseIngredient(typeof x === 'string' ? x : x.raw || x.name)),
    steps: asArray(data.steps).map(String),
    tags: asArray(data.tags)
      .map((t) => String(t).toLowerCase())
      .slice(0, 6),
    sourceUrl: url || null,
    sourceName: url ? hostName(url) : 'Pasted text',
  };
}

function isUsable(r) {
  return r && r.ingredients.length >= 2 && r.steps.length >= 1;
}

// ---------- main entry points ----------

/**
 * Import from a URL. Strategy:
 *  1. TikTok / YouTube -> oEmbed for caption/title + thumbnail
 *  2. Any page -> schema.org Recipe JSON-LD (most recipe blogs)
 *  3. Fallback: caption / og:description text -> AI (if configured) -> heuristic parser
 * Returns { recipe, method, warning }
 */
export async function importFromUrl(url, { aiUrl } = {}) {
  const clean = String(url)
    .trim()
    .match(/https?:\/\/\S+/)?.[0];
  if (!clean) throw new Error('That doesn’t look like a link. Paste a full URL starting with https://');
  const host = hostName(clean);

  let captionText = '';
  let title = '';
  let image = null;

  if (/tiktok\.com/.test(host)) {
    try {
      const r = await fetchWithTimeout(`https://www.tiktok.com/oembed?url=${encodeURIComponent(clean)}`);
      if (r.ok) {
        const j = await r.json();
        captionText = j.title || '';
        image = j.thumbnail_url || null;
        title = '';
      }
    } catch (e) {
      /* fall through */
    }
  } else if (/youtube\.com|youtu\.be/.test(host)) {
    try {
      const r = await fetchWithTimeout(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(clean)}`);
      if (r.ok) {
        const j = await r.json();
        title = j.title || '';
        image = j.thumbnail_url || null;
      }
    } catch (e) {
      /* fall through */
    }
  }

  if (!captionText) {
    let html = '';
    try {
      const res = await fetchWithTimeout(clean, { headers: { 'User-Agent': UA, Accept: 'text/html' } });
      html = await res.text();
    } catch (e) {
      if (!title) throw new Error('Couldn’t reach that page. Check your connection or try pasting the recipe text.');
    }
    if (html) {
      const ld = extractJsonLdRecipe(html, clean);
      if (isUsable(ld)) return { recipe: ld, method: 'Recipe card on page' };
      captionText = metaContent(html, 'og:description') || metaContent(html, 'description');
      title = title || metaContent(html, 'og:title') || decodeEntities(html.match(/<title>([^<]*)<\/title>/i)?.[1]);
      image = image || metaContent(html, 'og:image') || null;
      // Long pages without schema: give the AI the visible text
      if (captionText.length < 200) {
        const bodyText = decodeEntities(html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' '));
        if (bodyText.length > captionText.length) captionText = `${captionText}\n${bodyText.slice(0, 10000)}`;
      }
    }
  }

  if (aiUrl) {
    try {
      const recipe = await aiExtract(aiUrl, { text: `${title}\n${captionText}`, url: clean });
      recipe.image = recipe.image || image;
      return { recipe, method: 'AI extraction' };
    } catch (e) {
      // fall back to heuristics
    }
  }

  const guess = parseRecipeText(captionText, { title: title || undefined, sourceUrl: clean, image });
  return {
    recipe: guess,
    method: 'Best guess',
    warning: isUsable(guess)
      ? 'Parsed without AI — give it a quick check.'
      : 'This post didn’t include a full recipe in its caption. Fill in the gaps below, or turn on AI import in Settings.',
  };
}

export async function importFromText(text, { aiUrl } = {}) {
  if (!String(text || '').trim()) throw new Error('Paste some recipe text first.');
  if (aiUrl) {
    try {
      return { recipe: await aiExtract(aiUrl, { text }), method: 'AI extraction' };
    } catch (e) {
      /* fall back */
    }
  }
  const recipe = parseRecipeText(text);
  return {
    recipe,
    method: 'Best guess',
    warning: isUsable(recipe) ? undefined : 'Couldn’t spot clear ingredients and steps — edit below before saving.',
  };
}
