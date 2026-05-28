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
};

const GEMSTONE_MAP = {
  diamant: 'Diamond',    saphir: 'Sapphire',  rubis: 'Ruby',
  emeraude: 'Emerald',   perle: 'Pearl',      zircon: 'Cubic Zirconia',
  oxzir: 'Cubic Zirconia', oxyde: 'Cubic Zirconia', oz: 'Cubic Zirconia',
  spinelle: 'Spinel',    amethyste: 'Amethyst', topaze: 'Topaz',
  tourmaline: 'Tourmaline', citrine: 'Citrine', aigue: 'Aquamarine',
  grenat: 'Garnet',      onyx: 'Onyx',        nacre: 'Mother of Pearl',
  aquamarine: 'Aquamarine', 'dia.nat': 'Natural Diamond',
};

const STYLE_MAP = [
  ['non confort',    'non-comfort fit'], ['confort',       'comfort fit'],
  ['de type chaine', 'chain'],           ['souple',        'flexible'],
  ['bombee',         'domed'],           ['biseautee',     'bevelled'],
  ['ajoure',         'openwork'],        ['pavage',        'pavé set'],
  ['pavee',          'pavé'],            ['solitaire',     'solitaire'],
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
  ['religieux',      'religious'],      ['ange',          'angel'],
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
];

const SPECIFIC_CHAIN_TYPES = new Set([
  'anchor chain', 'ball chain', 'fancy link', 'alternating link',
  'flexible', 'curb chain', 'gourmette chain', 'filigree chain',
  'venetian chain', 'singapore chain', 'spiga chain', 'rope chain',
  'cable chain', 'bean chain', 'palm chain',
]);

function getColourEn(couleur) {
  if (!couleur) return '';
  return (couleur + '').split(',')
    .map(p => COLOUR_MAP[norm(p.trim())] || p.trim())
    .join(' & ');
}

function getGemstone(supp, prod) {
  const n = norm(supp || '');
  if (!n || n.includes('nogem') || n.replace(/\s/g,'').includes('toutmetal')) return '';
  const isSyn = n.includes('syn');
  const gems = [];
  for (const [key, val] of Object.entries(GEMSTONE_MAP)) {
    if (n.includes(key)) {
      const g = (isSyn ? 'Synthetic ' : '') + val;
      if (!gems.includes(g)) gems.push(g);
    }
  }
  if (!gems.length) return '';
  const combined = (supp || '') + ' ' + (prod || '');
  const caratM   = combined.match(/(\d+[.,]\d+)\s*ct/i);
  const qualityM = (supp || '').match(/\b([A-Z]{1,2}-[A-Z0-9]{1,3})\b/);
  const details  = [];
  if (caratM)   details.push(caratM[1].replace(',', '.') + 'ct');
  if (qualityM) details.push(qualityM[1]);
  return gems.join(' & ') + (details.length ? ` (${details.join(', ')})` : '');
}

function getStyle(libProd, libSupp) {
  const supp = libSupp || '';
  const afterColon = supp.includes(':') ? supp.split(':').slice(1).join(':') : supp;
  const suppN = norm(afterColon);
  const prodN = norm(libProd || '');
  const seen = [];
  // Search supp (after colon) for all style keys
  for (const [key, val] of STYLE_MAP) {
    if (suppN.includes(key) && !seen.includes(val)) seen.push(val);
  }
  // Also search libelle_produit (skip 'plaque' to avoid false match on 'plaqué')
  for (const [key, val] of STYLE_MAP) {
    if (key === 'plaque') continue;
    if (prodN.includes(key) && !seen.includes(val)) seen.push(val);
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
  const sizeM   = (libProd || '').match(/(\d+(?:[.,]\d+)?)\s*mm/i);
  const letterM = (libProd || '').match(/lettr[a-z]*[.\s]+([A-Z])/);
  if (sizeM)   seen.unshift(sizeM[1] + 'mm wide');
  if (letterM) seen.unshift(`Letter ${letterM[1]} initial`);
  return seen.slice(0, 4).join(', ');
}

function buildDescription(r) {
  const libProd = r.libelle_produit  || '';
  const libSupp = r.libelle_supplementaire || '';
  const isWed   = r['Product Type'] === 'Rings' &&
                  (/allianc/i.test(libProd) || /allianc/i.test(libSupp));
  const prodType  = isWed ? 'Wedding Ring' : (r['Product Type'] || '');
  const style     = getStyle(libProd, libSupp);
  const gemstone  = getGemstone(libSupp, libProd);
  const colour    = getColourEn(r.couleur);
  const metal     = r['Option2 Value'] || '';
  const collection = r.collection || '';
  const parts = [`Product Type: ${prodType}`];
  if (style)      parts.push(`Description: ${style}`);
  parts.push(`Metal: ${metal}`);
  if (gemstone)   parts.push(`Gemstone: ${gemstone}`);
  if (collection) parts.push(`Collection: ${collection}`);
  if (colour)     parts.push(`Colours: ${colour}`);
  return parts.join(' | ');
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

export const OUTPUT_COLUMNS = [
  'Title', 'URL Handle', 'Description', 'Vendor', 'Product Category',
  'Type', 'Tags', 'Published on online store', 'Status',
  'SKU', 'Barcode', 'Option1 Name', 'Option1 Value',
  'Option2 Name', 'Option2 Value', 'Price', 'Charge tax',
  'Inventory quantity', 'Continue selling when out of stock',
  'Weight value (grams)', 'Weight unit for display',
  'Requires shipping', 'Fulfillment service', 'Product Image URL',
  'Variant Inventory Tracker',
];

// ── Core transform ─────────────────────────────────────────────────────────────

function transform(rows) {
  return rows
    // Step 1: remove Steel products whose code_produit starts with "4"
    .filter(r => !(
      (r.code_matiere || '').trim().toUpperCase() === 'STEEL' &&
      String(r.code_produit).startsWith('4')
    ))

    // Step 2: keep only statut = "actif"
    .filter(r => r.statut === 'actif')

    // Step 2: keep only allowed categories
    .filter(r => ALLOWED_CATEGORIES.has(r.categorie))

    // Step 3 & 4: add Product Category and Product Type
    .map(r => {
      const cat  = CATEGORY_MAP[r.categorie] || '';
      const type = cat.split('>').pop().trim();
      return { ...r, 'Product Category': cat, 'Product Type': type };
    })

    // Step 5: Barcode = code_variant
    .map(r => ({ ...r, Barcode: String(r.code_variant || '') }))

    // Step 6: for Rings, keep only allowed mesure values
    .filter(r =>
      r['Product Type'] !== 'Rings' || ALLOWED_RING_SIZES.has(Number(r.mesure))
    )

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

    // Step 13: URL Handle
    .map(r => ({ ...r, 'URL Handle': 'mrm' + r.code_produit }))

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

    // Step 18: build structured English description
    .map(r => ({ ...r, Description: buildDescription(r) }))

    // Step 19 & 20: more constant columns
    .map(r => ({
      ...r,
      'Requires shipping':         true,
      'Weight unit for display':   'g',
      'Published on online store': true,
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

    // Step 24: remove any 18CT variant rows without "wedding ring" in Tags
    .filter(r => {
      if (!(r['Option2 Value'] || '').startsWith('18CT')) return true;
      return /wedding ring/i.test(r.Tags || '');
    })

    // Step 25: for non-18CT rows, keep only rows with "wedding ring" or a collection tag
    .filter(r => {
      if ((r['Option2 Value'] || '').startsWith('18CT')) return true;
      const tags = (r.Tags || '').toLowerCase();
      return (
        /wedding ring/i.test(tags) ||
        COLLECTION_TAGS.some(t => tags.includes(t))
      );
    });
}

// ── CSV serialisation ──────────────────────────────────────────────────────────

export function toCSV(rows) {
  if (!rows.length) return '﻿';
  const escape = val => {
    const s = String(val === null || val === undefined ? '' : val);
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? '"' + s.replace(/"/g, '""') + '"'
      : s;
  };
  const header = OUTPUT_COLUMNS.join(',');
  const lines  = rows.map(r => OUTPUT_COLUMNS.map(c => escape(r[c])).join(','));
  return '﻿' + header + '\n' + lines.join('\n');
}

// ── Chunking ───────────────────────────────────────────────────────────────────

export function chunkByURLHandle(rows, maxMB = 15) {
  const maxBytes = maxMB * 1024 * 1024;

  // Group rows by URL Handle preserving original order
  const groups  = new Map();
  const order   = [];
  for (const row of rows) {
    const h = row['URL Handle'];
    if (!groups.has(h)) { groups.set(h, []); order.push(h); }
    groups.get(h).push(row);
  }

  const chunks = [];
  let current  = [];
  let curSize  = 0;

  for (const h of order) {
    const group     = groups.get(h);
    const groupSize = new Blob([toCSV(group)]).size;

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

// ── Main entry point ───────────────────────────────────────────────────────────

export function processFile(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header:         true,
      encoding:       'ISO-8859-1',
      skipEmptyLines: true,
      complete: ({ data }) => {
        // defer heavy work so the "processing" UI state renders first
        setTimeout(() => {
          try {
            const baseName      = file.name.replace(/\.csv$/i, '');
            const transformed   = transform(data);
            const isWedding     = r => /wedding ring/i.test(r.Tags || '');
            const wedding       = transformed.filter(isWedding);
            const other         = transformed.filter(r => !isWedding(r));
            const weddingChunks = chunkByURLHandle(wedding);
            const otherChunks   = chunkByURLHandle(other);

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

            resolve({
              files,
              stats: {
                input:   data.length,
                output:  transformed.length,
                wedding: wedding.length,
                other:   other.length,
              },
            });
          } catch (err) {
            reject(err);
          }
        }, 0);
      },
      error: reject,
    });
  });
}
