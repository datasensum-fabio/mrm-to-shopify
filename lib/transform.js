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

const MATERIAL_MAP = {
  AU750: '18CT GOLD',
  AU375: '9CT GOLD',
  AG925: 'SILVER',
  PAU:   'GOLD PLATED',
  STEEL: 'STEEL',
};

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

    // Step 5: for Rings, keep only allowed mesure values
    .filter(r =>
      r['Product Type'] !== 'Rings' || ALLOWED_RING_SIZES.has(Number(r.mesure))
    )

    // Step 6: for Rings, remap mesure to international size label
    .map(r => {
      if (r['Product Type'] === 'Rings') {
        return { ...r, mesure: RING_SIZE_MAP[Number(r.mesure)] ?? r.mesure };
      }
      return r;
    })

    // Step 7: add Option2 Value from code_matiere
    .map(r => ({ ...r, 'Option2 Value': MATERIAL_MAP[(r.code_matiere || '').trim().toUpperCase()] || '' }))

    // Step 8: constant Option name columns
    .map(r => ({ ...r, 'Option1 Name': 'Size', 'Option2 Name': 'Metal' }))

    // Step 9: Product Image URL
    .map(r => ({
      ...r,
      'Product Image URL': 'https://pro.robbez.com/images/souches/' + (r.image || ''),
    }))

    // Step 10: constant columns
    .map(r => ({
      ...r,
      'Continue selling when out of stock': 'continue',
      'Fulfillment service': 'manual',
      'Charge tax': true,
      Vendor: 'MRM',
      Status: 'active',
    }))

    // Step 11: SKU
    .map(r => ({ ...r, SKU: 'MRM-' + r.code_variant }))

    // Step 12: URL Handle
    .map(r => ({ ...r, 'URL Handle': 'mrm' + r.code_produit }))

    // Step 13: Title
    .map(r => ({
      ...r,
      Title: String(r.code_produit) + ' - ' + r['Product Type'] + ' - ' + r['Option2 Value'],
    }))

    // Step 14: Price
    .map(r => {
      const isGold  = r.code_matiere === 'Au375' || r.code_matiere === 'Au750';
      const totalHt = parseFloat(String(r.total_ht).replace(',', '.')) || 0;
      return { ...r, Price: Math.round(totalHt * (isGold ? 1.25 : 1.30) * 100) / 100 };
    })

    // Step 15: Tags
    .map(r => ({
      ...r,
      Tags: (r.collection || '') + ', ' + (r['Option2 Value'] || '') + ', ' + (r.Vendor || ''),
    }))

    // Step 16: Description
    .map(r => ({
      ...r,
      Description:
        String(r.libelle_produit || '') + ' ' +
        String(r.libelle_supplementaire || '') +
        ' Collection: '  + (r.collection    || '') +
        ' Colors: '      + (r.couleur       || '') +
        ' Metal: '       + r['Option2 Value'] +
        ' Weight (g): '  + (r.poids_matiere || ''),
    }))

    // Step 17: append ", wedding rings" for Rings containing "allianc*" in description
    .map(r => {
      if (r['Product Type'] === 'Rings' && /allianc/i.test(r.Description)) {
        return { ...r, Tags: r.Tags + ', wedding rings' };
      }
      return r;
    })

    // Step 18: Barcode = SKU
    .map(r => ({ ...r, Barcode: r.SKU }))

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

    // Step 24: remove 18CT GOLD rows without "wedding ring" in Tags
    .filter(r => {
      if (r['Option2 Value'] !== '18CT GOLD') return true;
      return /wedding ring/i.test(r.Tags || '');
    })

    // Step 25: for non-18CT GOLD, keep only rows with "wedding ring" or a collection tag
    .filter(r => {
      if (r['Option2 Value'] === '18CT GOLD') return true;
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
