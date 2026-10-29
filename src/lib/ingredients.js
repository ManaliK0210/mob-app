// Ingredient parsing, scaling, formatting and grocery merging.
// Pure functions only — no React Native imports, so this file is unit-testable in Node.

const UNICODE_FRACTIONS = {
  '½': 0.5,
  '⅓': 1 / 3,
  '⅔': 2 / 3,
  '¼': 0.25,
  '¾': 0.75,
  '⅕': 0.2,
  '⅖': 0.4,
  '⅗': 0.6,
  '⅘': 0.8,
  '⅙': 1 / 6,
  '⅚': 5 / 6,
  '⅛': 0.125,
  '⅜': 0.375,
  '⅝': 0.625,
  '⅞': 0.875,
};

// canonical unit -> aliases (lowercase, no trailing dot)
const UNIT_ALIASES = {
  cup: ['cup', 'cups', 'c'],
  tbsp: ['tbsp', 'tbs', 'tbl', 'tablespoon', 'tablespoons', 'tbsps', 'T'],
  tsp: ['tsp', 'teaspoon', 'teaspoons', 'tsps', 't'],
  g: ['g', 'gr', 'gram', 'grams', 'gm', 'gms'],
  kg: ['kg', 'kgs', 'kilogram', 'kilograms'],
  ml: ['ml', 'milliliter', 'milliliters', 'millilitre', 'millilitres'],
  l: ['l', 'liter', 'liters', 'litre', 'litres'],
  oz: ['oz', 'ounce', 'ounces'],
  'fl oz': ['fl oz', 'fluid ounce', 'fluid ounces'],
  lb: ['lb', 'lbs', 'pound', 'pounds'],
  clove: ['clove', 'cloves'],
  can: ['can', 'cans', 'tin', 'tins'],
  pinch: ['pinch', 'pinches'],
  dash: ['dash', 'dashes'],
  slice: ['slice', 'slices'],
  stick: ['stick', 'sticks'],
  bunch: ['bunch', 'bunches'],
  handful: ['handful', 'handfuls'],
  pack: ['package', 'packages', 'pkg', 'pack', 'packs', 'packet', 'packets'],
  sprig: ['sprig', 'sprigs'],
  piece: ['piece', 'pieces', 'pc', 'pcs'],
  head: ['head', 'heads'],
  jar: ['jar', 'jars'],
};

const UNIT_LOOKUP = (() => {
  const map = {};
  for (const [canon, aliases] of Object.entries(UNIT_ALIASES)) {
    for (const a of aliases) map[a] = canon;
  }
  return map;
})();

// Case-sensitive single letters ("T" = tbsp, "t" = tsp) are handled first.
function lookupUnit(word) {
  if (!word) return null;
  const clean = word.replace(/\.$/, '');
  if (clean === 'T' || clean === 't') return clean === 'T' ? 'tbsp' : 'tsp';
  if (clean === 'c' || clean === 'C') return 'cup';
  return UNIT_LOOKUP[clean.toLowerCase()] || null;
}

function replaceUnicodeFractions(str) {
  // "1½" -> "1 1/2"-style numeric handled by converting to decimal text
  return str.replace(/(\d)?\s*([½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞])/g, (_, whole, frac) => {
    const value = (whole ? Number(whole) : 0) + UNICODE_FRACTIONS[frac];
    return ` ${Number(value.toFixed(4))}`;
  });
}

function parseNumberToken(tok) {
  if (!tok) return null;
  if (/^\d+\/\d+$/.test(tok)) {
    const [a, b] = tok.split('/').map(Number);
    return b ? a / b : null;
  }
  if (/^\d+(\.\d+)?$/.test(tok)) return Number(tok);
  if (/^\d+,\d+$/.test(tok)) return Number(tok.replace(',', '.'));
  return null;
}

/**
 * Parse a free-text ingredient line.
 * "2 1/2 cups all-purpose flour, sifted" -> { qty: 2.5, unit: 'cup', name: 'all-purpose flour, sifted' }
 */
export function parseIngredient(raw) {
  const original = String(raw || '').trim();
  let s = original
    .replace(/^[\s•·\-–—*▢□☐✓✔]+/, '') // bullets / checkboxes
    .replace(/\s+/g, ' ')
    .trim();
  s = replaceUnicodeFractions(s).trim();

  let qty = null;
  let qtyMax = null;
  const tokens = s.split(' ');
  let i = 0;

  // quantity: "1", "1/2", "1 1/2", "1.5", "1-2", "1 to 2"
  const first = parseNumberToken(tokens[i]);
  const rangeMatch = tokens[i] && tokens[i].match(/^(\d+(?:[./]\d+)?)[-–](\d+(?:[./]\d+)?)$/);
  if (rangeMatch) {
    qty = parseNumberToken(rangeMatch[1]);
    qtyMax = parseNumberToken(rangeMatch[2]);
    i += 1;
  } else if (first !== null) {
    qty = first;
    i += 1;
    const second = parseNumberToken(tokens[i]);
    if (second !== null && /\//.test(tokens[i]) && second < 1) {
      qty += second; // mixed number "1 1/2"
      i += 1;
    } else if ((tokens[i] === '-' || tokens[i] === 'to' || tokens[i] === '–') && parseNumberToken(tokens[i + 1]) !== null) {
      qtyMax = parseNumberToken(tokens[i + 1]);
      i += 2;
    }
  } else {
    // "a pinch of salt" / "an onion"
    if (/^(a|an)$/i.test(tokens[i] || '') && lookupUnit(tokens[i + 1])) {
      qty = 1;
      i += 1;
    }
  }

  // number glued to unit: "200g", "500ml"
  if (qty === null) {
    const glued = (tokens[i] || '').match(/^(\d+(?:\.\d+)?)([a-zA-Z]+)$/);
    if (glued && lookupUnit(glued[2])) {
      qty = Number(glued[1]);
      tokens[i] = glued[2];
    }
  }

  // parenthetical size after qty: "1 (14 oz) can tomatoes" -> keep in name
  let unit = null;
  if (tokens[i] && lookupUnit(tokens[i])) {
    unit = lookupUnit(tokens[i]);
    i += 1;
  } else if (tokens[i] && tokens[i + 1] && lookupUnit(`${tokens[i]} ${tokens[i + 1]}`)) {
    unit = lookupUnit(`${tokens[i]} ${tokens[i + 1]}`);
    i += 2;
  }

  let name = tokens
    .slice(i)
    .join(' ')
    .replace(/^of\s+/i, '')
    .trim();
  if (!name) name = original;

  return { raw: original, qty, qtyMax, unit, name };
}

const NICE_FRACTIONS = [
  [0, ''],
  [0.125, '⅛'],
  [0.25, '¼'],
  [1 / 3, '⅓'],
  [0.375, '⅜'],
  [0.5, '½'],
  [0.625, '⅝'],
  [2 / 3, '⅔'],
  [0.75, '¾'],
  [0.875, '⅞'],
  [1, ''],
];

export function formatQty(q) {
  if (q === null || q === undefined || Number.isNaN(q)) return '';
  if (q >= 10) return String(Math.round(q));
  const whole = Math.floor(q);
  const frac = q - whole;
  let best = NICE_FRACTIONS[0];
  for (const f of NICE_FRACTIONS) {
    if (Math.abs(f[0] - frac) < Math.abs(best[0] - frac)) best = f;
  }
  if (Math.abs(best[0] - frac) > 0.04) {
    return String(Number(q.toFixed(q < 1 ? 2 : 1)));
  }
  if (best[0] === 1) return String(whole + 1);
  if (!best[1]) return String(whole);
  return whole ? `${whole}${best[1]}` : best[1];
}

const PLURAL_SAFE_UNITS = new Set([
  'cup',
  'clove',
  'can',
  'slice',
  'stick',
  'bunch',
  'handful',
  'pack',
  'sprig',
  'piece',
  'head',
  'jar',
  'pinch',
  'dash',
]);

export function formatUnit(unit, qty) {
  if (!unit) return '';
  if (PLURAL_SAFE_UNITS.has(unit) && qty !== null && qty > 1) {
    if (unit === 'bunch' || unit === 'pinch' || unit === 'dash') return `${unit}es`;
    return `${unit}s`;
  }
  return unit;
}

/** Render an ingredient scaled by factor. */
export function formatIngredient(ing, factor = 1) {
  if (ing.qty === null || ing.qty === undefined) return ing.name || ing.raw;
  const q = ing.qty * factor;
  const qMax = ing.qtyMax ? ing.qtyMax * factor : null;
  const qtyText = qMax ? `${formatQty(q)}–${formatQty(qMax)}` : formatQty(q);
  const unitText = formatUnit(ing.unit, qMax || q);
  return [qtyText, unitText, ing.name].filter(Boolean).join(' ');
}

// ---------- Grocery aisles ----------

const AISLES = [
  [
    'Produce',
    [
      'onion',
      'garlic',
      'shallot',
      'tomato',
      'potato',
      'carrot',
      'celery',
      'lettuce',
      'spinach',
      'kale',
      'cabbage',
      'pepper',
      'chili',
      'chilli',
      'jalapeño',
      'jalapeno',
      'cucumber',
      'zucchini',
      'courgette',
      'eggplant',
      'aubergine',
      'broccoli',
      'cauliflower',
      'mushroom',
      'avocado',
      'lemon',
      'lime',
      'orange',
      'apple',
      'banana',
      'berries',
      'berry',
      'strawberr',
      'blueberr',
      'raspberr',
      'mango',
      'pineapple',
      'ginger',
      'cilantro',
      'coriander leaves',
      'parsley',
      'basil',
      'mint',
      'dill',
      'thyme',
      'rosemary',
      'scallion',
      'spring onion',
      'green onion',
      'leek',
      'corn',
      'pea',
      'bean sprout',
      'sweet potato',
      'squash',
      'pumpkin',
      'arugula',
      'rocket',
      'herb',
      'grape',
      'peach',
      'pear',
    ],
  ],
  [
    'Meat & Seafood',
    [
      'chicken',
      'beef',
      'pork',
      'lamb',
      'turkey',
      'bacon',
      'sausage',
      'ham',
      'steak',
      'shrimp',
      'prawn',
      'salmon',
      'tuna',
      'cod',
      'fish',
      'chorizo',
      'prosciutto',
    ],
  ],
  [
    'Dairy & Eggs',
    [
      'milk',
      'butter',
      'cheese',
      'parmesan',
      'mozzarella',
      'feta',
      'cheddar',
      'ricotta',
      'yogurt',
      'yoghurt',
      'cream',
      'egg',
      'ghee',
      'paneer',
    ],
  ],
  ['Bakery', ['bread', 'bun', 'tortilla', 'pita', 'baguette', 'naan', 'wrap', 'roll', 'croissant']],
  [
    'Spices & Seasoning',
    [
      'salt',
      'pepper flakes',
      'black pepper',
      'cumin',
      'paprika',
      'turmeric',
      'cinnamon',
      'oregano',
      'chili powder',
      'chilli powder',
      'curry powder',
      'garam masala',
      'nutmeg',
      'cardamom',
      'clove',
      'bay leaf',
      'bay leaves',
      'seasoning',
      'spice',
      "za'atar",
      'sumac',
      'red pepper flakes',
      'vanilla',
    ],
  ],
  ['Frozen', ['frozen', 'ice cream']],
  [
    'Pantry',
    [
      'flour',
      'sugar',
      'rice',
      'pasta',
      'spaghetti',
      'penne',
      'linguine',
      'fettuccine',
      'macaroni',
      'gnocchi',
      'couscous',
      'tortellini',
      'noodle',
      'oil',
      'vinegar',
      'soy sauce',
      'sauce',
      'stock',
      'broth',
      'honey',
      'maple',
      'syrup',
      'oats',
      'quinoa',
      'lentil',
      'chickpea',
      'bean',
      'nut',
      'peanut',
      'almond',
      'cashew',
      'seed',
      'tahini',
      'mustard',
      'ketchup',
      'mayo',
      'baking',
      'yeast',
      'cocoa',
      'chocolate',
      'coconut milk',
      'canned',
      'tomato paste',
      'paste',
      'breadcrumb',
      'panko',
      'cornstarch',
      'cornflour',
      'sesame',
      'miso',
      'sriracha',
      'stock cube',
      'wine',
      'water',
    ],
  ],
];

export const AISLE_ORDER = ['Produce', 'Meat & Seafood', 'Dairy & Eggs', 'Bakery', 'Pantry', 'Spices & Seasoning', 'Frozen', 'Other'];

export function aisleFor(name) {
  // Classify on the core name only: "garlic, minced" -> "garlic" (so "minced" can't look like meat)
  const core = String(name)
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ')
    .split(',')[0]
    .replace(PREP_WORDS, ' ');
  const n = ` ${core.replace(/\s+/g, ' ').trim()} `;
  // Spices first for tricky overlaps ("black pepper" vs "bell pepper"), pantry before produce ("tomato paste")
  if (/ (peanut|almond|cashew|nut) butter | coconut milk | coconut cream | oat milk | almond milk /.test(n)) return 'Pantry';
  const ordered = [AISLES[4], AISLES[1], AISLES[2], AISLES[6], AISLES[0], AISLES[3], AISLES[5]];
  for (const [aisle, words] of ordered) {
    for (const w of words) {
      if (n.includes(` ${w}`)) {
        if (aisle === 'Pantry' && (w === 'nut' || w === 'seed') && /nutmeg/.test(n)) continue;
        if (aisle === 'Pantry' && w === 'bean' && /green bean/.test(n)) return 'Produce';
        if (aisle === 'Pantry' && w === 'water' && /watermelon/.test(n)) return 'Produce';
        return aisle;
      }
    }
  }
  return 'Other';
}

// ---------- Grocery merge ----------

const PREP_WORDS =
  /\b(fresh(ly)?|large|medium|small|chopped|finely|roughly|thinly|minced|diced|sliced|grated|peeled|crushed|ground|to taste|optional|softened|melted|room temperature|packed|heaping|cooked|uncooked|raw|boneless|skinless|extra virgin|divided|for serving|for garnish|plus more)\b/g;

export function normalizeName(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ')
    .split(',')[0]
    .replace(PREP_WORDS, ' ')
    .replace(/[^a-z\s'-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/(oes|ies|s)$/, (m) => (m === 'ies' ? 'y' : m === 'oes' ? 'o' : ''))
    .trim();
}

function displayName(name) {
  const base = String(name || '')
    .replace(/\(.*?\)/g, '')
    .split(',')[0]
    .replace(PREP_WORDS, '')
    .replace(/\s+/g, ' ')
    .trim();
  return base ? base.charAt(0).toUpperCase() + base.slice(1) : name;
}

/**
 * Merge ingredient lines into grocery items.
 * entries: [{ ingredient: {qty, unit, name, raw}, factor, recipeTitle }]
 * Returns: [{ key, name, qty, unit, aisle, sources: [titles], note }]
 */
export function mergeIngredients(entries) {
  const map = new Map();
  for (const { ingredient, factor = 1, recipeTitle } of entries) {
    const ing = ingredient.qty === undefined ? parseIngredient(ingredient.raw || ingredient.name) : ingredient;
    const norm = normalizeName(ing.name);
    if (!norm) continue;
    const key = `${norm}|${ing.unit || ''}`;
    const existing = map.get(key);
    const amount = ing.qty !== null && ing.qty !== undefined ? ing.qty * factor : null;
    if (existing) {
      if (amount !== null) existing.qty = (existing.qty || 0) + amount;
      if (recipeTitle && !existing.sources.includes(recipeTitle)) existing.sources.push(recipeTitle);
    } else {
      map.set(key, {
        key,
        name: displayName(ing.name),
        qty: amount,
        unit: ing.unit || null,
        aisle: aisleFor(ing.name),
        sources: recipeTitle ? [recipeTitle] : [],
      });
    }
  }
  return [...map.values()];
}

export function formatGroceryAmount(item) {
  if (item.qty === null || item.qty === undefined) return '';
  return [formatQty(item.qty), formatUnit(item.unit, item.qty)].filter(Boolean).join(' ');
}
