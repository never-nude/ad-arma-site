((root, factory) => {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.AdArmaDoctrineEffects = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  'use strict';

  const DOCTRINE_EFFECT_KEYS = Object.freeze([
    'bonusMove',
    'bonusAttackDice',
    'rangedBonusDice',
    'meleeDefenseBonus',
    'ignoreRetreatCount',
    'ignoreAllRetreat',
    'cannotMove',
    'cannotAttack',
    'commandOverrideUnitIds',
    'counterchargeUnitIds',
    'coverFireIgnoreTerrain',
    'wingScreenUnitIds',
    'driveThemBackUnitIds',
    'commandRadiusBonusByGeneralId',
    'reserveReleaseUnitIds',
  ]);

  const DOCTRINE_STATUS_LABELS = Object.freeze({
    bonusMove: 'mobility',
    bonusAttackDice: 'attack',
    rangedBonusDice: 'missile',
    meleeDefenseBonus: 'defense',
    ignoreRetreatCount: 'steadfast',
    ignoreAllRetreat: 'unyielding',
    cannotMove: 'locked',
    cannotAttack: 'spent',
    commandOverrideUnitIds: 'in command',
    counterchargeUnitIds: 'countercharge',
    coverFireIgnoreTerrain: 'cover fire',
    wingScreenUnitIds: 'screen',
    driveThemBackUnitIds: 'pressure',
    commandRadiusBonusByGeneralId: 'command surge',
    reserveReleaseUnitIds: 'reserve',
  });

  function createDoctrineEffectState(seed = null) {
    const out = {};
    for (const key of DOCTRINE_EFFECT_KEYS) {
      const raw = seed && seed[key] && typeof seed[key] === 'object' ? seed[key] : {};
      out[key] = { ...raw };
    }
    return out;
  }

  function ensureDoctrineEffectMaps(effects) {
    if (!effects || typeof effects !== 'object') return createDoctrineEffectState();
    for (const key of DOCTRINE_EFFECT_KEYS) {
      if (!effects[key] || typeof effects[key] !== 'object') effects[key] = {};
    }
    return effects;
  }

  function clearDoctrineTurnEffects(effects) {
    const ensured = ensureDoctrineEffectMaps(effects);
    for (const key of DOCTRINE_EFFECT_KEYS) ensured[key] = {};
    return ensured;
  }

  function activeDoctrineEffectsForUnit(effects, longEffects, unitId, side = null) {
    const turnKeys = [];
    const longKeys = [];
    const ensured = ensureDoctrineEffectMaps(effects);

    for (const key of DOCTRINE_EFFECT_KEYS) {
      const turnValue = ensured[key][unitId];
      if (turnValue) turnKeys.push(key);
    }

    if (Array.isArray(longEffects)) {
      for (const eff of longEffects) {
        if (!eff || !eff.map || !DOCTRINE_STATUS_LABELS[eff.map]) continue;
        if (side && eff.side && eff.side !== side) continue;
        if (unitId != null && eff.unitId != null && eff.unitId !== unitId) continue;
        if (!eff.value) continue;
        if (!longKeys.includes(eff.map)) longKeys.push(eff.map);
      }
    }

    return {
      turnKeys,
      longKeys,
      hasAny: turnKeys.length > 0 || longKeys.length > 0,
      hasPersistent: longKeys.length > 0,
      reserveReleased: turnKeys.includes('reserveReleaseUnitIds') || longKeys.includes('reserveReleaseUnitIds'),
      labels: [...new Set([...longKeys, ...turnKeys].map((key) => DOCTRINE_STATUS_LABELS[key]).filter(Boolean))],
    };
  }

  return {
    DOCTRINE_EFFECT_KEYS,
    DOCTRINE_STATUS_LABELS,
    createDoctrineEffectState,
    ensureDoctrineEffectMaps,
    clearDoctrineTurnEffects,
    activeDoctrineEffectsForUnit,
  };
});
