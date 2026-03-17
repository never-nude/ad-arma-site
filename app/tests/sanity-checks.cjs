const assert = require('node:assert/strict');

const doctrineUtils = require('../rules/doctrine-utils.js');
const doctrineEffects = require('../rules/doctrine-effects.js');
const objectives = require('../rules/objectives.js');
const scenarioMeta = require('../data/scenario-meta.js');

const commandById = new Map([
  ['c1a', { cost: 1 }],
  ['c1b', { cost: 1 }],
  ['c1c', { cost: 1 }],
  ['c2a', { cost: 2 }],
  ['c2b', { cost: 2 }],
  ['c2c', { cost: 2 }],
  ['c3a', { cost: 3 }],
  ['c3b', { cost: 3 }],
  ['c3c', { cost: 3 }],
]);

assert.equal(doctrineUtils.commandActionSpend({ cost: 3, persistence: 'spent' }), 3);
assert.equal(
  doctrineUtils.validateDoctrineLoadout(
    ['c1a', 'c1b', 'c1c', 'c2a', 'c2b', 'c2c', 'c3a', 'c3b', 'c3c'],
    { commandById }
  ),
  true
);

const marathon = scenarioMeta.resolveScenarioMetadata('Terrain K — Marathon (490 BCE)');
assert.equal(marathon.group, 'history');
assert.equal(marathon.objectives.length, 3);
assert.equal(marathon.sideLabels.blue, 'Greek');

const effects = doctrineEffects.createDoctrineEffectState();
effects.reserveReleaseUnitIds[7] = true;
effects.bonusAttackDice[7] = 1;
const effectSummary = doctrineEffects.activeDoctrineEffectsForUnit(
  effects,
  [{ map: 'bonusMove', unitId: 7, value: 1, side: 'blue' }],
  7,
  'blue'
);
assert.equal(effectSummary.hasAny, true);
assert.equal(effectSummary.hasPersistent, true);
assert.equal(effectSummary.reserveReleased, true);

const zones = objectives.normalizeScenarioObjectives([
  { id: 'center', name: 'Center', value: 2, contestAdjacent: true, hexes: [{ q: 1, r: 1 }] },
]);
const unitMap = new Map([
  ['1,1', { side: 'blue' }],
  ['1,2', { side: 'red' }],
]);
const neighbors = { '1,1': ['1,2'] };
const objectiveState = objectives.evaluateObjectiveControlState(zones, {
  unitAtHex: (hk) => unitMap.get(hk) || null,
  neighborHexesForKey: (hk) => neighbors[hk] || [],
});
assert.equal(objectiveState.blueValue, 0);
assert.equal(objectiveState.redValue, 0);
assert.equal(objectiveState.contested, 1);

console.log('Ad Arma sanity checks passed.');
