import { differenceInDays, parseISO, addDays, format } from 'date-fns';
import { 
  TempData, GrowthParams, FoodRationParams, InitialMassParams, 
  LengthWeightParams, SurvivalParams, SimulationSettings, 
  SimulationResults, ReplicateSummary, FishResult 
} from '../types';
import { randomTruncatedNormal, randomUniform, calculateQuantiles } from './math';

export function runSimulation(
  tempData: TempData[],
  growthParams: GrowthParams,
  foodParams: FoodRationParams,
  initialMassParams: InitialMassParams,
  lwParams: LengthWeightParams,
  survivalParams: SurvivalParams,
  settings: SimulationSettings,
  onProgress?: (progress: number) => void
): SimulationResults {
  const { nFish, nRep, startDate, endDate } = settings;
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  const seasonDays = differenceInDays(end, start) + 1;

  // Map temperature data for quick lookup
  const tempMap = new Map<string, number>();
  tempData.forEach(d => tempMap.set(d.date, d.temp_c));

  const replicateSummaries: ReplicateSummary[] = [];
  const pooledFish: FishResult[] = [];

  // For diagnostic stats
  let totalTemp = 0;
  let minTemp = Infinity;
  let maxTemp = -Infinity;
  let tempCount = 0;

  for (let r = 0; r < nRep; r++) {
    // Sample replicate-level parameters
    const tU = randomUniform(growthParams.tUMin, growthParams.tUMax);
    const dParam = randomTruncatedNormal(growthParams.meanD, growthParams.sdD, 0);
    const gammaG = randomTruncatedNormal(growthParams.meanGammaG, growthParams.sdGammaG, 0);
    
    let R: number;
    if (foodParams.mode === 'scenario') {
      R = foodParams.fixedR;
    } else {
      R = randomTruncatedNormal(foodParams.meanR, foodParams.meanR * foodParams.cvR, foodParams.lowerR, foodParams.upperR);
    }
    
    const g = gammaG * R;
    const a = randomUniform(lwParams.aMin, lwParams.aMax);
    const bLW = randomUniform(lwParams.bLWMin, lwParams.bLWMax);

    const replicateMasses: number[] = [];
    const replicateFLs: number[] = [];
    const replicateSurvivals: number[] = [];

    for (let i = 0; i < nFish; i++) {
      let mass = randomTruncatedNormal(initialMassParams.mean, initialMassParams.sd, initialMassParams.min);
      const initialMass = mass;

      // Daily growth iteration
      for (let day = 0; day < seasonDays; day++) {
        const currentDate = format(addDays(start, day), 'yyyy-MM-dd');
        const T = tempMap.get(currentDate) ?? 0; // Should be handled by interpolation before calling

        if (r === 0 && i === 0) { // Only collect stats once
          totalTemp += T;
          minTemp = Math.min(minTemp, T);
          maxTemp = Math.max(maxTemp, T);
          tempCount++;
        }

        // Ratkowsky growth rate
        let omega = 0;
        if (T < tU) {
          omega = dParam * (T - growthParams.tL) * (1 - Math.exp(g * (T - tU)));
          omega = Math.max(0, omega);
        }

        // Allometric update
        mass = Math.pow(Math.pow(mass, growthParams.bGrow) + (growthParams.bGrow * omega) / 100, 1 / growthParams.bGrow);
      }

      // Final size and survival
      const finalMass = mass;
      const finalFL = Math.pow(finalMass / a, 1 / bLW);
      const logitS = survivalParams.beta0 + survivalParams.beta1 * finalFL;
      const survivalProb = 1 / (1 + Math.exp(-logitS));

      replicateMasses.push(finalMass);
      replicateFLs.push(finalFL);
      replicateSurvivals.push(survivalProb);

      // Store a subset of fish for pooled results to save memory
      if (pooledFish.length < 10000 || Math.random() < 0.05) {
        if (pooledFish.length < 20000) {
          pooledFish.push({
            replicateId: r,
            initialMass,
            finalMass,
            finalFL,
            survivalProb
          });
        }
      }
    }

    // Calculate replicate summaries
    const massQ = calculateQuantiles(replicateMasses, [0.05, 0.25, 0.5, 0.75, 0.95]);
    const flQ = calculateQuantiles(replicateFLs, [0.05, 0.25, 0.5, 0.75, 0.95]);
    const sQ = calculateQuantiles(replicateSurvivals, [0.05, 0.25, 0.5, 0.75, 0.95]);

    replicateSummaries.push({
      replicateId: r,
      meanMass: replicateMasses.reduce((a, b) => a + b, 0) / nFish,
      medianMass: massQ[2],
      q05Mass: massQ[0],
      q25Mass: massQ[1],
      q75Mass: massQ[3],
      q95Mass: massQ[4],
      meanFL: replicateFLs.reduce((a, b) => a + b, 0) / nFish,
      medianFL: flQ[2],
      q05FL: flQ[0],
      q25FL: flQ[1],
      q75FL: flQ[3],
      q95FL: flQ[4],
      meanS: replicateSurvivals.reduce((a, b) => a + b, 0) / nFish,
      medianS: sQ[2],
      q05S: sQ[0],
      q25S: sQ[1],
      q75S: sQ[3],
      q95S: sQ[4]
    });

    if (onProgress && r % 10 === 0) {
      onProgress((r + 1) / nRep);
    }
  }

  return {
    replicateSummaries,
    pooledFish,
    tempStats: {
      min: minTemp,
      max: maxTemp,
      mean: totalTemp / tempCount,
      count: tempCount
    },
    growthSeasonDays: seasonDays
  };
}
