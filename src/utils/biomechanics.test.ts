import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateCNSReadiness,
  calculateEstimated1RM,
  suggestProgressiveOverload,
  evaluateStrengthTier,
  applySetFatigueToMuscle,
  calculateSymmetryRadar,
  type MuscleTelemetry,
} from './biomechanics';

test('calculateCNSReadiness returns Mode Performance when sleep and recovery are high', () => {
  const res = calculateCNSReadiness({
    sleepHours: 8.5,
    sleepQuality: 5,
    neuralFatigue: 1,
    jointStiffness: 1,
    recent72hSets: 20,
  });
  assert.equal(res.statusLabel, 'Mode Performance');
  assert.ok(res.score >= 85, `Expected score >= 85, got ${res.score}`);
  assert.equal(res.loadAdjustmentPercent, 2.5);
});

test('calculateCNSReadiness returns Mode Deload when fatigued and high recent sets', () => {
  const res = calculateCNSReadiness({
    sleepHours: 5.0,
    sleepQuality: 2,
    neuralFatigue: 5,
    jointStiffness: 4,
    recent72hSets: 52,
  });
  assert.equal(res.statusLabel, 'Mode Deload');
  assert.ok(res.score < 55, `Expected score < 55, got ${res.score}`);
  assert.equal(res.loadAdjustmentPercent, -12.5);
});

test('calculateEstimated1RM computes accurate hybrid Epley/Brzycki 1RM', () => {
  assert.equal(calculateEstimated1RM(100, 1), 100);
  const e1rm = calculateEstimated1RM(100, 8);
  // Epley: 100*(1 + 8/30) = 126.67, Brzycki: 100*(36/29) = 124.14 -> avg ~ 125.4
  assert.ok(e1rm >= 124 && e1rm <= 127, `Expected ~125.4, got ${e1rm}`);
  assert.equal(calculateEstimated1RM(0, 10), 0);
});

test('suggestProgressiveOverload increments weight when top rep range reached with reserve', () => {
  const overload = suggestProgressiveOverload(100, 10, 2, [8, 10]);
  assert.equal(overload.suggestedWeight, 102.5);
  assert.equal(overload.suggestedReps, 8);
});

test('suggestProgressiveOverload increments reps when within rep range', () => {
  const overload = suggestProgressiveOverload(100, 8, 2, [8, 10]);
  assert.equal(overload.suggestedWeight, 100);
  assert.equal(overload.suggestedReps, 9);
});

test('evaluateStrengthTier classifies Novice to Maître accurately', () => {
  const elite = evaluateStrengthTier(140, 80, 1.5); // ratio 1.75 vs 1.5 elite standard -> 1.166x -> Maître
  assert.equal(elite.tier, 'Maître');

  const advanced = evaluateStrengthTier(100, 80, 1.5); // ratio 1.25 vs 1.5 -> 0.83x -> Avancé
  assert.equal(advanced.tier, 'Avancé');
});

test('applySetFatigueToMuscle drains primary muscle more than secondary and ignores warmup', () => {
  assert.equal(applySetFatigueToMuscle(90, true, 1, 'warmup'), 90);
  const afterPrimary = applySetFatigueToMuscle(90, true, 1, 'working');
  const afterSecondary = applySetFatigueToMuscle(90, false, 1, 'working');
  assert.ok(afterPrimary < afterSecondary);
});

test('calculateSymmetryRadar returns 5 balanced axes', () => {
  const sampleMuscles: MuscleTelemetry[] = [
    {
      id: 'pectorals',
      name: 'Pectoraux',
      view: 'front',
      category: 'push',
      recoveryPercent: 80,
      weeklySetsCompleted: 12,
      baseWeeklyTargetSets: 16,
      hoursSinceLastTrained: 48,
      primaryExercise: 'Développé Couché',
      bestE1RM: 115,
      bodyweightRatioStandard: 1.5,
    },
    {
      id: 'lats',
      name: 'Grands Dorsaux',
      view: 'back',
      category: 'pull',
      recoveryPercent: 85,
      weeklySetsCompleted: 13,
      baseWeeklyTargetSets: 16,
      hoursSinceLastTrained: 36,
      primaryExercise: 'Tractions Lestées',
      bestE1RM: 125,
      bodyweightRatioStandard: 1.5,
    },
  ];
  const radar = calculateSymmetryRadar(sampleMuscles);
  assert.equal(radar.length, 5);
  assert.ok(radar[0].score >= 80);
});
