import React, { useState, useEffect } from 'react';
import {
  Check,
  Plus,
  Timer,
  Trophy,
  Flame,
  Link2,
  Share2,
  Dumbbell,
  ChevronRight,
  RotateCcw,
} from 'lucide-react';
import {
  calculateEstimated1RM,
  suggestProgressiveOverload,
  type WorkoutExercise,
  type WorkoutSet,
  type SetType,
} from '../utils/biomechanics';
import { EXERCISE_CATALOG, type ExerciseLibraryItem } from '../data/initialData';

interface LiveWorkoutViewProps {
  exercises: WorkoutExercise[];
  onUpdateSet: (exerciseId: string, setId: string, updated: Partial<WorkoutSet>) => void;
  onAddSet: (exerciseId: string) => void;
  onAddExerciseFromCatalog: (item: ExerciseLibraryItem) => void;
  onOpenShareCard: () => void;
}

const SET_TYPE_LABELS: Record<SetType, { short: string; label: string; color: string }> = {
  warmup: { short: 'W', label: 'Échauffement', color: 'text-[#94A3B8]' },
  working: { short: 'E', label: 'Effective', color: 'text-[#CCFF00]' },
  dropset: { short: 'D', label: 'Drop-set', color: 'text-[#00E5FF]' },
  myoreps: { short: 'M', label: 'Myo-reps', color: 'text-[#F59E0B]' },
};

export const LiveWorkoutView: React.FC<LiveWorkoutViewProps> = ({
  exercises,
  onUpdateSet,
  onAddSet,
  onAddExerciseFromCatalog,
  onOpenShareCard,
}) => {
  const [selectedTarget, setSelectedTarget] = useState<{
    exerciseId: string;
    setId: string;
  }>({
    exerciseId: exercises[0]?.id || 'ex-bench',
    setId: exercises[0]?.sets[2]?.id || exercises[0]?.sets[0]?.id || 's-bench-3',
  });

  // Floating Rest Timer HUD state
  const [restRemaining, setRestRemaining] = useState<number>(0);
  const [restTotal, setRestTotal] = useState<number>(120);
  const [isRestRunning, setIsRestRunning] = useState<boolean>(false);
  const [showCatalogModal, setShowCatalogModal] = useState<boolean>(false);
  const [prBanner, setPrBanner] = useState<string | null>(null);

  useEffect(() => {
    if (!isRestRunning || restRemaining <= 0) return;
    const interval = setInterval(() => {
      setRestRemaining((prev) => {
        if (prev <= 1) {
          setIsRestRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isRestRunning, restRemaining]);

  const activeExercise =
    exercises.find((e) => e.id === selectedTarget.exerciseId) || exercises[0];
  const activeSet =
    activeExercise?.sets.find((s) => s.id === selectedTarget.setId) ||
    activeExercise?.sets[0];

  const handleAdjustWeight = (delta: number) => {
    if (!activeExercise || !activeSet) return;
    const nextWeight = Math.max(0, Math.round((activeSet.weight + delta) * 100) / 100);
    onUpdateSet(activeExercise.id, activeSet.id, { weight: nextWeight });
  };

  const handleAdjustReps = (delta: number) => {
    if (!activeExercise || !activeSet) return;
    const nextReps = Math.max(1, activeSet.reps + delta);
    onUpdateSet(activeExercise.id, activeSet.id, { reps: nextReps });
  };

  const handleSelectRir = (rir: number) => {
    if (!activeExercise || !activeSet) return;
    onUpdateSet(activeExercise.id, activeSet.id, { rir });
  };

  const handleCycleSetType = (exerciseId: string, set: WorkoutSet) => {
    const order: SetType[] = ['warmup', 'working', 'dropset', 'myoreps'];
    const nextType = order[(order.indexOf(set.type) + 1) % order.length];
    onUpdateSet(exerciseId, set.id, { type: nextType });
  };

  const handleValidateSet = (exercise: WorkoutExercise, set: WorkoutSet) => {
    const nextCompleted = !set.completed;
    const e1rm = calculateEstimated1RM(set.weight, set.reps);
    const isNewPR =
      nextCompleted && set.type !== 'warmup' && e1rm > exercise.historicalBest1RM;

    onUpdateSet(exercise.id, set.id, {
      completed: nextCompleted,
      isPR: isNewPR,
    });

    if (nextCompleted) {
      // Trigger Rest Timer HUD unless part of an incomplete superset first leg
      setRestTotal(exercise.restSeconds);
      setRestRemaining(exercise.restSeconds);
      setIsRestRunning(true);

      if (isNewPR) {
        setPrBanner(
          `Nouveau Record 1RM sur ${exercise.name} : ${e1rm} kg (précédent : ${exercise.historicalBest1RM} kg)`
        );
        setTimeout(() => setPrBanner(null), 5000);
      }

      // Advance active keypad selection to next uncompleted set
      const nextUnfinished = exercise.sets.find(
        (s) => s.id !== set.id && !s.completed
      );
      if (nextUnfinished) {
        setSelectedTarget({ exerciseId: exercise.id, setId: nextUnfinished.id });
      }
    }
  };

  // Summary session stats
  const totalVolumeKg = exercises.reduce(
    (sum, ex) =>
      sum +
      ex.sets
        .filter((s) => s.completed && s.type !== 'warmup')
        .reduce((sAcc, s) => sAcc + s.weight * s.reps, 0),
    0
  );
  const completedWorkingSets = exercises.reduce(
    (sum, ex) => sum + ex.sets.filter((s) => s.completed && s.type !== 'warmup').length,
    0
  );
  const prsHitCount = exercises.reduce(
    (sum, ex) => sum + ex.sets.filter((s) => s.completed && s.isPR).length,
    0
  );

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* PR Celebration Banner */}
      {prBanner && (
        <div
          role="status"
          className="rounded-xl bg-[#CCFF00]/15 border border-[#CCFF00] px-4 py-3 flex items-center justify-between text-xs text-[#CCFF00] font-semibold"
        >
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 shrink-0" />
            <span>{prBanner}</span>
          </div>
          <button
            onClick={() => setPrBanner(null)}
            className="text-xs underline ml-4 cursor-pointer"
          >
            Masquer
          </button>
        </div>
      )}

      {/* Session Telemetry Header Strip */}
      <div className="rounded-2xl bg-[#12151E] border border-[#1E2433] p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-xs text-[#94A3B8]">
            <span>Protocole Actif</span>
            <span className="mx-2" aria-hidden="true">·</span>
            <span>Upper Body — Surcharge & Antagonistes</span>
          </div>
          <h2 className="font-display text-2xl sm:text-3xl font-bold uppercase tracking-wide text-[#F1F5F9] mt-1">
            Logger Biomécanique Sans Friction
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-6">
          <div>
            <div className="text-xs text-[#94A3B8]">Tonnage Effectif</div>
            <div className="font-mono-tabular text-xl font-bold text-[#F1F5F9]">
              {Math.round(totalVolumeKg).toLocaleString('fr-FR')}{' '}
              <span className="text-xs text-[#94A3B8] font-normal">kg</span>
            </div>
          </div>
          <div>
            <div className="text-xs text-[#94A3B8]">Séries Validées</div>
            <div className="font-mono-tabular text-xl font-bold text-[#00E5FF]">
              {completedWorkingSets}
            </div>
          </div>
          <div>
            <div className="text-xs text-[#94A3B8]">Records (PR)</div>
            <div className="font-mono-tabular text-xl font-bold text-[#CCFF00]">
              {prsHitCount}
            </div>
          </div>
          <button
            onClick={onOpenShareCard}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-[#1E2433] hover:bg-[#283044] text-xs font-semibold text-[#F1F5F9] flex items-center gap-2 transition-colors whitespace-nowrap cursor-pointer"
          >
            <Share2 className="h-4 w-4 text-[#CCFF00]" />
            Carte Télémétrie 9:16
          </button>
        </div>
      </div>

      {/* Main Split: Left Exercise List (7 cols) + Right Biomechanical Keypad & HUD (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Exercises & Set Tables */}
        <div className="lg:col-span-7 space-y-5">
          {exercises.map((exercise) => {
            const isSuperset = Boolean(exercise.supersetGroupId);
            return (
              <div
                key={exercise.id}
                className="rounded-2xl bg-[#12151E] border border-[#1E2433] p-5 space-y-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-[#94A3B8]">
                      <span>{exercise.equipment}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono-tabular">
                        Record 1RM : {exercise.historicalBest1RM} kg
                      </span>
                      {isSuperset && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-[#00E5FF] font-semibold flex items-center gap-1">
                            <Link2 className="h-3.5 w-3.5" /> Biset Antagoniste {exercise.supersetGroupId}
                          </span>
                        </>
                      )}
                    </div>
                    <h3 className="font-display text-2xl font-bold uppercase tracking-wide text-[#F1F5F9] mt-0.5">
                      {exercise.name}
                    </h3>
                    <p className="text-xs text-[#94A3B8] mt-0.5">{exercise.notes}</p>
                  </div>

                  <button
                    onClick={() => onAddSet(exercise.id)}
                    aria-label={`Ajouter une série à ${exercise.name}`}
                    className="min-h-[40px] px-3 py-1.5 rounded-lg bg-[#090A0F] border border-[#1E2433] hover:border-[#CCFF00] text-xs font-medium text-[#F1F5F9] flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5 text-[#CCFF00]" />
                    Série
                  </button>
                </div>

                {/* Sets Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[#1E2433] text-[11px] text-[#94A3B8] font-mono-tabular">
                        <th className="py-2 pr-1.5">Série</th>
                        <th className="hidden sm:table-cell py-2 px-2">Précédent</th>
                        <th className="py-2 px-1.5">Cible IA</th>
                        <th className="py-2 px-1.5">Kg</th>
                        <th className="py-2 px-1.5">Réps</th>
                        <th className="hidden md:table-cell py-2 px-2">RIR</th>
                        <th className="hidden sm:table-cell py-2 px-2">1RM Est.</th>
                        <th className="py-2 pl-1.5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1E2433]/60 text-sm">
                      {exercise.sets.map((set) => {
                        const isSelected =
                          selectedTarget.exerciseId === exercise.id &&
                          selectedTarget.setId === set.id;
                        const e1rm = calculateEstimated1RM(set.weight, set.reps);
                        const overload = suggestProgressiveOverload(
                          set.previousWeight,
                          set.previousReps,
                          set.previousRir
                        );
                        const typeMeta = SET_TYPE_LABELS[set.type];

                        return (
                          <tr
                            key={set.id}
                            onClick={() =>
                              setSelectedTarget({
                                exerciseId: exercise.id,
                                setId: set.id,
                              })
                            }
                            className={`transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-[#1E2433]/70'
                                : set.completed
                                ? 'bg-[#10B981]/5'
                                : 'hover:bg-[#090A0F]/60'
                            }`}
                          >
                            <td className="py-2.5 pr-1.5 font-mono-tabular">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCycleSetType(exercise.id, set);
                                }}
                                title={`Type: ${typeMeta.label} (Cliquer pour changer)`}
                                className={`min-h-[36px] min-w-[36px] px-2 rounded-md bg-[#090A0F] border border-[#1E2433] text-xs font-bold ${typeMeta.color}`}
                              >
                                {set.setNumber}
                                {typeMeta.short}
                              </button>
                            </td>
                            <td className="hidden sm:table-cell py-2.5 px-2 font-mono-tabular text-xs text-[#94A3B8] whitespace-nowrap">
                              {set.previousWeight} kg × {set.previousReps}
                            </td>
                            <td className="py-2.5 px-1.5 font-mono-tabular text-xs text-[#00E5FF] whitespace-nowrap">
                              {overload.suggestedWeight}×{overload.suggestedReps}
                            </td>
                            <td className="py-2.5 px-1.5 font-mono-tabular font-bold text-[#F1F5F9]">
                              {set.weight}
                            </td>
                            <td className="py-2.5 px-1.5 font-mono-tabular font-bold text-[#F1F5F9]">
                              {set.reps}
                            </td>
                            <td className="hidden md:table-cell py-2.5 px-2 font-mono-tabular text-xs text-[#94A3B8]">
                              {set.rir}
                            </td>
                            <td className="hidden sm:table-cell py-2.5 px-2 font-mono-tabular text-xs whitespace-nowrap">
                              <span
                                className={
                                  set.isPR
                                    ? 'text-[#CCFF00] font-bold'
                                    : 'text-[#94A3B8]'
                                }
                              >
                                {e1rm} kg {set.isPR ? '★ PR' : ''}
                              </span>
                            </td>
                            <td className="py-2.5 pl-1.5 text-right">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleValidateSet(exercise, set);
                                }}
                                aria-label={`Valider la série ${set.setNumber} de ${exercise.name}`}
                                className={`min-h-[40px] min-w-[44px] px-2.5 sm:px-3 py-1.5 rounded-lg font-semibold text-xs inline-flex items-center justify-center gap-1 transition-all cursor-pointer ${
                                  set.completed
                                    ? 'bg-[#CCFF00] text-[#090A0F]'
                                    : 'bg-[#090A0F] border border-[#1E2433] text-[#94A3B8] hover:border-[#CCFF00] hover:text-white'
                                }`}
                              >
                                <Check className="h-4 w-4" />
                                <span>{set.completed ? 'Validé' : 'Valider'}</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}

          {/* Add Exercise From Library Button */}
          <button
            onClick={() => setShowCatalogModal(true)}
            className="w-full min-h-[48px] py-3.5 px-4 rounded-2xl bg-[#12151E] border border-dashed border-[#334155] hover:border-[#CCFF00] text-sm font-semibold text-[#F1F5F9] flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Dumbbell className="h-4 w-4 text-[#CCFF00]" />
            Ajouter un Exercice Biomécanique à la Séance
          </button>
        </div>

        {/* Right Sticky Column: One-Thumb Biomechanical Keypad & Rest HUD */}
        <div className="lg:col-span-5 lg:sticky lg:top-20 space-y-5">
          {/* Active Set Tactile Keypad */}
          {activeExercise && activeSet && (
            <div className="rounded-2xl bg-[#12151E] border border-[#1E2433] p-6 space-y-5">
              <div className="flex items-center justify-between gap-3 border-b border-[#1E2433] pb-3.5">
                <div className="min-w-0 flex-1">
                  <span className="text-xs text-[#00E5FF] font-mono-tabular">
                    Pavé Tactile Biomécanique · Série #{activeSet.setNumber}
                  </span>
                  <h3 className="font-display text-xl font-bold uppercase tracking-wide text-[#F1F5F9] truncate">
                    {activeExercise.name}
                  </h3>
                </div>
                <div className="text-right font-mono-tabular shrink-0">
                  <div className="text-xs text-[#94A3B8]">1RM Théorique</div>
                  <div className="text-lg font-bold text-[#CCFF00]">
                    {calculateEstimated1RM(activeSet.weight, activeSet.reps)} kg
                  </div>
                </div>
              </div>

              {/* Weight Direct Control & Micro-Plates */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <label htmlFor="direct-weight-input" className="text-[#94A3B8] font-medium">
                    Charge de la Série (kg)
                  </label>
                  <span className="font-mono-tabular text-[#94A3B8]">
                    Précédent : {activeSet.previousWeight} kg
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="direct-weight-input"
                    type="number"
                    step="0.5"
                    value={activeSet.weight}
                    onChange={(e) =>
                      onUpdateSet(activeExercise.id, activeSet.id, {
                        weight: Math.max(0, parseFloat(e.target.value) || 0),
                      })
                    }
                    className="w-28 h-12 rounded-xl bg-[#090A0F] border border-[#1E2433] px-3 text-center font-mono-tabular text-xl font-bold text-[#F1F5F9] focus:outline-none focus:border-[#CCFF00]"
                  />
                  <div className="grid grid-cols-4 gap-1.5 flex-1">
                    {[-2.5, +1.25, +2.5, +5].map((delta) => (
                      <button
                        key={delta}
                        type="button"
                        onClick={() => handleAdjustWeight(delta)}
                        className="min-h-[44px] rounded-xl bg-[#090A0F] border border-[#1E2433] hover:border-[#CCFF00] font-mono-tabular text-xs font-semibold text-[#F1F5F9] transition-colors cursor-pointer"
                      >
                        {delta > 0 ? `+${delta}` : delta}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Reps Control */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#94A3B8] font-medium">Répétitions Réalisées</span>
                  <span className="font-mono-tabular text-[#00E5FF]">
                    Surcharge :{' '}
                    {
                      suggestProgressiveOverload(
                        activeSet.previousWeight,
                        activeSet.previousReps,
                        activeSet.previousRir
                      ).rationale
                    }
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-2 items-center">
                  <button
                    type="button"
                    onClick={() => handleAdjustReps(-2)}
                    className="min-h-[44px] rounded-xl bg-[#090A0F] border border-[#1E2433] hover:border-[#00E5FF] font-mono-tabular text-xs font-semibold text-[#F1F5F9] cursor-pointer"
                  >
                    -2
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAdjustReps(-1)}
                    className="min-h-[44px] rounded-xl bg-[#090A0F] border border-[#1E2433] hover:border-[#00E5FF] font-mono-tabular text-xs font-semibold text-[#F1F5F9] cursor-pointer"
                  >
                    -1
                  </button>
                  <div className="h-11 rounded-xl bg-[#090A0F] border border-[#00E5FF]/50 flex items-center justify-center font-mono-tabular text-xl font-bold text-[#F1F5F9]">
                    {activeSet.reps}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAdjustReps(1)}
                    className="min-h-[44px] rounded-xl bg-[#090A0F] border border-[#1E2433] hover:border-[#00E5FF] font-mono-tabular text-xs font-semibold text-[#F1F5F9] cursor-pointer"
                  >
                    +1
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAdjustReps(2)}
                    className="min-h-[44px] rounded-xl bg-[#090A0F] border border-[#1E2433] hover:border-[#00E5FF] font-mono-tabular text-xs font-semibold text-[#F1F5F9] cursor-pointer"
                  >
                    +2
                  </button>
                </div>
              </div>

              {/* RIR (Reps In Reserve) Effort Selector */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#94A3B8] font-medium">
                    Répétitions en Réserve (RIR / Proximité de l&apos;échec)
                  </span>
                  <span className="font-mono-tabular text-[#F1F5F9]">
                    RIR {activeSet.rir} ({activeSet.rir === 0 ? 'Échec Max' : `${activeSet.rir} en réserve`})
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-1.5">
                  {[0, 1, 2, 3, 4].map((rirVal) => (
                    <button
                      key={rirVal}
                      type="button"
                      onClick={() => handleSelectRir(rirVal)}
                      className={`min-h-[40px] rounded-lg font-mono-tabular text-xs font-semibold transition-colors cursor-pointer ${
                        activeSet.rir === rirVal
                          ? 'bg-[#00E5FF] text-[#090A0F]'
                          : 'bg-[#090A0F] border border-[#1E2433] text-[#94A3B8] hover:text-white'
                      }`}
                    >
                      RIR {rirVal === 4 ? '4+' : rirVal}
                    </button>
                  ))}
                </div>
              </div>

              {/* Primary Set Validation Button */}
              <button
                type="button"
                onClick={() => handleValidateSet(activeExercise, activeSet)}
                className="w-full min-h-[48px] py-3 rounded-xl bg-[#CCFF00] text-[#090A0F] font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#b8e600] transition-colors cursor-pointer"
              >
                <Flame className="h-4 w-4 fill-current" />
                {activeSet.completed
                  ? 'Série Validée — Cliquer pour Annuler'
                  : `Valider la Série #${activeSet.setNumber} (${activeSet.weight} kg × ${activeSet.reps})`}
              </button>
            </div>
          )}

          {/* Persistent Rest Timer HUD */}
          <div className="rounded-2xl bg-[#12151E] border border-[#1E2433] p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Timer className="h-5 w-5 text-[#00E5FF]" />
                <div>
                  <div className="text-xs font-semibold text-[#F1F5F9]">
                    Chronomètre de Récupération Inter-Séries
                  </div>
                  <div className="text-[11px] text-[#94A3B8]">
                    {isRestRunning
                      ? 'Dissipation de l’ATP-CP en cours'
                      : 'Déclenchement auto après validation'}
                  </div>
                </div>
              </div>
              <div className="font-mono-tabular text-2xl font-bold text-[#00E5FF]">
                {formatSeconds(restRemaining)}
              </div>
            </div>

            {/* Progress bar */}
            <div className="mt-3 h-1.5 w-full rounded-full bg-[#090A0F] overflow-hidden">
              <div
                className="h-full bg-[#00E5FF] transition-all duration-300"
                style={{
                  width: `${
                    restTotal > 0 ? Math.min(100, (restRemaining / restTotal) * 100) : 0
                  }%`,
                }}
              />
            </div>

            <div className="mt-3.5 grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() =>
                  setRestRemaining((r) => Math.max(0, r - 15))
                }
                className="min-h-[40px] rounded-lg bg-[#090A0F] border border-[#1E2433] text-xs font-mono-tabular text-[#F1F5F9] hover:border-[#00E5FF] cursor-pointer"
              >
                -15s
              </button>
              <button
                type="button"
                onClick={() => {
                  setRestRemaining((r) => r + 30);
                  setRestTotal((t) => Math.max(t, restRemaining + 30));
                  setIsRestRunning(true);
                }}
                className="min-h-[40px] rounded-lg bg-[#090A0F] border border-[#1E2433] text-xs font-mono-tabular text-[#F1F5F9] hover:border-[#00E5FF] cursor-pointer"
              >
                +30s
              </button>
              <button
                type="button"
                onClick={() => {
                  setRestTotal(120);
                  setRestRemaining(120);
                  setIsRestRunning(true);
                }}
                className="min-h-[40px] rounded-lg bg-[#090A0F] border border-[#1E2433] text-xs font-mono-tabular text-[#F1F5F9] hover:border-[#00E5FF] flex items-center justify-center gap-1 cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" /> 2:00
              </button>
              <button
                type="button"
                onClick={() => {
                  setRestRemaining(0);
                  setIsRestRunning(false);
                }}
                className="min-h-[40px] rounded-lg bg-[#1E2433] text-xs font-semibold text-[#F1F5F9] hover:bg-[#2A3246] cursor-pointer"
              >
                Passer
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Exercise Catalog Modal */}
      {showCatalogModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="catalog-modal-title"
        >
          <div className="w-full max-w-lg rounded-2xl bg-[#12151E] border border-[#1E2433] p-6 text-[#F1F5F9]">
            <div className="flex items-center justify-between border-b border-[#1E2433] pb-3">
              <h3 id="catalog-modal-title" className="font-display text-2xl font-bold uppercase">
                Bibliothèque Biomécanique
              </h3>
              <button
                onClick={() => setShowCatalogModal(false)}
                className="px-3 py-1.5 rounded-lg bg-[#1E2433] text-xs font-semibold"
              >
                Fermer
              </button>
            </div>
            <div className="mt-4 space-y-2.5 max-h-80 overflow-y-auto">
              {EXERCISE_CATALOG.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    onAddExerciseFromCatalog(item);
                    setShowCatalogModal(false);
                  }}
                  className="w-full p-3.5 rounded-xl bg-[#090A0F] border border-[#1E2433] hover:border-[#CCFF00] text-left flex items-center justify-between transition-colors cursor-pointer"
                >
                  <div>
                    <div className="text-sm font-semibold text-[#F1F5F9]">{item.name}</div>
                    <div className="text-xs text-[#94A3B8] mt-0.5">
                      {item.equipment} · Repos {item.defaultRest}s
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-[#CCFF00]" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
