import React, { useState } from 'react';
import { X, Trophy, Check, Share2 } from 'lucide-react';
import type { MuscleTelemetry, WorkoutExercise } from '../utils/biomechanics';

interface TelemetryShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  exercises: WorkoutExercise[];
  muscles: MuscleTelemetry[];
  cnsScore: number;
}

export const TelemetryShareModal: React.FC<TelemetryShareModalProps> = ({
  isOpen,
  onClose,
  exercises,
  cnsScore,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const totalVolume = exercises.reduce(
    (sum, ex) =>
      sum +
      ex.sets
        .filter((s) => s.completed && s.type !== 'warmup')
        .reduce((acc, s) => acc + s.weight * s.reps, 0),
    0
  );

  const completedSets = exercises.reduce(
    (sum, ex) => sum + ex.sets.filter((s) => s.completed && s.type !== 'warmup').length,
    0
  );

  const handleCopySummary = () => {
    const text = `WISPORT // BIO-ADAPTIVE LAB\nSéance Upper Body Validée\nTonnage : ${Math.round(
      totalVolume
    )} kg · ${completedSets} séries effectives · CNS ${cnsScore}%`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-telemetry-title"
    >
      <div className="w-full max-w-sm rounded-3xl bg-[#090A0F] border border-[#1E2433] p-6 text-[#F1F5F9] shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <span
            id="share-telemetry-title"
            className="text-xs font-mono-tabular text-[#94A3B8]"
          >
            Format Story 9:16 · Télémétrie Wisport
          </span>
          <button
            onClick={onClose}
            aria-label="Fermer l'aperçu de partage"
            className="h-8 w-8 rounded-lg bg-[#12151E] flex items-center justify-center text-[#94A3B8] hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 9:16 Card Canvas */}
        <div className="rounded-2xl bg-[#12151E] border border-[#1E2433] p-5 space-y-5">
          <div className="flex items-center justify-between border-b border-[#1E2433] pb-3">
            <div>
              <div className="font-display text-2xl font-bold tracking-wider uppercase text-[#F1F5F9]">
                Wisport
              </div>
              <div className="text-[11px] text-[#94A3B8]">
                Bio-Adaptive Strength Telemetry
              </div>
            </div>
            <div className="text-right font-mono-tabular">
              <div className="text-[11px] text-[#94A3B8]">Indice CNS</div>
              <div className="text-sm font-bold text-[#CCFF00]">{cnsScore}%</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-[#090A0F] border border-[#1E2433] p-3">
              <div className="text-[11px] text-[#94A3B8]">Tonnage Total</div>
              <div className="font-mono-tabular text-2xl font-bold text-[#F1F5F9] mt-0.5">
                {Math.round(totalVolume).toLocaleString('fr-FR')}{' '}
                <span className="text-xs font-normal text-[#94A3B8]">kg</span>
              </div>
            </div>
            <div className="rounded-xl bg-[#090A0F] border border-[#1E2433] p-3">
              <div className="text-[11px] text-[#94A3B8]">Séries Effectives</div>
              <div className="font-mono-tabular text-2xl font-bold text-[#00E5FF] mt-0.5">
                {completedSets}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-semibold text-[#94A3B8]">
              Mouvements Principaux & Records
            </div>
            {exercises.slice(0, 3).map((ex) => {
              const bestSet = ex.sets.reduce(
                (best, s) => (s.weight > best.weight ? s : best),
                ex.sets[0]
              );
              return (
                <div
                  key={ex.id}
                  className="flex items-center justify-between text-xs py-2 border-b border-[#1E2433]/60"
                >
                  <span className="font-medium text-[#F1F5F9] truncate max-w-[180px]">
                    {ex.name}
                  </span>
                  <span className="font-mono-tabular text-[#CCFF00] font-semibold">
                    {bestSet ? `${bestSet.weight} kg × ${bestSet.reps}` : '-'}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono-tabular text-[#94A3B8] pt-1">
            <span className="flex items-center gap-1 text-[#CCFF00]">
              <Trophy className="h-3.5 w-3.5" /> Surcharge Validée
            </span>
            <span>WISPORT LAB</span>
          </div>
        </div>

        <button
          onClick={handleCopySummary}
          className="mt-4 w-full min-h-[44px] py-2.5 rounded-xl bg-[#CCFF00] text-[#090A0F] font-semibold text-xs flex items-center justify-center gap-2 hover:bg-[#b8e600] transition-colors cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4" /> Résumé Télémétrique Copié
            </>
          ) : (
            <>
              <Share2 className="h-4 w-4" /> Copier la Carte de Télémétrie
            </>
          )}
        </button>
      </div>
    </div>
  );
};
