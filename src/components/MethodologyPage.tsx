import React, { useMemo } from 'react';
import {
  Thermometer, CalendarDays, TrendingUp, Bug, Scale, Ruler, Heart,
  Dices, ArrowLeft, BookOpen, Workflow
} from 'lucide-react';
import { parseISO, format, isValid, differenceInDays } from 'date-fns';
import {
  GrowthParams, FoodRationParams, InitialMassParams,
  LengthWeightParams, SurvivalParams, SimulationSettings, TempData
} from '../types';
import { MiniPlot } from './MiniPlot';
import { References } from './References';

interface MethodologyPageProps {
  rawTempData: TempData[];
  tempData: TempData[];
  settings: SimulationSettings;
  growthParams: GrowthParams;
  foodParams: FoodRationParams;
  initialMassParams: InitialMassParams;
  lwParams: LengthWeightParams;
  survivalParams: SurvivalParams;
  onBack: () => void;
}

const SECTIONS = [
  { id: 'overview', label: 'Overview', icon: Workflow },
  { id: 'temperature', label: 'Temperature Data', icon: Thermometer },
  { id: 'dates', label: 'Dates', icon: CalendarDays },
  { id: 'growth', label: 'Growth', icon: TrendingUp },
  { id: 'food', label: 'Food', icon: Bug },
  { id: 'mass', label: 'Initial Mass', icon: Scale },
  { id: 'lw', label: 'Length–Weight', icon: Ruler },
  { id: 'survival', label: 'Winter Survival', icon: Heart },
  { id: 'montecarlo', label: 'Monte Carlo', icon: Dices },
  { id: 'references', label: 'References', icon: BookOpen },
];

const fmt = (d: string) => {
  const p = parseISO(d);
  return isValid(p) ? format(p, 'MMM d, yyyy') : d;
};

const Section = ({ id, icon: Icon, title, subtitle, children }: {
  id: string; icon: any; title: string; subtitle: string; children: React.ReactNode;
}) => (
  <section id={`methodology/${id}`} className="bg-white rounded-2xl p-8 shadow-sm border border-black/5 scroll-mt-24">
    <div className="flex items-start gap-3 mb-6">
      <div className="bg-emerald-100 p-2 rounded-lg flex-shrink-0">
        <Icon className="w-5 h-5 text-emerald-600" />
      </div>
      <div>
        <h2 className="text-xl font-semibold tracking-tight leading-tight">{title}</h2>
        <p className="text-sm text-black/40 leading-tight mt-0.5">{subtitle}</p>
      </div>
    </div>
    <div className="space-y-5 text-sm text-black/70 leading-relaxed">{children}</div>
  </section>
);

const Eq = ({ children }: { children: React.ReactNode }) => (
  <div className="p-3 bg-[#f5f5f4] rounded-lg border border-black/5 font-mono text-xs text-black/60 leading-relaxed">
    {children}
  </div>
);

const Params = ({ rows }: { rows: [string, string, string][] }) => (
  <table className="w-full text-xs border-collapse">
    <thead>
      <tr className="text-left text-[10px] uppercase tracking-wider text-black/40 border-b border-black/10">
        <th className="py-2 pr-4 font-semibold">Parameter</th>
        <th className="py-2 pr-4 font-semibold">Current value</th>
        <th className="py-2 font-semibold">Role</th>
      </tr>
    </thead>
    <tbody>
      {rows.map(([p, v, r]) => (
        <tr key={p} className="border-b border-black/5">
          <td className="py-2 pr-4 font-mono text-black/70 whitespace-nowrap">{p}</td>
          <td className="py-2 pr-4 font-mono text-emerald-700 whitespace-nowrap">{v}</td>
          <td className="py-2 text-black/50">{r}</td>
        </tr>
      ))}
    </tbody>
  </table>
);

const Figure = ({ caption, children }: { caption: string; children: React.ReactNode }) => (
  <figure>
    {children}
    <figcaption className="text-[11px] text-black/40 mt-2 leading-snug">{caption}</figcaption>
  </figure>
);

const omegaAt = (T: number, gp: GrowthParams, g: number, tU: number) => {
  if (T >= tU || T <= gp.tL) return 0;
  return Math.max(0, gp.meanD * (T - gp.tL) * (1 - Math.exp(g * (T - tU))));
};

export const MethodologyPage: React.FC<MethodologyPageProps> = ({
  rawTempData, tempData, settings, growthParams, foodParams,
  initialMassParams, lwParams, survivalParams, onBack,
}) => {
  const R = foodParams.mode === 'scenario' ? foodParams.fixedR : foodParams.meanR;
  const tU = (growthParams.tUMin + growthParams.tUMax) / 2;
  const g = growthParams.meanGammaG * R;
  const legendH = { x: 0.5, y: 1.02, xanchor: 'center', orientation: 'h', font: { size: 9 } };

  const seasonDays = useMemo(() => {
    const s = parseISO(settings.startDate); const e = parseISO(settings.endDate);
    return isValid(s) && isValid(e) ? differenceInDays(e, s) + 1 : 0;
  }, [settings]);

  const tempStats = useMemo(() => {
    if (!tempData.length) return null;
    const t = tempData.map(d => d.temp_c);
    const interp = tempData.filter(d => d.interpolated).length;
    return {
      min: Math.min(...t), max: Math.max(...t),
      mean: t.reduce((a, b) => a + b, 0) / t.length,
      aboveTU: t.filter(v => v >= tU).length, interp,
    };
  }, [tempData, tU]);

  // --- Figures -------------------------------------------------------------

  const tempFig = useMemo(() => {
    const observed = rawTempData;
    const windowed = tempData;
    const data: any[] = [
      { x: observed.map(d => d.date), y: observed.map(d => d.temp_c), type: 'scatter', mode: 'lines', name: 'Observed series', line: { color: '#94a3b8', width: 1 } },
      { x: windowed.map(d => d.date), y: windowed.map(d => d.temp_c), type: 'scatter', mode: 'lines', name: 'Growth window', line: { color: '#10b981', width: 2 } },
    ];
    const interp = windowed.filter(d => d.interpolated);
    if (interp.length) {
      data.push({ x: interp.map(d => d.date), y: interp.map(d => d.temp_c), type: 'scatter', mode: 'markers', name: 'Interpolated / carried', marker: { color: '#f59e0b', size: 4 } });
    }
    return (
      <MiniPlot height={300} data={data} layout={{
        xaxis: { title: 'Date' }, yaxis: { title: 'Temperature (°C)' }, showlegend: true, legend: legendH,
        shapes: [{ type: 'line', x0: observed[0]?.date, x1: observed[observed.length - 1]?.date, y0: tU, y1: tU, line: { color: '#ef4444', width: 1, dash: 'dot' } }],
        annotations: [{ x: observed[observed.length - 1]?.date, y: tU, text: `T_U ≈ ${tU.toFixed(1)}°C`, showarrow: false, xanchor: 'right', yanchor: 'bottom', font: { size: 9, color: '#ef4444' } }],
      }} />
    );
  }, [rawTempData, tempData, tU]);

  const omegaFig = useMemo(() => {
    const tRange = Array.from({ length: 121 }, (_, i) => i / 4);
    const curves = [growthParams.tUMin, tU, growthParams.tUMax].map(u => tRange.map(T => omegaAt(T, growthParams, g, u)));
    return (
      <MiniPlot height={300} data={[
        { x: tRange, y: curves[1], type: 'scatter', mode: 'lines', name: `T_U = ${tU.toFixed(1)}°C (midpoint)`, line: { color: '#10b981', width: 2.5 } },
        { x: tRange, y: curves[0], type: 'scatter', mode: 'lines', name: `T_U min = ${growthParams.tUMin}°C`, line: { color: '#3b82f6', width: 1.5, dash: 'dash' } },
        { x: tRange, y: curves[2], type: 'scatter', mode: 'lines', name: `T_U max = ${growthParams.tUMax}°C`, line: { color: '#f59e0b', width: 1.5, dash: 'dot' } },
      ]} layout={{ xaxis: { title: 'Temperature (°C)' }, yaxis: { title: 'Ω (% day⁻¹, 1 g fish)' }, showlegend: true, legend: legendH }} />
    );
  }, [growthParams, g, tU]);

  const allomFig = useMemo(() => {
    const massRange = Array.from({ length: 40 }, (_, i) => 0.5 + i * 0.5);
    const b = growthParams.bGrow;
    let tOpt = growthParams.tL; let maxO = 0;
    for (let T = growthParams.tL; T < tU; T += 0.1) { const o = omegaAt(T, growthParams, g, tU); if (o > maxO) { maxO = o; tOpt = T; } }
    const tLow = growthParams.tL + (tOpt - growthParams.tL) * 0.4;
    const tHigh = tOpt + (tU - tOpt) * 0.6;
    const mk = (T: number) => massRange.map(M => omegaAt(T, growthParams, g, tU) * Math.pow(M, -b));
    return (
      <MiniPlot height={300} data={[
        { x: massRange, y: mk(tOpt), type: 'scatter', mode: 'lines', name: `Optimal (${tOpt.toFixed(0)}°C)`, line: { color: '#10b981', width: 2 } },
        { x: massRange, y: mk(tLow), type: 'scatter', mode: 'lines', name: `Cool (${tLow.toFixed(0)}°C)`, line: { color: '#3b82f6', width: 1.5, dash: 'dash' } },
        { x: massRange, y: mk(tHigh), type: 'scatter', mode: 'lines', name: `Warm (${tHigh.toFixed(0)}°C)`, line: { color: '#f59e0b', width: 1.5, dash: 'dot' } },
      ]} layout={{ xaxis: { title: 'Body mass M (g)' }, yaxis: { title: 'G_M (g·g⁻¹·day⁻¹)' }, showlegend: true, legend: legendH }} />
    );
  }, [growthParams, g, tU]);

  const foodFig = useMemo(() => {
    const tRange = Array.from({ length: 121 }, (_, i) => i / 4);
    const scen: [string, number, string, any][] = [
      ['Low food (R = 0.43)', 0.43, '#f59e0b', 'dot'],
      ['Medium food (R = 0.87)', 0.87, '#3b82f6', 'dash'],
      ['High food (R = 1.19)', 1.19, '#8b5cf6', 'dashdot'],
    ];
    const data: any[] = scen.map(([name, r, color, dash]) => ({
      x: tRange, y: tRange.map(T => omegaAt(T, growthParams, growthParams.meanGammaG * r, tU)),
      type: 'scatter', mode: 'lines', name, line: { color, width: 1.5, dash },
    }));
    data.unshift({ x: tRange, y: tRange.map(T => omegaAt(T, growthParams, g, tU)), type: 'scatter', mode: 'lines', name: `Current (R = ${R.toFixed(2)})`, line: { color: '#10b981', width: 2.5 } });
    return <MiniPlot height={300} data={data} layout={{ xaxis: { title: 'Temperature (°C)' }, yaxis: { title: 'Ω (% day⁻¹, 1 g fish)' }, showlegend: true, legend: legendH }} />;
  }, [growthParams, g, tU, R]);

  const massFig = useMemo(() => {
    const { mean, sd, min } = initialMassParams;
    const lo = Math.max(min, 0); const hi = mean + 4 * sd;
    const xs = Array.from({ length: 121 }, (_, i) => lo + (hi - lo) * i / 120);
    const pdf = xs.map(x => Math.exp(-0.5 * Math.pow((x - mean) / sd, 2)) / (sd * Math.sqrt(2 * Math.PI)));
    const area = pdf.reduce((a, b) => a + b, 0) * (xs[1] - xs[0]);
    return (
      <MiniPlot height={280} data={[
        { x: xs, y: pdf.map(p => p / area), type: 'scatter', mode: 'lines', fill: 'tozeroy', name: 'Truncated normal density', line: { color: '#10b981', width: 2 }, fillcolor: 'rgba(16,185,129,0.15)' },
      ]} layout={{
        xaxis: { title: 'Initial mass M₀ (g)' }, yaxis: { title: 'Density' }, showlegend: false,
        shapes: [{ type: 'line', x0: mean, x1: mean, y0: 0, y1: 1, yref: 'paper', line: { color: '#2563eb', width: 1, dash: 'dash' } }],
        annotations: [{ x: mean, y: 1, yref: 'paper', text: `mean ${mean} g`, showarrow: false, xanchor: 'left', font: { size: 9, color: '#2563eb' } }],
      }} />
    );
  }, [initialMassParams]);

  const lwFig = useMemo(() => {
    const fl = Array.from({ length: 21 }, (_, i) => 50 + i * 5);
    return (
      <MiniPlot height={280} data={[
        { x: fl, y: fl.map(f => lwParams.aMin * Math.pow(f, lwParams.bLWMin)), type: 'scatter', mode: 'lines', name: 'Min a, b_LW', line: { color: '#3b82f6', width: 1.5 } },
        { x: fl, y: fl.map(f => lwParams.aMax * Math.pow(f, lwParams.bLWMax)), type: 'scatter', mode: 'lines', name: 'Max a, b_LW', line: { color: '#2563eb', width: 1.5, dash: 'dash' } },
      ]} layout={{ xaxis: { title: 'Fork length (mm)' }, yaxis: { title: 'Mass (g)' }, showlegend: true, legend: legendH }} />
    );
  }, [lwParams]);

  const survFig = useMemo(() => {
    const fl = Array.from({ length: 101 }, (_, i) => 40 + i);
    const probs = fl.map(f => 1 / (1 + Math.exp(-(survivalParams.beta0 + survivalParams.beta1 * f))));
    return (
      <MiniPlot height={300} data={[
        { x: fl, y: probs, type: 'scatter', mode: 'lines', name: 'Model', line: { color: '#ef4444', width: 2.5 } },
        {
          x: [60, 55, 90, 110], y: [0.17, 0.30, 0.50, 0.80], type: 'scatter', mode: 'markers+text',
          marker: { color: '#2563eb', size: 9, symbol: 'diamond' },
          text: ['Sullivan 2000', 'Brakensiek et al. 2007', 'Ebersole 2006', 'Brakensiek et al. 2007'],
          textposition: 'top center', textfont: { size: 9, color: '#2563eb' }, name: 'Literature',
        },
      ]} layout={{ xaxis: { title: 'Fall fork length (mm)' }, yaxis: { title: 'Overwinter survival probability', range: [0, 1] }, showlegend: true, legend: legendH }} />
    );
  }, [survivalParams]);

  const sAt = (f: number) => (1 / (1 + Math.exp(-(survivalParams.beta0 + survivalParams.beta1 * f)))) * 100;

  // --- Page ----------------------------------------------------------------

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-8 items-start">
      {/* Side table of contents */}
      <aside className="lg:sticky lg:top-24 self-start">
        <button onClick={onBack} className="flex items-center gap-2 text-sm font-semibold text-emerald-700 hover:text-emerald-900 mb-5 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to model
        </button>
        <p className="text-[10px] font-bold uppercase tracking-wider text-black/40 mb-2">Contents</p>
        <nav className="flex flex-col gap-0.5">
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <a key={id} href={`#methodology/${id}`} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-black/60 hover:bg-white hover:text-black transition-colors">
              <Icon className="w-3.5 h-3.5 text-emerald-600" /> {label}
            </a>
          ))}
        </nav>
      </aside>

      <div className="space-y-6 min-w-0">
        <div className="mb-2">
          <h1 className="text-3xl font-semibold tracking-tight">Methodology</h1>
          <p className="text-sm text-black/50 mt-1 max-w-2xl">
            A walk-through of each model input, the equations behind it, and the sources for the default values.
            Figures reflect the inputs currently set in the model, so changes you make on the model page appear here.
          </p>
        </div>

        <Section id="overview" icon={Workflow} title="Overview" subtitle="What the model does and how the pieces connect">
          <p>
            The model tracks the body mass of individual age-0 coho salmon through one summer growth season,
            converts end-of-season mass to fork length, and uses fork length to predict the probability of
            surviving the following winter. Daily stream temperature and a food ration index drive growth.
            Monte Carlo replicates carry parameter uncertainty through to the outputs.
          </p>
          <ol className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
            {[
              ['Temperature Data', 'A daily temperature series sets the thermal environment for each day of growth.'],
              ['Dates', 'The growth window defines which days are simulated and when size is frozen for the survival step.'],
              ['Growth', 'A Ratkowsky-type curve converts daily temperature into a mass-standardized growth rate Ω.'],
              ['Food', 'The ration index R scales the deceleration term g, shifting the thermal optimum up or down.'],
              ['Initial Mass', 'Each fish starts from a mass drawn from a truncated normal distribution.'],
              ['Length–Weight', 'Final mass is converted to fork length with a power-law relationship.'],
              ['Winter Survival', 'A logistic curve maps fall fork length to overwinter survival probability.'],
              ['Monte Carlo', 'Replicates resample parameters; fish within a replicate resample starting mass.'],
            ].map(([t, d], i) => (
              <li key={t} className="flex gap-3 p-3 bg-[#f5f5f4] rounded-lg border border-black/5">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                <div><p className="font-semibold text-black/70">{t}</p><p className="text-black/50 leading-snug">{d}</p></div>
              </li>
            ))}
          </ol>
          <Eq>
            Temperature(t) → Ω(T<sub>t</sub>, R) → M<sub>t+1</sub> = [M<sub>t</sub><sup>b</sup> + b·Ω/100]<sup>1/b</sup> → FL = (M<sub>end</sub>/a)<sup>1/b<sub>LW</sub></sup> → S = logit<sup>-1</sup>(β<sub>0</sub> + β<sub>1</sub>·FL)
          </Eq>
        </Section>

        <Section id="temperature" icon={Thermometer} title="Temperature Data" subtitle="Mean daily water temperatures">
          <p>
            The model needs one mean water temperature per day across the growth window. Data are supplied as a CSV
            with <code className="font-mono text-xs bg-black/5 px-1 rounded">date</code> and <code className="font-mono text-xs bg-black/5 px-1 rounded">temp_c</code> columns.
            Column names are matched flexibly and duplicate dates are rejected. A demo series is loaded by default.
          </p>
          <p>
            Gaps inside the observed range are filled by linear interpolation between the nearest observations.
            Days in the growth window that fall before the first or after the last observation are handled by the
            missing-data policy. "Carry ends" repeats the nearest observed value. "Drop incomplete" refuses to run
            unless the data cover the whole window.
          </p>
          <Figure caption="Observed temperature series (grey) with the current growth window highlighted (green). Orange markers are interpolated or carried days. The dotted red line is the midpoint upper thermal limit T_U, above which growth is zero.">
            {rawTempData.length ? tempFig : <p className="text-xs text-black/40 italic">No temperature data loaded.</p>}
          </Figure>
          {tempStats && (
            <Params rows={[
              ['Days in window', `${tempData.length}`, 'Number of simulated growth days'],
              ['Mean temperature', `${tempStats.mean.toFixed(1)} °C`, 'Average over the growth window'],
              ['Range', `${tempStats.min.toFixed(1)} – ${tempStats.max.toFixed(1)} °C`, 'Minimum and maximum daily temperature'],
              ['Days ≥ T_U', `${tempStats.aboveTU}`, 'Days with zero growth at the midpoint T_U'],
              ['Interpolated / carried', `${tempStats.interp}`, 'Days filled rather than observed'],
            ]} />
          )}
        </Section>

        <Section id="dates" icon={CalendarDays} title="Dates" subtitle="Growing season and life stage">
          <p>
            The model simulates age-0 coho fry and parr through the summer growing season and then predicts
            overwinter survival to the yearling smolt stage. The default window of June 1 to September 30
            follows Sullivan et al. (2000). Fraser-specific work by Araujo et al. (2015) uses a similar window
            of June 21 to September 30. Body size is frozen at the growth end date and used for the survival step.
          </p>
          <p>
            The winter period is not simulated day by day. The survival coefficients already describe apparent
            survival from about September 30 to April 30. Fraser coho mostly leave fresh water as yearling smolts
            after one winter, so one survival step covers the freshwater stage after summer growth.
          </p>
          <Params rows={[
            ['Growth start', fmt(settings.startDate), 'First simulated day; initial mass applies on this date'],
            ['Growth end', fmt(settings.endDate), 'Last simulated day; size frozen here for survival'],
            ['Season length', `${seasonDays} days`, 'Number of daily growth steps per fish'],
          ]} />
        </Section>

        <Section id="growth" icon={TrendingUp} title="Growth" subtitle="Temperature-dependent growth rate (Ratkowsky model)">
          <p>
            Daily growth follows the Ratkowsky-type model that Manhard et al. (2018) calibrated for coho in the
            laboratory. Ω is the mass-standardized growth rate, the specific growth rate of a hypothetical 1 g fish.
            Standardizing to 1 g removes the allometric decline in growth with size so thermal responses can be
            compared directly. Growth is zero below the lower limit T<sub>L</sub> and at or above the upper limit
            T<sub>U</sub>, and peaks at an intermediate optimum set by d and g. Negative values are clamped to zero.
          </p>
          <Eq>Ω(T) = d · (T − T<sub>L</sub>) · [1 − e<sup>g·(T − T<sub>U</sub>)</sup>] &nbsp;&nbsp; for T &lt; T<sub>U</sub>; otherwise Ω = 0</Eq>
          <Figure caption="Mass-standardized growth rate Ω across temperature for the current d, γ_g and R. The three curves show the midpoint and the two bounds of the T_U sampling range. Each replicate draws one T_U uniformly between the bounds.">
            {omegaFig}
          </Figure>
          <p>
            Ω feeds an allometric mass update. The specific growth rate of a fish of mass M scales as M<sup>−b</sup>,
            so larger fish grow proportionally slower. The exponent b of 0.386 is robust across coho populations
            (Manhard et al., 2018).
          </p>
          <Eq>
            G<sub>M</sub> = Ω · M<sup>−b</sup><br />
            M<sub>t+1</sub> = [M<sub>t</sub><sup>b</sup> + b · Ω / 100]<sup>1/b</sup>
          </Eq>
          <Figure caption="Mass-specific growth rate G_M against body mass at a cool, optimal and warm temperature. All curves fall with mass at the same rate; temperature only shifts their height.">
            {allomFig}
          </Figure>
          <Params rows={[
            ['T_L', `${growthParams.tL} °C`, 'Lower thermal limit for growth'],
            ['T_U', `${growthParams.tUMin} – ${growthParams.tUMax} °C`, 'Upper thermal limit, drawn uniformly per replicate'],
            ['d', `${growthParams.meanD} ± ${growthParams.sdD}`, 'Growth slope, truncated normal (> 0) per replicate'],
            ['b', `${growthParams.bGrow}`, 'Allometric exponent'],
          ]} />
        </Section>

        <Section id="food" icon={Bug} title="Food" subtitle="Prey availability and the ration index R">
          <p>
            Temperature alone does not determine growth. The ration index R expresses prey availability as a
            proportion of maximum consumption. It enters the growth model through the deceleration coefficient g,
            which sets how sharply growth falls as temperature approaches T<sub>U</sub>. Lower food lowers g,
            which pulls both the optimum temperature and the realised thermal ceiling downward
            (Manhard et al., 2018).
          </p>
          <Eq>g = γ<sub>g</sub> × R</Eq>
          <p>
            Lusardi et al. (2020) saw the same interaction in stream enclosures. High invertebrate density allowed
            growth of 0.11 g per day at a mean of 18.1 °C, while low food gave only 0.02 g per day at 13.0 °C.
            This makes R the main lever for scenario analysis.
          </p>
          <Figure caption="Growth curve under the three food scenarios from Manhard et al. (2018) and under the current R. Higher R shifts the peak toward warmer water and raises growth at high temperature.">
            {foodFig}
          </Figure>
          <p>
            In scenario mode R is fixed for every replicate, which suits comparing low, medium and high food.
            In stochastic mode each replicate draws R from a truncated normal distribution so food uncertainty
            carries into the outputs. γ<sub>g</sub> is itself drawn per replicate from a truncated normal with
            posterior mean 0.142 and SE 0.025 (Manhard et al., 2018).
          </p>
          <Params rows={foodParams.mode === 'scenario' ? [
            ['Mode', 'Scenario', 'R fixed across replicates'],
            ['R', `${foodParams.fixedR}`, '0.43 low, 0.87 medium, 1.19 high'],
            ['γ_g', `${growthParams.meanGammaG} ± ${growthParams.sdGammaG}`, 'Deceleration slope, truncated normal per replicate'],
            ['g (at means)', g.toFixed(3), 'Deceleration coefficient used in the figures'],
          ] : [
            ['Mode', 'Stochastic', 'R drawn per replicate'],
            ['Mean R', `${foodParams.meanR}`, 'Central estimate'],
            ['CV R', `${foodParams.cvR}`, 'SD = CV × mean'],
            ['R bounds', `${foodParams.lowerR} – ${foodParams.upperR}`, 'Truncation limits'],
            ['γ_g', `${growthParams.meanGammaG} ± ${growthParams.sdGammaG}`, 'Deceleration slope, truncated normal per replicate'],
            ['g (at means)', g.toFixed(3), 'Deceleration coefficient used in the figures'],
          ]} />
        </Section>

        <Section id="mass" icon={Scale} title="Initial Mass" subtitle="Starting body mass at the growth start date">
          <p>
            M<sub>0</sub> is the wet mass of each fish on the growth start date. Every simulated fish draws its own
            M<sub>0</sub> from a truncated normal distribution, which represents natural size variation within a
            cohort. The lower bound prevents implausible near-zero masses.
          </p>
          <p>
            Bioenergetics studies often start emerged fry at 0.2 g (Spanjer et al., 2018). For growth starting
            June 1, Sullivan et al. (2000) used 1.4 g as representative. Willey (2004) found June mean weights of
            1.26 to 3.27 g across northern California streams, depending on stream and year. The start mass should
            match the growth start date you set.
          </p>
          <Figure caption="Probability density of starting mass for the current mean, SD and lower bound. The distribution is truncated at the minimum and renormalized.">
            {massFig}
          </Figure>
          <Params rows={[
            ['Mean M₀', `${initialMassParams.mean} g`, `Mean fry mass on ${fmt(settings.startDate)}`],
            ['SD M₀', `${initialMassParams.sd} g`, 'Spread of starting mass'],
            ['Min M₀', `${initialMassParams.min} g`, 'Lower truncation bound'],
          ]} />
        </Section>

        <Section id="lw" icon={Ruler} title="Length–Weight" subtitle="Converting final mass to fork length">
          <p>
            Growth is tracked in mass, but overwinter survival is predicted from fork length. At the end of the
            growth window each fish's mass is converted with the standard power law, inverted to solve for length.
            Stream-specific regressions vary (Campbell, 2017), so a and b<sub>LW</sub> each have a min and max.
            Each replicate draws both uniformly from their ranges.
          </p>
          <Eq>W = a · FL<sup>b<sub>LW</sub></sup> &nbsp;&nbsp;→&nbsp;&nbsp; FL = (W / a)<sup>1 / b<sub>LW</sub></sup></Eq>
          <Figure caption="Mass against fork length at the minimum and maximum coefficient bounds. When the bounds are equal the two lines coincide.">
            {lwFig}
          </Figure>
          <Params rows={[
            ['a', `${lwParams.aMin} – ${lwParams.aMax}`, 'Intercept, uniform per replicate'],
            ['b_LW', `${lwParams.bLWMin} – ${lwParams.bLWMax}`, 'Exponent, uniform per replicate'],
          ]} />
        </Section>

        <Section id="survival" icon={Heart} title="Winter Survival" subtitle="Size-dependent overwinter survival">
          <p>
            Overwinter survival is strongly size-selective. Larger juveniles at the end of summer carry more lipid
            reserves and better withstand metabolic depletion over winter (Quinn & Peterson, 1996). Survival is
            modelled as a logistic function of fall fork length, following Pess et al. (2011), who found fork
            length a significant predictor in every best-approximating model. The coefficients describe apparent
            survival from about September 30 to April 30 and are not corrected for emigration.
          </p>
          <Eq>
            logit(S) = β<sub>0</sub> + β<sub>1</sub> · FL<br />
            S = 1 / (1 + e<sup>−(β<sub>0</sub> + β<sub>1</sub> · FL)</sup>)
          </Eq>
          <Figure caption="Survival probability against fall fork length for the current β0 and β1 (red), with published point estimates for comparison (blue diamonds).">
            {survFig}
          </Figure>
          <p>
            Published benchmarks guide calibration: under 15% for fish below 60 mm, about 15% at 70 to 79 mm, and
            35 to 50% above 90 mm. System-level estimates are about 35% at Prairie Creek, California and Carnation
            Creek, British Columbia, and 0 to 50% by year in the interior Fraser (Pess et al., 2011; Drobny, 2016;
            Chittenden et al., 2010).
          </p>
          <Params rows={[
            ['β0', `${survivalParams.beta0}`, 'Logistic intercept; more negative lowers baseline survival'],
            ['β1', `${survivalParams.beta1}`, 'Change in log-odds of survival per mm of fork length'],
            ['S at 60 mm', `${sAt(60).toFixed(0)} %`, 'Predicted survival for a small fish'],
            ['S at 80 mm', `${sAt(80).toFixed(0)} %`, 'Predicted survival for a mid-size fish'],
            ['S at 100 mm', `${sAt(100).toFixed(0)} %`, 'Predicted survival for a large fish'],
          ]} />
        </Section>

        <Section id="montecarlo" icon={Dices} title="Monte Carlo" subtitle="How uncertainty is propagated">
          <p>
            The simulation has two levels. Each replicate draws one set of population-level parameters: d and
            γ<sub>g</sub> from truncated normal distributions, T<sub>U</sub>, a and b<sub>LW</sub> from uniform
            ranges, and R from a truncated normal when stochastic food is selected. Within a replicate, every fish
            draws its own starting mass and then grows through the full season under the same daily temperatures.
          </p>
          <p>
            Outputs separate the two sources of spread. Variation among fish within a replicate reflects starting
            size. Variation among replicate medians reflects parameter uncertainty. Results report the 5th, 25th,
            50th, 75th and 95th percentiles of final mass, fork length and survival at both levels.
          </p>
          <Params rows={[
            ['Fish per replicate', `${settings.nFish}`, 'Within-replicate sample size'],
            ['Replicates', `${settings.nRep}`, 'Number of parameter draws'],
            ['Total fish', `${settings.nFish * settings.nRep}`, 'Individual growth trajectories simulated'],
          ]} />
          <p className="text-xs text-black/50">
            The growth model was calibrated on hatchery fish fed set rations, so field growth may differ. The
            survival relationship pools studies from several regions and does not account for habitat quality or
            density. The model is best used to compare scenarios rather than to predict absolute survival for a
            single stream.
          </p>
        </Section>

        <References id="methodology/references" />
      </div>
    </div>
  );
};
