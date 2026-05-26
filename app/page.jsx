'use client';
import { useState, useCallback, useRef } from 'react';
import { processFile, toCSV } from '../lib/transform';

// ── Download button ────────────────────────────────────────────────────────────

function DownloadButton({ label, filename, rows }) {
  const [loading, setLoading] = useState(false);

  const handleDownload = () => {
    setLoading(true);
    setTimeout(() => {
      const csv  = toCSV(rows);
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

  const sizeMB = (new Blob([toCSV(rows)]).size / (1024 * 1024)).toFixed(1);

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
  const [status,  setStatus]  = useState('idle');
  const [results, setResults] = useState(null);
  const [error,   setError]   = useState(null);
  const [dragging, setDragging] = useState(false);
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
              <p className="text-sm text-gray-400 mt-1">French-encoded (ISO-8859-1) files supported</p>
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
                { label: 'Input rows',     value: results.stats.input   },
                { label: 'Output rows',    value: results.stats.output  },
                { label: 'Wedding rings',  value: results.stats.wedding },
                { label: 'Other',          value: results.stats.other   },
              ].map(({ label, value }) => (
                <div key={label} className="bg-white border border-gray-200 rounded-xl p-4">
                  <div className="text-2xl font-bold text-blue-600">{value.toLocaleString()}</div>
                  <div className="text-xs text-gray-500 mt-1 leading-tight">{label}</div>
                </div>
              ))}
            </div>

            {/* Download buttons */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-2">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Download Output Files
              </h2>
              {results.files.map(f => (
                <DownloadButton key={f.filename} {...f} />
              ))}
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
