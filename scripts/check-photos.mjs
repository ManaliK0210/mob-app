// Confirms every sample-recipe photo URL loads (run in CI, where the network is open).
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../src/data/seed.js', import.meta.url), 'utf8');
const ids = [...src.matchAll(/photo\('([^']+)'\)/g)].map((m) => m[1]);
let bad = 0;
for (const id of ids) {
  const url = `https://images.unsplash.com/photo-${id}?w=1000&q=70&auto=format&fit=crop`;
  const res = await fetch(url, { method: 'GET' }).catch((e) => ({ ok: false, status: e.message }));
  const type = res.headers?.get?.('content-type') || '';
  const ok = res.ok && type.startsWith('image/');
  if (!ok) bad += 1;
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${res.status} ${type} ${id}`);
}
if (bad) {
  console.log(`::error::${bad} sample photo(s) failed to load`);
  process.exit(1);
}
console.log(`All ${ids.length} sample photos load.`);
