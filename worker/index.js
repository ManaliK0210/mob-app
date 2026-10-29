// Forkcast AI import proxy — a Cloudflare Worker (free tier is plenty for a demo).
// The app sends { text, url }; the worker asks Gemini for a structured recipe and returns JSON.
// Keeping the API key here means it never ships inside the APK.
//
// Deploy:
//   npm i -g wrangler
//   cd worker && wrangler deploy
//   wrangler secret put GEMINI_API_KEY      (free key from https://aistudio.google.com/apikey)
// Then put the printed https://forkcast-ai.<you>.workers.dev URL into the app's Settings,
// or into the AI_PROXY_URL repository secret so it is baked into the APK build.

const SCHEMA = {
  type: 'OBJECT',
  properties: {
    title: { type: 'STRING' },
    description: { type: 'STRING' },
    servings: { type: 'INTEGER' },
    totalMinutes: { type: 'INTEGER' },
    ingredients: { type: 'ARRAY', items: { type: 'STRING' } },
    steps: { type: 'ARRAY', items: { type: 'STRING' } },
    tags: { type: 'ARRAY', items: { type: 'STRING' } },
  },
  required: ['title', 'ingredients', 'steps'],
};

const PROMPT = `You turn messy recipe text (social media captions, video descriptions, blog pages, chat messages) into a clean recipe.
Rules:
- ingredients: one string per ingredient, quantity first, e.g. "2 tbsp olive oil". Use US units if the source does; never invent quantities that are not implied.
- steps: short imperative sentences in cooking order, no numbering.
- If the text clearly describes a dish but omits quantities, list ingredients without quantities.
- tags: up to 4 lowercase tags such as meal type, cuisine or diet.
- If there is no recipe at all, return title "" and empty arrays.
Source text:
`;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...cors } });

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (request.method !== 'POST') return json({ error: 'POST { text, url } to this endpoint' }, 405);

    let body;
    try {
      body = await request.json();
    } catch (e) {
      return json({ error: 'Body must be JSON' }, 400);
    }
    const text = String(body.text || '').slice(0, 12000);
    if (text.trim().length < 10) return json({ error: 'Not enough text to read a recipe from' }, 400);

    const model = env.GEMINI_MODEL || 'gemini-2.5-flash';
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: PROMPT + (body.url ? `(from ${body.url})\n` : '') + text }] }],
        generationConfig: { responseMimeType: 'application/json', responseSchema: SCHEMA, temperature: 0.2 },
      }),
    });
    if (!res.ok) return json({ error: `Model error ${res.status}` }, 502);

    const data = await res.json();
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    try {
      const recipe = JSON.parse(raw);
      if (!recipe.title) return json({ error: 'No recipe found in that text' }, 422);
      return json(recipe);
    } catch (e) {
      return json({ error: 'Model returned an unreadable answer' }, 502);
    }
  },
};
