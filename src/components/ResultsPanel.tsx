import React, { useEffect, useRef, useMemo } from 'react';
import Plotly from 'plotly.js-dist-min';
import { SimulationResults, TempData, GrowthParams, FoodRationParams, InitialMassParams, LengthWeightParams, SurvivalParams } from '../types';
import { Download, TrendingUp, Ruler, Heart, Info } from 'lucide-react';
import Papa from 'papaparse';
import { parseISO, addDays, format, differenceInDays } from 'date-fns';

interface ResultsPanelProps {
  results: SimulationResults;
  tempData: TempData[];
  allTempData: TempData[];
  growthParams: GrowthParams;
  foodParams: FoodRationParams;
  initialMassParams: InitialMassParams;
  lwParams: LengthWeightParams;
  survivalParams: SurvivalParams;
  startDate: string;
  endDate: string;
}

function computeStats(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
  const sd = Math.sqrt(variance);
  const quantile = (q: number) => {
    const pos = (n - 1) * q;
    const base = Math.floor(pos);
    const rest = pos - base;
    return sorted[base + 1] !== undefined
      ? sorted[base] + rest * (sorted[base + 1] - sorted[base])
      : sorted[base];
  };
  return {
    p10: quantile(0.1),
    mean,
    median: quantile(0.5),
    sd,
    p90: quantile(0.9),
  };
}

const StatRow = ({ label, stats, unit, decimals = 2 }: { label: string; stats: ReturnType<typeof computeStats>; unit: string; decimals?: number }) => (
  <div className="grid grid-cols-5 gap-3 text-center">
    {[
      { key: 'P10', val: stats.p10 },
      { key: 'Mean', val: stats.mean },
      { key: 'Median', val: stats.median },
      { key: 'SD', val: stats.sd },
      { key: 'P90', val: stats.p90 },
    ].map(({ key, val }) => (
      <div key={key} className="bg-[#f5f5f4] rounded-lg p-2 border border-black/5">
        <p className="text-[10px] font-bold text-black/40 uppercase tracking-wider">{key}</p>
        <p className="text-sm font-semibold text-black/70">{val.toFixed(decimals)} <span className="text-[10px] text-black/40">{unit}</span></p>
      </div>
    ))}
  </div>
);

export const ResultsPanel: React.FC<ResultsPanelProps> = ({
  results,
  tempData,
  allTempData,
  growthParams,
  foodParams,
  initialMassParams,
  lwParams,
  survivalParams,
  startDate,
  endDate,
}) => {
  const tempChartRef = useRef<HTMLDivElement>(null);
  const growthProjectionRef = useRef<HTMLDivElement>(null);
  const massDistChartRef = useRef<HTMLDivElement>(null);
  const flDistChartRef = useRef<HTMLDivElement>(null);
  const survivalChartRef = useRef<HTMLDivElement>(null);
  const uncertaintyChartRef = useRef<HTMLDivElement>(null);

  // Compute pooled stats
  const massStats = useMemo(() => computeStats(results.pooledFish.map(f => f.finalMass)), [results]);
  const flStats = useMemo(() => computeStats(results.pooledFish.map(f => f.finalFL)), [results]);
  const survivalRepStats = useMemo(() => computeStats(results.replicateSummaries.map(r => r.meanS)), [results]);

  useEffect(() => {
    if (!results) return;

    const layoutDefaults = {
      font: { family: 'Inter, sans-serif', size: 11 },
      margin: { t: 40, r: 20, b: 40, l: 50 },
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)',
      xaxis: { gridcolor: '#eee', zeroline: false },
      yaxis: { gridcolor: '#eee', zeroline: false },
    };

    // 1. Temperature Time Series (full width, show ALL data, highlight growth season)
    if (tempChartRef.current) {
      const plotData = allTempData.length > 0 ? allTempData : tempData;
      const dates = plotData.map(d => d.date);
      const temps = plotData.map(d => d.temp_c);

      Plotly.newPlot(
        tempChartRef.current,
        [
          {
            x: dates,
            y: temps,
            type: 'scatter',
            mode: 'lines',
            name: 'Temperature',
            line: { color: '#6b7280', width: 1.5 },
          },
          {
            x: tempData.map(d => d.date),
            y: tempData.map(d => d.temp_c),
            type: 'scatter',
            mode: 'lines',
            name: 'Growth Season',
            line: { color: '#10b981', width: 2.5 },
          },
        ],
        {
          ...layoutDefaults,
          title: { text: 'Temperature Time Series' },
          xaxis: { ...layoutDefaults.xaxis, title: { text: 'Date' } },
          yaxis: { ...layoutDefaults.yaxis, title: { text: 'Temp (°C)' } },
          shapes: [
            {
              type: 'rect',
              xref: 'x',
              yref: 'paper',
              x0: startDate,
              x1: endDate,
              y0: 0,
              y1: 1,
              fillcolor: 'rgba(16, 185, 129, 0.1)',
              line: { width: 0 },
            },
            {
              type: 'line',
              xref: 'x',
              yref: 'paper',
              x0: startDate,
              x1: startDate,
              y0: 0,
              y1: 1,
              line: { color: '#10b981', width: 1.5, dash: 'dash' },
            },
            {
              type: 'line',
              xref: 'x',
              yref: 'paper',
              x0: endDate,
              x1: endDate,
              y0: 0,
              y1: 1,
              line: { color: '#10b981', width: 1.5, dash: 'dash' },
            },
          ],
          annotations: [
            {
              x: startDate,
              y: 1,
              xref: 'x',
              yref: 'paper',
              text: 'Growth Start',
              showarrow: false,
              font: { size: 9, color: '#059669' },
              xanchor: 'left',
              yanchor: 'bottom',
              xshift: 4,
            },
            {
              x: endDate,
              y: 1,
              xref: 'x',
              yref: 'paper',
              text: 'Growth End',
              showarrow: false,
              font: { size: 9, color: '#059669' },
              xanchor: 'right',
              yanchor: 'bottom',
              xshift: -4,
            },
          ],
        },
        { responsive: true, displayModeBar: false }
      );
    }

    // 2. Growth Season Projection — deterministic single fish
    if (growthProjectionRef.current) {
      const start = parseISO(startDate);
      const end = parseISO(endDate);
      const seasonDays = differenceInDays(end, start) + 1;

      // Deterministic (mean) parameter values
      const detTU = (growthParams.tUMin + growthParams.tUMax) / 2;
      const detD = growthParams.meanD;
      const detGammaG = growthParams.meanGammaG;
      const detR = foodParams.mode === 'scenario' ? foodParams.fixedR : foodParams.meanR;
      const detG = detGammaG * detR;
      const detA = (lwParams.aMin + lwParams.aMax) / 2;
      const detBLW = (lwParams.bLWMin + lwParams.bLWMax) / 2;

      const tempMap = new Map<string, number>(tempData.map(d => [d.date, d.temp_c]));

      const projDates: string[] = [];
      const projTemp: number[] = [];
      const projMass: number[] = [];
      const projFL: number[] = [];

      let mass = initialMassParams.mean;
      let lastT = tempData.length > 0 ? tempData[0].temp_c : 0;

      for (let day = 0; day < seasonDays; day++) {
        const currentDate = format(addDays(start, day), 'yyyy-MM-dd');
        // Carry the last known temperature over any gap rather than dropping to 0,
        // which would otherwise draw a spurious vertical spike in the projection.
        const T = tempMap.get(currentDate) ?? lastT;
        lastT = T;

        // Record start-of-day state
        projDates.push(currentDate);
        projTemp.push(T);
        projMass.push(mass);
        projFL.push(Math.pow(mass / detA, 1 / detBLW));

        // Ratkowsky growth
        let omega = 0;
        if (T < detTU) {
          omega = detD * (T - growthParams.tL) * (1 - Math.exp(detG * (T - detTU)));
          omega = Math.max(0, omega);
        }
        mass = Math.pow(
          Math.pow(mass, growthParams.bGrow) + (growthParams.bGrow * omega) / 100,
          1 / growthParams.bGrow
        );
      }

      // Update the last point to show final post-growth mass
      projMass[projMass.length - 1] = mass;
      projFL[projFL.length - 1] = Math.pow(mass / detA, 1 / detBLW);

      Plotly.newPlot(
        growthProjectionRef.current,
        [
          {
            x: projDates,
            y: projTemp,
            type: 'scatter',
            mode: 'lines',
            name: 'Temperature (°C)',
            line: { color: '#6b7280', width: 1.5 },
            yaxis: 'y',
          },
          {
            x: projDates,
            y: projMass,
            type: 'scatter',
            mode: 'lines',
            name: 'Mass (g)',
            line: { color: '#10b981', width: 2.5 },
            yaxis: 'y2',
          },
          {
            x: projDates,
            y: projFL,
            type: 'scatter',
            mode: 'lines',
            name: 'Fork Length (mm)',
            line: { color: '#3b82f6', width: 2.5 },
            yaxis: 'y3',
          },
        ],
        {
          ...layoutDefaults,
          title: { text: '' },
          xaxis: {
            ...layoutDefaults.xaxis,
            title: { text: 'Date' },
            domain: [0, 0.82],
          },
          yaxis: {
            ...layoutDefaults.yaxis,
            title: { text: 'Temperature (°C)', font: { color: '#6b7280' } },
            tickfont: { color: '#6b7280' },
          },
          yaxis2: {
            title: { text: 'Mass (g)', font: { color: '#10b981' } },
            tickfont: { color: '#10b981' },
            overlaying: 'y',
            side: 'right',
            gridcolor: 'transparent',
            zeroline: false,
          },
          yaxis3: {
            title: { text: 'Fork Length (mm)', font: { color: '#3b82f6' } },
            tickfont: { color: '#3b82f6' },
            overlaying: 'y',
            side: 'right',
            anchor: 'free',
            position: 0.9,
            gridcolor: 'transparent',
            zeroline: false,
          },
          legend: { x: 0, y: 1.15, orientation: 'h' },
          margin: { t: 60, r: 80, b: 40, l: 50 },
        },
        { responsive: true, displayModeBar: false }
      );
    }

    // 3. Fall Mass Distribution
    if (massDistChartRef.current) {
      const masses = results.pooledFish.map(f => f.finalMass);
      Plotly.newPlot(
        massDistChartRef.current,
        [
          {
            x: masses,
            type: 'histogram',
            autobinx: true,
            marker: { color: '#10b981', opacity: 0.7, line: { color: '#059669', width: 1 } },
          },
        ],
        {
          ...layoutDefaults,
          title: { text: 'Fall Mass Distribution' },
          xaxis: { ...layoutDefaults.xaxis, title: { text: 'Mass (g)' } },
          yaxis: { ...layoutDefaults.yaxis, title: { text: 'Frequency' } },
        },
        { responsive: true, displayModeBar: false }
      );
    }

    // 3. Fall FL Distribution
    if (flDistChartRef.current) {
      const fls = results.pooledFish.map(f => f.finalFL);
      Plotly.newPlot(
        flDistChartRef.current,
        [
          {
            x: fls,
            type: 'histogram',
            autobinx: true,
            marker: { color: '#3b82f6', opacity: 0.7, line: { color: '#2563eb', width: 1 } },
          },
        ],
        {
          ...layoutDefaults,
          title: { text: 'Fall Fork Length Distribution' },
          xaxis: { ...layoutDefaults.xaxis, title: { text: 'FL (mm)' } },
          yaxis: { ...layoutDefaults.yaxis, title: { text: 'Frequency' } },
        },
        { responsive: true, displayModeBar: false }
      );
    }

    // 4. Survival Curve (full width)
    if (survivalChartRef.current) {
      const flRange = Array.from({ length: 151 }, (_, i) => i + 50);
      const survivalProbs = flRange.map(fl => 1 / (1 + Math.exp(-(survivalParams.beta0 + survivalParams.beta1 * fl))));

      const sampleFish = results.pooledFish.slice(0, 500);

      Plotly.newPlot(
        survivalChartRef.current,
        [
          {
            x: flRange,
            y: survivalProbs,
            type: 'scatter',
            mode: 'lines',
            name: 'Logistic Curve',
            line: { color: '#ef4444', width: 3 },
          },
          {
            x: sampleFish.map(f => f.finalFL),
            y: sampleFish.map(f => f.survivalProb),
            type: 'scatter',
            mode: 'markers',
            name: 'Simulated Fish',
            marker: { color: '#10b981', size: 4, opacity: 0.3 },
          },
          {
            x: [60, 55, 90, 110],
            y: [0.17, 0.30, 0.50, 0.80],
            type: 'scatter',
            mode: 'markers+text' as any,
            name: 'Literature',
            marker: { color: '#2563eb', size: 10, symbol: 'diamond', line: { color: '#1e40af', width: 1 } },
            text: ['Sullivan 2000', 'Brakensiek et al. 2007', 'Ebersole 2006', 'Brakensiek et al. 2007'],
            textposition: 'top center',
            textfont: { size: 10, color: '#2563eb' },
          },
        ],
        {
          ...layoutDefaults,
          title: { text: 'Survival Probability vs Fork Length' },
          xaxis: { ...layoutDefaults.xaxis, title: { text: 'FL (mm)' } },
          yaxis: { ...layoutDefaults.yaxis, title: { text: 'Survival Prob' }, range: [0, 1] },
        },
        { responsive: true, displayModeBar: false }
      );
    }

    // 5. Replicate-Level Uncertainty (mean survival only)
    if (uncertaintyChartRef.current) {
      const meanSs = results.replicateSummaries.map(r => r.meanS);

      Plotly.newPlot(
        uncertaintyChartRef.current,
        [
          {
            x: meanSs,
            type: 'histogram',
            autobinx: true,
            name: 'Mean Survival',
            marker: { color: '#ef4444', opacity: 0.7, line: { color: '#dc2626', width: 1 } },
          },
        ],
        {
          ...layoutDefaults,
          title: { text: 'Replicate-Level Mean Overwinter Survival' },
          xaxis: { ...layoutDefaults.xaxis, title: { text: 'Mean Survival Probability' } },
          yaxis: { ...layoutDefaults.yaxis, title: { text: 'Frequency (Replicates)' } },
        },
        { responsive: true, displayModeBar: false }
      );
    }
  }, [results, tempData, allTempData, growthParams, foodParams, initialMassParams, lwParams, survivalParams, startDate, endDate]);

  const downloadCSV = (data: any[], filename: string) => {
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const overallMeanMass = results.replicateSummaries.reduce((a, b) => a + b.meanMass, 0) / results.replicateSummaries.length;
  const overallMeanFL = results.replicateSummaries.reduce((a, b) => a + b.meanFL, 0) / results.replicateSummaries.length;
  const overallMeanS = results.replicateSummaries.reduce((a, b) => a + b.meanS, 0) / results.replicateSummaries.length;

  const SummaryCard = ({ title, icon: Icon, value, unit, subValue, colorClass }: any) => (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-black/5 flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-2 rounded-lg ${colorClass}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <span className="text-[10px] font-bold text-black/30 uppercase tracking-widest">{title}</span>
      </div>
      <div>
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold tracking-tight">{value}</span>
          <span className="text-sm font-semibold text-black/40">{unit}</span>
        </div>
        <p className="text-xs text-black/40 mt-1 font-medium">{subValue}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Top-level summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <SummaryCard
          title="Fall Mass"
          icon={TrendingUp}
          value={overallMeanMass.toFixed(2)}
          unit="g"
          subValue="Cohort Mean"
          colorClass="bg-emerald-500"
        />
        <SummaryCard
          title="Fall Fork Length"
          icon={Ruler}
          value={overallMeanFL.toFixed(1)}
          unit="mm"
          subValue="Cohort Mean"
          colorClass="bg-blue-500"
        />
        <SummaryCard
          title="Winter Survival"
          icon={Heart}
          value={(overallMeanS * 100).toFixed(1)}
          unit="%"
          subValue="Apparent Probability"
          colorClass="bg-red-500"
        />
      </div>

      {/* Season stats row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-[#f5f5f4] p-4 rounded-xl border border-black/5 flex flex-col gap-1">
          <span className="text-[10px] font-bold text-black/40 uppercase tracking-wider">Growth Season</span>
          <span className="text-sm font-semibold text-black/70">{results.growthSeasonDays} Days</span>
        </div>
        <div className="bg-[#f5f5f4] p-4 rounded-xl border border-black/5 flex flex-col gap-1">
          <span className="text-[10px] font-bold text-black/40 uppercase tracking-wider">Temp Range (Season)</span>
          <span className="text-sm font-semibold text-black/70">
            {results.tempStats.min.toFixed(1)} – {results.tempStats.max.toFixed(1)} °C
          </span>
        </div>
        <div className="bg-[#f5f5f4] p-4 rounded-xl border border-black/5 flex flex-col gap-1">
          <span className="text-[10px] font-bold text-black/40 uppercase tracking-wider">Mean Temp (Season)</span>
          <span className="text-sm font-semibold text-black/70">{results.tempStats.mean.toFixed(2)} °C</span>
        </div>
      </div>

      {/* Temperature Time Series — full width, own row */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-black/5">
        <div ref={tempChartRef} className="h-80" />
      </div>

      {/* Growth Season Projection — deterministic single fish, full width */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-black/5">
        <div ref={growthProjectionRef} className="h-96" />
        <div className="mt-3">
          <p className="text-xs font-semibold text-black/70 mb-1">Growth Season: Deterministic Fish Projection</p>
          <p className="text-xs text-black/50 leading-relaxed">
            Deterministic projection of a single fish using mean parameter values
            (M<sub>0</sub> = {initialMassParams.mean} g, d = {growthParams.meanD},
            γ<sub>g</sub> = {growthParams.meanGammaG}, R = {foodParams.mode === 'scenario' ? foodParams.fixedR : foodParams.meanR}).
            No stochastic variation is applied.
          </p>
        </div>
      </div>

      {/* Fall Mass & Fork Length — side by side with stats inside each box */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-black/5 space-y-4">
          <div ref={massDistChartRef} className="h-80" />
          <StatRow label="Mass" stats={massStats} unit="g" />
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-black/5 space-y-4">
          <div ref={flDistChartRef} className="h-80" />
          <StatRow label="FL" stats={flStats} unit="mm" decimals={1} />
        </div>
      </div>

      {/* Survival Probability vs Fork Length — full width, own row */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-black/5">
        <div ref={survivalChartRef} className="h-80" />
      </div>

      {/* Replicate-Level Mean Survival — full width, own row with stats inside */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-black/5 space-y-4">
        <div ref={uncertaintyChartRef} className="h-80" />
        <StatRow label="Mean Survival" stats={survivalRepStats} unit="" decimals={4} />
      </div>

      {/* Download buttons */}
      <div className="flex gap-4">
        <button
          onClick={() => downloadCSV(results.replicateSummaries, 'replicate_summaries.csv')}
          className="flex-1 bg-white hover:bg-black/5 text-black/70 font-bold py-3 px-6 rounded-xl border border-black/5 flex items-center justify-center gap-2 transition-all"
        >
          <Download className="w-4 h-4" />
          Download Replicate Summaries
        </button>
        <button
          onClick={() => downloadCSV(results.pooledFish, 'pooled_fish_results.csv')}
          className="flex-1 bg-white hover:bg-black/5 text-black/70 font-bold py-3 px-6 rounded-xl border border-black/5 flex items-center justify-center gap-2 transition-all"
        >
          <Download className="w-4 h-4" />
          Download Pooled Fish Data
        </button>
      </div>

      {/* Model Assumptions */}
      <details className="bg-white rounded-2xl border border-black/5 overflow-hidden group">
        <summary className="px-6 py-4 cursor-pointer hover:bg-black/[0.02] transition-colors flex items-center gap-3 font-semibold text-black/60">
          <Info className="w-4 h-4" />
          Model Assumptions & Methodology
        </summary>
        <div className="px-6 pb-6 pt-2 text-sm text-black/50 space-y-3 leading-relaxed">
          <p>
            • <strong>Bioenergetics:</strong> Uses the Ratkowsky allometric growth model. Growth is
            mass-standardized and updated on a daily timestep.
          </p>
          <p>
            • <strong>Temperature:</strong> Daily mean temperatures are used. Diel variation is not
            modeled.
          </p>
          <p>
            • <strong>Food Ration:</strong> Represented by the parameter R (0-1+), which scales the
            maximum growth rate γ_g.
          </p>
          <p>
            • <strong>Survival:</strong> Overwinter survival is "apparent survival" modeled as a
            logistic function of fall fork length.
          </p>
          <p>
            • <strong>Limitations:</strong> No density dependence, no summer heat mortality (growth is
            simply truncated at 0), and size is "frozen" at the growth end date.
          </p>
        </div>
      </details>
    </div>
  );
};
