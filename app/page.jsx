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
  const [outputMode, setOutputMode] = useState('full'); // 'full' | 'desc' | 'metafields'
  const inputRef = useRef(null);

  const handleFile = useCallback(async (file) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Please upload a .csv file.');
      return;
    }
    setStatus('processing');
    setError(null);
    setResults(null);

    try {
      const result = await processFile(file);
      setResults(result);
      setStatus('done');
    } catch (err) {
      setError(err.message || 'An unexpected error occurred.');
      setStatus('error');
    }
  }, []);

  const onDrop      = useCallback((e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }, [handleFile]);
  const onDragOver  = (e) => { e.preventDefault(); setDragging(true);  };
  const onDragLeave = ()  => setDragging(false);
  const onInputChange = (e) => handleFile(e.target.files[0]);

  return (
    <main className="min-h-screen bg-gray-50 py-16 px-4">
      <div className="max-w-xl mx-auto space-y-8">

        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">MRM Product Catalog</h1>
          <p className="mt-2 text-gray-500 text-sm">
            Upload your CSV, all transformations run in your browser, then download the output files.
          </p>
        </div>

        {/* Upload zone */}
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
                {dragging ? 'Drop your CSV file here' : 'Click or drag & drop your CSV file'}
              </p>
              <p className="text-sm text-gray-400 mt-1">Encoding detected automatically — accents are preserved</p>
            </>
          )}
        </div>

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
                  <li><b>Full Import:</b> creates or refreshes products and variants; includes the single-value Age Group metafield.</li>
                  <li><b>Description + Tags:</b> optional existing-product update for Description, Tags, and Age Group only.</li>
                  <li><b>List Metafields:</b> separate custom-field-only files for Jewel Style and Stones. Import both after the products exist.</li>
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
                  Description + Tags
                </button>
                <button
                  onClick={() => setOutputMode('metafields')}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors
                    ${outputMode === 'metafields'
                      ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500'
                      : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                    }`}
                >
                  List Metafields
                </button>
              </div>

              {/* Tab content */}
              <div className="p-5 space-y-2">
                {outputMode === 'full' ? (
                  <>
                    <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg text-xs text-green-800">
                      <b>Product and variant import.</b> Use this first. It includes Age Group, but Jewel Style and Stones
                      must be applied afterward from the List Metafields tab.
                    </div>
                    <p className="text-xs text-gray-400 mb-3">All {OUTPUT_COLUMNS.length} product/variant columns.</p>
                    {results.files.map(f => (
                      <DownloadButton key={f.filename} {...f} />
                    ))}
                  </>
                ) : outputMode === 'desc' ? (
                  <>
                    <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                      <b>Existing-product fields only.</b> This does not update inventory, pricing, images, Jewel Style, or Stones.
                      Select <b>Overwrite existing products</b> during import.
                    </div>
                    <p className="text-xs text-gray-400 mb-3">
                      {DESC_UPDATE_COLUMNS.length} columns · {results.stats.output.toLocaleString()} rows (all variants included so Shopify can match each size).
                      Updates Description, Tags, and Age Group.
                    </p>
                    {results.descFiles.map(f => (
                      <DownloadButton key={f.filename} {...f} />
                    ))}
                  </>
                ) : (
                  <>
                    <div className="mb-3 p-3 bg-purple-50 border border-purple-200 rounded-lg text-xs text-purple-800">
                      <b>Custom-field updates only — not product or variant imports.</b> Import both files after the products
                      already exist, and select <b>Overwrite existing products</b>. The files update only Jewel Style and Stones.
                    </div>
                    <p className="text-xs text-gray-400 mb-3">
                      Separate three-column files for Jewel Style and Stones, with one value per product row.
                      Continuation rows repeat the exact Handle and leave Title blank.
                    </p>
                    {results.metafieldFiles.map(f => (
                      <DownloadButton key={f.filename} {...f} />
                    ))}
                  </>
                )}
              </div>
            </div>

            {/* Process another */}
            <button
              onClick={() => { setStatus('idle'); setResults(null); setError(null); }}
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
