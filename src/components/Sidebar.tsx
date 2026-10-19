import React, { useMemo, useState } from 'react';
import {
  GrowthParams, FoodRationParams, InitialMassParams,
  LengthWeightParams, SurvivalParams, SimulationSettings, TempData
} from '../types';
import {
  Thermometer, Ruler, Heart, Play, RotateCcw,
  CalendarDays, TrendingUp, Scale, CheckCircle2, Bug
} from 'lucide-react';
import { parseISO, format, isValid } from 'date-fns';
import { MiniPlot } from './MiniPlot';
import { CSVUpload } from './CSVUpload';

export const InputGroup = ({ title, icon: Icon, children }: { title: string, icon: any, children: React.ReactNode }) => (
  <div className="bg-white rounded-2xl p-5 shadow-sm border border-black/5 mb-4">
    <div className="flex items-center gap-2 mb-4">
      <Icon className="w-4 h-4 text-emerald-600" />
      <h3 className="font-semibold text-sm uppercase tracking-wider text-black/70">{title}</h3>
    </div>
    <div className="space-y-4">
      {children}
    </div>
  </div>
);

export const LabelInput = ({ label, description, unit, value, onChange, type = "number", step = "any" }: any) => (
  <div className="space-y-1">
    <div className="flex justify-between items-baseline">
      <label className="text-xs font-semibold text-black/60">{label}</label>
      {unit && <span className="text-[10px] font-mono text-black/40">{unit}</span>}
    </div>
    <input
      type={type}
      step={step}
      value={value}
      onChange={(e) => onChange(type === "number" ? parseFloat(e.target.value) : e.target.value)}
      className="w-full bg-[#f5f5f4] border-none rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500/20 transition-all"
    />
    {description && <p className="text-[10px] text-black/40 leading-tight">{description}</p>}
  </div>
);

/** Header shown at the top of each tab panel. */
const PanelHeader = ({ icon: Icon, title, subtitle }: { icon: any; title: string; subtitle: string }) => (
  <div className="flex items-start gap-3 mb-2">
    <div className="bg-emerald-100 p-2 rounded-lg flex-shrink-0">
      <Icon className="w-5 h-5 text-emerald-600" />
    </div>
    <div>
      <h2 className="text-base font-semibold tracking-tight leading-tight">{title}</h2>
      <p className="text-xs text-black/40 leading-tight mt-0.5">{subtitle}</p>
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Individual input panels (one per tab)
// ---------------------------------------------------------------------------

const DatesPanel = ({ settings, setSettings }: {
  settings: SimulationSettings; setSettings: (p: SimulationSettings) => void;
}) => (
  <div className="space-y-4">
    <PanelHeader icon={CalendarDays} title="Dates" subtitle="Growing season & life stage" />
    <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100 space-y-2">
      <p className="text-[10px] font-semibold text-emerald-800">Growing Season & Life Stage</p>
      <p className="text-[10px] text-emerald-700/80 leading-relaxed">
        This model simulates age-0 Coho fry/parr through the summer growing season,
        then predicts overwinter survival to the yearling smolt stage. The default
        growing season (June 1 – Sep 30) follows Sullivan et al. (2000). Fraser-specific
        studies (Araujo et al. 2015) define a similar window (Jun 21 – Sep 30).
        Size is "frozen" at the growth end date and used for the winter survival prediction.
      </p>
    </div>
    <LabelInput
      label="Growth Start"
      type="date"
      value={settings.startDate}
      onChange={(v: string) => setSettings({ ...settings, startDate: v })}
      description="Onset of summer growth period. Default Jun 1 (Sullivan et al. 2000)."
    />
    <LabelInput
      label="Growth End"
      type="date"
      value={settings.endDate}
      onChange={(v: string) => setSettings({ ...settings, endDate: v })}
      description="End of growth period / fall size measurement. Default Sep 30."
    />
    <div className="p-3 bg-[#f5f5f4] rounded-lg border border-black/5 space-y-1">
      <p className="text-[10px] font-semibold text-black/60">Winter Period (Context Only)</p>
      <p className="text-[10px] text-black/40 leading-relaxed">
        Overwinter survival coefficients (β<sub>0</sub>, β<sub>1</sub>) correspond to
        apparent survival from ~Sep 30 to ~Apr 30. Fraser Coho predominantly leave
        freshwater as yearling smolts after one winter.
      </p>
    </div>
  </div>
);

const GrowthPanel = ({ growthParams, setGrowthParams, foodParams }: {
  growthParams: GrowthParams; setGrowthParams: (p: GrowthParams) => void; foodParams: FoodRationParams;
}) => (
  <div className="space-y-4">
    <PanelHeader icon={TrendingUp} title="Growth (Ratkowsky)" subtitle="Temperature-dependent growth rate" />
    {/* Introductory explanation */}
    <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100 space-y-2">
      <p className="text-[10px] font-semibold text-emerald-800">Mass-Standardized Growth Rate (Ω)</p>
      <p className="text-[10px] text-emerald-700/80 leading-relaxed">
        The Ratkowsky model (Manhard et al. 2017) predicts daily growth as a function
        of temperature. <strong>Ω</strong> is the mass-standardized instantaneous growth
        rate — it represents the specific growth rate of a hypothetical 1 g fish, which
        controls for the allometric decline in growth rate as fish get larger. This
        standardization allows direct comparison of intrinsic growth potential across
        different body sizes and temperatures.
      </p>
      <p className="text-[10px] text-emerald-700/80 leading-relaxed">
        Growth is zero below T<sub>L</sub> and above T<sub>U</sub>, and peaks at
        an intermediate optimum determined by the shape parameters d and g.
        Negative values of Ω are clamped to zero (no weight loss).
      </p>
    </div>

    {/* Growth equation */}
    <div className="p-2 bg-[#f5f5f4] rounded-lg border border-black/5 space-y-1">
      <p className="text-[10px] font-mono text-black/50 leading-tight">
        Ω(T) = d · (T - T<sub>L</sub>) · [1 - e<sup>g·(T - T<sub>U</sub>)</sup>]
      </p>
    </div>

    {/* T_L */}
    <LabelInput
      label="T_L (Lower Thermal Limit)"
      unit="°C"
      value={growthParams.tL}
      onChange={(v: number) => setGrowthParams({ ...growthParams, tL: v })}
      description="Temperature below which growth ceases (Ω = 0). Default 1.3°C from Manhard et al. 2017."
    />

    {/* T_U with explanation */}
    <div className="p-3 bg-amber-50 rounded-lg border border-amber-100 space-y-1">
      <p className="text-[10px] font-semibold text-amber-800">T<sub>U</sub> Uncertainty Range</p>
      <p className="text-[10px] text-amber-700/80 leading-relaxed">
        T<sub>U</sub> is the upper thermal limit where growth drops to zero. Its exact
        value is uncertain, so you specify a <strong>min</strong> and <strong>max</strong> bound.
        Each Monte Carlo replicate draws a random T<sub>U</sub> uniformly from this range,
        propagating that uncertainty into the results.
      </p>
    </div>
    <div className="grid grid-cols-2 gap-2">
      <LabelInput
        label="T_U Min"
        unit="°C"
        value={growthParams.tUMin}
        onChange={(v: number) => setGrowthParams({ ...growthParams, tUMin: v })}
        description="Lower bound for T_U sampling"
      />
      <LabelInput
        label="T_U Max"
        unit="°C"
        value={growthParams.tUMax}
        onChange={(v: number) => setGrowthParams({ ...growthParams, tUMax: v })}
        description="Upper bound for T_U sampling"
      />
    </div>

    {/* d parameter */}
    <div className="grid grid-cols-2 gap-2">
      <LabelInput
        label="d Mean"
        value={growthParams.meanD}
        onChange={(v: number) => setGrowthParams({ ...growthParams, meanD: v })}
        description="Growth coefficient mean (Manhard et al. 2017)"
      />
      <LabelInput
        label="d SD"
        value={growthParams.sdD}
        onChange={(v: number) => setGrowthParams({ ...growthParams, sdD: v })}
        description="Sampled per replicate from truncated Normal(mean, SD, >0)"
      />
    </div>

    {/* Ω(T) Plot */}
    {useMemo(() => {
      const tRange = Array.from({ length: 61 }, (_, i) => i / 2); // 0 to 30
      const R = foodParams.mode === 'scenario' ? foodParams.fixedR : foodParams.meanR;
      const g = growthParams.meanGammaG * R;
      const tU = (growthParams.tUMin + growthParams.tUMax) / 2;

      const omegas = tRange.map(T => {
        if (T >= tU) return 0;
        let o = growthParams.meanD * (T - growthParams.tL) * (1 - Math.exp(g * (T - tU)));
        return Math.max(0, o);
      });

      return (
        <MiniPlot
          height={240}
          data={[{ x: tRange, y: omegas, type: 'scatter', mode: 'lines', line: { color: '#10b981', width: 2 } }]}
          layout={{ xaxis: { title: 'Temperature (°C)' }, yaxis: { title: 'Ω (mass-standardized growth rate)' } }}
        />
      );
    }, [growthParams, foodParams])}

    {/* Allometric Scaling subsection */}
    <div className="border-t border-black/10 pt-4 mt-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-black/70 mb-3">Allometric Scaling of Growth</p>

      <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 space-y-2">
        <p className="text-[10px] text-blue-700/80 leading-relaxed">
          Ω is defined so that when applied to fish of different masses, growth
          follows an allometric power law. The specific growth rate of a fish
          at mass M is:
        </p>
        <div className="p-2 bg-white/60 rounded border border-blue-100 space-y-1">
          <p className="text-[10px] font-mono text-blue-900/70 leading-tight">
            G<sub>M</sub> = Ω · M<sup>-b</sup>
          </p>
          <p className="text-[10px] font-mono text-blue-900/70 leading-tight border-t border-blue-100 pt-1">
            Δ(M<sup>b</sup>) / Δt = b · Ω &nbsp; (Δt = 1 day)
          </p>
          <p className="text-[10px] font-mono text-blue-900/70 leading-tight border-t border-blue-100 pt-1">
            M<sub>t+1</sub> = [M<sub>t</sub><sup>b</sup> + b · Ω]<sup>1/b</sup>
          </p>
        </div>
        <p className="text-[10px] text-blue-700/80 leading-relaxed">
          <strong>G<sub>M</sub></strong> is the mass-specific growth rate at body mass M.
          Larger fish grow proportionally slower because G<sub>M</sub> scales
          as M<sup>-b</sup>. The exponent <strong>b</strong> controls how steeply
          growth rate declines with increasing mass — a value of 0.386 is robust
          across Coho populations (Manhard et al. 2017).
        </p>
      </div>
    </div>

    <LabelInput
      label="b (Allometric Exponent)"
      value={growthParams.bGrow}
      onChange={(v: number) => setGrowthParams({ ...growthParams, bGrow: v })}
      description="Controls how growth rate scales with body mass. 0.386 for Coho (Manhard et al. 2017), ~0.333 for salmonids generally."
    />

    {/* Allometric G_M Plot */}
    {useMemo(() => {
      const massRange = Array.from({ length: 40 }, (_, i) => 0.5 + i * 0.5); // 0.5 to 20 g
      const R = foodParams.mode === 'scenario' ? foodParams.fixedR : foodParams.meanR;
      const g = growthParams.meanGammaG * R;
      const tU = (growthParams.tUMin + growthParams.tUMax) / 2;
      const b = growthParams.bGrow;

      const computeOmega = (T: number) => {
        if (T >= tU || T <= growthParams.tL) return 0;
        return Math.max(0, growthParams.meanD * (T - growthParams.tL) * (1 - Math.exp(g * (T - tU))));
      };

      // Find optimal temperature (peak Ω)
      let tOpt = growthParams.tL;
      let maxOmega = 0;
      for (let T = growthParams.tL; T < tU; T += 0.1) {
        const o = computeOmega(T);
        if (o > maxOmega) { maxOmega = o; tOpt = T; }
      }

      const tLow = growthParams.tL + (tOpt - growthParams.tL) * 0.4;
      const tHigh = tOpt + (tU - tOpt) * 0.6;

      const omegaLow = computeOmega(tLow);
      const omegaOpt = computeOmega(tOpt);
      const omegaHigh = computeOmega(tHigh);

      const gmLow = massRange.map(M => omegaLow * Math.pow(M, -b));
      const gmOpt = massRange.map(M => omegaOpt * Math.pow(M, -b));
      const gmHigh = massRange.map(M => omegaHigh * Math.pow(M, -b));

      return (
        <MiniPlot
          height={240}
          data={[
            { x: massRange, y: gmOpt, type: 'scatter', mode: 'lines', name: `Optimal (${tOpt.toFixed(0)}°C)`, line: { color: '#10b981', width: 2 } },
            { x: massRange, y: gmLow, type: 'scatter', mode: 'lines', name: `Cool (${tLow.toFixed(0)}°C)`, line: { color: '#3b82f6', width: 1.5, dash: 'dash' } },
            { x: massRange, y: gmHigh, type: 'scatter', mode: 'lines', name: `Warm (${tHigh.toFixed(0)}°C)`, line: { color: '#f59e0b', width: 1.5, dash: 'dot' } },
          ]}
          layout={{
            xaxis: { title: 'Body Mass M (g)' },
            yaxis: { title: 'G_M (g·g⁻¹·day⁻¹)' },
            showlegend: true,
            legend: { x: 0.5, y: 1, xanchor: 'center', orientation: 'h', font: { size: 9 } }
          }}
        />
      );
    }, [growthParams, foodParams])}
  </div>
);

const FoodPanel = ({ foodParams, setFoodParams, growthParams, setGrowthParams }: {
  foodParams: FoodRationParams; setFoodParams: (p: FoodRationParams) => void;
  growthParams: GrowthParams; setGrowthParams: (p: GrowthParams) => void;
}) => (
  <div className="space-y-4">
    <PanelHeader icon={Bug} title="Food Ration" subtitle="Prey availability index (R)" />
    <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100 space-y-2">
      <p className="text-[10px] font-semibold text-emerald-800">Prey Availability & the Ration Index (R)</p>
      <p className="text-[10px] text-emerald-700/80 leading-relaxed">
        Temperature alone does not determine growth — food availability is critical.
        The ration index <strong>R</strong> represents prey availability as a proportion
        of maximum consumption. It modifies the growth deceleration parameter via
        <strong> g = γ<sub>g</sub> × R</strong>. As R decreases, the optimal growth
        temperature and upper thermal limit both shift downward (Manhard et al. 2017).
      </p>
      <p className="text-[10px] text-emerald-700/80 leading-relaxed">
        Lusardi et al. (2020) found that high invertebrate density allows positive
        growth even at high temperatures (0.11 g/day at mean T = 18.1°C), while low
        food yields only 0.02 g/day at 13.0°C. This interaction makes R a key
        lever for scenario analysis.
      </p>
    </div>

    <div className="p-3 bg-[#f5f5f4] rounded-lg border border-black/5 space-y-2">
      <p className="text-xs font-mono text-black/60 leading-tight text-center">
        g = γ<sub>g</sub> × R
      </p>
      <dl className="space-y-1.5 border-t border-black/5 pt-2">
        <div className="flex gap-2">
          <dt className="font-mono text-[11px] font-semibold text-black/70 w-8 flex-shrink-0">g</dt>
          <dd className="text-[10px] text-black/50 leading-relaxed">
            Growth <strong>deceleration coefficient</strong> — sets how sharply growth falls off as
            temperature approaches the upper limit T<sub>U</sub>. Higher g pulls the optimum and
            thermal ceiling downward.
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="font-mono text-[11px] font-semibold text-black/70 w-8 flex-shrink-0">γ<sub>g</sub></dt>
          <dd className="text-[10px] text-black/50 leading-relaxed">
            <strong>Deceleration slope</strong> (gamma-g) — the fixed coefficient linking food ration
            to g. Posterior mean 0.142 (Manhard et al. 2017); set in the section below.
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="font-mono text-[11px] font-semibold text-black/70 w-8 flex-shrink-0">R</dt>
          <dd className="text-[10px] text-black/50 leading-relaxed">
            <strong>Food ration index</strong> — prey availability as a proportion of maximum
            consumption (≈0.43 low, 0.87 medium, 1.19 high). Set via the Mode control below.
          </dd>
        </div>
      </dl>
    </div>

    <div className="p-3 bg-amber-50 rounded-lg border border-amber-100 space-y-1">
      <p className="text-[10px] font-semibold text-amber-800">Scenario vs Stochastic Mode</p>
      <p className="text-[10px] text-amber-700/80 leading-relaxed">
        In <strong>Scenario</strong> mode, R is fixed across all replicates — useful for
        comparing discrete low/medium/high food conditions. In <strong>Stochastic</strong> mode,
        each replicate draws a random R from a truncated Normal distribution, propagating
        food-availability uncertainty into the results.
      </p>
    </div>

    <div className="space-y-1">
      <label className="text-xs font-semibold text-black/60">Mode</label>
      <select
        value={foodParams.mode}
        onChange={(e) => setFoodParams({ ...foodParams, mode: e.target.value as any })}
        className="w-full bg-[#f5f5f4] border-none rounded-lg px-3 py-2 text-sm"
      >
        <option value="scenario">Scenario (Fixed R)</option>
        <option value="stochastic">Stochastic (Per Replicate)</option>
      </select>
    </div>
    {foodParams.mode === 'scenario' ? (
      <LabelInput
        label="Fixed R"
        value={foodParams.fixedR}
        onChange={(v: number) => setFoodParams({ ...foodParams, fixedR: v })}
        description="0.43 (Low Food), 0.87 (Medium — default), 1.19 (High Food). From Manhard et al. 2017 meta-analysis."
      />
    ) : (
      <>
        <LabelInput label="Mean R" value={foodParams.meanR} onChange={(v: number) => setFoodParams({ ...foodParams, meanR: v })} description="Central estimate for food ration (default 0.87)." />
        <LabelInput label="CV R" value={foodParams.cvR} onChange={(v: number) => setFoodParams({ ...foodParams, cvR: v })} description="Coefficient of variation. SD = CV × Mean." />
        <div className="grid grid-cols-2 gap-2">
          <LabelInput label="Min R" value={foodParams.lowerR} onChange={(v: number) => setFoodParams({ ...foodParams, lowerR: v })} description="Lower truncation bound" />
          <LabelInput label="Max R" value={foodParams.upperR} onChange={(v: number) => setFoodParams({ ...foodParams, upperR: v })} description="Upper truncation bound" />
        </div>
      </>
    )}

    <div className="border-t border-black/10 pt-4 mt-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-black/70 mb-3">Deceleration Coefficient (γ<sub>g</sub>)</p>
      <p className="text-[10px] text-black/40 leading-relaxed mb-3">
        γ<sub>g</sub> is the slope parameter that links food ration to the growth
        deceleration coefficient g. Each replicate draws γ<sub>g</sub> from a truncated
        Normal distribution (lower bound 0), then computes g = γ<sub>g</sub> × R.
        Posterior mean 0.142, SE 0.025 (Manhard et al. 2017).
      </p>
    </div>
    <div className="grid grid-cols-2 gap-2">
      <LabelInput label="γ_g Mean" value={growthParams.meanGammaG} onChange={(v: number) => setGrowthParams({ ...growthParams, meanGammaG: v })} description="Posterior mean (Manhard et al. 2017)" />
      <LabelInput label="γ_g SD" value={growthParams.sdGammaG} onChange={(v: number) => setGrowthParams({ ...growthParams, sdGammaG: v })} description="Posterior SE, sampled per replicate" />
    </div>
  </div>
);

const MassPanel = ({ initialMassParams, setInitialMassParams, startDate }: {
  initialMassParams: InitialMassParams; setInitialMassParams: (p: InitialMassParams) => void;
  startDate: string;
}) => {
  const parsed = parseISO(startDate);
  const startLabel = isValid(parsed) ? format(parsed, 'MMM d, yyyy') : 'the growth start date';
  return (
  <div className="space-y-4">
    <PanelHeader icon={Scale} title="Initial Mass" subtitle="Starting body mass at emergence" />
    <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100 space-y-2">
      <p className="text-[10px] font-semibold text-emerald-800">Starting Body Mass (M<sub>0</sub>)</p>
      <p className="text-[10px] text-emerald-700/80 leading-relaxed">
        M<sub>0</sub> is the wet mass of age-0 Coho fry at the onset of the growing season.
        Each simulated fish draws its own M<sub>0</sub> from a truncated Normal distribution,
        capturing natural size variation within a cohort. The lower bound prevents
        biologically implausible near-zero masses.
      </p>
      <p className="text-[10px] text-emerald-700/80 leading-relaxed">
        For bioenergetics modeling, researchers commonly initialize the starting weight of
        emerged fry at 0.2 g. Spanjer et al. (2018) explicitly used a starting emergence
        weight of 0.2 g for all diagnostic bioenergetic simulations of juvenile Coho.
        Similarly, Beauchamp (2009) established 0.2 g as the baseline body mass for fry
        when modeling allometric and thermal responses across the salmonid life cycle.
        When simulating summer growth starting on June 1, Sullivan et al. (2000) determined
        that a representative initial weight for Coho across their study sites was 1.4 grams.
        Field surveys conducted by Willey (2004) across multiple Northern California streams
        found that the average weight of Coho salmon in June ranged from 1.26 g up to 3.27 g,
        depending on the specific stream and year.
      </p>
    </div>
    <LabelInput label="Mean M0 (grams)" unit="g" value={initialMassParams.mean} onChange={(v: number) => setInitialMassParams({ ...initialMassParams, mean: v })} description={`Mean fry size (weight in grams) at the growth start date (${startLabel}). Sampled per fish per replicate.`} />
    <LabelInput label="SD M0 (grams)" unit="g" value={initialMassParams.sd} onChange={(v: number) => setInitialMassParams({ ...initialMassParams, sd: v })} description="Standard deviation of the starting mass distribution (grams)." />
    <LabelInput label="Min M0 (grams)" unit="g" value={initialMassParams.min} onChange={(v: number) => setInitialMassParams({ ...initialMassParams, min: v })} description="Lower truncation bound for drawn masses (grams)." />
  </div>
  );
};

const LWPanel = ({ lwParams, setLwParams }: {
  lwParams: LengthWeightParams; setLwParams: (p: LengthWeightParams) => void;
}) => (
  <div className="space-y-4">
    <PanelHeader icon={Ruler} title="Length–Weight Conversion" subtitle="Mass → fork length" />
    <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100 space-y-2">
      <p className="text-[10px] font-semibold text-emerald-800">Mass-to-Length Conversion</p>
      <p className="text-[10px] text-emerald-700/80 leading-relaxed">
        The growth model tracks mass (g), but overwinter survival is predicted from
        fork length (mm). At the end of the growing season, each fish's final mass is
        converted to fork length using the standard power-law relationship
        W = a · FL<sup>b<sub>LW</sub></sup>, inverted to FL = (W / a)<sup>1/b<sub>LW</sub></sup>.
      </p>
      <p className="text-[10px] text-emerald-700/80 leading-relaxed">
        Stream-specific regressions vary (Campbell 2017), so coefficients a and b<sub>LW</sub>
        are each given <strong>min</strong> and <strong>max</strong> bounds. Each Monte Carlo
        replicate draws both a and b<sub>LW</sub> uniformly from these ranges,
        propagating length-weight uncertainty into the survival estimate.
      </p>
    </div>

    <div className="p-2 bg-[#f5f5f4] rounded-lg border border-black/5 space-y-1">
      <p className="text-[10px] font-mono text-black/50 leading-tight">
        W = a · FL<sup>b<sub>LW</sub></sup> &nbsp;&nbsp;→&nbsp;&nbsp; FL = (W / a)<sup>1 / b<sub>LW</sub></sup>
      </p>
    </div>

    <div className="grid grid-cols-2 gap-2">
      <LabelInput label="a Min" value={lwParams.aMin} onChange={(v: number) => setLwParams({ ...lwParams, aMin: v })} description="Lower bound for intercept a (Uniform)" />
      <LabelInput label="a Max" value={lwParams.aMax} onChange={(v: number) => setLwParams({ ...lwParams, aMax: v })} description="Upper bound for intercept a (Uniform)" />
    </div>
    <div className="grid grid-cols-2 gap-2">
      <LabelInput label="b_LW Min" value={lwParams.bLWMin} onChange={(v: number) => setLwParams({ ...lwParams, bLWMin: v })} description="Lower bound for exponent b_LW" />
      <LabelInput label="b_LW Max" value={lwParams.bLWMax} onChange={(v: number) => setLwParams({ ...lwParams, bLWMax: v })} description="Upper bound for exponent b_LW" />
    </div>

    {/* Length-Weight Mini Plot */}
    {useMemo(() => {
      const flRange = Array.from({ length: 21 }, (_, i) => 50 + i * 5); // 50 to 150
      const massMin = flRange.map(fl => lwParams.aMin * Math.pow(fl, lwParams.bLWMin));
      const massMax = flRange.map(fl => lwParams.aMax * Math.pow(fl, lwParams.bLWMax));

      return (
        <MiniPlot
          height={240}
          data={[
            { x: flRange, y: massMin, type: 'scatter', mode: 'lines', name: 'Min (a/b)', line: { color: '#3b82f6', width: 1.5 } },
            { x: flRange, y: massMax, type: 'scatter', mode: 'lines', name: 'Max (a/b)', line: { color: '#2563eb', width: 1.5, dash: 'dash' } }
          ]}
          layout={{ xaxis: { title: 'FL (mm)' }, yaxis: { title: 'Mass (g)' }, showlegend: true, legend: { x: 0.5, y: 1, xanchor: 'center', orientation: 'h', font: { size: 9 } } }}
        />
      );
    }, [lwParams])}
  </div>
);

const SurvivalPanel = ({ survivalParams, setSurvivalParams }: {
  survivalParams: SurvivalParams; setSurvivalParams: (p: SurvivalParams) => void;
}) => (
  <div className="space-y-4">
    <PanelHeader icon={Heart} title="Overwinter Survival" subtitle="Size-dependent winter survival" />
    <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100 space-y-2">
      <p className="text-[10px] font-semibold text-emerald-800">Size-Dependent Overwinter Survival</p>
      <p className="text-[10px] text-emerald-700/80 leading-relaxed">
        Overwinter survival is strongly size-selective: larger juveniles at the end of
        summer have significantly higher survival through winter. The mechanism is
        primarily lipid reserves — larger fish accumulate more energy stores to
        withstand metabolic depletion during cold months (Quinn & Peterson 1996).
      </p>
      <p className="text-[10px] text-emerald-700/80 leading-relaxed">
        Survival is modeled as a logistic function of fall fork length, following
        Pess et al. (2011) who found FL was a significant predictor in all
        best-approximating models for Coho survival. These coefficients represent
        <strong> apparent survival</strong> (not true survival) from ~Sep 30 to ~Apr 30.
      </p>
    </div>

    <div className="p-3 bg-[#f5f5f4] rounded-lg border border-black/5 space-y-2">
      <p className="text-[10px] font-mono text-black/50 leading-tight">
        logit(S) = β<sub>0</sub> + β<sub>1</sub> · FL
      </p>
      <p className="text-[10px] font-mono text-black/50 leading-tight border-t border-black/5 pt-1">
        S = 1 / (1 + e<sup>-(β<sub>0</sub> + β<sub>1</sub> · FL)</sup>)
      </p>
    </div>

    <div className="p-3 bg-amber-50 rounded-lg border border-amber-100 space-y-1">
      <p className="text-[10px] font-semibold text-amber-800">Survival Benchmarks (Calibration)</p>
      <p className="text-[10px] text-amber-700/80 leading-relaxed">
        &lt; 60 mm: very low (&lt; 15%) · 70–79 mm: ~15% · &gt; 90 mm: 35–50%.
        System-level estimates: Prairie Creek (CA) ~35%, Carnation Creek (BC) ~35%,
        Interior Fraser (Thompson) 0–50% depending on year (Pess et al. 2011; Drobny 2016;
        Chittenden et al. 2010).
      </p>
    </div>

    <LabelInput label="β0 (Intercept)" value={survivalParams.beta0} onChange={(v: number) => setSurvivalParams({ ...survivalParams, beta0: v })} description="Logistic intercept. More negative = lower baseline survival." />
    <LabelInput label="β1 (Slope)" value={survivalParams.beta1} onChange={(v: number) => setSurvivalParams({ ...survivalParams, beta1: v })} description="Increase in log-odds of survival per mm of FL. Consistently positive (Pess et al. 2011)." />

    {/* Survival Mini Plot */}
    {useMemo(() => {
      const flRange = Array.from({ length: 21 }, (_, i) => 50 + i * 5); // 50 to 150
      const probs = flRange.map(fl => 1 / (1 + Math.exp(-(survivalParams.beta0 + survivalParams.beta1 * fl))));

      const litX = [60, 55, 90, 110];
      const litY = [0.17, 0.30, 0.50, 0.80];
      const litLabels = ['Sullivan 2000', 'Brakensiek et al. 2007', 'Ebersole 2006', 'Brakensiek et al. 2007'];

      return (
        <MiniPlot
          height={240}
          data={[
            { x: flRange, y: probs, type: 'scatter', mode: 'lines', line: { color: '#ef4444', width: 2 }, name: 'Model' },
            {
              x: litX, y: litY, type: 'scatter', mode: 'markers+text',
              marker: { color: '#2563eb', size: 8, symbol: 'diamond' },
              text: litLabels, textposition: 'top center',
              textfont: { size: 8, color: '#2563eb' },
              name: 'Literature',
            },
          ]}
          layout={{ xaxis: { title: 'FL (mm)' }, yaxis: { title: 'Survival Prob', range: [0, 1] }, showlegend: false }}
        />
      );
    }, [survivalParams])}
  </div>
);

// ---------------------------------------------------------------------------
// Sidebar (tabbed input panel)
// ---------------------------------------------------------------------------

interface SidebarProps {
  growthParams: GrowthParams;
  setGrowthParams: (p: GrowthParams) => void;
  foodParams: FoodRationParams;
  setFoodParams: (p: FoodRationParams) => void;
  initialMassParams: InitialMassParams;
  setInitialMassParams: (p: InitialMassParams) => void;
  lwParams: LengthWeightParams;
  setLwParams: (p: LengthWeightParams) => void;
  survivalParams: SurvivalParams;
  setSurvivalParams: (p: SurvivalParams) => void;
  settings: SimulationSettings;
  setSettings: (p: SimulationSettings) => void;
  onRun: () => void;
  onReset: () => void;
  isRunning: boolean;
  // Temperature CSV
  rawTempData: TempData[];
  onRawDataLoaded: (data: TempData[]) => void;
  missingHandling: 'carry' | 'drop';
  setMissingHandling: (v: 'carry' | 'drop') => void;
  tempLoaded: boolean;
  tempError: string | null;
}

type TabId = 'temp' | 'dates' | 'growth' | 'food' | 'mass' | 'lw' | 'survival';

export const Sidebar: React.FC<SidebarProps> = (props) => {
  const {
    growthParams, setGrowthParams,
    foodParams, setFoodParams,
    initialMassParams, setInitialMassParams,
    lwParams, setLwParams,
    survivalParams, setSurvivalParams,
    settings, setSettings,
    onRun, onReset, isRunning,
    rawTempData, onRawDataLoaded, missingHandling, setMissingHandling, tempLoaded, tempError,
  } = props;

  const [activeTab, setActiveTab] = useState<TabId>('temp');

  const tabs: { id: TabId; label: string; icon: any }[] = [
    { id: 'temp', label: 'Temperature Data', icon: Thermometer },
    { id: 'dates', label: 'Dates', icon: CalendarDays },
    { id: 'growth', label: 'Growth', icon: TrendingUp },
    { id: 'food', label: 'Food', icon: Bug },
    { id: 'mass', label: 'Initial Mass', icon: Scale },
    { id: 'lw', label: 'Length–Weight', icon: Ruler },
    { id: 'survival', label: 'Winter Survival', icon: Heart },
  ];

  return (
    <div className="w-full flex-shrink-0 lg:sticky lg:top-24 self-start">
      <div className="bg-white rounded-2xl shadow-sm border border-black/5 flex flex-col max-h-[calc(100vh-7rem)]">
        {/* Header */}
        <div className="px-4 pt-4 pb-3 border-b border-black/5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-black/60">Model Inputs</h2>
            <button
              onClick={onReset}
              className="text-black/40 hover:text-black/70 flex items-center gap-1.5 text-xs font-semibold transition-colors"
              title="Reset all inputs to defaults"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>
          </div>
          {/* Tab pills */}
          <div className="flex flex-wrap gap-1.5">
            {tabs.map(({ id, label, icon: Icon }) => {
              const isActive = activeTab === id;
              const showCheck = id === 'temp' && tempLoaded;
              return (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-[#f5f5f4] text-black/50 hover:bg-black/5 hover:text-black/70'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{label}</span>
                  {showCheck && (
                    <CheckCircle2 className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-emerald-500'}`} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Active panel content (scrollable) */}
        <div className="p-4 overflow-y-auto flex-1">
          {activeTab === 'temp' && (
            <div className="space-y-4">
              <PanelHeader icon={Thermometer} title="Temperature Data" subtitle="Mean Daily Water Temperatures" />
              <CSVUpload
                rawData={rawTempData}
                onRawDataLoaded={onRawDataLoaded}
                missingHandling={missingHandling}
                setMissingHandling={setMissingHandling}
                externalError={tempError}
              />
            </div>
          )}
          {activeTab === 'dates' && <DatesPanel settings={settings} setSettings={setSettings} />}
          {activeTab === 'growth' && <GrowthPanel growthParams={growthParams} setGrowthParams={setGrowthParams} foodParams={foodParams} />}
          {activeTab === 'food' && <FoodPanel foodParams={foodParams} setFoodParams={setFoodParams} growthParams={growthParams} setGrowthParams={setGrowthParams} />}
          {activeTab === 'mass' && <MassPanel initialMassParams={initialMassParams} setInitialMassParams={setInitialMassParams} startDate={settings.startDate} />}
          {activeTab === 'lw' && <LWPanel lwParams={lwParams} setLwParams={setLwParams} />}
          {activeTab === 'survival' && <SurvivalPanel survivalParams={survivalParams} setSurvivalParams={setSurvivalParams} />}
        </div>

        {/* Pinned footer: run controls */}
        <div className="px-4 py-4 border-t-4 border-emerald-600/15 bg-[#f5f5f4] rounded-b-2xl space-y-3 shadow-[0_-4px_12px_-6px_rgba(0,0,0,0.12)]">
          <p className="text-[10px] font-bold uppercase tracking-wider text-black/40">Run Simulation</p>
          <div className="grid grid-cols-2 gap-3">
            <LabelInput
              label="Fish / Rep"
              value={settings.nFish}
              onChange={(v: number) => setSettings({ ...settings, nFish: v })}
            />
            <LabelInput
              label="Replicates"
              value={settings.nRep}
              onChange={(v: number) => setSettings({ ...settings, nRep: v })}
            />
          </div>
          {!tempLoaded && (
            <p className="text-[10px] text-amber-600 font-medium text-center">
              Upload temperature data (Temperature tab) to enable the simulation.
            </p>
          )}
          <button
            onClick={onRun}
            disabled={isRunning || !tempLoaded}
            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 disabled:cursor-not-allowed text-white font-bold py-3.5 px-6 rounded-xl shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-3 transition-all active:scale-[0.98]"
          >
            {isRunning ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Running Simulation...</span>
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                <span className="text-base">Run Simulation</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
