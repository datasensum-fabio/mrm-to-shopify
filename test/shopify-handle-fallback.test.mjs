import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AGE_GROUP_HEADER,
  JEWEL_STYLE_HEADER,
  STONES_HEADER,
  getDescriptionUpdateRows,
  getShopifyHandleIndex,
  getShopifyVariantIndex,
  matchMRMRowsToShopifyProducts,
} from '../lib/transform.js';

const shopifyRow = {
  Handle: 'mrm137832r',
  'Variant SKU': '',
  'Body (HTML)': '<p>Existing description</p>',
  Tags: 'APA, GOLD PLATED, Kids, MRM, PLAIN METAL RING',
  Published: 'true',
  Status: 'active',
  [AGE_GROUP_HEADER]: 'Kids',
  [JEWEL_STYLE_HEADER]: 'Kids\nPLAIN METAL RING',
  [STONES_HEADER]: 'Plain Metal/No Gems',
};

const mrmRow = {
  code_produit: '137832R',
  code_variant: '137832R',
};

const transformedRow = {
  Title: '137832R - Rings - GOLD PLATED',
  'URL Handle': 'mrm137832r',
  Description: '<p>Existing description</p>',
  Tags: shopifyRow.Tags,
  'Published on online store': true,
  Status: 'active',
  SKU: 'MRM-137832R',
  [AGE_GROUP_HEADER]: 'Kids',
  [JEWEL_STYLE_HEADER]: 'Plain Metal\nFor Kids',
  [STONES_HEADER]: 'Plain Metal/No Gems',
};

test('matches an MRM product by Shopify handle when Variant SKU is blank', () => {
  const variantIndex = getShopifyVariantIndex([shopifyRow]);
  const handleIndex = getShopifyHandleIndex([shopifyRow]);
  const matched = matchMRMRowsToShopifyProducts([mrmRow], variantIndex, handleIndex);

  assert.equal(variantIndex.size, 0);
  assert.equal(matched.length, 1);
  assert.equal(matched[0]._shopifyExistingVariant, true);
  assert.equal(matched[0]._shopifyHandle, 'mrm137832r');
});

test('detects changed product fields through handle fallback when Variant SKU is blank', () => {
  const updates = getDescriptionUpdateRows([transformedRow], [shopifyRow]);
  assert.equal(updates.length, 1);
  assert.equal(updates[0][JEWEL_STYLE_HEADER], 'Plain Metal\nFor Kids');
});

test('does not emit a handle-matched product whose generated fields are unchanged', () => {
  const currentShopifyRow = {
    ...shopifyRow,
    [JEWEL_STYLE_HEADER]: transformedRow[JEWEL_STYLE_HEADER],
  };
  assert.equal(getDescriptionUpdateRows([transformedRow], [currentShopifyRow]).length, 0);
});
