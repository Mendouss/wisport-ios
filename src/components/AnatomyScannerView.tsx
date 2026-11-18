import React, { useState } from 'react';
import { Layers, Scale, Award, Plus, Activity } from 'lucide-react';
import {
  CYCLE_GOALS,
  evaluateStrengthTier,
  calculateSymmetryRadar,
  type CycleGoalId,
  type MuscleGroupId,
  type MuscleTelemetry,
} from '../utils/biomechanics';
import type { MorphologyEntry } from '../data/initialData';

interface AnatomyScannerViewProps {
  muscles: MuscleTelemetry[];
  cycleGoal: CycleGoalId;
  morphologyLog: MorphologyEntry[];
  onAddMorphologyEntry: (entry: Omit<MorphologyEntry, 'id'>) => void;
}

type ScannerLens = 'recovery' | 'volume' | 'strength';

export const AnatomyScannerView: React.FC<AnatomyScannerViewProps> = ({
  muscles,
  cycleGoal,
  morphologyLog,
  onAddMorphologyEntry,
}) => {
  const [bodyView, setBodyView] = useState<'front' | 'back'>('front');
  const [lens, setLens] = useState<ScannerLens>('recovery');
  const [selectedMuscleId, setSelectedMuscleId] = useState<MuscleGroupId>('pectorals');

  // Morphology form state
  const latestMorph = morphologyLog[morphologyLog.length - 1] || {
    bodyweightKg: 82.0,
    bodyFatPercent: 12.3,
    chestCm: 109.5,
    armCm: 41.8,
    waistCm: 79.0,
    thighCm: 61.8,
  };
  const [bwInput, setBwInput] = useState<string>(String(latestMorph.bodyweightKg));
  const [bfInput, setBfInput] = useState<string>(String(latestMorph.bodyFatPercent));
  const [armInput, setArmInput] = useState<string>(String(latestMorph.armCm));
  const [waistInput, setWaistInput] = useState<string>(String(latestMorph.waistCm));
  const [morphError, setMorphError] = useState<string | null>(null);

  const activeGoal = CYCLE_GOALS[cycleGoal];
  const selectedMuscle =
    muscles.find((m) => m.id === selectedMuscleId) || muscles[0];
  const radarAxes = calculateSymmetryRadar(muscles);

  const getMuscleColor = (m: MuscleTelemetry): string => {
    if (lens === 'recovery') {
      if (m.recoveryPercent >= 78) return '#10B981'; // Emerald Fresh
      if (m.recoveryPercent >= 55) return '#F59E0B'; // Amber Moderate
      return '#EF4444'; // Red Fatigued
    }
    if (lens === 'volume') {
      const target = Math.round(m.baseWeeklyTargetSets * activeGoal.weeklyTargetMultiplier);
      const ratio = m.weeklySetsCompleted / Math.max(1, target);
      if (ratio >= 0.85) return '#CCFF00'; // Volt Target Reached
      if (ratio >= 0.5) return '#00E5FF'; // Cyan In Progress
      return '#475569'; // Under-stimulated
    }
    // Strength lens
    const tierInfo = evaluateStrengthTier(
      m.bestE1RM,
      latestMorph.bodyweightKg,
      m.bodyweightRatioStandard
    );
    if (tierInfo.tier === 'Maître' || tierInfo.tier === 'Élite') return '#CCFF00';
    if (tierInfo.tier === 'Avancé') return '#00E5FF';
    if (tierInfo.tier === 'Intermédiaire') return '#10B981';
    return '#64748B';
  };

  const getMuscleFill = (id: MuscleGroupId) => {
    const m = muscles.find((item) => item.id === id);
    if (!m) return '#1E2433';
    return getMuscleColor(m);
  };

  const handleAddMorph = (e: React.FormEvent) => {
    e.preventDefault();
    const bw = parseFloat(bwInput);
    const bf = parseFloat(bfInput);
    const arm = parseFloat(armInput);
    const waist = parseFloat(waistInput);

    if (isNaN(bw) || bw < 35 || bw > 220 || isNaN(bf) || bf < 3 || bf > 50) {
      setMorphError('Veuillez saisir un poids (35–220 kg) et taux de masse grasse (3–50%) valides.');
      return;
    }
    setMorphError(null);
    onAddMorphologyEntry({
      date: 'Aujourd’hui',
      bodyweightKg: bw,
      bodyFatPercent: bf,
      chestCm: latestMorph.chestCm,
      armCm: isNaN(arm) ? latestMorph.armCm : arm,
      waistCm: isNaN(waist) ? latestMorph.waistCm : waist,
      thighCm: latestMorph.thighCm,
    });
  };

  const selectedTier = evaluateStrengthTier(
    selectedMuscle.bestE1RM,
    latestMorph.bodyweightKg,
    selectedMuscle.bodyweightRatioStandard
  );
  const selectedTargetSets = Math.round(
    selectedMuscle.baseWeeklyTargetSets * activeGoal.weeklyTargetMultiplier
  );

  return (
    <div className="space-y-8">
      {/* Top Controls Bar */}
      <div className="rounded-2xl bg-[#12151E] border border-[#1E2433] p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-xs text-[#94A3B8]">
            <span>Scanner Anatomique Vectoriel</span>
            <span className="mx-2" aria-hidden="true">·</span>
            <span>15 Groupes Musculaires Segmentés</span>
          </div>
          <h2 className="font-display text-2xl sm:text-3xl font-bold uppercase tracking-wide text-[#F1F5F9] mt-1">
            Cartographie Musculaire & Symétrie
          </h2>
        </div>

        {/* Lens Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-[#090A0F] border border-[#1E2433]">
            <button
              type="button"
              onClick={() => setLens('recovery')}
              className={`min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                lens === 'recovery'
                  ? 'bg-[#CCFF00] text-[#090A0F]'
                  : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              Récupération (Heatmap)
            </button>
            <button
              type="button"
              onClick={() => setLens('volume')}
              className={`min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                lens === 'volume'
                  ? 'bg-[#00E5FF] text-[#090A0F]'
                  : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              Volume Hebdo (MAV)
            </button>
            <button
              type="button"
              onClick={() => setLens('strength')}
              className={`min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                lens === 'strength'
                  ? 'bg-[#10B981] text-[#090A0F]'
                  : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              Rang de Force
            </button>
          </div>

          <div className="flex items-center gap-1 p-1 rounded-xl bg-[#090A0F] border border-[#1E2433]">
            <button
              type="button"
              onClick={() => setBodyView('front')}
              className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                bodyView === 'front'
                  ? 'bg-[#1E2433] text-white'
                  : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              Vue Antérieure
            </button>
            <button
              type="button"
              onClick={() => setBodyView('back')}
              className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                bodyView === 'back'
                  ? 'bg-[#1E2433] text-white'
                  : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              Vue Postérieure
            </button>
          </div>
        </div>
      </div>

      {/* Main 12-Col Grid: Interactive SVG Body Map (5 cols) + Muscle Inspector & Radar (7 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Interactive Anatomical SVG Canvas */}
        <div className="lg:col-span-5 rounded-2xl bg-[#12151E] border border-[#1E2433] p-6 flex flex-col justify-between items-center">
          <div className="w-full flex items-center justify-between text-xs text-[#94A3B8]">
            <span>Plan : {bodyView === 'front' ? 'Coronal Antérieur' : 'Coronal Postérieur'}</span>
            <span className="font-mono-tabular text-[#00E5FF]">Cliquez sur un muscle</span>
          </div>

          {/* Vector Anatomical Silhouette */}
          <div className="my-4 w-full max-w-[270px] flex items-center justify-center">
            {bodyView === 'front' ? (
              <svg
                viewBox="0 0 240 460"
                className="w-full h-auto select-none"
                role="img"
                aria-label="Carte anatomique antérieure interactive"
              >
                {/* Head & Neck Outline */}
                <circle cx="120" cy="34" r="20" fill="#1E2433" stroke="#334155" strokeWidth="1.5" />
                <rect x="110" y="54" width="20" height="14" rx="4" fill="#1E2433" />

                {/* Front Delts */}
                <g
                  onClick={() => setSelectedMuscleId('front_delts')}
                  className="cursor-pointer hover:opacity-90 transition-opacity"
                >
                  <title>Deltoïdes Antérieurs</title>
                  <path
                    d="M72 72 Q60 82 62 104 L82 102 L86 74 Z"
                    fill={getMuscleFill('front_delts')}
                    stroke={selectedMuscleId === 'front_delts' ? '#FFFFFF' : '#090A0F'}
                    strokeWidth="2"
                  />
                  <path
                    d="M168 72 Q180 82 178 104 L158 102 L154 74 Z"
                    fill={getMuscleFill('front_delts')}
                    stroke={selectedMuscleId === 'front_delts' ? '#FFFFFF' : '#090A0F'}
                    strokeWidth="2"
                  />
                </g>

                {/* Side Delts */}
                <g
                  onClick={() => setSelectedMuscleId('side_delts')}
                  className="cursor-pointer hover:opacity-90 transition-opacity"
                >
                  <title>Deltoïdes Latéraux</title>
                  <path
                    d="M60 76 Q48 92 54 114 L64 110 L64 82 Z"
                    fill={getMuscleFill('side_delts')}
                    stroke={selectedMuscleId === 'side_delts' ? '#FFFFFF' : '#090A0F'}
                    strokeWidth="2"
                  />
                  <path
                    d="M180 76 Q192 92 186 114 L176 110 L176 82 Z"
                    fill={getMuscleFill('side_delts')}
                    stroke={selectedMuscleId === 'side_delts' ? '#FFFFFF' : '#090A0F'}
                    strokeWidth="2"
                  />
                </g>

                {/* Pectorals */}
                <g
                  onClick={() => setSelectedMuscleId('pectorals')}
                  className="cursor-pointer hover:opacity-90 transition-opacity"
                >
                  <title>Pectoraux</title>
                  <path
                    d="M86 72 L118 72 L118 118 L82 114 L82 88 Z"
                    fill={getMuscleFill('pectorals')}
                    stroke={selectedMuscleId === 'pectorals' ? '#FFFFFF' : '#090A0F'}
                    strokeWidth="2"
                  />
                  <path
                    d="M154 72 L122 72 L122 118 L158 114 L158 88 Z"
                    fill={getMuscleFill('pectorals')}
                    stroke={selectedMuscleId === 'pectorals' ? '#FFFFFF' : '#090A0F'}
                    strokeWidth="2"
                  />
                </g>

                {/* Biceps */}
                <g
                  onClick={() => setSelectedMuscleId('biceps')}
                  className="cursor-pointer hover:opacity-90 transition-opacity"
                >
                  <title>Biceps Brachial</title>
                  <rect
                    x="56"
                    y="112"
                    width="20"
                    height="46"
                    rx="9"
                    fill={getMuscleFill('biceps')}
                    stroke={selectedMuscleId === 'biceps' ? '#FFFFFF' : '#090A0F'}
                    strokeWidth="2"
                  />
                  <rect
                    x="164"
                    y="112"
                    width="20"
                    height="46"
                    rx="9"
                    fill={getMuscleFill('biceps')}
                    stroke={selectedMuscleId === 'biceps' ? '#FFFFFF' : '#090A0F'}
                    strokeWidth="2"
                  />
                </g>

                {/* Forearms */}
                <g
                  onClick={() => setSelectedMuscleId('forearms')}
                  className="cursor-pointer hover:opacity-90 transition-opacity"
                >
                  <title>Avant-Bras</title>
                  <rect
                    x="50"
                    y="162"
                    width="18"
                    height="52"
                    rx="7"
                    fill={getMuscleFill('forearms')}
                    stroke={selectedMuscleId === 'forearms' ? '#FFFFFF' : '#090A0F'}
                    strokeWidth="2"
                  />
                  <rect
                    x="172"
                    y="162"
                    width="18"
                    height="52"
                    rx="7"
                    fill={getMuscleFill('forearms')}
                    stroke={selectedMuscleId === 'forearms' ? '#FFFFFF' : '#090A0F'}
                    strokeWidth="2"
                  />
                </g>

                {/* Abs / Core */}
                <g
                  onClick={() => setSelectedMuscleId('abs')}
                  className="cursor-pointer hover:opacity-90 transition-opacity"
                >
                  <title>Sangle Abdominale</title>
                  <rect
                    x="92"
                    y="122"
                    width="56"
                    height="86"
                    rx="10"
                    fill={getMuscleFill('abs')}
                    stroke={selectedMuscleId === 'abs' ? '#FFFFFF' : '#090A0F'}
                    strokeWidth="2"
                  />
                  <line x1="120" y1="124" x2="120" y2="206" stroke="#090A0F" strokeWidth="2" />
                  <line x1="94" y1="148" x2="146" y2="148" stroke="#090A0F" strokeWidth="2" />
                  <line x1="94" y1="175" x2="146" y2="175" stroke="#090A0F" strokeWidth="2" />
                </g>

                {/* Quads */}
                <g
                  onClick={() => setSelectedMuscleId('quads')}
                  className="cursor-pointer hover:opacity-90 transition-opacity"
                >
                  <title>Quadriceps Fémoral</title>
                  <path
                    d="M84 214 L116 214 L112 318 L86 318 Z"
                    fill={getMuscleFill('quads')}
                    stroke={selectedMuscleId === 'quads' ? '#FFFFFF' : '#090A0F'}
                    strokeWidth="2"
                  />
                  <path
                    d="M124 214 L156 214 L154 318 L128 318 Z"
                    fill={getMuscleFill('quads')}
                    stroke={selectedMuscleId === 'quads' ? '#FFFFFF' : '#090A0F'}
                    strokeWidth="2"
                  />
                </g>

                {/* Calves */}
                <g
                  onClick={() => setSelectedMuscleId('calves')}
                  className="cursor-pointer hover:opacity-90 transition-opacity"
                >
                  <title>Mollets</title>
                  <rect
                    x="86"
                    y="328"
                    width="24"
                    height="84"
                    rx="10"
                    fill={getMuscleFill('calves')}
                    stroke={selectedMuscleId === 'calves' ? '#FFFFFF' : '#090A0F'}
                    strokeWidth="2"
                  />
                  <rect
                    x="130"
                    y="328"
                    width="24"
                    height="84"
                    rx="10"
                    fill={getMuscleFill('calves')}
                    stroke={selectedMuscleId === 'calves' ? '#FFFFFF' : '#090A0F'}
                    strokeWidth="2"
                  />
                </g>
              </svg>
            ) : (
              <svg
                viewBox="0 0 240 460"
                className="w-full h-auto select-none"
                role="img"
                aria-label="Carte anatomique postérieure interactive"
              >
                <circle cx="120" cy="34" r="20" fill="#1E2433" stroke="#334155" strokeWidth="1.5" />

                {/* Traps */}
                <g
                  onClick={() => setSelectedMuscleId('traps')}
                  className="cursor-pointer hover:opacity-90 transition-opacity"
                >
                  <title>Trapèzes</title>
                  <polygon
                    points="120,54 84,72 104,126 136,126 156,72"
                    fill={getMuscleFill('traps')}
                    stroke={selectedMuscleId === 'traps' ? '#FFFFFF' : '#090A0F'}
                    strokeWidth="2"
                  />
                </g>

                {/* Rear Delts */}
                <g
                  onClick={() => setSelectedMuscleId('rear_delts')}
                  className="cursor-pointer hover:opacity-90 transition-opacity"
                >
                  <title>Deltoïdes Postérieurs</title>
                  <rect
                    x="60"
                    y="74"
                    width="22"
                    height="30"
                    rx="8"
                    fill={getMuscleFill('rear_delts')}
                    stroke={selectedMuscleId === 'rear_delts' ? '#FFFFFF' : '#090A0F'}
                    strokeWidth="2"
                  />
                  <rect
                    x="158"
                    y="74"
                    width="22"
                    height="30"
                    rx="8"
                    fill={getMuscleFill('rear_delts')}
                    stroke={selectedMuscleId === 'rear_delts' ? '#FFFFFF' : '#090A0F'}
                    strokeWidth="2"
                  />
                </g>

                {/* Lats */}
                <g
                  onClick={() => setSelectedMuscleId('lats')}
                  className="cursor-pointer hover:opacity-90 transition-opacity"
                >
                  <title>Grands Dorsaux</title>
                  <path
                    d="M82 106 L104 126 L104 176 L88 164 Z"
                    fill={getMuscleFill('lats')}
                    stroke={selectedMuscleId === 'lats' ? '#FFFFFF' : '#090A0F'}
                    strokeWidth="2"
                  />
                  <path
                    d="M158 106 L136 126 L136 176 L152 164 Z"
                    fill={getMuscleFill('lats')}
                    stroke={selectedMuscleId === 'lats' ? '#FFFFFF' : '#090A0F'}
                    strokeWidth="2"
                  />
                </g>

                {/* Triceps */}
                <g
                  onClick={() => setSelectedMuscleId('triceps')}
                  className="cursor-pointer hover:opacity-90 transition-opacity"
                >
                  <title>Triceps Brachial</title>
                  <rect
                    x="56"
                    y="110"
                    width="20"
                    height="48"
                    rx="9"
                    fill={getMuscleFill('triceps')}
                    stroke={selectedMuscleId === 'triceps' ? '#FFFFFF' : '#090A0F'}
                    strokeWidth="2"
                  />
                  <rect
                    x="164"
                    y="110"
                    width="20"
                    height="48"
                    rx="9"
                    fill={getMuscleFill('triceps')}
                    stroke={selectedMuscleId === 'triceps' ? '#FFFFFF' : '#090A0F'}
                    strokeWidth="2"
                  />
                </g>

                {/* Lower Back */}
                <g
                  onClick={() => setSelectedMuscleId('lower_back')}
                  className="cursor-pointer hover:opacity-90 transition-opacity"
                >
                  <title>Lombaires</title>
                  <rect
                    x="96"
                    y="168"
                    width="48"
                    height="40"
                    rx="6"
                    fill={getMuscleFill('lower_back')}
                    stroke={selectedMuscleId === 'lower_back' ? '#FFFFFF' : '#090A0F'}
                    strokeWidth="2"
                  />
                </g>

                {/* Glutes */}
                <g
                  onClick={() => setSelectedMuscleId('glutes')}
                  className="cursor-pointer hover:opacity-90 transition-opacity"
                >
                  <title>Grands Fessiers</title>
                  <rect
                    x="84"
                    y="210"
                    width="34"
                    height="38"
                    rx="12"
                    fill={getMuscleFill('glutes')}
                    stroke={selectedMuscleId === 'glutes' ? '#FFFFFF' : '#090A0F'}
                    strokeWidth="2"
                  />
                  <rect
                    x="122"
                    y="210"
                    width="34"
                    height="38"
                    rx="12"
                    fill={getMuscleFill('glutes')}
                    stroke={selectedMuscleId === 'glutes' ? '#FFFFFF' : '#090A0F'}
                    strokeWidth="2"
                  />
                </g>

                {/* Hamstrings */}
                <g
                  onClick={() => setSelectedMuscleId('hamstrings')}
                  className="cursor-pointer hover:opacity-90 transition-opacity"
                >
                  <title>Ischio-Jambiers</title>
                  <rect
                    x="86"
                    y="252"
                    width="28"
                    height="68"
                    rx="10"
                    fill={getMuscleFill('hamstrings')}
                    stroke={selectedMuscleId === 'hamstrings' ? '#FFFFFF' : '#090A0F'}
                    strokeWidth="2"
                  />
                  <rect
                    x="126"
                    y="252"
                    width="28"
                    height="68"
                    rx="10"
                    fill={getMuscleFill('hamstrings')}
                    stroke={selectedMuscleId === 'hamstrings' ? '#FFFFFF' : '#090A0F'}
                    strokeWidth="2"
                  />
                </g>

                {/* Calves Back */}
                <g
                  onClick={() => setSelectedMuscleId('calves')}
                  className="cursor-pointer hover:opacity-90 transition-opacity"
                >
                  <title>Mollets</title>
                  <rect
                    x="86"
                    y="328"
                    width="24"
                    height="84"
                    rx="10"
                    fill={getMuscleFill('calves')}
                    stroke={selectedMuscleId === 'calves' ? '#FFFFFF' : '#090A0F'}
                    strokeWidth="2"
                  />
                  <rect
                    x="130"
                    y="328"
                    width="24"
                    height="84"
                    rx="10"
                    fill={getMuscleFill('calves')}
                    stroke={selectedMuscleId === 'calves' ? '#FFFFFF' : '#090A0F'}
                    strokeWidth="2"
                  />
                </g>
              </svg>
            )}
          </div>

          {/* Quick Muscle Selector Chips */}
          <div className="w-full pt-3 border-t border-[#1E2433]">
            <div className="flex flex-wrap gap-1.5 justify-center">
              {muscles
                .filter((m) => m.view === bodyView || m.view === 'both')
                .map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSelectedMuscleId(m.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                      selectedMuscleId === m.id
                        ? 'bg-[#CCFF00] text-[#090A0F] font-semibold'
                        : 'bg-[#090A0F] text-[#94A3B8] hover:text-white border border-[#1E2433]'
                    }`}
                  >
                    {m.name}
                  </button>
                ))}
            </div>
          </div>
        </div>

        {/* Right 7 Columns: Selected Muscle Diagnostics + Symmetry Radar */}
        <div className="lg:col-span-7 space-y-6 flex flex-col justify-between">
          {/* Selected Muscle Telemetry Card */}
          <div className="rounded-2xl bg-[#12151E] border border-[#1E2433] p-6 space-y-5">
            <div className="flex items-start justify-between gap-4 border-b border-[#1E2433] pb-4">
              <div>
                <div className="text-xs text-[#94A3B8]">
                  <span>Unité Anatomique Sélectionnée</span>
                  <span className="mx-2" aria-hidden="true">·</span>
                  <span>Dernière séance il y a {selectedMuscle.hoursSinceLastTrained}h</span>
                </div>
                <h3 className="font-display text-3xl font-bold uppercase tracking-wide text-[#F1F5F9] mt-1">
                  {selectedMuscle.name}
                </h3>
              </div>
              <div className="text-right">
                <div className="text-xs text-[#94A3B8]">Rang Biomécanique</div>
                <div className="font-mono-tabular text-lg font-bold text-[#CCFF00]">
                  {selectedTier.tier} ({selectedTier.ratio}× PDC)
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-xl bg-[#090A0F] border border-[#1E2433] p-4">
                <div className="text-xs text-[#94A3B8]">Fraîcheur Tissulaire</div>
                <div
                  className="font-mono-tabular text-2xl font-bold mt-1"
                  style={{ color: getMuscleColor(selectedMuscle) }}
                >
                  {selectedMuscle.recoveryPercent}%
                </div>
                <div className="text-[11px] text-[#94A3B8] mt-1">
                  {selectedMuscle.recoveryPercent >= 75
                    ? 'Prêt pour surcharge'
                    : 'Récupération active'}
                </div>
              </div>

              <div className="rounded-xl bg-[#090A0F] border border-[#1E2433] p-4">
                <div className="text-xs text-[#94A3B8]">Quota Hebdomadaire (MAV)</div>
                <div className="font-mono-tabular text-2xl font-bold text-[#00E5FF] mt-1">
                  {selectedMuscle.weeklySetsCompleted}{' '}
                  <span className="text-sm text-[#94A3B8]">/ {selectedTargetSets}</span>
                </div>
                <div className="text-[11px] text-[#94A3B8] mt-1">Séries effectives</div>
              </div>

              <div className="rounded-xl bg-[#090A0F] border border-[#1E2433] p-4">
                <div className="text-xs text-[#94A3B8]">1RM Estimé Référence</div>
                <div className="font-mono-tabular text-2xl font-bold text-[#F1F5F9] mt-1">
                  {selectedMuscle.bestE1RM}{' '}
                  <span className="text-xs text-[#94A3B8] font-normal">kg</span>
                </div>
                <div className="text-[11px] text-[#94A3B8] mt-1 truncate">
                  {selectedMuscle.primaryExercise}
                </div>
              </div>
            </div>
          </div>

          {/* Agonist / Antagonist Symmetry Matrix */}
          <div className="rounded-2xl bg-[#12151E] border border-[#1E2433] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-xl font-bold uppercase tracking-wide text-[#F1F5F9] flex items-center gap-2">
                <Award className="h-4 w-4 text-[#00E5FF]" />
                Radar d&apos;Équilibre Agoniste / Antagoniste
              </h3>
              <span className="text-xs font-mono-tabular text-[#94A3B8]">Prévention Posturale</span>
            </div>

            <div className="space-y-3">
              {radarAxes.map((item) => (
                <div key={item.axis} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-[#F1F5F9]">{item.axis}</span>
                      <span className="mx-2 text-[#94A3B8]" aria-hidden="true">·</span>
                      <span className="text-[#94A3B8]">{item.status}</span>
                    </div>
                    <div className="font-mono-tabular text-[#00E5FF]">
                      {item.ratioLabel} ({item.score}%)
                    </div>
                  </div>
                  <div className="h-2 w-full rounded-full bg-[#090A0F] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#00E5FF]"
                      style={{ width: `${item.score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Morphological Log Section */}
      <div className="rounded-2xl bg-[#12151E] border border-[#1E2433] p-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-4">
            <h3 className="font-display text-xl font-bold uppercase tracking-wide text-[#F1F5F9] flex items-center gap-2">
              <Scale className="h-4 w-4 text-[#CCFF00]" />
              Journal Morphologique & Anthropométrie
            </h3>
            <p className="text-xs text-[#94A3B8]">
              Enregistrez vos mensurations clés pour recalibrer vos ratios de force relative (PDC).
            </p>

            <form onSubmit={handleAddMorph} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="bw-input" className="block text-xs text-[#94A3B8] mb-1">
                    Poids Corporel (kg)
                  </label>
                  <input
                    id="bw-input"
                    type="number"
                    step="0.1"
                    value={bwInput}
                    onChange={(e) => setBwInput(e.target.value)}
                    className="w-full h-10 rounded-xl bg-[#090A0F] border border-[#1E2433] px-3 font-mono-tabular text-sm text-[#F1F5F9]"
                  />
                </div>
                <div>
                  <label htmlFor="bf-input" className="block text-xs text-[#94A3B8] mb-1">
                    Masse Grasse (%)
                  </label>
                  <input
                    id="bf-input"
                    type="number"
                    step="0.1"
                    value={bfInput}
                    onChange={(e) => setBfInput(e.target.value)}
                    className="w-full h-10 rounded-xl bg-[#090A0F] border border-[#1E2433] px-3 font-mono-tabular text-sm text-[#F1F5F9]"
                  />
                </div>
                <div>
                  <label htmlFor="arm-input" className="block text-xs text-[#94A3B8] mb-1">
                    Tour de Bras (cm)
                  </label>
                  <input
                    id="arm-input"
                    type="number"
                    step="0.1"
                    value={armInput}
                    onChange={(e) => setArmInput(e.target.value)}
                    className="w-full h-10 rounded-xl bg-[#090A0F] border border-[#1E2433] px-3 font-mono-tabular text-sm text-[#F1F5F9]"
                  />
                </div>
                <div>
                  <label htmlFor="waist-input" className="block text-xs text-[#94A3B8] mb-1">
                    Tour de Taille (cm)
                  </label>
                  <input
                    id="waist-input"
                    type="number"
                    step="0.1"
                    value={waistInput}
                    onChange={(e) => setWaistInput(e.target.value)}
                    className="w-full h-10 rounded-xl bg-[#090A0F] border border-[#1E2433] px-3 font-mono-tabular text-sm text-[#F1F5F9]"
                  />
                </div>
              </div>

              {morphError && (
                <div className="text-xs text-[#EF4444] font-medium">{morphError}</div>
              )}

              <button
                type="submit"
                className="w-full min-h-[44px] py-2.5 rounded-xl bg-[#CCFF00] text-[#090A0F] font-semibold text-xs flex items-center justify-center gap-1.5 hover:bg-[#b8e600] transition-colors cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                Enregistrer le Relevé Morphologique
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#1E2433] text-xs text-[#94A3B8] font-mono-tabular">
                  <th className="py-2.5">Date</th>
                  <th className="py-2.5">Poids</th>
                  <th className="py-2.5">Masse Grasse</th>
                  <th className="py-2.5">Poitrine</th>
                  <th className="py-2.5">Bras</th>
                  <th className="py-2.5">Taille</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E2433]/60 text-sm font-mono-tabular">
                {morphologyLog.map((entry) => (
                  <tr key={entry.id}>
                    <td className="py-3 text-[#94A3B8] font-sans text-xs">{entry.date}</td>
                    <td className="py-3 font-bold text-[#F1F5F9]">{entry.bodyweightKg} kg</td>
                    <td className="py-3 text-[#00E5FF]">{entry.bodyFatPercent}%</td>
                    <td className="py-3 text-[#F1F5F9]">{entry.chestCm} cm</td>
                    <td className="py-3 text-[#CCFF00] font-semibold">{entry.armCm} cm</td>
                    <td className="py-3 text-[#F1F5F9]">{entry.waistCm} cm</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
