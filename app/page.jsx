'use client';
import { useState, useCallback, useRef } from 'react';
import {
  processFile, toCSV, OUTPUT_COLUMNS, DESC_UPDATE_COLUMNS,
} from '../lib/transform';

// ── Download button ────────────────────────────────────────────────────────────

function DownloadButton({ label, filename, rows, columns = OUTPUT_COLUMNS }) {
  const [loading, setLoading] = useState(false);

  const handleDownload = () => {
    setLoading(true);
    setTimeout(() => {
      const csv  = toCSV(rows, columns);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setLoading(false);
    }, 10);
  };

  const sizeMB = (new Blob([toCSV(rows, columns)]).size / (1024 * 1024)).toFixed(1);

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      className="flex items-center justify-between w-full px-4 py-3 bg-white border border-gray-200 rounded-lg hover:bg-green-50 hover:border-green-400 transition-colors group"
    >
      <div className="flex items-center gap-3 text-left">
        <span className="text-green-500 text-lg">⬇</span>
        <div>
          <div className="font-medium text-gray-800 group-hover:text-green-700 text-sm">{label}</div>
          <div className="text-xs text-gray-400 mt-0.5">
            {filename} · {rows.length.toLocaleString()} rows · {sizeMB} MB
          </div>
        </div>
      </div>
      <span className="text-xs text-gray-400 group-hover:text-green-600 whitespace-nowrap ml-4">
        {loading ? 'Preparing…' : 'Download CSV'}
      </span>
    </button>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function Home() {
  const [status,     setStatus]     = useState('idle');
  const [results,    setResults]    = useState(null);
  const [error,      setError]      = useState(null);
  const [dragging,   setDragging]   = useState(false);
  const [outputMode, setOutputMode] = useState('full'); // 'full' | 'desc' | 'new'
  const [mrmFile,     setMrmFile]     = useState(null);
  const [shopifyFiles, setShopifyFiles] = useState([]);
  const inputRef = useRef(null);
  const shopifyInputRef = useRef(null);

  const selectCSV = useCallback((file, setter) => {
    if (!file) return false;
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Please upload a .csv file.');
      return false;
    }
    setter(file);
    setError(null);
    setResults(null);
    setStatus('idle');
    return true;
  }, []);

  const handleProcess = useCallback(async () => {
    if (!mrmFile) {
      setError('Please select the MRM input CSV first.');
      return;
    }
    setStatus('processing');
    setError(null);
    setResults(null);

    try {
      const result = await processFile(mrmFile, shopifyFiles);
      setResults(result);
      setStatus('done');
    } catch (err) {
      setError(err.message || 'An unexpected error occurred.');
      setStatus('error');
    }
  }, [mrmFile, shopifyFiles]);

  const onDrop      = useCallback((e) => { e.preventDefault(); setDragging(false); selectCSV(e.dataTransfer.files[0], setMrmFile); }, [selectCSV]);
  const onDragOver  = (e) => { e.preventDefault(); setDragging(true);  };
  const onDragLeave = ()  => setDragging(false);
  const onInputChange = (e) => selectCSV(e.target.files[0], setMrmFile);
  const onShopifyInputChange = (e) => {
    const selected = [...e.target.files];
    const invalid = selected.find(file => !/\.(csv|zip)$/i.test(file.name));
    if (invalid) {
      setError('Every Shopify export file must be a .csv or .zip file.');
      return;
    }
    setShopifyFiles(current => {
      const combined = [...current, ...selected];
      return combined.filter((file, index) =>
        combined.findIndex(candidate =>
          candidate.name === file.name && candidate.size === file.size && candidate.lastModified === file.lastModified
        ) === index
      );
    });
    setError(null);
    setResults(null);
    setStatus('idle');
    e.target.value = '';
  };

  return (
    <main className="min-h-screen bg-gray-50 py-16 px-4">
      <div className="max-w-xl mx-auto space-y-8">

        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">MRM Product Catalog</h1>
          <p className="mt-2 text-gray-500 text-sm">
            Upload the MRM CSV and optionally the latest Shopify export. All processing stays in your browser.
          </p>
        </div>

        {/* MRM upload zone */}
        <div
          onClick={() => status !== 'processing' && inputRef.current?.click()}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          className={`border-2 border-dashed rounded-2xl p-14 text-center transition-all select-none
            ${status === 'processing'
              ? 'border-yellow-300 bg-yellow-50 cursor-wait'
              : dragging
              ? 'border-blue-500 bg-blue-50 cursor-copy'
              : 'border-gray-300 bg-white hover:border-blue-400 hover:bg-blue-50 cursor-pointer'
            }`}
        >
          <input ref={inputRef} type="file" accept=".csv" onChange={onInputChange} className="hidden" />

          {status === 'processing' ? (
            <>
              <div className="text-5xl mb-4 animate-spin inline-block">⚙️</div>
              <p className="font-semibold text-yellow-700">Processing your file…</p>
              <p className="text-sm text-yellow-600 mt-1">This may take a few seconds for large files.</p>
            </>
          ) : (
            <>
              <div className="text-5xl mb-4">📂</div>
              <p className="font-semibold text-gray-700">
                {dragging ? 'Drop the MRM CSV here' : mrmFile ? mrmFile.name : 'Select the MRM input CSV'}
              </p>
              <p className="text-sm text-gray-400 mt-1">Required · encoding detected automatically</p>
            </>
          )}
        </div>

        {/* Optional Shopify export safety filter */}
        {status !== 'processing' && (
          <div className="bg-white border border-gray-200 rounded-2xl p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold text-gray-800">
                  Latest Shopify product export <span className="font-normal text-gray-400">(optional)</span>
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Upload multiple CSV or ZIP files; each ZIP must contain exactly one CSV. Missing SKUs are removed.
                  Existing variants outside actif/Destockage unpublish their product from the Online Store.
                </p>
              </div>
              {shopifyFiles.length > 0 && (
                <button onClick={() => setShopifyFiles([])} className="text-xs text-red-500 hover:text-red-700">Remove all</button>
              )}
            </div>
            <input ref={shopifyInputRef} type="file" accept=".csv,.zip" multiple onChange={onShopifyInputChange} className="hidden" />
            <button
              onClick={() => shopifyInputRef.current?.click()}
              className="mt-3 w-full px-4 py-3 border border-dashed border-gray-300 rounded-xl text-sm text-gray-600 hover:border-blue-400 hover:bg-blue-50 transition-colors"
            >
              {shopifyFiles.length ? 'Add more Shopify export files' : 'Select Shopify export CSV or ZIP files'}
            </button>
            {shopifyFiles.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {shopifyFiles.map((file, index) => (
                  <div key={`${file.name}-${file.size}-${file.lastModified}`} className="flex items-center justify-between gap-3 px-3 py-2 bg-gray-50 rounded-lg">
                    <span className="text-xs text-gray-600 truncate">{file.name}</span>
                    <button
                      onClick={() => setShopifyFiles(files => files.filter((_, fileIndex) => fileIndex !== index))}
                      className="text-xs text-red-500 hover:text-red-700 whitespace-nowrap"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <p className="text-xs text-gray-400">{shopifyFiles.length} Shopify export file(s) selected</p>
              </div>
            )}
          </div>
        )}

        {status !== 'processing' && status !== 'done' && (
          <button
            onClick={handleProcess}
            disabled={!mrmFile}
            className="w-full px-5 py-3.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {shopifyFiles.length ? 'Filter to Shopify products and process' : 'Process MRM file'}
          </button>
        )}

        {/* Error */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            ⚠️ {error}
          </div>
        )}

        {/* Results */}
        {status === 'done' && results && (
          <div className="space-y-5">

            {/* Stats */}
            <div className="grid grid-cols-4 gap-3 text-center">
              {[
                { label: 'Input rows',    value: results.stats.input   },
                { label: 'Output rows',   value: results.stats.output  },
                { label: 'Wedding rings', value: results.stats.wedding },
                { label: 'Other',         value: results.stats.other   },
              ].map(({ label, value }) => (
                <div key={label} className="bg-white border border-gray-200 rounded-xl p-4">
                  <div className="text-2xl font-bold text-blue-600">{value.toLocaleString()}</div>
                  <div className="text-xs text-gray-500 mt-1 leading-tight">{label}</div>
                </div>
              ))}
            </div>

            {/* Rows excluded by each sequential pipeline filter */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
                <div>
                  <h2 className="text-sm font-semibold text-gray-800">Rows dropped from final output</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Each row is counted against the first filter that removes it.</p>
                </div>
                <div className="text-right ml-4">
                  <div className="text-xl font-bold text-red-600">{results.stats.dropped.toLocaleString()}</div>
                  <div className="text-xs text-gray-500">total dropped</div>
                </div>
              </div>
              <div className="divide-y divide-gray-100">
                {results.stats.dropReasons.map(reason => (
                  <div key={reason.key} className="flex items-center justify-between gap-4 px-4 py-2.5">
                    <span className="text-xs text-gray-600">{reason.label}</span>
                    <span className={`text-sm font-semibold tabular-nums ${reason.count ? 'text-red-600' : 'text-gray-400'}`}>
                      {reason.count.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Detected source encoding — output is always UTF-8 with BOM */}
            <p className="text-xs text-center text-gray-400">
              Source encoding detected: <span className="font-medium text-gray-500">{results.stats.encoding}</span>
              {' · '}downloads are UTF-8 with BOM
            </p>

            {results.stats.shopifyFilterApplied && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-green-800 text-xs">
                Shopify safety filter applied across <b>{results.stats.shopifyFiles.toLocaleString()}</b> file(s), using <b>{results.stats.shopifyVariants.toLocaleString()}</b> exported variant SKUs.
                Variants absent from that export cannot appear in these output files.
              </div>
            )}

            {results.stats.shopifyFilterApplied && results.stats.unpublishedProducts > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs">
                <b>{results.stats.unpublishedProducts.toLocaleString()}</b> product(s) will be unpublished from the Online Store because
                they are unavailable in MRM or outside the approved product rules. Collection-ineligible existing products are also set to draft.
                This affects <b>{results.stats.unpublishedRows.toLocaleString()}</b> output row(s).
              </div>
            )}

            {/* Upstream mojibake repair (MRM exports cp1252 text mis-decoded as cp1250) */}
            {results.stats.repaired > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs">
                Repaired accents in <b>{results.stats.repaired.toLocaleString()}</b> fields — the MRM
                export mis-encodes à, è, ï and Ø (e.g. “Chevaličre” → “Chevalière”). Fixed here, but
                worth reporting to MRM so the export is corrected at source.
              </div>
            )}

            {/* Output mode tabs */}
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 bg-blue-50 border-b border-blue-100">
                <h2 className="text-sm font-semibold text-blue-900">Shopify import workflow</h2>
                <ol className="mt-2 space-y-1 text-xs text-blue-800 list-decimal list-inside">
                  <li><b>Full Import:</b> creates or refreshes products and variants; includes Age Group, Jewel Style, and Stones.</li>
                  <li><b>Description + Tags + Metafields:</b> when a Shopify export is supplied, includes only products whose values actually changed.</li>
                  <li><b>New Products:</b> full imports for eligible MRM products absent from every supplied Shopify export.</li>
                </ol>
              </div>

              {/* Tab bar */}
              <div className="flex border-b border-gray-200">
                <button
                  onClick={() => setOutputMode('full')}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors
                    ${outputMode === 'full'
                      ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500'
                      : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                    }`}
                >
                  Full Import
                </button>
                <button
                  onClick={() => setOutputMode('desc')}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors
                    ${outputMode === 'desc'
                      ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500'
                      : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                    }`}
                >
                  Description + Tags + Metafields
                </button>
                <button
                  onClick={() => setOutputMode('new')}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors
                    ${outputMode === 'new'
                      ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500'
                      : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                    }`}
                >
                  New Products
                </button>
              </div>

              {/* Tab content */}
              <div className="p-5 space-y-2">
                {outputMode === 'full' ? (
                  <>
                    <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg text-xs text-green-800">
                      <b>Product and variant import.</b> It includes Age Group, Jewel Style, and Stones using the exact
                      headers and newline-separated list format emitted by your Shopify product export.
                    </div>
                    <p className="text-xs text-gray-400 mb-3">All {OUTPUT_COLUMNS.length} product/variant columns.</p>
                    {results.files.map(f => (
                      <DownloadButton key={f.filename} {...f} />
                    ))}
                  </>
                ) : outputMode === 'desc' ? (
                  <>
                    <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                      <b>Existing-product fields only.</b> This does not update inventory, pricing, or images.
                      Select <b>Overwrite existing products</b> during import.
                    </div>
                    <p className="text-xs text-gray-400 mb-3">
                      {DESC_UPDATE_COLUMNS.length} columns · {results.stats.descOutput.toLocaleString()} rows across {results.stats.descProducts.toLocaleString()} products.
                      Updates Description, Tags, publication, Age Group, Jewel Style, and Stones.
                    </p>
                    {results.descFiles.length ? results.descFiles.map(f => (
                      <DownloadButton key={f.filename} {...f} />
                    )) : (
                      <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800 text-center">
                        No Description, Tags, publication, or metafield updates are required.
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="mb-3 p-3 bg-purple-50 border border-purple-200 rounded-lg text-xs text-purple-800">
                      <b>New products only.</b> These are full product and variant imports that passed all pipeline rules but were absent from Shopify by both SKU and expected MRM handle.
                    </div>
                    {results.stats.shopifyFilterApplied ? (
                      <>
                        <p className="text-xs text-gray-400 mb-3">
                          {results.stats.newProductRows.toLocaleString()} rows across {results.stats.newProducts.toLocaleString()} new products.
                        </p>
                        {results.newProductFiles.length ? results.newProductFiles.map(f => (
                          <DownloadButton key={f.filename} {...f} />
                        )) : (
                          <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800 text-center">
                            No eligible new products were found.
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 text-center">
                        Upload the latest Shopify export file(s) to generate the new-products comparison.
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Process another */}
            <button
              onClick={() => {
                setStatus('idle'); setResults(null); setError(null);
                setMrmFile(null); setShopifyFiles([]);
                if (inputRef.current) inputRef.current.value = '';
                if (shopifyInputRef.current) shopifyInputRef.current.value = '';
              }}
              className="w-full text-sm text-gray-400 hover:text-blue-600 transition-colors py-2"
            >
              ← Process another file
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
