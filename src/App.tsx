import React, { useState, useCallback, useMemo, useEffect } from 'react';
import Papa from 'papaparse';
import { Layout } from './components/Layout';
import { Sidebar } from './components/Sidebar';
import { ResultsPanel } from './components/ResultsPanel';
import {
  GrowthParams, FoodRationParams, InitialMassParams,
  LengthWeightParams, SurvivalParams, SimulationSettings,
  TempData, SimulationResults
} from './types';
import { runSimulation } from './utils/simulation';
import { parseTempRows, interpolateToWindow, yearFromData, withYear } from './utils/temperature';
import { AlertCircle, Info, BookOpen } from 'lucide-react';
// Bundled demo dataset (daily stream temperatures), loaded by default.
import demoCsv from './data/demo_temperature_data.csv?raw';

const DEFAULT_GROWTH: GrowthParams = {
  bGrow: 0.386,
  tL: 1.3,
  tUMin: 24,
  tUMax: 25,
  meanD: 0.341,
  sdD: 0.048,
  meanGammaG: 0.142,
  sdGammaG: 0.025
};

const DEFAULT_FOOD: FoodRationParams = {
  mode: 'scenario',
  fixedR: 0.87,
  meanR: 0.87,
  cvR: 0.2,
  lowerR: 0.43,
  upperR: 1.19
};

const DEFAULT_INITIAL_MASS: InitialMassParams = {
  mean: 1.0,
  sd: 0.7,
  min: 0.1
};

const DEFAULT_LW: LengthWeightParams = {
  aMin: 0.00001,
  aMax: 0.00001,
  bLWMin: 3.0,
  bLWMax: 3.0
};

const DEFAULT_SURVIVAL: SurvivalParams = {
  beta0: -4.77,
  beta1: 0.053
};

const DEFAULT_SETTINGS: SimulationSettings = {
  nFish: 100,
  nRep: 20,
  startDate: '2025-06-01',
  endDate: '2025-09-30'
};

export default function App() {
  const [growthParams, setGrowthParams] = useState<GrowthParams>(DEFAULT_GROWTH);
  const [foodParams, setFoodParams] = useState<FoodRationParams>(DEFAULT_FOOD);
  const [initialMassParams, setInitialMassParams] = useState<InitialMassParams>(DEFAULT_INITIAL_MASS);
  const [lwParams, setLwParams] = useState<LengthWeightParams>(DEFAULT_LW);
  const [survivalParams, setSurvivalParams] = useState<SurvivalParams>(DEFAULT_SURVIVAL);
  const [settings, setSettings] = useState<SimulationSettings>(DEFAULT_SETTINGS);
  
  // Raw observed temperatures (the source of truth). The windowed daily series is derived.
  const [rawTempData, setRawTempData] = useState<TempData[]>([]);
  const [missingHandling, setMissingHandling] = useState<'carry' | 'drop'>('carry');

  const [results, setResults] = useState<SimulationResults | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Derive the interpolated daily series for the current growth window. Recomputes
  // whenever the raw data, the dates, or the missing-data policy change — so editing
  // the growth start/end in the Dates tab keeps the temperature series in sync.
  const { series: tempData, error: tempError } = useMemo(
    () => interpolateToWindow(rawTempData, settings.startDate, settings.endDate, missingHandling),
    [rawTempData, settings.startDate, settings.endDate, missingHandling]
  );

  // Called when new observed data is loaded (default demo or user upload). Aligns the
  // growth window's year to the data's year, keeping the month/day the user has set.
  const handleRawDataLoaded = useCallback((data: TempData[]) => {
    setRawTempData(data);
    const yr = yearFromData(data);
    if (yr != null) {
      setSettings(prev => ({
        ...prev,
        startDate: withYear(prev.startDate, yr),
        endDate: withYear(prev.endDate, yr),
      }));
    }
  }, []);

  // Load the bundled demo dataset once on startup.
  useEffect(() => {
    const parsed = Papa.parse(demoCsv, { header: true, skipEmptyLines: true, transformHeader: (h) => h.trim() });
    const { data } = parseTempRows(parsed.data as any[]);
    if (data.length > 0) handleRawDataLoaded(data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRun = useCallback(() => {
    if (tempData.length === 0) {
      setError(tempError || "Please upload temperature data first.");
      return;
    }

    setError(null);
    setIsRunning(true);

    // Use setTimeout to allow UI to update before heavy computation
    setTimeout(() => {
      try {
        const res = runSimulation(
          tempData,
          growthParams,
          foodParams,
          initialMassParams,
          lwParams,
          survivalParams,
          settings
        );
        setResults(res);
      } catch (err: any) {
        setError(`Simulation failed: ${err.message}`);
      } finally {
        setIsRunning(false);
      }
    }, 100);
  }, [tempData, tempError, growthParams, foodParams, initialMassParams, lwParams, survivalParams, settings]);

  const handleReset = () => {
    setGrowthParams(DEFAULT_GROWTH);
    setFoodParams(DEFAULT_FOOD);
    setInitialMassParams(DEFAULT_INITIAL_MASS);
    setLwParams(DEFAULT_LW);
    setSurvivalParams(DEFAULT_SURVIVAL);
    // Keep the growth window aligned to whatever data is currently loaded.
    const yr = yearFromData(rawTempData);
    setSettings(yr != null
      ? { ...DEFAULT_SETTINGS, startDate: withYear(DEFAULT_SETTINGS.startDate, yr), endDate: withYear(DEFAULT_SETTINGS.endDate, yr) }
      : DEFAULT_SETTINGS);
    setResults(null);
    setError(null);
  };

  return (
    <Layout>
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(400px,484px)_1fr] gap-8 items-start">
        <Sidebar
          growthParams={growthParams} setGrowthParams={setGrowthParams}
          foodParams={foodParams} setFoodParams={setFoodParams}
          initialMassParams={initialMassParams} setInitialMassParams={setInitialMassParams}
          lwParams={lwParams} setLwParams={setLwParams}
          survivalParams={survivalParams} setSurvivalParams={setSurvivalParams}
          settings={settings} setSettings={setSettings}
          onRun={handleRun}
          onReset={handleReset}
          isRunning={isRunning}
          rawTempData={rawTempData}
          onRawDataLoaded={handleRawDataLoaded}
          missingHandling={missingHandling}
          setMissingHandling={setMissingHandling}
          tempLoaded={tempData.length > 0}
          tempError={tempError}
        />

        <div className="space-y-8">
          {error && (
            <div className="bg-red-50 border border-red-100 rounded-2xl p-6 flex gap-4 mb-8 shadow-sm">
              <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-red-800">Error</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          )}

          {!results && !isRunning && (
            <div className="bg-white rounded-2xl p-10 border border-dashed border-black/10 flex flex-col items-center text-center">
              <div className="bg-[#f5f5f4] p-4 rounded-full mb-6">
                <Info className="w-8 h-8 text-black/20" />
              </div>
              <h2 className="text-xl font-bold text-black/70 mb-2">Ready to Simulate</h2>
              <p className="text-sm text-black/40 max-w-md mb-8">
                A sample dataset is already loaded, so you can press <strong>Run Simulation</strong>
                right away — or work through the input tabs on the left to upload your own temperature
                data and adjust the model parameters first.
              </p>

              <ol className="text-left w-full max-w-md space-y-3 mb-8">
                {[
                  ['Temperature Data', 'A demo series is preloaded. Upload your own daily CSV (date, temp_c) to replace it — a template is provided.'],
                  ['Dates', 'Set the summer growth window used to project size.'],
                  ['Parameters', 'Review Growth, Food, Initial Mass, Length–Weight & Survival (sensible defaults are pre-filled).'],
                  ['Run', 'Choose fish/replicates and run the Monte Carlo simulation.'],
                ].map(([title, desc], i) => (
                  <li key={title} className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center">{i + 1}</span>
                    <div>
                      <p className="text-sm font-semibold text-black/70">{title}</p>
                      <p className="text-xs text-black/40 leading-snug">{desc}</p>
                    </div>
                  </li>
                ))}
              </ol>

              <div className="w-full max-w-md p-4 bg-emerald-50 rounded-xl border border-emerald-100 text-left">
                <p className="text-[11px] font-semibold text-emerald-800 mb-1">Monte Carlo Uncertainty Propagation</p>
                <p className="text-[11px] text-emerald-700/80 leading-relaxed">
                  Each <strong>replicate</strong> draws its own set of parameters (d, γ<sub>g</sub>,
                  T<sub>U</sub>, R, length-weight coefficients) from their distributions. Within each
                  replicate, <strong>N fish</strong> are simulated, each drawing its own initial mass
                  M<sub>0</sub>. Outputs report both within-replicate variation (fish size
                  distributions) and across-replicate variation (parameter uncertainty).
                </p>
              </div>
            </div>
          )}

          {isRunning && (
            <div className="bg-white rounded-2xl p-12 border border-black/5 flex flex-col items-center text-center shadow-sm">
              <div className="relative w-16 h-16 mb-6">
                <div className="absolute inset-0 border-4 border-emerald-100 rounded-full" />
                <div className="absolute inset-0 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
              </div>
              <h2 className="text-xl font-bold text-black/70 mb-2">Simulation in Progress</h2>
              <p className="text-sm text-black/40">
                Processing {settings.nRep} replicates with {settings.nFish} fish each...
              </p>
            </div>
          )}

          {results && (
            <ResultsPanel
              results={results}
              tempData={tempData}
              allTempData={rawTempData}
              growthParams={growthParams}
              foodParams={foodParams}
              initialMassParams={initialMassParams}
              lwParams={lwParams}
              survivalParams={survivalParams}
              startDate={settings.startDate}
              endDate={settings.endDate}
            />
          )}
        </div>
      </div>

      {/* Full-width References Section */}
      <div className="mt-12 bg-white rounded-2xl p-8 shadow-sm border border-black/5">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-black/5 p-2 rounded-lg">
            <BookOpen className="w-5 h-5 text-black/50" />
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-tight">References</h2>
            <p className="text-xs text-black/40">Sources used for model parameterization and validation</p>
          </div>
        </div>
        <div className="columns-1 md:columns-2 gap-8 text-[11px] text-black/60 leading-relaxed space-y-3">
          <p className="break-inside-avoid">
            Araujo, H. A., Cooper, A. B., MacIsaac, E. A., Knowler, D., & Velez-Espino, A. (2015).
            Modeling population responses of Chinook and coho salmon to suspended sediment using a
            life history approach. <em>Theoretical Population Biology</em>, 104, 1–13.
          </p>
          <p className="break-inside-avoid">
            Campbell, E. Y. (2017). <em>Influences of thermal and trophic heterogeneity on phenology,
            growth and resource use by juvenile coho salmon</em> (Doctoral dissertation). Oregon State
            University, Corvallis, OR.
          </p>
          <p className="break-inside-avoid">
            Campbell, E. Y., Dunham, J. B., Reeves, G. H., & Wondzell, S. M. (2019). Phenology of
            hatching, emergence, and end-of-season body size in young-of-year coho salmon in thermally
            contrasting streams draining the Copper River Delta, Alaska. <em>Canadian Journal of
            Fisheries and Aquatic Sciences</em>, 76(2), 185–191.
          </p>
          <p className="break-inside-avoid">
            Chittenden, C. M., Melnychuk, M. C., Welch, D. W., & McKinley, R. S. (2010). An
            investigation into the poor survival of an endangered coho salmon population.
            <em> PLoS ONE</em>, 5(5), e10869.
          </p>
          <p className="break-inside-avoid">
            Drobny, P. Y. (2016). <em>Influence of body size, intra- and inter-specific salmonid
            densities, and habitat on overwinter survival of juvenile Coho Salmon (Oncorhynchus
            kisutch) in Prairie Creek, California</em> (Master's thesis). Humboldt State University,
            Arcata, CA.
          </p>
          <p className="break-inside-avoid">
            Ebersole, J. L., Wigington, P. J. Jr., Baker, J. P., Cairns, M. A., Church, M. R.,
            Hansen, B. P., Miller, B. A., LaVigne, H. R., Compton, J. E., & Leibowitz, S. G.
            (2006). Juvenile coho salmon growth and survival across stream network seasonal habitats.
            <em> Transactions of the American Fisheries Society</em>, 135(6), 1681–1697.
          </p>
          <p className="break-inside-avoid">
            Iacarella, J. C., Chea, R., & Patterson, D. A. (2025). Potential limits to local
            adaptation of Coho Salmon populations from eggs to fry under naturally varying and warming
            temperature conditions. <em>Transactions of the American Fisheries Society</em>, 154, 693–707.
          </p>
          <p className="break-inside-avoid">
            Lang, D. W., Hall, J. D., Reeves, G. H., & Wipfli, M. S. (2006). The influence of
            fall-spawning coho salmon (<em>Oncorhynchus kisutch</em>) on growth and production of
            juvenile coho salmon rearing in beaver ponds on the Copper River Delta, Alaska.
            <em> Canadian Journal of Fisheries and Aquatic Sciences</em>, 63(4), 917–930.
          </p>
          <p className="break-inside-avoid">
            Lusardi, R. A., Hammock, B. G., Jeffres, C. A., Dahlgren, R. A., & Kiernan, J. D.
            (2020). Oversummer growth and survival of juvenile coho salmon (<em>Oncorhynchus
            kisutch</em>) across a natural gradient of stream water temperature and prey availability:
            an in situ enclosure experiment. <em>Canadian Journal of Fisheries and Aquatic
            Sciences</em>, 77(3), 413–424.
          </p>
          <p className="break-inside-avoid">
            Manhard, C. V., Som, N. A., Perry, R. W., & Plumb, J. M. (2018). A laboratory-calibrated
            model of coho salmon growth with utility for ecological analyses. <em>Canadian Journal
            of Fisheries and Aquatic Sciences</em>, 75, 684–690. (Referenced as Manhard et al. 2017
            per online acceptance date.)
          </p>
          <p className="break-inside-avoid">
            Pess, G. R., Kiffney, P. M., Liermann, M. C., Bennett, T. R., Anderson, J. H., &
            Quinn, T. P. (2011). The influences of body size, habitat quality, and competition on the
            movement and survival of juvenile coho salmon during the early stages of stream
            recolonization. <em>Transactions of the American Fisheries Society</em>, 140(4), 883–897.
          </p>
          <p className="break-inside-avoid">
            Quinn, T. P., & Peterson, N. P. (1996). The influence of habitat complexity and fish size
            on over-winter survival and growth of individually marked juvenile coho salmon
            (<em>Oncorhynchus kisutch</em>) in Big Beef Creek, Washington. <em>Canadian Journal of
            Fisheries and Aquatic Sciences</em>, 53(7), 1555–1564.
          </p>
          <p className="break-inside-avoid">
            Sandercock, F. K. (1991). Life history of coho salmon (<em>Oncorhynchus kisutch</em>).
            In C. Groot & L. Margolis (Eds.), <em>Pacific salmon life histories</em> (pp. 395–446).
            University of British Columbia Press.
          </p>
          <p className="break-inside-avoid">
            Spanjer, A. R., Moran, P. W., Larsen, K. A., Wetzel, L. A., Hansen, A. G., &
            Beauchamp, D. A. (2018). Juvenile coho salmon growth and health in streams across an
            urbanization gradient. <em>Science of the Total Environment</em>, 625, 1003–1012.
          </p>
          <p className="break-inside-avoid">
            Sullivan, K., Martin, D. J., Cardwell, R. D., Toll, J. E., & Duke, S. (2000).
            <em> An analysis of the effects of temperature on salmonids of the Pacific Northwest with
            implications for selecting temperature criteria</em>. Sustainable Ecosystems Institute.
          </p>
          <p className="break-inside-avoid">
            Willey, W. S. (2004). <em>Energetic response of juvenile coho salmon (Oncorhynchus
            kisutch) to varying water temperature regimes in northern California streams</em>
            (Master's thesis). Humboldt State University, Arcata, CA.
          </p>
        </div>
      </div>
    </Layout>
  );
}
