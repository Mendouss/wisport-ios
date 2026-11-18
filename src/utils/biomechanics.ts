/**
 * KINESIS — Pure Biomechanical & Telemetry Engine
 * Decoupled logic for CNS Readiness, 1RM Epley/Brzycki, Progressive Overload,
 * Muscle Heatmap Recovery, Strength Tiers, and Agonist/Antagonist Symmetry.
 */

export type CycleGoalId = 'hypertrophy' | 'strength' | 'recomp' | 'peaking';

export interface CycleGoalConfig {
  id: CycleGoalId;
  label: string;
  subtitle: string;
  weeklyTargetMultiplier: number;
  repRangeTarget: [number, number];
  rirTarget: number;
}

export const CYCLE_GOALS: Record<CycleGoalId, CycleGoalConfig> = {
  hypertrophy: {
    id: 'hypertrophy',
    label: 'Hypertrophie Ciblée',
    subtitle: 'Volume optimal MAV (12–18 séries/muscle)',
    weeklyTargetMultiplier: 1.0,
    repRangeTarget: [8, 12],
    rirTarget: 1,
  },
  strength: {
    id: 'strength',
    label: 'Force Maximale',
    subtitle: 'Intensité neurale élevée (80–92% 1RM)',
    weeklyTargetMultiplier: 0.75,
    repRangeTarget: [3, 6],
    rirTarget: 2,
  },
  recomp: {
    id: 'recomp',
    label: 'Recomposition Corporelle',
    subtitle: 'Densité mécanique & maintien du volume',
    weeklyTargetMultiplier: 0.85,
    repRangeTarget: [6, 10],
    rirTarget: 1,
  },
  peaking: {
    id: 'peaking',
    label: 'Affûtage & Deload',
    subtitle: 'Dissipation de la fatigue nerveuse (-35% volume)',
    weeklyTargetMultiplier: 0.65,
    repRangeTarget: [5, 8],
    rirTarget: 3,
  },
};

export type MuscleGroupId =
  | 'pectorals'
  | 'front_delts'
  | 'side_delts'
  | 'biceps'
  | 'forearms'
  | 'abs'
  | 'quads'
  | 'calves'
  | 'traps'
  | 'lats'
  | 'rear_delts'
  | 'triceps'
  | 'lower_back'
  | 'glutes'
  | 'hamstrings';

export interface MuscleTelemetry {
  id: MuscleGroupId;
  name: string;
  view: 'front' | 'back' | 'both';
  category: 'push' | 'pull' | 'legs' | 'core';
  recoveryPercent: number; // 0 to 100
  weeklySetsCompleted: number;
  baseWeeklyTargetSets: number;
  hoursSinceLastTrained: number;
  primaryExercise: string;
  bestE1RM: number;
  bodyweightRatioStandard: number; // e1RM / bodyweight for Elite tier
}

export type StrengthTier = 'Novice' | 'Intermédiaire' | 'Avancé' | 'Élite' | 'Maître';

export type SetType = 'warmup' | 'working' | 'dropset' | 'myoreps';

export interface WorkoutSet {
  id: string;
  setNumber: number;
  type: SetType;
  previousWeight: number;
  previousReps: number;
  previousRir: number;
  weight: number;
  reps: number;
  rir: number;
  completed: boolean;
  isPR?: boolean;
}

export interface WorkoutExercise {
  id: string;
  name: string;
  primaryMuscle: MuscleGroupId;
  secondaryMuscles: MuscleGroupId[];
  equipment: string;
  restSeconds: number;
  supersetGroupId?: string;
  historicalBest1RM: number;
  notes: string;
  sets: WorkoutSet[];
}

export interface ReadinessInput {
  sleepHours: number; // 4 to 10
  sleepQuality: number; // 1 to 5
  neuralFatigue: number; // 1 (fresh) to 5 (exhausted)
  jointStiffness: number; // 1 (fluid) to 5 (stiff)
  recent72hSets: number; // e.g., 0 to 60
}

export interface ReadinessResult {
  score: number; // 0 to 100
  statusLabel: 'Mode Performance' | 'Mode Régulation' | 'Mode Deload';
  statusTone: 'optimal' | 'moderate' | 'fatigued';
  recommendation: string;
  loadAdjustmentPercent: number;
}

/**
 * Calculates Daily CNS Readiness Score (0-100%)
 */
export function calculateCNSReadiness(input: ReadinessInput): ReadinessResult {
  const clampedSleep = Math.max(4, Math.min(10, input.sleepHours));
  const sleepScore = ((clampedSleep - 4) / 6) * 35; // up to 35 pts
  const qualityScore = ((Math.max(1, Math.min(5, input.sleepQuality)) - 1) / 4) * 20; // up to 20 pts
  const neuralScore = ((5 - Math.max(1, Math.min(5, input.neuralFatigue))) / 4) * 25; // up to 25 pts
  const jointScore = ((5 - Math.max(1, Math.min(5, input.jointStiffness))) / 4) * 10; // up to 10 pts

  // Workload penalty: optimal recent 72h sets ~ 18-30. Above 35 incurs CNS drain
  const workloadPenalty = Math.max(0, (input.recent72hSets - 24) * 0.45);
  const rawScore = sleepScore + qualityScore + neuralScore + jointScore + 10 - workloadPenalty;
  const score = Math.round(Math.max(15, Math.min(100, rawScore)));

  if (score >= 78) {
    return {
      score,
      statusLabel: 'Mode Performance',
      statusTone: 'optimal',
      recommendation:
        'Disponibilité nerveuse optimale. Visez la surcharge progressive (+2.5 kg ou +1 rép) sur vos séries principales.',
      loadAdjustmentPercent: 2.5,
    };
  }
  if (score >= 55) {
    return {
      score,
      statusLabel: 'Mode Régulation',
      statusTone: 'moderate',
      recommendation:
        'Récupération intermédiaire. Maintenez vos charges de travail à RIR 1–2 sans forcer l’échec nerveux.',
      loadAdjustmentPercent: 0,
    };
  }
  return {
    score,
    statusLabel: 'Mode Deload',
    statusTone: 'fatigued',
    recommendation:
      'Fatigue périphérique et centrale détectée. Réduisez les charges de 10–15% ou coupez 1 série par exercice.',
    loadAdjustmentPercent: -12.5,
  };
}

/**
 * Estimates 1RM using hybrid Epley / Brzycki formula
 * For warmups or invalid sets, returns 0.
 */
export function calculateEstimated1RM(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0;
  if (reps === 1) return Math.round(weight * 10) / 10;
  const cappedReps = Math.min(reps, 20);
  const epley = weight * (1 + cappedReps / 30);
  const brzycki = weight * (36 / (37 - Math.min(cappedReps, 30)));
  const hybrid = (epley + brzycki) / 2;
  return Math.round(hybrid * 10) / 10;
}

/**
 * Suggests Progressive Overload Target based on previous performance and RIR
 */
export function suggestProgressiveOverload(
  previousWeight: number,
  previousReps: number,
  previousRir: number,
  repRange: [number, number] = [6, 10]
): { suggestedWeight: number; suggestedReps: number; rationale: string } {
  if (previousWeight <= 0) {
    return { suggestedWeight: 60, suggestedReps: repRange[0], rationale: 'Calibration initiale' };
  }
  // If athlete hit top of rep range with RIR >= 1, increase weight by +2.5kg
  if (previousReps >= repRange[1] && previousRir >= 1) {
    return {
      suggestedWeight: Math.round((previousWeight + 2.5) * 100) / 100,
      suggestedReps: repRange[0],
      rationale: '+2.5 kg (Plafond de répétitions validé)',
    };
  }
  // If athlete had RIR >= 2, suggest +1 rep at same weight
  if (previousRir >= 1) {
    return {
      suggestedWeight: previousWeight,
      suggestedReps: previousReps + 1,
      rationale: '+1 rép (Surcharge en volume à charge constante)',
    };
  }
  // If RIR == 0 (failure), consolidate same load & reps
  return {
    suggestedWeight: previousWeight,
    suggestedReps: previousReps,
    rationale: 'Consolidation mécanique (RIR 0 à la séance précédente)',
  };
}

/**
 * Evaluates Strength Tier for a muscle/lift given best e1RM, athlete bodyweight, and elite standard ratio
 */
export function evaluateStrengthTier(
  bestE1RM: number,
  bodyweightKg: number,
  eliteRatio: number
): { tier: StrengthTier; progressPercent: number; ratio: number } {
  const safeBw = Math.max(45, bodyweightKg);
  const ratio = Math.round((bestE1RM / safeBw) * 100) / 100;
  const normalized = ratio / eliteRatio; // 1.0 = Elite

  if (normalized >= 1.15) {
    return { tier: 'Maître', progressPercent: 100, ratio };
  }
  if (normalized >= 0.95) {
    return {
      tier: 'Élite',
      progressPercent: Math.min(99, Math.round(80 + ((normalized - 0.95) / 0.2) * 20)),
      ratio,
    };
  }
  if (normalized >= 0.75) {
    return {
      tier: 'Avancé',
      progressPercent: Math.round(60 + ((normalized - 0.75) / 0.2) * 20),
      ratio,
    };
  }
  if (normalized >= 0.55) {
    return {
      tier: 'Intermédiaire',
      progressPercent: Math.round(35 + ((normalized - 0.55) / 0.2) * 25),
      ratio,
    };
  }
  return {
    tier: 'Novice',
    progressPercent: Math.max(10, Math.round((normalized / 0.55) * 35)),
    ratio,
  };
}

/**
 * Computes updated recovery percentage after logging a completed working set
 */
export function applySetFatigueToMuscle(
  currentRecovery: number,
  isPrimary: boolean,
  rir: number,
  setType: SetType
): number {
  if (setType === 'warmup') return currentRecovery;
  const intensityFactor = rir === 0 ? 1.35 : rir === 1 ? 1.15 : rir === 2 ? 1.0 : 0.8;
  const baseDrain = isPrimary ? 9 : 4.5;
  const drain = baseDrain * intensityFactor * (setType === 'dropset' || setType === 'myoreps' ? 1.25 : 1);
  return Math.max(12, Math.round(currentRecovery - drain));
}

export interface SymmetryAxis {
  axis: string;
  score: number; // 0 to 100 (100 = ideal balance)
  status: string;
  ratioLabel: string;
}

/**
 * Computes Agonist / Antagonist Postural & Volume Symmetry
 */
export function calculateSymmetryRadar(muscles: MuscleTelemetry[]): SymmetryAxis[] {
  const getSets = (ids: MuscleGroupId[]) =>
    muscles.filter((m) => ids.includes(m.id)).reduce((acc, m) => acc + m.weeklySetsCompleted, 0);

  const pushSets = getSets(['pectorals', 'front_delts', 'triceps']);
  const pullSets = getSets(['lats', 'traps', 'rear_delts', 'biceps']);
  const quadSets = getSets(['quads']);
  const posteriorChainSets = getSets(['hamstrings', 'glutes', 'lower_back']);
  const armFlexorSets = getSets(['biceps', 'forearms']);
  const armExtensorSets = getSets(['triceps']);
  const upperSets = pushSets + pullSets;
  const lowerSets = quadSets + posteriorChainSets + getSets(['calves']);

  const computeBalance = (a: number, b: number, idealRatio = 1.0) => {
    if (a === 0 && b === 0) return 85;
    const actual = a / Math.max(1, b);
    const deviation = Math.abs(actual - idealRatio) / idealRatio;
    return Math.max(40, Math.min(100, Math.round((1 - deviation * 0.65) * 100)));
  };

  return [
    {
      axis: 'Poussée / Tirage',
      score: computeBalance(pushSets, pullSets, 0.95),
      status: pushSets > pullSets * 1.15 ? 'Dominance Poussée' : 'Équilibré',
      ratioLabel: `${pushSets} vs ${pullSets} séries`,
    },
    {
      axis: 'Quad / Chaîne Post.',
      score: computeBalance(quadSets, posteriorChainSets, 0.8),
      status: quadSets > posteriorChainSets ? 'Renforcer Ischios' : 'Optimal',
      ratioLabel: `${quadSets} vs ${posteriorChainSets} séries`,
    },
    {
      axis: 'Fléchisseurs / Extenseurs',
      score: computeBalance(armFlexorSets, armExtensorSets, 1.0),
      status: 'Symétrie Bras Nominale',
      ratioLabel: `${armFlexorSets} vs ${armExtensorSets} séries`,
    },
    {
      axis: 'Haut / Bas du Corps',
      score: computeBalance(upperSets, lowerSets, 1.6),
      status: lowerSets < upperSets * 0.45 ? 'Déficit Membres Inf.' : 'Proportionné',
      ratioLabel: `${upperSets} vs ${lowerSets} séries`,
    },
    {
      axis: 'Fraîcheur Globale',
      score: Math.round(muscles.reduce((s, m) => s + m.recoveryPercent, 0) / Math.max(1, muscles.length)),
      status: 'Disponibilité Tissulaire',
      ratioLabel: 'Moyenne 15 zones',
    },
  ];
}
