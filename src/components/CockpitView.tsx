import React from 'react';
import { Play, Zap, Activity, ShieldAlert, ArrowUpRight, Sliders } from 'lucide-react';
import {
  CYCLE_GOALS,
  calculateCNSReadiness,
  type CycleGoalId,
  type MuscleTelemetry,
  type ReadinessInput,
} from '../utils/biomechanics';

interface CockpitViewProps {
  readinessInput: ReadinessInput;
  onUpdateReadiness: (next: ReadinessInput) => void;
  cycleGoal: CycleGoalId;
  onSelectCycleGoal: (goal: CycleGoalId) => void;
  muscles: MuscleTelemetry[];
  onStartLiveWorkout: () => void;
  onNavigateToAnatomy: () => void;
}

export const CockpitView: React.FC<CockpitViewProps> = ({
  readinessInput,
  onUpdateReadiness,
  cycleGoal,
  onSelectCycleGoal,
  muscles,
  onStartLiveWorkout,
  onNavigateToAnatomy,
}) => {
  const readiness = calculateCNSReadiness(readinessInput);
  const activeGoal = CYCLE_GOALS[cycleGoal];

  const freshMuscles = [...muscles]
    .sort((a, b) => b.recoveryPercent - a.recoveryPercent)
    .slice(0, 4);

  const fatiguedMuscles = [...muscles]
    .filter((m) => m.recoveryPercent < 65)
    .sort((a, b) => a.recoveryPercent - b.recoveryPercent);

  const totalWeeklySets = muscles.reduce((acc, m) => acc + m.weeklySetsCompleted, 0);
  const totalTargetSets = muscles.reduce(
    (acc, m) => acc + Math.round(m.baseWeeklyTargetSets * activeGoal.weeklyTargetMultiplier),
    0
  );

  // SVG Ring calculation
  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (readiness.score / 100) * circumference;

  const toneColor =
    readiness.statusTone === 'optimal'
      ? '#CCFF00'
      : readiness.statusTone === 'moderate'
      ? '#F59E0B'
      : '#EF4444';

  return (
    <div className="space-y-8">
      {/* Top 2-Column Asymmetric Split: CNS Readiness Gauge + Calibration & Cycle */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Dominant Focal Anchor: CNS Readiness Telemetry Card */}
        <div className="lg:col-span-7 rounded-2xl bg-[#12151E] border border-[#1E2433] p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-4">
              <div className="text-xs text-[#94A3B8]">
                <span>Indice de Disponibilité Nerveuse (CNS)</span>
                <span className="mx-2" aria-hidden="true">·</span>
                <span>Fenêtre 72h</span>
              </div>
              <span
                className="text-xs font-mono-tabular font-semibold"
                style={{ color: toneColor }}
              >
                {readiness.statusTone === 'optimal'
                  ? '● Nominal'
                  : readiness.statusTone === 'moderate'
                  ? '▲ Régulation'
                  : '✖ Fatigue Centrale'}
              </span>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row items-center gap-6">
              {/* Circular Readiness Gauge */}
              <div className="relative flex items-center justify-center shrink-0">
                <svg className="h-36 w-36 -rotate-90 transform" viewBox="0 0 140 140">
                  <circle
                    cx="70"
                    cy="70"
                    r={radius}
                    stroke="#1E2433"
                    strokeWidth="10"
                    fill="transparent"
                  />
                  <circle
                    cx="70"
                    cy="70"
                    r={radius}
                    stroke={toneColor}
                    strokeWidth="10"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    fill="transparent"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="font-mono-tabular text-4xl font-bold text-[#F1F5F9]">
                    {readiness.score}
                    <span className="text-sm text-[#94A3B8] ml-0.5">%</span>
                  </span>
                  <span className="text-[11px] text-[#94A3B8] mt-0.5">Prêt</span>
                </div>
              </div>

              {/* Readiness Directives */}
              <div className="flex-1 space-y-3 text-center sm:text-left">
                <div>
                  <h2 className="font-display text-3xl font-bold uppercase tracking-wide text-[#F1F5F9]">
                    {readiness.statusLabel}
                  </h2>
                  <p className="mt-1 text-sm text-[#94A3B8] leading-relaxed">
                    {readiness.recommendation}
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 pt-1 text-xs text-[#94A3B8]">
                  <div>
                    <span>Modulation Charge : </span>
                    <span className="font-mono-tabular font-semibold text-[#F1F5F9]">
                      {readiness.loadAdjustmentPercent > 0
                        ? `+${readiness.loadAdjustmentPercent}%`
                        : `${readiness.loadAdjustmentPercent}%`}
                    </span>
                  </div>
                  <span aria-hidden="true">·</span>
                  <div>
                    <span>Cible RIR : </span>
                    <span className="font-mono-tabular font-semibold text-[#00E5FF]">
                      {activeGoal.rirTarget} RIR
                    </span>
                  </div>
                  <span aria-hidden="true">·</span>
                  <div>
                    <span>Volume Hebdo : </span>
                    <span className="font-mono-tabular font-semibold text-[#F1F5F9]">
                      {totalWeeklySets} / {totalTargetSets} séries
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Primary Action Bar */}
          <div className="mt-6 pt-5 border-t border-[#1E2433] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="text-xs text-[#94A3B8]">
              <span className="text-[#F1F5F9] font-medium">Séance du jour :</span> Upper Body — Hypertrophie & Densité (4 exercices)
            </div>
            <button
              onClick={onStartLiveWorkout}
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#CCFF00] text-[#090A0F] font-semibold text-sm flex items-center justify-center gap-2 hover:bg-[#b8e600] active:scale-[0.99] transition-all whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Play className="h-4 w-4 fill-current" />
              Démarrer la Séance Live
            </button>
          </div>
        </div>

        {/* Right Column: Live Bio-Calibration Sliders */}
        <div className="lg:col-span-5 rounded-2xl bg-[#12151E] border border-[#1E2433] p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="font-display text-xl font-bold uppercase tracking-wide text-[#F1F5F9] flex items-center gap-2">
                <Sliders className="h-4 w-4 text-[#00E5FF]" />
                Calibration Bio-Nerveuse Matinale
              </h3>
              <span className="text-xs font-mono-tabular text-[#94A3B8]">Temps réel</span>
            </div>
            <p className="mt-1 text-xs text-[#94A3B8]">
              Ajustez vos capteurs subjectifs pour recalibrer automatiquement vos charges du jour.
            </p>

            <div className="mt-5 space-y-4">
              {/* Sleep Hours */}
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <label htmlFor="sleep-hours-slider" className="text-[#94A3B8] font-medium">
                    Durée de Sommeil Récupérateur
                  </label>
                  <span className="font-mono-tabular font-semibold text-[#F1F5F9]">
                    {readinessInput.sleepHours.toFixed(1)}{' '}
                    <span className="text-[#94A3B8] text-[11px] uppercase">h</span>
                  </span>
                </div>
                <input
                  id="sleep-hours-slider"
                  type="range"
                  min="4"
                  max="10"
                  step="0.5"
                  value={readinessInput.sleepHours}
                  onChange={(e) =>
                    onUpdateReadiness({
                      ...readinessInput,
                      sleepHours: parseFloat(e.target.value),
                    })
                  }
                  className="w-full accent-[#CCFF00] cursor-pointer h-2 rounded-lg bg-[#090A0F]"
                />
              </div>

              {/* Neural Fatigue */}
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <label htmlFor="neural-fatigue-slider" className="text-[#94A3B8] font-medium">
                    Fatigue Nerveuse Perçue (1 = Frais, 5 = Épuisé)
                  </label>
                  <span className="font-mono-tabular font-semibold text-[#00E5FF]">
                    Niveau {readinessInput.neuralFatigue}/5
                  </span>
                </div>
                <input
                  id="neural-fatigue-slider"
                  type="range"
                  min="1"
                  max="5"
                  step="1"
                  value={readinessInput.neuralFatigue}
                  onChange={(e) =>
                    onUpdateReadiness({
                      ...readinessInput,
                      neuralFatigue: parseInt(e.target.value, 10),
                    })
                  }
                  className="w-full accent-[#00E5FF] cursor-pointer h-2 rounded-lg bg-[#090A0F]"
                />
              </div>

              {/* Joint Stiffness */}
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <label htmlFor="joint-stiffness-slider" className="text-[#94A3B8] font-medium">
                    Raideur Articulaire & Tendineuse (1 = Fluide, 5 = Raide)
                  </label>
                  <span className="font-mono-tabular font-semibold text-[#F1F5F9]">
                    Niveau {readinessInput.jointStiffness}/5
                  </span>
                </div>
                <input
                  id="joint-stiffness-slider"
                  type="range"
                  min="1"
                  max="5"
                  step="1"
                  value={readinessInput.jointStiffness}
                  onChange={(e) =>
                    onUpdateReadiness({
                      ...readinessInput,
                      jointStiffness: parseInt(e.target.value, 10),
                    })
                  }
                  className="w-full accent-[#CCFF00] cursor-pointer h-2 rounded-lg bg-[#090A0F]"
                />
              </div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-[#1E2433] flex items-center justify-between text-xs text-[#94A3B8]">
            <span>Charge cumulée 72h</span>
            <span className="font-mono-tabular text-[#F1F5F9] font-semibold">
              {readinessInput.recent72hSets} séries effectives
            </span>
          </div>
        </div>
      </div>

      {/* Morphological Cycle Selector */}
      <div className="rounded-2xl bg-[#12151E] border border-[#1E2433] p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="font-display text-xl font-bold uppercase tracking-wide text-[#F1F5F9]">
              Cycle de Programmation Biomécanique Actif
            </h3>
            <p className="text-xs text-[#94A3B8]">
              Recalibre instantanément les quotas de séries hebdomadaires (MAV) et les fourchettes de répétitions cibles.
            </p>
          </div>
          <div className="text-xs font-mono-tabular text-[#00E5FF]">
            Plage cible : {activeGoal.repRangeTarget[0]}–{activeGoal.repRangeTarget[1]} réps · RIR {activeGoal.rirTarget}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {(Object.keys(CYCLE_GOALS) as CycleGoalId[]).map((goalKey) => {
            const g = CYCLE_GOALS[goalKey];
            const isSelected = cycleGoal === goalKey;
            return (
              <button
                key={g.id}
                onClick={() => onSelectCycleGoal(g.id)}
                className={`text-left p-4 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#090A0F] border-[#CCFF00] text-[#F1F5F9]'
                    : 'bg-[#090A0F]/60 border-[#1E2433] text-[#94A3B8] hover:border-[#334155] hover:text-[#F1F5F9]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-sm text-[#F1F5F9] whitespace-nowrap truncate">
                    {g.label}
                  </span>
                  {isSelected && (
                    <span className="text-xs font-mono-tabular text-[#CCFF00] shrink-0">Actif</span>
                  )}
                </div>
                <p className="mt-1.5 text-xs text-[#94A3B8] line-clamp-2">{g.subtitle}</p>
                <div className="mt-3 pt-2.5 border-t border-[#1E2433] flex items-center justify-between text-[11px] font-mono-tabular">
                  <span>Volume ×{g.weeklyTargetMultiplier}</span>
                  <span>
                    {g.repRangeTarget[0]}–{g.repRangeTarget[1]} réps
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom 2-Column Strip: Freshness Dispatch & Recovery Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ready to Push Muscles */}
        <div className="rounded-2xl bg-[#12151E] border border-[#1E2433] p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-xl font-bold uppercase tracking-wide text-[#F1F5F9] flex items-center gap-2">
              <Zap className="h-4 w-4 text-[#CCFF00]" />
              Unités Motrices Prêtes (Surcharge)
            </h3>
            <button
              onClick={onNavigateToAnatomy}
              className="text-xs font-medium text-[#00E5FF] hover:underline flex items-center gap-1 cursor-pointer whitespace-nowrap"
            >
              Scanner 3D complet <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {freshMuscles.map((m) => {
              const target = Math.round(m.baseWeeklyTargetSets * activeGoal.weeklyTargetMultiplier);
              return (
                <div
                  key={m.id}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-[#090A0F] border border-[#1E2433]"
                >
                  <div>
                    <div className="text-sm font-semibold text-[#F1F5F9]">{m.name}</div>
                    <div className="text-xs text-[#94A3B8] mt-0.5">
                      <span>{m.primaryExercise}</span>
                      <span className="mx-1.5" aria-hidden="true">·</span>
                      <span className="font-mono-tabular">
                        1RM Est. {m.bestE1RM} kg
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono-tabular text-sm font-bold text-[#10B981]">
                      {m.recoveryPercent}% frais
                    </div>
                    <div className="text-xs font-mono-tabular text-[#94A3B8]">
                      {m.weeklySetsCompleted}/{target} séries
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Fatigued / In-Recovery Muscles */}
        <div className="rounded-2xl bg-[#12151E] border border-[#1E2433] p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-xl font-bold uppercase tracking-wide text-[#F1F5F9] flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-[#F59E0B]" />
              Zones en Récupération Tissulaire
            </h3>
            <span className="text-xs text-[#94A3B8]">Éviter l&apos;échec nerveux</span>
          </div>

          <div className="space-y-3">
            {fatiguedMuscles.length === 0 ? (
              <div className="p-6 text-center text-sm text-[#94A3B8]">
                Tous les groupes musculaires ont dépassé 65% de récupération.
              </div>
            ) : (
              fatiguedMuscles.map((m) => {
                const target = Math.round(m.baseWeeklyTargetSets * activeGoal.weeklyTargetMultiplier);
                return (
                  <div
                    key={m.id}
                    className="flex items-center justify-between p-3.5 rounded-xl bg-[#090A0F] border border-[#1E2433]"
                  >
                    <div>
                      <div className="text-sm font-semibold text-[#F1F5F9]">{m.name}</div>
                      <div className="text-xs text-[#94A3B8] mt-0.5">
                        <span>Dernière sollicitation il y a {m.hoursSinceLastTrained}h</span>
                        <span className="mx-1.5" aria-hidden="true">·</span>
                        <span>Repos conseillé : 24h</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className={`font-mono-tabular text-sm font-bold ${
                          m.recoveryPercent < 50 ? 'text-[#EF4444]' : 'text-[#F59E0B]'
                        }`}
                      >
                        {m.recoveryPercent}% récup.
                      </div>
                      <div className="text-xs font-mono-tabular text-[#94A3B8]">
                        {m.weeklySetsCompleted}/{target} séries
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
