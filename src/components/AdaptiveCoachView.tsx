import React, { useState } from 'react';
import { Cpu, Send, Sparkles, Sliders, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import {
  calculateCNSReadiness,
  type CycleGoalId,
  type MuscleTelemetry,
  type ReadinessInput,
  type WorkoutExercise,
} from '../utils/biomechanics';

interface AdaptiveCoachViewProps {
  readinessInput: ReadinessInput;
  cycleGoal: CycleGoalId;
  muscles: MuscleTelemetry[];
  exercises: WorkoutExercise[];
  onApplyWorkoutAdaptation: (loadMultiplier: number, rirDelta: number, restDelta: number) => void;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface AdaptationPlan {
  title: string;
  summary: string;
  loadMultiplier: number;
  targetRirDelta: number;
  restSecondsDelta: number;
  adjustmentsList: string[];
}

export const AdaptiveCoachView: React.FC<AdaptiveCoachViewProps> = ({
  readinessInput,
  cycleGoal,
  muscles,
  exercises,
  onApplyWorkoutAdaptation,
}) => {
  const readiness = calculateCNSReadiness(readinessInput);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      role: 'assistant',
      content: `Télémétrie synchronisée. Votre indice CNS actuel est de ${readiness.score}% (${readiness.statusLabel}). Vos quadriceps (48%) et ischio-jambiers (46%) sont en récupération tissulaire, tandis que votre chaîne de poussée supérieure (Pectoraux 92%, Triceps 91%) est prête pour une surcharge progressive. Quelle analyse biomécanique souhaitez-vous effectuer ?`,
    },
  ]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  const [adaptPlan, setAdaptPlan] = useState<AdaptationPlan | null>(null);
  const [isAdapting, setIsAdapting] = useState(false);
  const [appliedBanner, setAppliedBanner] = useState<string | null>(null);

  const buildTelemetryPayload = () => ({
    cnsReadinessScore: readiness.score,
    cnsStatus: readiness.statusLabel,
    activeCycleGoal: cycleGoal,
    sleepHours: readinessInput.sleepHours,
    neuralFatigue: readinessInput.neuralFatigue,
    musclesSummary: muscles.map((m) => ({
      name: m.name,
      recoveryPercent: m.recoveryPercent,
      weeklySets: m.weeklySetsCompleted,
      bestE1RM: m.bestE1RM,
    })),
    currentWorkout: exercises.map((ex) => ({
      name: ex.name,
      restSeconds: ex.restSeconds,
      sets: ex.sets.map((s) => ({
        weight: s.weight,
        reps: s.reps,
        rir: s.rir,
        completed: s.completed,
      })),
    })),
  });

  const handleSendQuestion = async (promptText?: string) => {
    const textToSend = (promptText ?? inputPrompt).trim();
    if (!textToSend || isLoadingChat) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: textToSend,
    };
    setMessages((prev) => [...prev, userMsg]);
    if (!promptText) setInputPrompt('');
    setIsLoadingChat(true);
    setChatError(null);

    try {
      const response = await fetch('/api/coach/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: textToSend,
          telemetryContext: buildTelemetryPayload(),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la communication avec le serveur IA.');
      }
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          content: data.reply,
        },
      ]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur réseau.';
      setChatError(msg);
    } finally {
      setIsLoadingChat(false);
    }
  };

  const handleGenerateAdaptation = async (reason: string) => {
    setIsAdapting(true);
    setChatError(null);
    setAppliedBanner(null);
    try {
      const response = await fetch('/api/coach/adapt-program', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason,
          telemetryContext: buildTelemetryPayload(),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Impossible de générer le protocole.');
      }
      setAdaptPlan(data.plan);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur serveur.';
      setChatError(msg);
    } finally {
      setIsAdapting(false);
    }
  };

  const handleConfirmApplyPlan = () => {
    if (!adaptPlan) return;
    onApplyWorkoutAdaptation(
      adaptPlan.loadMultiplier || 1,
      adaptPlan.targetRirDelta || 0,
      adaptPlan.restSecondsDelta || 0
    );
    setAppliedBanner(
      `Protocole "${adaptPlan.title}" appliqué aux séries restantes de votre séance Live.`
    );
    setAdaptPlan(null);
  };

  const quickPrompts = [
    'Pourquoi mon Développé Couché stagne autour de 97.5 kg ?',
    'Analyse mon ratio Poussée / Tirage de la semaine',
    'Optimise mes temps de repos pour maximiser l’hypertrophie',
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-[#12151E] border border-[#1E2433] p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-xs text-[#94A3B8]">
            <span>Intelligence Biomécanique Contextuelle</span>
            <span className="mx-2" aria-hidden="true">·</span>
            <span>Connectée à vos Charges, RIR & Récupération</span>
          </div>
          <h2 className="font-display text-2xl sm:text-3xl font-bold uppercase tracking-wide text-[#F1F5F9] mt-1">
            Ingénieur Wisport IA & Régulation de Séance
          </h2>
        </div>
        <div className="text-xs font-mono-tabular text-[#00E5FF]">
          Modèle : Gemini 4 Hydrogen · Télémétrie Active
        </div>
      </div>

      {appliedBanner && (
        <div className="rounded-xl bg-[#10B981]/15 border border-[#10B981] p-4 flex items-center gap-3 text-xs text-[#10B981] font-semibold">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{appliedBanner}</span>
        </div>
      )}

      {chatError && (
        <div className="rounded-xl bg-[#EF4444]/15 border border-[#EF4444] p-4 flex items-center gap-3 text-xs text-[#EF4444]">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{chatError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left 7 Cols: Interactive Biomechanical Assistant */}
        <div className="lg:col-span-7 rounded-2xl bg-[#12151E] border border-[#1E2433] p-6 flex flex-col justify-between min-h-[480px]">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#1E2433] pb-3">
              <div className="flex items-center gap-2">
                <Cpu className="h-4 w-4 text-[#CCFF00]" />
                <h3 className="font-display text-xl font-bold uppercase tracking-wide text-[#F1F5F9]">
                  Diagnostic & Questions Techniques
                </h3>
              </div>
              <span className="text-xs text-[#94A3B8]">100% dédié performance & biomécanique</span>
            </div>

            {/* Quick Prompt Buttons */}
            <div className="flex flex-wrap gap-2">
              {quickPrompts.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => handleSendQuestion(q)}
                  disabled={isLoadingChat}
                  className="px-3 py-1.5 rounded-lg bg-[#090A0F] border border-[#1E2433] hover:border-[#00E5FF] text-xs text-[#94A3B8] hover:text-[#F1F5F9] transition-colors cursor-pointer"
                >
                  {q}
                </button>
              ))}
            </div>

            {/* Messages Feed */}
            <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`p-4 rounded-xl text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-[#1E2433] text-[#F1F5F9] ml-8'
                      : 'bg-[#090A0F] border border-[#1E2433] text-[#E2E8F0] mr-4'
                  }`}
                >
                  <div className="text-[11px] font-mono-tabular text-[#94A3B8] mb-1">
                    {m.role === 'user' ? 'Athlète' : 'Wisport AI · Ingénieur Biomécanique'}
                  </div>
                  <div className="whitespace-pre-line">{m.content}</div>
                </div>
              ))}
              {isLoadingChat && (
                <div className="p-4 rounded-xl bg-[#090A0F] border border-[#1E2433] text-xs text-[#00E5FF] flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyse des courbes de charge et de récupération en cours...
                </div>
              )}
            </div>
          </div>

          {/* Chat Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendQuestion();
            }}
            className="mt-4 pt-4 border-t border-[#1E2433] flex items-center gap-2"
          >
            <input
              type="text"
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              placeholder="Posez une question sur vos charges, RIR, stagnation ou exécution..."
              aria-label="Poser une question au coach biomécanique"
              className="flex-1 h-11 rounded-xl bg-[#090A0F] border border-[#1E2433] px-4 text-sm text-[#F1F5F9] placeholder-[#64748B] focus:outline-none focus:border-[#CCFF00]"
            />
            <button
              type="submit"
              disabled={isLoadingChat || !inputPrompt.trim()}
              className="min-h-[44px] px-4 rounded-xl bg-[#CCFF00] text-[#090A0F] font-semibold text-xs flex items-center gap-1.5 hover:bg-[#b8e600] disabled:opacity-50 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Send className="h-4 w-4" />
              Analyser
            </button>
          </form>
        </div>

        {/* Right 5 Cols: Automatic Session Recalibration */}
        <div className="lg:col-span-5 rounded-2xl bg-[#12151E] border border-[#1E2433] p-6 flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-[#1E2433] pb-3">
              <Sliders className="h-4 w-4 text-[#00E5FF]" />
              <h3 className="font-display text-xl font-bold uppercase tracking-wide text-[#F1F5F9]">
                Recalibration Dynamique de la Séance
              </h3>
            </div>
            <p className="text-xs text-[#94A3B8] leading-relaxed">
              Demandez à l&apos;IA de recalculer les charges, les répétitions en réserve (RIR) et les temps de repos de votre séance en cours selon votre état du moment :
            </p>

            <div className="space-y-2.5">
              <button
                type="button"
                disabled={isAdapting}
                onClick={() =>
                  handleGenerateAdaptation(
                    'Maximiser la surcharge progressive (Pic de forme nerveuse)'
                  )
                }
                className="w-full p-3.5 rounded-xl bg-[#090A0F] border border-[#1E2433] hover:border-[#CCFF00] text-left transition-colors cursor-pointer"
              >
                <div className="text-xs font-semibold text-[#CCFF00] flex items-center justify-between">
                  <span>Protocole Surcharge Maximale (+Intensité)</span>
                  <Sparkles className="h-3.5 w-3.5" />
                </div>
                <p className="text-xs text-[#94A3B8] mt-1">
                  Augmente les charges cibles sur les séries restantes et allonge légèrement le repos.
                </p>
              </button>

              <button
                type="button"
                disabled={isAdapting}
                onClick={() =>
                  handleGenerateAdaptation(
                    'Fatigue articulaire aux épaules — sécuriser la séance sans perdre le volume'
                  )
                }
                className="w-full p-3.5 rounded-xl bg-[#090A0F] border border-[#1E2433] hover:border-[#00E5FF] text-left transition-colors cursor-pointer"
              >
                <div className="text-xs font-semibold text-[#00E5FF] flex items-center justify-between">
                  <span>Protocole Protection Articulaire & Densité</span>
                  <Sparkles className="h-3.5 w-3.5" />
                </div>
                <p className="text-xs text-[#94A3B8] mt-1">
                  Modère la charge de 8–10% et augmente la marge RIR pour préserver les tendons.
                </p>
              </button>

              <button
                type="button"
                disabled={isAdapting}
                onClick={() =>
                  handleGenerateAdaptation(
                    'Séance Express 35 minutes — densifier les temps de repos'
                  )
                }
                className="w-full p-3.5 rounded-xl bg-[#090A0F] border border-[#1E2433] hover:border-[#F59E0B] text-left transition-colors cursor-pointer"
              >
                <div className="text-xs font-semibold text-[#F59E0B] flex items-center justify-between">
                  <span>Protocole Haute Densité (Gain de Temps)</span>
                  <Sparkles className="h-3.5 w-3.5" />
                </div>
                <p className="text-xs text-[#94A3B8] mt-1">
                  Compresse les temps de repos inter-séries tout en ajustant le tonnage.
                </p>
              </button>
            </div>

            {isAdapting && (
              <div className="p-4 rounded-xl bg-[#090A0F] border border-[#1E2433] text-xs text-[#00E5FF] flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Calcul des coefficients d&apos;adaptation biomécanique...
              </div>
            )}

            {adaptPlan && (
              <div className="p-4 rounded-xl bg-[#090A0F] border border-[#CCFF00] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#CCFF00] uppercase">
                    {adaptPlan.title}
                  </span>
                  <span className="font-mono-tabular text-xs text-[#00E5FF]">
                    Charge ×{adaptPlan.loadMultiplier}
                  </span>
                </div>
                <p className="text-xs text-[#E2E8F0]">{adaptPlan.summary}</p>
                {adaptPlan.adjustmentsList && adaptPlan.adjustmentsList.length > 0 && (
                  <ul className="space-y-1 text-xs text-[#94A3B8] list-disc pl-4">
                    {adaptPlan.adjustmentsList.map((adj, idx) => (
                      <li key={idx}>{adj}</li>
                    ))}
                  </ul>
                )}
                <button
                  type="button"
                  onClick={handleConfirmApplyPlan}
                  className="w-full py-2.5 rounded-lg bg-[#CCFF00] text-[#090A0F] font-bold text-xs hover:bg-[#b8e600] transition-colors cursor-pointer"
                >
                  Appliquer ces Ajustements à ma Séance Live
                </button>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-[#1E2433] text-[11px] text-[#94A3B8] flex items-center justify-between">
            <span>Validation manuelle requise avant modification</span>
            <span className="font-mono-tabular">Sécurité active</span>
          </div>
        </div>
      </div>
    </div>
  );
};
