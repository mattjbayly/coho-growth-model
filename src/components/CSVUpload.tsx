import React, { useState } from 'react';
import Papa from 'papaparse';
import { Upload, AlertCircle, CheckCircle2, FileText, ChevronDown, ChevronUp, Download } from 'lucide-react';
import { TempData } from '../types';
import { parseTempRows } from '../utils/temperature';

interface CSVUploadProps {
  rawData: TempData[];
  onRawDataLoaded: (data: TempData[]) => void;
  missingHandling: 'carry' | 'drop';
  setMissingHandling: (v: 'carry' | 'drop') => void;
  /** Error surfaced from the App-level interpolation step (e.g. window not covered). */
  externalError?: string | null;
}

export const CSVUpload: React.FC<CSVUploadProps> = ({
  rawData,
  onRawDataLoaded,
  missingHandling,
  setMissingHandling,
  externalError,
}) => {
  const [parseError, setParseError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const downloadTemplate = () => {
    const rows = [
      { date: '2025-06-01', temp_c: 11.8 },
      { date: '2025-06-02', temp_c: 12.1 },
      { date: '2025-06-03', temp_c: 12.6 },
      { date: '2025-06-04', temp_c: 13.0 },
      { date: '2025-06-05', temp_c: 13.4 },
    ];
    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'temperature_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
      complete: (results) => {
        const { data, error } = parseTempRows(results.data as any[]);
        if (error) {
          setParseError(error);
          return;
        }
        setParseError(null);
        onRawDataLoaded(data);
      },
      error: (err) => {
        setParseError(`CSV Parsing Error: ${err.message}`);
      },
    });
    // Allow re-uploading the same file name
    e.target.value = '';
  };

  const error = parseError || externalError || null;
  const stats = rawData.length > 0
    ? { minDate: rawData[0].date, maxDate: rawData[rawData.length - 1].date, count: rawData.length }
    : null;
  const preview = rawData.slice(0, 10);

  return (
    <div className="space-y-4">
      {/* Format guidance */}
      <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100 space-y-3">
        <p className="text-[10px] font-semibold text-emerald-800 uppercase tracking-wider">
          How to format your CSV
        </p>
        <p className="text-[11px] text-emerald-700/90 leading-relaxed">
          Upload a plain <strong>.csv</strong> file with <strong>one row per day</strong> and exactly
          two columns: a <strong>date</strong> and a <strong>daily mean water temperature</strong> in °C.
          The first row must be the column headers.
        </p>

        {/* Required columns */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white/70 rounded-lg border border-emerald-100 p-2">
            <p className="text-[10px] font-mono font-semibold text-emerald-900">date</p>
            <p className="text-[10px] text-emerald-700/80 leading-tight mt-0.5">
              ISO format <span className="font-mono">YYYY-MM-DD</span> (e.g. 2025-06-01).
            </p>
          </div>
          <div className="bg-white/70 rounded-lg border border-emerald-100 p-2">
            <p className="text-[10px] font-mono font-semibold text-emerald-900">temp_c</p>
            <p className="text-[10px] text-emerald-700/80 leading-tight mt-0.5">
              Numeric temperature in °C (e.g. 12.6).
            </p>
          </div>
        </div>

        {/* Example */}
        <div>
          <p className="text-[10px] font-semibold text-emerald-800 mb-1">Example file contents</p>
          <pre className="text-[10px] font-mono text-emerald-900/80 bg-white/70 rounded-lg border border-emerald-100 p-2 overflow-x-auto leading-relaxed">
{`date,temp_c
2025-06-01,11.8
2025-06-02,12.1
2025-06-03,12.6`}
          </pre>
        </div>

        <p className="text-[10px] text-emerald-700/70 leading-relaxed">
          Header names are matched flexibly (e.g. <span className="font-mono">Date</span>,
          <span className="font-mono"> temperature</span>, <span className="font-mono">Temp</span> are
          also accepted). Rows may be in any order and gaps are filled by interpolation — see the
          missing-data option below.
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2">
        <label className="cursor-pointer w-full bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-600/10">
          <Upload className="w-4 h-4" />
          <span>Upload Temperature CSV</span>
          <input type="file" accept=".csv" onChange={onFileChange} className="hidden" />
        </label>
        <button
          onClick={downloadTemplate}
          className="w-full bg-white hover:bg-black/5 text-black/60 font-semibold py-2.5 px-4 rounded-xl border border-black/5 flex items-center justify-center gap-2 transition-all text-xs"
        >
          <Download className="w-4 h-4" />
          Download template CSV
        </button>
        <p className="text-[10px] text-black/40 leading-relaxed">
          A sample dataset is loaded by default so you can explore the model immediately — upload your
          own CSV to replace it.
        </p>
      </div>

      {/* Missing-data handling */}
      <div className="p-3 bg-[#f5f5f4] rounded-lg border border-black/5 space-y-2">
        <p className="text-[10px] font-semibold text-black/60">Missing / partial coverage</p>
        <p className="text-[10px] text-black/40 leading-relaxed">
          Days inside the growth window that are missing from your file are linearly interpolated.
          Choose how to handle dates before the first / after the last observation:
        </p>
        <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-black/5 w-fit">
          <button
            onClick={() => setMissingHandling('carry')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${missingHandling === 'carry' ? 'bg-emerald-50 shadow-sm text-emerald-600' : 'text-black/40 hover:text-black/60'}`}
          >
            Carry Ends
          </button>
          <button
            onClick={() => setMissingHandling('drop')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${missingHandling === 'drop' ? 'bg-emerald-50 shadow-sm text-emerald-600' : 'text-black/40 hover:text-black/60'}`}
          >
            Drop Incomplete
          </button>
        </div>
        <p className="text-[10px] text-black/40 leading-relaxed">
          <strong>Carry Ends</strong> holds the first/last observed value flat to fill the window.
          <strong> Drop Incomplete</strong> requires your data to fully cover the growth dates.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <div className="text-sm text-red-700 whitespace-pre-line">{error}</div>
        </div>
      )}

      {stats && (
        <div className="space-y-2">
          <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
            <p className="text-sm font-bold text-emerald-700">Data Loaded</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-[#f5f5f4] p-3 rounded-xl border border-black/5">
              <p className="text-[10px] font-bold text-black/40 uppercase tracking-wider mb-1">Date Range</p>
              <p className="text-xs font-semibold text-black/70">{stats.minDate}<br />→ {stats.maxDate}</p>
            </div>
            <div className="bg-[#f5f5f4] p-3 rounded-xl border border-black/5">
              <p className="text-[10px] font-bold text-black/40 uppercase tracking-wider mb-1">Observations</p>
              <p className="text-sm font-semibold text-black/70">{stats.count} days</p>
            </div>
          </div>
        </div>
      )}

      {preview.length > 0 && (
        <div className="border border-black/5 rounded-xl overflow-hidden">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="w-full px-4 py-3 bg-[#f5f5f4] flex items-center justify-between text-sm font-semibold text-black/60 hover:bg-black/5 transition-colors"
          >
            <span className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Data Preview (First 10 rows)
            </span>
            {showPreview ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {showPreview && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f5f5f4] border-b border-black/5">
                  <tr>
                    <th className="px-4 py-2 font-bold text-black/40 uppercase tracking-wider">Date</th>
                    <th className="px-4 py-2 font-bold text-black/40 uppercase tracking-wider">Temp (°C)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {preview.map((row, i) => (
                    <tr key={i} className="hover:bg-black/[0.02]">
                      <td className="px-4 py-2 font-mono text-black/60">{row.date}</td>
                      <td className="px-4 py-2 font-mono text-black/60">{row.temp_c.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
