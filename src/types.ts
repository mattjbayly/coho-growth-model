export interface TempData {
  date: string;
  temp_c: number;
  interpolated?: boolean;
}

export interface GrowthParams {
  bGrow: number;
  tL: number;
  tUMin: number;
  tUMax: number;
  meanD: number;
  sdD: number;
  meanGammaG: number;
  sdGammaG: number;
}

export interface FoodRationParams {
  mode: 'scenario' | 'stochastic';
  fixedR: number;
  meanR: number;
  cvR: number;
  lowerR: number;
  upperR: number;
}

export interface InitialMassParams {
  mean: number;
  sd: number;
  min: number;
}

export interface LengthWeightParams {
  aMin: number;
  aMax: number;
  bLWMin: number;
  bLWMax: number;
}

export interface SurvivalParams {
  beta0: number;
  beta1: number;
}

export interface SimulationSettings {
  nFish: number;
  nRep: number;
  startDate: string;
  endDate: string;
  seed?: number;
}

export interface ReplicateSummary {
  replicateId: number;
  meanMass: number;
  medianMass: number;
  q05Mass: number;
  q25Mass: number;
  q75Mass: number;
  q95Mass: number;
  meanFL: number;
  medianFL: number;
  q05FL: number;
  q25FL: number;
  q75FL: number;
  q95FL: number;
  meanS: number;
  medianS: number;
  q05S: number;
  q25S: number;
  q75S: number;
  q95S: number;
}

export interface FishResult {
  replicateId: number;
  initialMass: number;
  finalMass: number;
  finalFL: number;
  survivalProb: number;
}

export interface SimulationResults {
  replicateSummaries: ReplicateSummary[];
  pooledFish: FishResult[];
  tempStats: {
    min: number;
    max: number;
    mean: number;
    count: number;
  };
  growthSeasonDays: number;
}
