import Papa from 'papaparse';

// ── Constants ──────────────────────────────────────────────────────────────────

const ALLOWED_CATEGORIES = new Set([
  'DoigtBag', 'DoigtAll', 'ChMultiLong', 'Suspendre',
  'Cou', 'Oreille', 'Poignet', 'Cheville',
]);

const CATEGORY_MAP = {
  DoigtBag:    'Apparel & Accessories > Jewelry > Rings',
  DoigtAll:    'Apparel & Accessories > Jewelry > Rings',
  ChMultiLong: 'Apparel & Accessories > Jewelry > Necklaces',
  Suspendre:   'Apparel & Accessories > Jewelry > Charms & Pendants',
  Cou:         'Apparel & Accessories > Jewelry > Necklaces',
  Cheville:    'Apparel & Accessories > Jewelry > Anklets',
  Oreille:     'Apparel & Accessories > Jewelry > Earrings',
  Poignet:     'Apparel & Accessories > Jewelry > Bracelets',
};

const ALLOWED_RING_SIZES = new Set([
  43, 44, 46, 47, 48, 50, 51, 52, 53, 54,
  55, 56, 57, 58, 59, 60, 61, 62, 63, 64,
  66, 67, 68, 69, 70, 72, 73,
]);

const RING_SIZE_MAP = {
  43: 'E - 2 - 43',      44: 'F - 2.5 - 44',    46: 'G - 3 - 46',
  47: 'H - 3.5 - 47',    48: 'I - 4 - 48',       50: 'J - 4.5 - 50',
  51: 'K - 5 - 51',      52: 'L - 5.5 - 52',     53: 'M - 6 - 53',
  54: 'M.5 - 6.5 - 54',  55: 'N - 6.5 - 55',     56: 'O - 7 - 56',
  57: 'P - 7.5 - 57',    58: 'Q - 8 - 58',       59: 'R - 8.5 - 59',
  60: 'R.5 - 9 - 60',    61: 'S - 9 - 61',       62: 'T - 9.5 - 62',
  63: 'U - 10 - 63',     64: 'V - 10.5 - 64',    66: 'W - 11 - 66',
  67: 'X - 11.5 - 67',   68: 'Y - 12 - 68',      69: 'Z - 12.5 - 69',
  70: 'Z+1 - 13 - 70',   72: 'Z+2 - 13.5 - 72',  73: 'Z+3 - 14 - 73',
};

// ── Description helpers ────────────────────────────────────────────────────────

function norm(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

const COLOUR_MAP = {
  jaune: 'Yellow',    blanc: 'White',      rose: 'Rose Gold',
  rouge: 'Red',       noir: 'Black',       argent: 'Silver',
  dore: 'Gold',       gris: 'Grey',        vert: 'Green',
  bleu: 'Blue',       multicolore: 'Multicolour',
  bicolore: 'Two-tone', tricolore: 'Three-tone',
  violet: 'Violet',   orange: 'Orange',    marron: 'Brown',
  brun: 'Brown',      lilas: 'Lilac',      fushia: 'Fuchsia',
};

const GEMSTONE_MAP = {
  diamant: 'Diamond',    saphir: 'Sapphire',  rubis: 'Ruby',
  emeraude: 'Emerald',   perle: 'Pearl',      zircon: 'Cubic Zirconia',
  oxzir: 'Cubic Zirconia', oxyde: 'Cubic Zirconia', oz: 'Cubic Zirconia',
  spinelle: 'Spinel',    amethyste: 'Amethyst', ameth: 'Amethyst',
  topaze: 'Topaz',       tourmaline: 'Tourmaline', citrine: 'Citrine',
  aigue: 'Aquamarine',   aquamarine: 'Aquamarine', aqua: 'Aquamarine',
  grenat: 'Garnet',      onyx: 'Onyx',        nacre: 'Mother of Pearl',
  'dia.nat': 'Natural Diamond',
  'dia.syn': 'Diamond',   // resolves to 'Synthetic Diamond' via the isSyn prefix
  turquoise: 'Turquoise', peridot: 'Peridot',  lapis: 'Lapis Lazuli',
  hematit: 'Hematite',   ambre: 'Amber',       jade: 'Jade',
  aventurine: 'Aventurine', malachite: 'Malachite', prehn: 'Prehnite',
  larim: 'Larimar',      tsav: 'Tsavorite',    kyani: 'Kyanite',
  cristal: 'Crystal',    jaspe: 'Jasper',      apatite: 'Apatite',
  akoya: 'Akoya Pearl',  tahiti: 'Tahitian Pearl', tigre: "Tiger's Eye",
  // 2-letter standalone abbreviations (word-boundary matched — see getGemstone loop)
  di: 'Diamond',         ru: 'Ruby',               em: 'Emerald',
};

// Colour qualifiers used in product abbreviations (e.g. oz.blu, topa.ros)
const STONE_COLOUR_MAP = {
  blu: 'Blue',   bleu: 'Blue',
  blc: 'White',  blanc: 'White',
  ros: 'Pink',   rose: 'Pink',
  rou: 'Red',    rouge: 'Red',
  ver: 'Green',  vert: 'Green',
  noi: 'Black',  noir: 'Black',  nr: 'Black',
  jau: 'Yellow', jaune: 'Yellow',
  vio: 'Violet',
  marr: 'Brown', marron: 'Brown', brun: 'Brown',
  lila: 'Lilac', lilas: 'Lilac',
  ciel: 'Sky Blue',
  lavand: 'Lavender',
  cognac: 'Cognac',
  fush: 'Fuchsia',
  indigo: 'Indigo',
  lemon: 'Lemon',
  ecru: 'Ecru',
};

// Maps abbreviated stone names (as in libelle_produit) to their GEMSTONE_MAP value
const GEM_ABBREV_TO_VAL = {
  oz:     'Cubic Zirconia',
  topa:   'Topaz',
  saphir: 'Sapphire',
  tourm:  'Tourmaline',
  spinel: 'Spinel',
  ru:     'Ruby',
  em:     'Emerald',
  perle:  'Pearl',
  ameth:  'Amethyst',
  aqua:   'Aquamarine',
};

const STYLE_MAP = [
  // Multi-word phrases first (most specific)
  ['non confort',    'non-comfort fit'], ['confort',       'comfort fit'],
  ['sans vis',       'butterfly back'],  ['a vis',         'screw back'],
  ['de type chaine', 'chain'],           ['souple',        'flexible'],
  ['bombee',         'domed'],           ['biseautee',     'bevelled'],
  ['ajoure',         'openwork'],        ['pavage',        'pavé set'],
  ['pavee',          'pavé'],
  ['solitaire accompagn', 'solitaire with side stones'],
  ['avec entourage',      'solitaire with side stones'],
  ['solitaire nonacc',    'plain solitaire'],
  ['solitaire',     'solitaire'],
  ['chevaliere',     'signet'],          ['boules',        'ball chain'],
  ['marine',         'anchor chain'],    ['fantaisie',     'fancy link'],
  ['identit',        'ID'],             ['plaque',        'ID plate'],
  ['jonc',           'bangle'],         ['creole',        'hoop'],
  ['puces',          'studs'],          ['multi ',        'multi-stone'],
  ['empierr',        'stone-set'],      ['godron',        'fluted'],
  ['torsad',         'twisted'],        ['non alternee',  'non-alternating link'],
  ['alternee',       'alternating link'], ['anglais',     'cable chain'],
  ['haricot',        'bean chain'],     ['palmier',       'palm chain'],
  ['maille',         'chain'],
  ['griffe',         'claw set'],       ['canal',         'channel set'],
  ['etrier',         'bar set'],        ['serti',         'set'],
  ['medaille',       'medallion'],      ['religieux',      'religious'],
  ['ange',           'angel'],
  ['croix',          'cross'],          ['vierge',        'Virgin Mary'],
  ['coeur',          'heart'],          ['etoile',        'star'],
  ['fleur',          'floral'],         ['rigide',        'bangle'],
  ['breloque',       'charm/dangle'],
  ['forcat',         'curb chain'],
  ['gourm',          'gourmette chain'],
  ['filigran',       'filigree chain'],
  ['zodiaque',       'zodiac'],
  ['venezian',       'venetian chain'],
  ['singapour',      'singapore chain'],
  ['spiga',          'spiga chain'],
  ['corde',          'rope chain'],
  // New chain types
  ['figaro',         'figaro chain'],
  ['jaseron',        'jaseron chain'],
  ['bismark',        'bismarck chain'],
  ['serpentin',      'serpentine chain'],
  ['paillasson',     'flat weave'],
  // New finish / shape / style descriptors
  ['demitour',       'half eternity'],
  ['tourbillon',     'swirl'],
  ['trilogie',       'trilogy'],
  ['tresse',         'braided'],
  ['ruban',          'ribbon'],
  ['miroir',         'mirror finish'],
  ['martelee',       'hammered'],
  ['satinee',        'satin finish'],
  ['concave',        'concave'],
  ['infini',         'infinity'],
  ['arbre',          'tree of life'],
  ['ouvrant',        'locket'],
  ['ovale',          'oval'],
  ['manchette',      'cuff'],
  ['riviere',        'rivière'],
  ['allongee',       'elongated'],
  ['princesse',      'princess cut'],
  ['rectangul',      'rectangular'],
  ['carre',          'square'],
  // Motifs
  ['lune',           'moon'],
  ['colombe',        'dove'],
  ['trefle',         'clover'],
  ['choker',         'choker'],
  // Tone descriptors
  ['bicolore',       'two-tone'],
  ['tricolore',      'three-tone'],
  // Target audience / age range
  ['enfant',         "children's"],
  ['bebe',           'baby'],
  ['junior',         'junior'],
];

const SPECIFIC_CHAIN_TYPES = new Set([
  'anchor chain', 'ball chain', 'fancy link', 'alternating link',
  'flexible', 'curb chain', 'gourmette chain', 'filigree chain',
  'venetian chain', 'singapore chain', 'spiga chain', 'rope chain',
  'cable chain', 'bean chain', 'palm chain',
  'figaro chain', 'jaseron chain', 'bismarck chain',
  'serpentine chain', 'flat weave',
]);

// French zodiac sign names → English
const ZODIAC_MAP = {
  belier: 'Aries',       taureau: 'Taurus',
  gemeaux: 'Gemini',     cancer: 'Cancer',
  lion: 'Leo',           vierge: 'Virgo',
  balance: 'Libra',      scorpion: 'Scorpio',
  sagittaire: 'Sagittarius', capricorne: 'Capricorn',
  verseau: 'Aquarius',   poissons: 'Pisces',
};

function getColourEn(couleur) {
  if (!couleur) return '';
  return (couleur + '').split(',')
    .map(p => COLOUR_MAP[norm(p.trim())] || p.trim())
    .join(' & ');
}

function gemCore(g) {
  return g.replace(/^(Synthetic |Natural )/, '');
}

// Which GEMSTONE_MAP values a piece of normalised text names, in map order.
// Short keys (≤3 chars) use word-boundary matching to avoid false positives.
function gemValuesIn(text) {
  const vals = [];
  for (const [key, val] of Object.entries(GEMSTONE_MAP)) {
    const hit = key.length <= 3
      ? new RegExp('\\b' + key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b').test(text)
      : text.includes(key);
    if (hit && !vals.includes(val)) vals.push(val);
  }
  return vals;
}

// Stone specs in libelle_supplementaire list slash-separated alternatives:
// "Perle=Syn/Imit&di/oz" means the stone is a diamond OR a cubic zirconia, not
// both. libelle_produit names the one actually used, so it is authoritative —
// the same rule getStyle() already applies to slash-separated chain types.
// Without this, an imitation-pearl-and-CZ piece reads as containing a diamond.
function dropUnusedAlternatives(gems, suppN, prodN) {
  const prodVals = gemValuesIn(prodN).map(gemCore);
  if (!prodVals.length) return gems;
  let kept = gems;
  for (const m of suppN.matchAll(/([a-z.]{2,12})\s*\/\s*([a-z.]{2,12})/g)) {
    const alts = [...new Set([...gemValuesIn(m[1]), ...gemValuesIn(m[2])].map(gemCore))];
    if (alts.length < 2) continue;                  // not a stone alternation
    const used = alts.filter(v => prodVals.includes(v));
    if (!used.length) continue;                     // prod names none — keep both
    kept = kept.filter(g => !alts.includes(gemCore(g)) || used.includes(gemCore(g)));
  }
  return kept.length ? kept : gems;
}

function getGemstone(supp, prod) {
  const n = norm(supp || '');
  if (!n || n.includes('nogem') || n.replace(/\s/g,'').includes('toutmetal')) return '';
  const prodN = norm(prod || '');
  // isSyn is true if either field mentions synthetic stones
  const isSyn = n.includes('syn') || prodN.includes('syn');
  let gems = [];
  const addGem = (g) => {
    const core = gemCore(g);
    if (!gems.some(ex => gemCore(ex) === core)) gems.push(g);
  };
  for (const val of gemValuesIn(n)) addGem((isSyn ? 'Synthetic ' : '') + val);
  // Second pass: scan libelle_produit for additional stones not listed in supp
  // (MRM supp often names only the main stone; prod abbreviations list all stones)
  for (const val of gemValuesIn(prodN)) addGem((isSyn ? 'Synthetic ' : '') + val);
  gems = dropUnusedAlternatives(gems, n, prodN);
  if (!gems.length) return '';
  const combined = (supp || '') + ' ' + (prod || '');
  const caratM   = combined.match(/(\d+[.,]\d+)\s*ct/i);
  const qualityM = combined.match(/\b([A-Z]{1,2}-[A-Z0-9]{1,3})\b/);
  const details  = [];
  if (caratM)   details.push(caratM[1].replace(',', '.') + 'ct');
  if (qualityM) details.push(qualityM[1]);
  // Detect colour qualifiers — supports multiple colours per gem (e.g. oz.blc+nr → White & Black CZ)
  // Uses matchAll to scan ALL occurrences of the abbreviation (supp may say OZ.Couleur generically
  // while prod says oz.blc+nr specifically; we want to catch both).
  const combinedN    = norm(combined);
  const colourKeys   = Object.keys(STONE_COLOUR_MAP).sort((a, b) => b.length - a.length);
  const colourPat    = colourKeys.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const detectedBases = new Set(gems.map(g => g.replace('Synthetic ', '').replace('Natural ', '')));
  const gemColours   = {};
  for (const [abbrev, gemVal] of Object.entries(GEM_ABBREV_TO_VAL)) {
    if (!detectedBases.has(gemVal)) continue;
    const esc  = abbrev.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const segRe = new RegExp(`\\b${esc}[.\\s\\-]*([\\w+,/]{1,25})`, 'g');
    const colRe = new RegExp(`(${colourPat})`, 'g');
    const allColours = [];
    for (const segM of combinedN.matchAll(segRe)) {
      for (const colM of segM[1].matchAll(colRe)) {
        allColours.push(STONE_COLOUR_MAP[colM[1]]);
      }
    }
    if (allColours.length) {
      gemColours[gemVal] = [...new Set(allColours)];
    }
  }
  const gemStrs = [];
  for (const g of gems) {
    const base    = g.replace('Synthetic ', '').replace('Natural ', '');
    const colours = gemColours[base] || [];
    if (colours.length) {
      for (const c of colours) gemStrs.push(c + ' ' + g);
    } else {
      gemStrs.push(g);
    }
  }
  return gemStrs.join(' & ') + (details.length ? ` (${details.join(', ')})` : '');
}

function getStyle(libProd, libSupp) {
  const supp = libSupp || '';
  const afterColon = supp.includes(':') ? supp.split(':').slice(1).join(':') : supp;
  const suppN = norm(afterColon);
  const prodN = norm(libProd || '');

  // Build supp-derived and prod-derived style lists separately
  const seenSupp = [];
  for (const [key, val] of STYLE_MAP) {
    if (suppN.includes(key) && !seenSupp.includes(val)) seenSupp.push(val);
  }
  const seenProd = [];
  for (const [key, val] of STYLE_MAP) {
    if (key === 'plaque') continue;   // skip to avoid matching 'plaqué'
    if (prodN.includes(key) && !seenProd.includes(val)) seenProd.push(val);
  }

  // If libelle_produit names a specific chain type, it is the authoritative source.
  // Supp often lists slash-separated alternatives ("Anglaise/Haricot/Palmier");
  // discard those alternatives and keep only the prod-identified chain.
  const prodChains = seenProd.filter(v => SPECIFIC_CHAIN_TYPES.has(v));
  if (prodChains.length) {
    for (let i = seenSupp.length - 1; i >= 0; i--) {
      if (SPECIFIC_CHAIN_TYPES.has(seenSupp[i])) seenSupp.splice(i, 1);
    }
  }

  // Merge: supp first, then prod additions not already present
  const seen = [...seenSupp];
  for (const v of seenProd) {
    if (!seen.includes(v)) seen.push(v);
  }

  if (seen.includes('non-comfort fit')) {
    const idx = seen.indexOf('comfort fit');
    if (idx !== -1) seen.splice(idx, 1);
  }
  if (seen.includes('non-alternating link')) {
    const idx = seen.indexOf('alternating link');
    if (idx !== -1) seen.splice(idx, 1);
  }
  if (seen.includes('chain') && seen.some(v => SPECIFIC_CHAIN_TYPES.has(v))) {
    seen.splice(seen.indexOf('chain'), 1);
  }
  if (seen.includes('solitaire with side stones')) {
    for (const redundant of ['solitaire', 'stone-set']) {
      const ri = seen.indexOf(redundant);
      if (ri !== -1) seen.splice(ri, 1);
    }
  }
  if (seen.includes('plain solitaire')) {
    const si = seen.indexOf('solitaire');
    if (si !== -1) seen.splice(si, 1);
  }
  // If a generic "zodiac" was detected, try to resolve to the specific sign name
  if (seen.includes('zodiac')) {
    const combinedN = norm((libProd || '') + ' ' + (libSupp || ''));
    for (const [frSign, enSign] of Object.entries(ZODIAC_MAP)) {
      if (combinedN.includes(frSign)) {
        seen[seen.indexOf('zodiac')] = `Zodiac Symbol (${enSign})`;
        // "vierge" also triggers Virgin Mary in STYLE_MAP → remove that duplicate
        if (enSign === 'Virgo') {
          const vmIdx = seen.indexOf('Virgin Mary');
          if (vmIdx !== -1) seen.splice(vmIdx, 1);
        }
        break;
      }
    }
  }
  const sizeM   = (libProd || '').match(/(\d+(?:[.,]\d+)?)\s*mm/i);
  const letterM = (libProd || '').match(/lettr[a-z]*[.\s]+([A-Z])/);
  if (sizeM) seen.unshift(sizeM[1] + 'mm wide');
  if (letterM) {
    seen.unshift(`Letter ${letterM[1]} initial`);
    // Remove generic zodiac OR any resolved "Zodiac Symbol (X)" (this is an initial, not a zodiac)
    const zodiacVals = [...Object.values(ZODIAC_MAP).map(v => `Zodiac Symbol (${v})`), 'zodiac'];
    for (const zval of zodiacVals) {
      const zi = seen.indexOf(zval);
      if (zi !== -1) { seen.splice(zi, 1); break; }
    }
  }
  return seen.slice(0, 4).join(', ');
}

// Setting techniques that imply the piece is stone-set even when no stone is named
const SETTING_WORDS = ['empierr', 'serti', 'griffe', 'canal', 'pav'];

// Audience words marking a children's product. Matched as substrings on the
// accent-normalised label, so plurals and inflections come along for free
// ('enfants', 'fillette'). 'garcon' relies on norm() folding ç to c.
const KIDS_WORDS = ['enfant', 'bebe', 'fille', 'garcon'];

// MRM writes a lab-grown diamond as "di.syn" in libelle_produit and
// "P.Synt=Diamant.syn" in libelle_supplementaire; a natural one as "Dia.Nat".
// These are matched on the label rather than on the gemstone getGemstone()
// derives, because that function raises its "synthetic" flag from any "syn" in
// the row: on "Perle=Syn/Imit&di/oz" a synthetic *pearl* turns the incidental
// "di" into "Synthetic Diamond" and would mis-tag costume jewellery.
const LAB_DIAMOND_RE     = /\b(?:di|dia|diamant)[.\s-]*syn/;
const NATURAL_DIAMOND_RE = /\b(?:di|dia|diamant)[.\s-]*nat/;

function isKidsProduct(r) {
  const labelN = norm(`${r.libelle_produit || ''} ${r.libelle_supplementaire || ''}`);
  return KIDS_WORDS.some(w => labelN.includes(w));
}

function isWeddingRing(r, labelN) {
  return r['Product Type'] === 'Rings' && /\ballianc/.test(labelN);
}

function isBangleBracelet(r, labelN) {
  return r['Product Type'] === 'Bracelets' && (
    /\bjoncs?\b/.test(labelN) ||
    /\bbracelet\w*\b.{0,30}\brigide\b/.test(labelN) ||
    /\brigide\b.{0,30}\bbracelet\w*\b/.test(labelN)
  );
}

function isSignetRing(r, labelN) {
  if (r['Product Type'] !== 'Rings') return false;
  return (
    /\bchevalier(?:e|es|s)?\b/.test(labelN) ||
    /\b(?:bague|bag)[. ]*chev[.](?:\s|$)/.test(labelN) ||
    /\bsignet(?:[ .-]*ring)?s?\b/.test(labelN) ||
    /\bseal[ .-]*rings?\b/.test(labelN) ||
    /\b(?:bague|anneau)[ .-]*(?:a[ .-]*)?sceau\b/.test(labelN) ||
    /\b(?:bague|anneau)[ .-]*sigillair(?:e|es|s)?\b/.test(labelN) ||
    /\bbague[ .-]*cachet\b/.test(labelN)
  );
}

function isGentsProduct(labelN) {
  return /\b(?:hommes?|masculin(?:e|es|s)?|monsieur|gents?)\b/.test(labelN) ||
         /\bhom[. ]/.test(labelN);
}

// Normalized values for Shopify's custom.stones list metafield. Unlike the
// Description's Gemstone line, these omit colour, carat and quality details.
// Slash-separated MRM alternatives are resolved using libelle_produit.
export function getStoneValues(r) {
  const suppN = norm(r.libelle_supplementaire || '');
  const prodN  = norm(r.libelle_produit || '');
  const labelN = `${prodN} ${suppN}`;
  if (labelN.includes('nogem') || labelN.replace(/\s/g, '').includes('toutmetal')) {
    return ['Plain Metal/No Gems'];
  }
  if (!suppN && !prodN) return ['Plain Metal/No Gems'];
  let stones = [];
  const addStone = stone => {
    const core = gemCore(stone);
    if (!stones.some(existing => gemCore(existing) === core)) stones.push(core);
  };
  for (const stone of gemValuesIn(suppN)) addStone(stone);
  for (const stone of gemValuesIn(prodN)) addStone(stone);
  stones = dropUnusedAlternatives(stones, suppN, prodN).map(gemCore);
  if (!stones.length) return ['Plain Metal/No Gems'];

  return stones.map(stone => {
    if (stone !== 'Diamond') return stone;
    if (LAB_DIAMOND_RE.test(labelN)) return 'Lab Diamond';
    if (NATURAL_DIAMOND_RE.test(labelN)) return 'Natural Diamond';
    return 'Diamond';
  });
}

// Merchandising tags derived from the French catalogue label. MRM has no structured
// field for these, so they are read from libelle_produit / libelle_supplementaire.
export function getExtraTags(r) {
  const labelN   = norm(`${r.libelle_produit || ''} ${r.libelle_supplementaire || ''}`);
  const gemstone = getGemstone(r.libelle_supplementaire, r.libelle_produit);
  const stones   = getStoneValues(r).filter(stone => stone !== 'Plain Metal/No Gems');
  const tags     = [];

  const addTag = tag => {
    if (!tags.includes(tag)) tags.push(tag);
  };

  if (LAB_DIAMOND_RE.test(labelN))     addTag('Lab Diamonds');
  if (NATURAL_DIAMOND_RE.test(labelN)) addTag('Natural Diamonds');
  if (isKidsProduct(r)) addTag('Kids');

  if (isBangleBracelet(r, labelN)) addTag('BANGLE');
  if (isSignetRing(r, labelN)) addTag('SIGNET RING');
  if (r['Product Type'] === 'Rings' && !isWeddingRing(r, labelN) && !stones.length) {
    addTag('PLAIN METAL RING');
  }
  if (stones.length === 1 && stones[0] === 'Cubic Zirconia') addTag('ONLY ZIRCONIA');
  if (isGentsProduct(labelN)) addTag('GENTS');

  // Add one English-language tag for every stone positively identified in the
  // French catalogue fields. The no-gem fallback is deliberately excluded.
  for (const stone of stones) addTag(stone);

  // Earring-only classification. Matched on the raw label rather than getStyle(),
  // which truncates to the first four styles and can drop 'hoop'.
  if (r['Product Type'] === 'Earrings') {
    if (labelN.includes('creole')) {
      addTag('Hoop Earring');
    } else if (gemstone || SETTING_WORDS.some(w => labelN.includes(w))) {
      addTag('Stone Set Earring');
    }
  }
  return tags;
}

function buildDescription(r) {
  const libProd = r.libelle_produit  || '';
  const libSupp = r.libelle_supplementaire || '';
  const isWed   = r['Product Type'] === 'Rings' &&
                  (/allianc/i.test(libProd) || /allianc/i.test(libSupp));
  const prodType  = isWed ? 'Wedding Ring' : (r['Product Type'] || '');
  const gemstone  = getGemstone(libSupp, libProd);
  // "stone-set" is redundant when the Gemstone field already names the stone
  const rawStyle  = getStyle(libProd, libSupp);
  const style     = gemstone
    ? rawStyle.split(', ').filter(p => p !== 'stone-set').join(', ')
    : rawStyle;
  const colour    = getColourEn(r.couleur);
  const metal     = r['Option2 Value'] || '';
  const collection = r.collection || '';
  // When no gemstone, fold "plain metal" into the Description line instead of a separate Gemstone line
  const descLine = gemstone ? style : (style ? style + ', plain metal' : 'plain metal');
  const items = [`<li><b>Product Type:</b> ${prodType}</li>`];
  if (descLine)   items.push(`<li><b>Description:</b> ${descLine}</li>`);
  items.push(`<li><b>Metal:</b> ${metal}</li>`);
  if (gemstone)   items.push(`<li><b>Gemstone:</b> ${gemstone}</li>`);
  if (collection) items.push(`<li><b>Collection:</b> ${collection}</li>`);
  if (colour)     items.push(`<li><b>Colours:</b> ${colour}</li>`);
  let html = '<ul>' + items.join('') + '</ul>';
  // Append original French catalogue label (libelle_produit + libelle_supplementaire; no weight)
  const frParts = [libProd.trim(), libSupp.trim()].filter(p => p && p !== 'nan');
  if (frParts.length) {
    html += '<br><br><p><em>Original French MRM label:</em><br>' + frParts.join(' | ') + '</p>';
  }
  return html;
}

function getMetal(code_matiere, couleur) {
  const mat   = (code_matiere || '').trim().toUpperCase();
  const color = (couleur      || '').trim().toLowerCase();
  if (mat === 'AU750') {
    if (color === 'jaune') return '18CT YELLOW GOLD';
    if (color === 'blanc') return '18CT WHITE GOLD';
    if (color === 'rose')  return '18CT ROSE GOLD';
    return '18CT GOLD';
  }
  if (mat === 'AU375') {
    if (color === 'jaune') return '9CT YELLOW GOLD';
    if (color === 'blanc') return '9CT WHITE GOLD';
    if (color === 'rose')  return '9CT ROSE GOLD';
    return '9CT GOLD';
  }
  if (mat === 'AG925') return 'SILVER';
  if (mat === 'PAU')   return 'GOLD PLATED';
  if (mat === 'STEEL') return 'STEEL';
  return '';
}

const COLLECTION_TAGS = [
  'amore', 'mrm 375', 'apa', 'argy.all',
  'diamanti09', 'diamanti18', 'argy.375', 'cargo',
];

// Exact headers emitted by Shopify's own product export for this store.
export const AGE_GROUP_HEADER  = 'Age Group (product.metafields.custom.age_group)';
export const JEWEL_STYLE_HEADER = 'Jewel Style (product.metafields.custom.jewel_style)';
export const STONES_HEADER      = 'Stones (product.metafields.custom.stones)';

export const OUTPUT_COLUMNS = [
  'Title', 'URL Handle', 'Description', 'Vendor', 'Product Category',
  'Type', 'Tags', 'Published on online store', 'Status',
  'SKU', 'Barcode', 'Option1 Name', 'Option1 Value',
  'Option2 Name', 'Option2 Value', 'Price', 'Charge tax',
  'Inventory quantity', 'Continue selling when out of stock',
  'Weight value (grams)', 'Weight unit for display',
  'Requires shipping', 'Fulfillment service', 'Product Image URL',
  'Variant Inventory Tracker',
  'product.metafields.custom.stock_level',
  AGE_GROUP_HEADER,
  JEWEL_STYLE_HEADER,
  STONES_HEADER,
];

// Minimum columns to update Description, Tags, and scalar custom metafields on existing
// Shopify products without touching inventory, pricing, or images. These are product-level fields, but Option
// columns are required so Shopify can match each row to the correct variant; omitting
// them would delete all variants.
export const DESC_UPDATE_COLUMNS = [
  'Title', 'URL Handle', 'Description', 'Tags', 'Published on online store',
  AGE_GROUP_HEADER, JEWEL_STYLE_HEADER, STONES_HEADER,
  'Option1 Name', 'Option1 Value',
  'Option2 Name', 'Option2 Value',
];

// ── Core transform ─────────────────────────────────────────────────────────────

function transform(rows, dropReasons = []) {
  const trackDrop = (key, label, predicate) => {
    const reason = { key, label, count: 0 };
    dropReasons.push(reason);
    return row => {
      const keep = predicate(row);
      if (!keep) reason.count++;
      return keep;
    };
  };

  return rows
    // Step 1: remove Steel products whose code_produit starts with "4"
    .filter(trackDrop('steel_code_4', 'Steel product with a product code starting with 4', r => !(
      (r.code_matiere || '').trim().toUpperCase() === 'STEEL' &&
      String(r.code_produit).startsWith('4')
    )))

    // Step 2: without a Shopify export, preserve the original active-only rule.
    // With the optional SKU filter, existing variants of every status continue;
    // unavailable statuses are converted to product-level unpublish instructions.
    .filter(trackDrop(
      'inactive',
      'Product status is not active and the variant was not matched in Shopify',
      r => r.statut === 'actif' || r._shopifyExistingVariant
    ))

    // Step 2: keep only allowed categories
    .filter(trackDrop(
      'unsupported_category',
      'Product category is not supported by the Shopify pipeline',
      r => ALLOWED_CATEGORIES.has(r.categorie)
    ))

    // Step 3 & 4: add Product Category and Product Type
    .map(r => {
      const cat  = CATEGORY_MAP[r.categorie] || '';
      const type = cat.split('>').pop().trim();
      return { ...r, 'Product Category': cat, 'Product Type': type };
    })

    // Step 5: Barcode = code_variant
    .map(r => ({ ...r, Barcode: String(r.code_variant || '') }))

    // Step 6: for Rings, keep only allowed mesure values. Exception: Kids rings use
    // mesure=0 to mean "adjustable / one size" (e.g. "Bag.réglab" — bague réglable)
    // rather than a missing size, so they're exempted here and later mapped to
    // "Standard" by Step 22.
    .filter(trackDrop('unsupported_ring_size', 'Ring size is not in the allowed size list', r =>
      r['Product Type'] !== 'Rings' ||
      ALLOWED_RING_SIZES.has(Number(r.mesure)) ||
      (isKidsProduct(r) && Number(r.mesure) === 0)
    ))

    // Step 7: for Rings, remap mesure to international size label
    .map(r => {
      if (r['Product Type'] === 'Rings') {
        return { ...r, mesure: RING_SIZE_MAP[Number(r.mesure)] ?? r.mesure };
      }
      return r;
    })

    // Step 8: add Option2 Value from code_matiere + couleur
    .map(r => ({ ...r, 'Option2 Value': getMetal(r.code_matiere, r.couleur) }))

    // Step 9: constant Option name columns
    .map(r => ({ ...r, 'Option1 Name': 'Size', 'Option2 Name': 'Metal' }))

    // Step 10: Product Image URL
    .map(r => ({
      ...r,
      'Product Image URL': 'https://pro.robbez.com/images/souches/' + (r.image || ''),
    }))

    // Step 11: constant columns
    .map(r => ({
      ...r,
      'Continue selling when out of stock': 'continue',
      'Fulfillment service': 'manual',
      'Charge tax': true,
      Vendor: 'MRM',
      Status: 'active',
    }))

    // Step 12: SKU
    .map(r => ({ ...r, SKU: 'MRM-' + r.code_variant }))

    // Step 13: use the store's exact handle when a Shopify export was supplied.
    .map(r => ({ ...r, 'URL Handle': r._shopifyHandle || ('mrm' + r.code_produit) }))

    // Step 14: Title
    .map(r => ({
      ...r,
      Title: String(r.code_produit) + ' - ' + r['Product Type'] + ' - ' + r['Option2 Value'],
    }))

    // Step 15: Price
    .map(r => {
      const isGold  = r.code_matiere === 'Au375' || r.code_matiere === 'Au750';
      const totalHt = parseFloat(String(r.total_ht).replace(',', '.')) || 0;
      return { ...r, Price: Math.round(totalHt * (isGold ? 1.25 : 1.30) * 100) / 100 };
    })

    // Step 16: Tags
    .map(r => ({
      ...r,
      Tags: (r.collection || '') + ', ' + (r['Option2 Value'] || '') + ', ' + (r.Vendor || ''),
    }))

    // Step 17: append ", wedding rings" for Rings with "allianc" in libelle fields
    .map(r => {
      const libProd = r.libelle_produit || '';
      const libSupp = r.libelle_supplementaire || '';
      if (r['Product Type'] === 'Rings' &&
          (/allianc/i.test(libProd) || /allianc/i.test(libSupp))) {
        return { ...r, Tags: r.Tags + ', wedding rings' };
      }
      return r;
    })

    // Step 17b: derive merchandising classifications from the French catalogue
    // label. The same values are exported as tags and as Shopify's jewel_style
    // metafield. Shopify's own export serializes list.single_line_text_field
    // values as line breaks inside one quoted CSV cell.
    .map(r => {
      const extra = getExtraTags(r);
      return {
        ...r,
        Tags: extra.length ? r.Tags + ', ' + extra.join(', ') : r.Tags,
        [JEWEL_STYLE_HEADER]: extra.join('\n'),
        [AGE_GROUP_HEADER]: isKidsProduct(r) ? 'Kids' : 'Adults',
        [STONES_HEADER]: getStoneValues(r).join('\n'),
      };
    })

    // Step 18: build structured English description
    .map(r => ({ ...r, Description: buildDescription(r) }))

    // Step 18b: French description metafield (product.metafields.custom.stock_level)
    // Combines libelle_produit and libelle_supplementaire into the original French catalogue text.
    .map(r => {
      const prod = (r.libelle_produit  || '').trim();
      const supp = (r.libelle_supplementaire || '').trim();
      const parts = [prod, supp].filter(Boolean);
      return { ...r, 'product.metafields.custom.stock_level': parts.join(' | ') };
    })

    // Step 19 & 20: more constant columns
    .map(r => ({
      ...r,
      'Requires shipping':         true,
      'Weight unit for display':   'g',
      'Published on online store': !r._unpublishProduct,
      'Variant Inventory Tracker': 'shopify',
    }))

    // Step 21: rename columns
    .map(r => {
      const n = { ...r };
      n['Option1 Value']       = r.mesure;
      n['Weight value (grams)'] = r.poids_matiere;
      n['Inventory quantity']  = r.stock;
      n['Type']                = r['Product Type'];
      delete n.mesure;
      delete n.poids_matiere;
      delete n.stock;
      delete n['Product Type'];
      return n;
    })

    // Step 22: replace 0 with "Standard" in Option1 Value
    .map(r => ({
      ...r,
      'Option1 Value':
        r['Option1 Value'] === '0' || r['Option1 Value'] === 0
          ? 'Standard'
          : r['Option1 Value'],
    }))

    // Step 23: select and reorder output columns
    .map(r => {
      const out = {};
      for (const col of OUTPUT_COLUMNS) out[col] = r[col] ?? '';
      return out;
    })

    // Step 24: 18CT rows are always kept. Non-18CT rows need a "wedding ring" or
    // a collection tag. (18CT was previously restricted to wedding rings only,
    // which discarded ranges such as the Diamanti18 lab-diamond solitaires.)
    .filter(trackDrop(
      'non_18ct_without_eligible_tag',
      'Non-18CT product has neither a wedding-ring tag nor an approved collection tag',
      r => {
        if ((r['Option2 Value'] || '').startsWith('18CT')) return true;
        const tags = (r.Tags || '').toLowerCase();
        return (
          /wedding ring/i.test(tags) ||
          COLLECTION_TAGS.some(t => tags.includes(t))
        );
      }
    ));
}

// ── CSV serialisation ──────────────────────────────────────────────────────────

export function toCSV(rows, columns = OUTPUT_COLUMNS) {
  if (!rows.length) return '﻿';
  const escape = val => {
    const s = String(val === null || val === undefined ? '' : val);
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? '"' + s.replace(/"/g, '""') + '"'
      : s;
  };
  const header = columns.join(',');
  const lines  = rows.map(r => columns.map(c => escape(r[c])).join(','));
  return '﻿' + header + '\n' + lines.join('\n');
}

// ── Chunking ───────────────────────────────────────────────────────────────────

export function chunkByURLHandle(rows, maxMB = 15, columns = OUTPUT_COLUMNS, handleColumn = 'URL Handle') {
  const maxBytes = maxMB * 1024 * 1024;

  // Group rows by URL Handle preserving original order
  const groups  = new Map();
  const order   = [];
  for (const row of rows) {
    const h = row[handleColumn];
    if (!groups.has(h)) { groups.set(h, []); order.push(h); }
    groups.get(h).push(row);
  }

  const chunks = [];
  let current  = [];
  let curSize  = 0;

  for (const h of order) {
    const group     = groups.get(h);
    const groupSize = new Blob([toCSV(group, columns)]).size;

    if (current.length > 0 && curSize + groupSize > maxBytes) {
      chunks.push(current);
      current = [];
      curSize = 0;
    }

    current.push(...group);
    curSize += groupSize;
  }

  if (current.length > 0) chunks.push(current);
  return chunks;
}

// ── Encoding detection ─────────────────────────────────────────────────────────

// MRM exports are windows-1252, but a file that has been opened and re-saved
// (Excel, Google Sheets, a text editor) comes back as UTF-8. Decoding UTF-8 as
// windows-1252 turns every accent into mojibake ("Créole" → "CrÃ©ole"), so sniff
// the bytes instead of assuming. Accented windows-1252 bytes are not valid UTF-8,
// which makes a strict UTF-8 decode a reliable discriminator.
export async function detectEncoding(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) return 'UTF-8';
  try {
    new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    return 'UTF-8';
  } catch {
    // windows-1252 rather than ISO-8859-1: it is what browsers actually use for
    // that label, and it maps the 0x80-0x9F slots MRM uses for Œ, œ and ’.
    return 'windows-1252';
  }
}

// ── Upstream mojibake repair ───────────────────────────────────────────────────

// MRM's exporter mis-decodes its own windows-1252 text as windows-1250 (Central
// European) before writing the UTF-8 file, so every accent whose byte differs
// between those two codepages arrives as the wrong letter: "Chevalière" comes
// through as "Chevaličre", "Baïonnette" as "Baďonnette". é, î, ç and â survive
// untouched because their bytes are identical in both codepages, which is what
// makes the damage easy to miss. This maps each differing byte back to the
// character MRM meant to send.
//
// Safe to run unconditionally: every key is a character that cannot occur in
// French, so a correctly encoded file passes through untouched.
const CP1250_MISDECODE = {
  'Ś': 'Œ', 'ś': 'œ', 'ź': 'Ÿ', 'ˇ': '¡', '˘': '¢', 'Ł': '£',
  'Ą': '¥', 'Ş': 'ª', 'Ż': '¯', '˛': '²', 'ł': '³', 'ą': '¹',
  'ş': 'º', 'Ľ': '¼', '˝': '½', 'ľ': '¾', 'ż': '¿', 'Ŕ': 'À',
  'Ă': 'Ã', 'Ĺ': 'Å', 'Ć': 'Æ', 'Č': 'È', 'Ę': 'Ê', 'Ě': 'Ì',
  'Ď': 'Ï', 'Đ': 'Ð', 'Ń': 'Ñ', 'Ň': 'Ò', 'Ő': 'Õ', 'Ř': 'Ø',
  'Ů': 'Ù', 'Ű': 'Û', 'Ţ': 'Þ', 'ŕ': 'à', 'ă': 'ã', 'ĺ': 'å',
  'ć': 'æ', 'č': 'è', 'ę': 'ê', 'ě': 'ì', 'ď': 'ï', 'đ': 'ð',
  'ń': 'ñ', 'ň': 'ò', 'ő': 'õ', 'ř': 'ø', 'ů': 'ù', 'ű': 'û',
  'ţ': 'þ', '˙': 'ÿ',
};

const MISDECODE_RE = new RegExp('[' + Object.keys(CP1250_MISDECODE).join('') + ']', 'g');

export function repairMojibake(value) {
  return typeof value === 'string'
    ? value.replace(MISDECODE_RE, ch => CP1250_MISDECODE[ch])
    : value;
}

// ── Main entry point ───────────────────────────────────────────────────────────

function parseCSVFile(file, encoding) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      encoding,
      skipEmptyLines: true,
      complete: result => resolve(result),
      error: reject,
    });
  });
}

function canonicalSKU(value) {
  return String(value || '').trim().toLowerCase();
}

function isPublishableMRMStatus(value) {
  const status = norm(String(value || '').trim());
  return status === 'actif' || status === 'destockage';
}

export function getShopifySKUs(rows) {
  return new Set(getShopifyVariantIndex(rows).keys());
}

export function getShopifyVariantIndex(rows) {
  const first = rows[0] || {};
  const skuColumn = Object.prototype.hasOwnProperty.call(first, 'Variant SKU')
    ? 'Variant SKU'
    : Object.prototype.hasOwnProperty.call(first, 'SKU') ? 'SKU' : null;
  const handleColumn = Object.prototype.hasOwnProperty.call(first, 'Handle')
    ? 'Handle'
    : Object.prototype.hasOwnProperty.call(first, 'URL Handle') ? 'URL Handle' : null;
  if (!skuColumn) {
    throw new Error('The Shopify export must contain a Variant SKU column. Please export it from Shopify Admin > Products.');
  }
  if (!handleColumn) throw new Error('The Shopify export must contain a Handle column.');
  const variants = new Map();
  let currentHandle = '';
  for (const row of rows) {
    currentHandle = String(row[handleColumn] || '').trim() || currentHandle;
    const sku = canonicalSKU(row[skuColumn]);
    if (sku && currentHandle) variants.set(sku, currentHandle);
  }
  if (!variants.size) throw new Error('The Shopify export does not contain any variant SKUs with product handles.');
  return variants;
}

export function getShopifyHandleSet(rows) {
  const first = rows[0] || {};
  const handleColumn = Object.prototype.hasOwnProperty.call(first, 'Handle')
    ? 'Handle'
    : Object.prototype.hasOwnProperty.call(first, 'URL Handle') ? 'URL Handle' : null;
  if (!handleColumn) throw new Error('The Shopify export must contain a Handle column.');
  return new Set(rows.map(row => canonicalSKU(row[handleColumn])).filter(Boolean));
}

export function filterMRMRowsToShopifyVariants(rows, shopifySKUs) {
  return rows.filter(row =>
    shopifySKUs.has(canonicalSKU('MRM-' + String(row.code_variant || '').trim()))
  );
}

const SHOPIFY_COMPARE_FIELDS = [
  { output: 'Description', sources: ['Body (HTML)', 'Description'], normalize: normalizeHTML },
  { output: 'Tags', sources: ['Tags'], normalize: normalizeTags },
  { output: 'Published on online store', sources: ['Published', 'Published on online store'], normalize: normalizeBoolean },
  { output: AGE_GROUP_HEADER, sources: [AGE_GROUP_HEADER], normalize: normalizeText },
  { output: JEWEL_STYLE_HEADER, sources: [JEWEL_STYLE_HEADER], normalize: normalizeList },
  { output: STONES_HEADER, sources: [STONES_HEADER], normalize: normalizeList },
];

function normalizeText(value) {
  return String(value ?? '').replace(/\r\n?/g, '\n').trim();
}

function normalizeHTML(value) {
  const namedEntities = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ' };
  return String(value ?? '')
    .replace(/\r\n?/g, '\n')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, number) => String.fromCodePoint(parseInt(number, 10)))
    .replace(/&(amp|quot|apos|lt|gt|nbsp);/gi, (_, name) => namedEntities[name.toLowerCase()])
    .replace(/>\s+</g, '><')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeTags(value) {
  return String(value ?? '').split(',').map(v => v.trim().toLowerCase()).filter(Boolean).sort().join('|');
}

function normalizeList(value) {
  return String(value ?? '').replace(/\r\n?/g, '\n').split(/[\n|]/).map(v => v.trim()).filter(Boolean).sort().join('|');
}

function normalizeBoolean(value) {
  return ['true', '1', 'yes'].includes(String(value ?? '').trim().toLowerCase());
}

function findColumn(firstRow, candidates) {
  return candidates.find(column => Object.prototype.hasOwnProperty.call(firstRow, column));
}

export function getDescriptionUpdateRows(transformedRows, shopifyRows) {
  if (!shopifyRows?.length) return transformedRows;
  const first = shopifyRows[0];
  const skuColumn = findColumn(first, ['Variant SKU', 'SKU']);
  const handleColumn = findColumn(first, ['Handle', 'URL Handle']);
  if (!skuColumn || !handleColumn) {
    throw new Error('The Shopify export must contain Handle and Variant SKU columns.');
  }

  const columns = SHOPIFY_COMPARE_FIELDS.map(field => {
    const source = findColumn(first, field.sources);
    if (!source) throw new Error(`The Shopify export is missing the ${field.sources[0]} column required for update comparison.`);
    return { ...field, source };
  });

  const products = new Map();
  const skuToProduct = new Map();
  let currentHandle = '';
  for (const row of shopifyRows) {
    currentHandle = canonicalSKU(row[handleColumn]) || currentHandle;
    if (!currentHandle) continue;
    if (!products.has(currentHandle)) {
      products.set(currentHandle, Object.fromEntries(
        columns.map(field => [field.output, field.normalize(row[field.source])])
      ));
    }
    const sku = canonicalSKU(row[skuColumn]);
    if (sku) skuToProduct.set(sku, currentHandle);
  }

  const changedProducts = new Set();
  const checkedProducts = new Set();
  for (const row of transformedRows) {
    const productKey = skuToProduct.get(canonicalSKU(row.SKU));
    if (!productKey || checkedProducts.has(productKey)) continue;
    checkedProducts.add(productKey);
    const existing = products.get(productKey);
    if (columns.some(field => field.normalize(row[field.output]) !== existing[field.output])) {
      changedProducts.add(productKey);
    }
  }

  return transformedRows.filter(row =>
    changedProducts.has(skuToProduct.get(canonicalSKU(row.SKU)))
  );
}

export async function processFile(file, shopifyInput = null) {
  const shopifyFiles = (Array.isArray(shopifyInput) ? shopifyInput : shopifyInput ? [shopifyInput] : [])
    .filter(Boolean);
  const [encoding, shopifyEncodings] = await Promise.all([
    detectEncoding(file),
    Promise.all(shopifyFiles.map(detectEncoding)),
  ]);
  const [mrmParsed, shopifyParts] = await Promise.all([
    parseCSVFile(file, encoding),
    Promise.all(shopifyFiles.map((shopifyFile, index) =>
      parseCSVFile(shopifyFile, shopifyEncodings[index])
    )),
  ]);
  const shopifyParsed = shopifyParts.length
    ? { data: shopifyParts.flatMap(part => part.data) }
    : null;
  const data = mrmParsed.data;

  return new Promise((resolve, reject) => {
    // Defer heavy work so the "processing" UI state renders first.
    setTimeout(() => {
      try {
            const baseName      = file.name.replace(/\.csv$/i, '');
            const dropReasons   = [];
            let sourceRows      = data;
            let newProductSourceRows = [];
            let shopifyVariants = null;
            let unpublishedProducts = 0;
            let unpublishedRows = 0;

            // This optional variant-SKU safety filter is deliberately the first
            // pipeline stage, before text repair and every existing transformation.
            if (shopifyParsed) {
              const shopifyVariantIndex = getShopifyVariantIndex(shopifyParsed.data);
              const shopifyHandles = getShopifyHandleSet(shopifyParsed.data);
              shopifyVariants = shopifyVariantIndex.size;

              // A product already exists when either one of its SKUs matches or
              // its normal MRM handle exists (important for legacy blank-SKU products).
              const existingProductCodes = new Set(
                data
                  .filter(row => {
                    const sku = canonicalSKU('MRM-' + String(row.code_variant || '').trim());
                    const handle = canonicalSKU('mrm' + String(row.code_produit || '').trim());
                    return shopifyVariantIndex.has(sku) || shopifyHandles.has(handle);
                  })
                  .map(row => String(row.code_produit || '').trim())
              );
              newProductSourceRows = data.filter(row =>
                !existingProductCodes.has(String(row.code_produit || '').trim())
              );

              sourceRows = filterMRMRowsToShopifyVariants(data, new Set(shopifyVariantIndex.keys()))
                .map(row => ({
                  ...row,
                  _shopifyExistingVariant: true,
                  _shopifyHandle: shopifyVariantIndex.get(canonicalSKU('MRM-' + String(row.code_variant || '').trim())),
                }));
              dropReasons.push({
                key: 'not_in_shopify_export',
                label: 'Variant SKU is not present in the supplied Shopify export',
                count: data.length - sourceRows.length,
              });

              // Shopify publication is product-level. If any retained variant
              // is unavailable in MRM, set Published=false on every retained
              // row for that product so the CSV contains one consistent value.
              const productsToUnpublish = new Set(
                sourceRows
                  .filter(row => !isPublishableMRMStatus(row.statut))
                  .map(row => String(row.code_produit || '').trim())
                  .filter(Boolean)
              );
              unpublishedProducts = productsToUnpublish.size;
              sourceRows = sourceRows.map(row => ({
                ...row,
                _unpublishProduct: productsToUnpublish.has(String(row.code_produit || '').trim()),
              }));
              unpublishedRows = sourceRows.filter(row => row._unpublishProduct).length;
            }

            // Undo MRM's upstream cp1250 mis-decode before anything reads the labels
            let repaired = 0;
            const clean = sourceRows.map(row => {
              const out = {};
              for (const [k, v] of Object.entries(row)) {
                out[k] = repairMojibake(v);
                if (out[k] !== v) repaired++;
              }
              return out;
            });
            const transformed   = transform(clean, dropReasons);
            const newProductDropReasons = [];
            const cleanNewProducts = newProductSourceRows.map(row => {
              const out = {};
              for (const [k, v] of Object.entries(row)) out[k] = repairMojibake(v);
              return out;
            });
            const newProductRows = shopifyParsed
              ? transform(cleanNewProducts, newProductDropReasons)
              : [];
            const isWedding     = r => /wedding ring/i.test(r.Tags || '');
            const wedding       = transformed.filter(isWedding);
            const other         = transformed.filter(r => !isWedding(r));
            const weddingChunks = chunkByURLHandle(wedding);
            const otherChunks   = chunkByURLHandle(other);

            // With a Shopify export, emit only products whose generated fields
            // differ. Keep every retained variant row for changed products so
            // Shopify can preserve and match the complete variant structure.
            const descUpdateRows = shopifyParsed
              ? getDescriptionUpdateRows(transformed, shopifyParsed.data)
              : transformed;
            const descChunks = chunkByURLHandle(descUpdateRows, 15, DESC_UPDATE_COLUMNS);
            const newProductChunks = chunkByURLHandle(newProductRows);

            const files = [
              {
                label:    'Full output',
                filename: `${baseName}_full.csv`,
                rows:     transformed,
              },
              ...weddingChunks.map((rows, i) => ({
                label:    `Wedding Rings — Part ${i + 1} of ${weddingChunks.length}`,
                filename: `${baseName}_wedding_rings_${i + 1}.csv`,
                rows,
              })),
              ...otherChunks.map((rows, i) => ({
                label:    `Other — Part ${i + 1} of ${otherChunks.length}`,
                filename: `${baseName}_other_${i + 1}.csv`,
                rows,
              })),
            ];

            const descFiles = descChunks.map((rows, i) => ({
              label:    `Description + Tags + Metafields Update — Part ${i + 1} of ${descChunks.length}`,
              filename: `${baseName}_desc_update_${i + 1}.csv`,
              rows,
              columns:  DESC_UPDATE_COLUMNS,
            }));

            const newProductFiles = newProductChunks.map((rows, i) => ({
              label:    `New Products Full Import — Part ${i + 1} of ${newProductChunks.length}`,
              filename: `${baseName}_new_products_${i + 1}.csv`,
              rows,
              columns: OUTPUT_COLUMNS,
            }));

            resolve({
              files,
              descFiles,
              newProductFiles,
              stats: {
                input:   data.length,
                output:  transformed.length,
                wedding: wedding.length,
                other:   other.length,
                dropped: data.length - transformed.length,
                dropReasons,
                encoding,
                repaired,
                shopifyFilterApplied: Boolean(shopifyParsed),
                shopifyFiles: shopifyFiles.length,
                shopifyVariants,
                unpublishedProducts,
                unpublishedRows,
                descOutput: descUpdateRows.length,
                descProducts: new Set(descUpdateRows.map(row => row['URL Handle'])).size,
                newProductCandidates: newProductSourceRows.length,
                newProductRows: newProductRows.length,
                newProducts: new Set(newProductRows.map(row => row['URL Handle'])).size,
                newProductDropReasons,
              },
            });
      } catch (err) {
        reject(err);
      }
    }, 0);
  });
}
