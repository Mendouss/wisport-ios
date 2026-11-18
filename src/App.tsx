/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Activity, Dumbbell, Layers, Cpu, Smartphone, WifiOff } from 'lucide-react';
import {
  applySetFatigueToMuscle,
  calculateCNSReadiness,
  calculateEstimated1RM,
  type CycleGoalId,
  type MuscleTelemetry,
  type ReadinessInput,
  type WorkoutExercise,
  type WorkoutSet,
} from './utils/biomechanics';
import {
  INITIAL_MORPHOLOGY_LOG,
  INITIAL_MUSCLES,
  INITIAL_WORKOUT_EXERCISES,
  type ExerciseLibraryItem,
  type MorphologyEntry,
} from './data/initialData';
import { CockpitView } from './components/CockpitView';
import { LiveWorkoutView } from './components/LiveWorkoutView';
import { AnatomyScannerView } from './components/AnatomyScannerView';
import { AdaptiveCoachView } from './components/AdaptiveCoachView';
import { IOSInstallAndTestFlightModal } from './components/IOSInstallAndTestFlightModal';
import { TelemetryShareModal } from './components/TelemetryShareModal';

type ActiveTab = 'cockpit' | 'workout' | 'anatomy' | 'coach';

const STORAGE_KEY = 'kinesis_bio_telemetry_v1';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('cockpit');
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  // Persisted State
  const [readinessInput, setReadinessInput] = useState<ReadinessInput>({
    sleepHours: 7.5,
    sleepQuality: 4,
    neuralFatigue: 2,
    jointStiffness: 2,
    recent72hSets: 22,
  });

  const [cycleGoal, setCycleGoal] = useState<CycleGoalId>('hypertrophy');
  const [muscles, setMuscles] = useState<MuscleTelemetry[]>(INITIAL_MUSCLES);
  const [exercises, setExercises] = useState<WorkoutExercise[]>(INITIAL_WORKOUT_EXERCISES);
  const [morphologyLog, setMorphologyLog] = useState<MorphologyEntry[]>(INITIAL_MORPHOLOGY_LOG);

  // Load saved state on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.readinessInput) setReadinessInput(parsed.readinessInput);
        if (parsed.cycleGoal) setCycleGoal(parsed.cycleGoal);
        if (parsed.muscles) setMuscles(parsed.muscles);
        if (parsed.exercises) setExercises(parsed.exercises);
        if (parsed.morphologyLog) setMorphologyLog(parsed.morphologyLog);
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  // Save state changes
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          readinessInput,
          cycleGoal,
          muscles,
          exercises,
          morphologyLog,
        })
      );
    } catch {
      // Ignore storage errors
    }
  }, [readinessInput, cycleGoal, muscles, exercises, morphologyLog]);

  // Online / Offline connectivity listener
  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  // Update a workout set and propagate real-time muscle recovery & 1RM changes
  const handleUpdateSet = (
    exerciseId: string,
    setId: string,
    updated: Partial<WorkoutSet>
  ) => {
    const targetExercise = exercises.find((e) => e.id === exerciseId);
    const prevSet = targetExercise?.sets.find((s) => s.id === setId);

    setExercises((prevExercises) =>
      prevExercises.map((ex) => {
        if (ex.id !== exerciseId) return ex;
        const nextSets = ex.sets.map((s) => (s.id === setId ? { ...s, ...updated } : s));
        const maxSet1RM = nextSets.reduce((best, s) => {
          if (!s.completed || s.type === 'warmup') return best;
          return Math.max(best, calculateEstimated1RM(s.weight, s.reps));
        }, ex.historicalBest1RM);

        return {
          ...ex,
          historicalBest1RM: maxSet1RM,
          sets: nextSets,
        };
      })
    );

    // If completion state changed on a working set, update muscle telemetry
    if (
      targetExercise &&
      prevSet &&
      typeof updated.completed === 'boolean' &&
      updated.completed !== prevSet.completed
    ) {
      const mergedSet: WorkoutSet = { ...prevSet, ...updated };
      if (mergedSet.type !== 'warmup') {
        const isCompleting = updated.completed;
        const newE1RM = calculateEstimated1RM(mergedSet.weight, mergedSet.reps);

        setMuscles((prevMuscles) =>
          prevMuscles.map((m) => {
            const isPrimary = m.id === targetExercise.primaryMuscle;
            const isSecondary = targetExercise.secondaryMuscles.includes(m.id);
            if (!isPrimary && !isSecondary) return m;

            if (isCompleting) {
              return {
                ...m,
                recoveryPercent: applySetFatigueToMuscle(
                  m.recoveryPercent,
                  isPrimary,
                  mergedSet.rir,
                  mergedSet.type
                ),
                weeklySetsCompleted: isPrimary
                  ? m.weeklySetsCompleted + 1
                  : m.weeklySetsCompleted,
                hoursSinceLastTrained: 0,
                bestE1RM: isPrimary ? Math.max(m.bestE1RM, newE1RM) : m.bestE1RM,
              };
            } else {
              return {
                ...m,
                recoveryPercent: Math.min(100, m.recoveryPercent + (isPrimary ? 8 : 4)),
                weeklySetsCompleted: isPrimary
                  ? Math.max(0, m.weeklySetsCompleted - 1)
                  : m.weeklySetsCompleted,
              };
            }
          })
        );

        setReadinessInput((prev) => ({
          ...prev,
          recent72hSets: Math.max(0, prev.recent72hSets + (isCompleting ? 1 : -1)),
        }));
      }
    }
  };

  const handleAddSet = (exerciseId: string) => {
    setExercises((prev) =>
      prev.map((ex) => {
        if (ex.id !== exerciseId) return ex;
        const lastSet = ex.sets[ex.sets.length - 1] || {
          weight: 60,
          reps: 10,
          rir: 1,
          previousWeight: 60,
          previousReps: 10,
          previousRir: 1,
        };
        const nextNumber = ex.sets.length + 1;
        return {
          ...ex,
          sets: [
            ...ex.sets,
            {
              id: `${ex.id}-s-${Date.now()}`,
              setNumber: nextNumber,
              type: 'working',
              previousWeight: lastSet.previousWeight,
              previousReps: lastSet.previousReps,
              previousRir: lastSet.previousRir,
              weight: lastSet.weight,
              reps: lastSet.reps,
              rir: lastSet.rir,
              completed: false,
            },
          ],
        };
      })
    );
  };

  const handleAddExerciseFromCatalog = (item: ExerciseLibraryItem) => {
    const newEx: WorkoutExercise = {
      id: `ex-${Date.now()}`,
      name: item.name,
      primaryMuscle: item.primaryMuscle,
      secondaryMuscles: item.secondaryMuscles,
      equipment: item.equipment,
      restSeconds: item.defaultRest,
      historicalBest1RM: calculateEstimated1RM(item.defaultWeight, 8),
      notes: 'Ajouté depuis la bibliothèque biomécanique.',
      sets: [
        {
          id: `s-${Date.now()}-1`,
          setNumber: 1,
          type: 'working',
          previousWeight: item.defaultWeight,
          previousReps: 8,
          previousRir: 2,
          weight: item.defaultWeight,
          reps: 8,
          rir: 1,
          completed: false,
        },
        {
          id: `s-${Date.now()}-2`,
          setNumber: 2,
          type: 'working',
          previousWeight: item.defaultWeight,
          previousReps: 8,
          previousRir: 1,
          weight: item.defaultWeight,
          reps: 8,
          rir: 1,
          completed: false,
        },
      ],
    };
    setExercises((prev) => [...prev, newEx]);
  };

  const handleAddMorphologyEntry = (entry: Omit<MorphologyEntry, 'id'>) => {
    setMorphologyLog((prev) => [
      ...prev,
      {
        ...entry,
        id: `m-${Date.now()}`,
      },
    ]);
  };

  const handleApplyWorkoutAdaptation = (
    loadMultiplier: number,
    rirDelta: number,
    restDelta: number
  ) => {
    setExercises((prev) =>
      prev.map((ex) => ({
        ...ex,
        restSeconds: Math.max(45, ex.restSeconds + restDelta),
        sets: ex.sets.map((s) => {
          if (s.completed) return s;
          const adjustedWeight =
            Math.round((s.weight * loadMultiplier) / 1.25) * 1.25;
          return {
            ...s,
            weight: Math.max(5, adjustedWeight),
            rir: Math.max(0, Math.min(4, s.rir + rirDelta)),
          };
        }),
      }))
    );
  };

  const cnsReadiness = calculateCNSReadiness(readinessInput);

  const navItems: { id: ActiveTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'cockpit', label: 'Cockpit CNS', icon: Activity },
    { id: 'workout', label: 'Séance Live', icon: Dumbbell },
    { id: 'anatomy', label: 'Scanner 3D', icon: Layers },
    { id: 'coach', label: 'Coach IA', icon: Cpu },
  ];

  return (
    <div className="min-h-screen bg-[#090A0F] text-[#F1F5F9] pb-24 md:pb-12">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-8 px-4 sm:px-8 h-14 bg-[#090A0F]/90 backdrop-blur-md border-b border-[#1E2433]">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#cockpit"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('cockpit');
          }}
          className="font-display text-2xl font-bold tracking-wider uppercase text-[#F1F5F9] whitespace-nowrap shrink-0"
        >
          Wisport
        </a>

        {/* Zone 2: 4 clean single-line text navigation links */}
        <nav
          aria-label="Navigation principale"
          className="hidden md:flex items-center gap-8 text-sm font-medium"
        >
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2 ${
                activeTab === item.id
                  ? 'text-[#CCFF00] border-[#CCFF00]'
                  : 'text-[#94A3B8] border-transparent hover:text-[#F1F5F9]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Zone 3: 1 primary action (iOS / TestFlight Install) */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={() => setShowIOSModal(true)}
            className="min-h-[38px] px-4 py-1.5 rounded-lg bg-[#CCFF00] text-[#090A0F] text-xs font-bold hover:bg-[#b8e600] transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
          >
            <Smartphone className="h-3.5 w-3.5" />
            TestFlight iOS
          </button>
        </div>
      </header>

      {/* Offline Banner */}
      {!isOnline && (
        <div className="bg-[#F59E0B]/15 border-b border-[#F59E0B] px-4 py-2 text-xs text-[#F59E0B] flex items-center justify-center gap-2">
          <WifiOff className="h-3.5 w-3.5" />
          <span>Mode Hors-Ligne Actif — Vos séries sont sauvegardées localement sur l&apos;appareil.</span>
        </div>
      )}

      {/* Main Content Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 pt-6">
        {activeTab === 'cockpit' && (
          <CockpitView
            readinessInput={readinessInput}
            onUpdateReadiness={setReadinessInput}
            cycleGoal={cycleGoal}
            onSelectCycleGoal={setCycleGoal}
            muscles={muscles}
            onStartLiveWorkout={() => setActiveTab('workout')}
            onNavigateToAnatomy={() => setActiveTab('anatomy')}
          />
        )}

        {activeTab === 'workout' && (
          <LiveWorkoutView
            exercises={exercises}
            onUpdateSet={handleUpdateSet}
            onAddSet={handleAddSet}
            onAddExerciseFromCatalog={handleAddExerciseFromCatalog}
            onOpenShareCard={() => setShowShareModal(true)}
          />
        )}

        {activeTab === 'anatomy' && (
          <AnatomyScannerView
            muscles={muscles}
            cycleGoal={cycleGoal}
            morphologyLog={morphologyLog}
            onAddMorphologyEntry={handleAddMorphologyEntry}
          />
        )}

        {activeTab === 'coach' && (
          <AdaptiveCoachView
            readinessInput={readinessInput}
            cycleGoal={cycleGoal}
            muscles={muscles}
            exercises={exercises}
            onApplyWorkoutAdaptation={handleApplyWorkoutAdaptation}
          />
        )}
      </main>

      {/* Mobile Fixed Bottom Thumb Bar (<= 15% sticky height cap) */}
      <nav
        aria-label="Navigation mobile"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-16 bg-[#090A0F]/95 backdrop-blur-md border-t border-[#1E2433] grid grid-cols-4 items-center px-2"
      >
        {navItems.map((item) => {
          const IconComponent = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`min-h-[44px] flex flex-col items-center justify-center transition-colors cursor-pointer ${
                isActive ? 'text-[#CCFF00]' : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              <IconComponent className="h-5 w-5" />
              <span className="text-[10px] font-medium tracking-tight mt-1 whitespace-nowrap">
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Modals */}
      <IOSInstallAndTestFlightModal
        isOpen={showIOSModal}
        onClose={() => setShowIOSModal(false)}
      />

      <TelemetryShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        exercises={exercises}
        muscles={muscles}
        cnsScore={cnsReadiness.score}
      />
    </div>
  );
}
