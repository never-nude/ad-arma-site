((root, factory) => {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.AdArmaScenarioMeta = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  'use strict';

  const SCENARIO_METADATA_BY_NAME = Object.freeze({
    'Demo A — Line Clash': {
      group: 'demo',
      description: 'Small mirrored line clash for learning basic movement, missile pressure, and first contact.',
      sideLabels: { blue: 'Blue Army', red: 'Red Army', named: false },
    },
    'Demo B — Center Push': {
      group: 'demo',
      description: 'Compact center-pressure exercise with a cavalry wing and simple decision lanes.',
      sideLabels: { blue: 'Blue Army', red: 'Red Army', named: false },
    },
    'Demo C — Skirmisher Screen': {
      group: 'demo',
      description: 'Screening battle built around skirmish spacing, missile tempo, and flank protection.',
      sideLabels: { blue: 'Blue Army', red: 'Red Army', named: false },
    },
    'Terrain G — Tuderberg Ring Ambush': {
      group: 'history',
      description: 'Column under ambush pressure in constricted terrain with danger on every shoulder.',
      historical: '9 CE',
      sideLabels: { blue: 'Roman', red: 'Germanic', named: true },
      objectives: [
        { id: 'ambush-corridor', name: 'Ambush Corridor', value: 2, contestAdjacent: true, hexes: [{ q: 7, r: 5 }, { q: 8, r: 5 }] },
      ],
    },
    'Terrain K — Marathon (490 BCE)': {
      group: 'history',
      description: 'Fast closing battle over open ground with strong flanks.',
      historical: '490 BCE',
      checkpointTurn: 7,
      pointTarget: 22,
      sideLabels: { blue: 'Greek', red: 'Persian', named: true },
      objectives: [
        { id: 'center-plain', name: 'Center Plain', value: 2, contestAdjacent: true, hexes: [{ q: 6, r: 5 }, { q: 7, r: 5 }, { q: 8, r: 5 }] },
        { id: 'left-wing', name: 'West Wing Ground', value: 1, contestAdjacent: false, hexes: [{ q: 3, r: 5 }, { q: 3, r: 6 }] },
        { id: 'right-wing', name: 'East Wing Ground', value: 1, contestAdjacent: false, hexes: [{ q: 11, r: 5 }, { q: 11, r: 6 }] },
      ],
    },
    'Terrain L — Granicus River (334 BCE)': {
      group: 'history',
      description: 'River crossing pressure and a decisive cavalry breach.',
      historical: '334 BCE',
      checkpointTurn: 8,
      sideLabels: { blue: 'Macedonian', red: 'Persian', named: true },
      objectives: [
        { id: 'ford', name: 'River Ford', value: 2, contestAdjacent: true, hexes: [{ q: 7, r: 4 }, { q: 7, r: 5 }, { q: 8, r: 5 }] },
        { id: 'north-bank', name: 'North Bank', value: 1, contestAdjacent: false, hexes: [{ q: 7, r: 2 }, { q: 8, r: 2 }] },
      ],
    },
    'Terrain M — Cannae Double Envelopment (216 BCE)': {
      group: 'history',
      description: 'Deep center push under risk of double envelopment.',
      historical: '216 BCE',
      checkpointTurn: 7,
      pointTarget: 24,
      sideLabels: { blue: 'Roman', red: 'Carthaginian', named: true },
      objectives: [
        { id: 'kill-zone', name: 'Center Kill Zone', value: 2, contestAdjacent: true, hexes: [{ q: 7, r: 5 }, { q: 8, r: 5 }, { q: 7, r: 6 }, { q: 8, r: 6 }] },
        { id: 'left-horn', name: 'Western Horn', value: 1, contestAdjacent: false, hexes: [{ q: 3, r: 5 }, { q: 2, r: 5 }] },
        { id: 'right-horn', name: 'Eastern Horn', value: 1, contestAdjacent: false, hexes: [{ q: 12, r: 5 }, { q: 13, r: 5 }] },
      ],
    },
    'Terrain N — Pharsalus Reserve Counterstroke (48 BCE)': {
      group: 'history',
      description: 'Reserve timing and cavalry wing stability decide the line.',
      historical: '48 BCE',
      checkpointTurn: 8,
      sideLabels: { blue: 'Caesarian', red: 'Pompeian', named: true },
      objectives: [
        { id: 'center-line', name: 'Center Line', value: 2, contestAdjacent: true, hexes: [{ q: 6, r: 5 }, { q: 7, r: 5 }, { q: 8, r: 5 }, { q: 9, r: 5 }] },
        { id: 'reserve-wing', name: 'Reserve Wing', value: 1, contestAdjacent: false, hexes: [{ q: 11, r: 4 }, { q: 11, r: 5 }] },
      ],
    },
    'Terrain O — Zama (202 BCE)': {
      group: 'history',
      description: 'Open lanes for maneuver and a late cavalry decision.',
      historical: '202 BCE',
      sideLabels: { blue: 'Roman', red: 'Carthaginian', named: true },
      objectives: [
        { id: 'main-lanes', name: 'Battle Lanes', value: 2, contestAdjacent: true, hexes: [{ q: 6, r: 5 }, { q: 7, r: 5 }, { q: 8, r: 5 }] },
      ],
    },
    'Terrain P — Ilipa Reverse Deployment (206 BCE)': {
      group: 'history',
      description: 'Reverse deployment and wing timing over broken approach terrain.',
      historical: '206 BCE',
      sideLabels: { blue: 'Roman', red: 'Carthaginian', named: true },
      objectives: [
        { id: 'center-open', name: 'Open Center', value: 2, contestAdjacent: true, hexes: [{ q: 7, r: 5 }, { q: 8, r: 5 }] },
      ],
    },
    'Terrain Q — Carhae (Carrhae, 53 BCE)': {
      group: 'history',
      description: 'Missile pressure and mobility over exposed terrain.',
      historical: '53 BCE',
      sideLabels: { blue: 'Roman', red: 'Parthian', named: true },
      objectives: [
        { id: 'exposed-center', name: 'Exposed Center', value: 2, contestAdjacent: true, hexes: [{ q: 7, r: 5 }, { q: 8, r: 5 }] },
      ],
    },
    'Terrain R — Thapsus Coastal Pressure (46 BCE)': {
      group: 'history',
      description: 'Coastal pressure and rough-ground friction on the center push.',
      historical: '46 BCE',
      sideLabels: { blue: 'Caesarian', red: 'Optimates', named: true },
      objectives: [
        { id: 'coast-road', name: 'Coastal Road', value: 1, contestAdjacent: true, hexes: [{ q: 12, r: 5 }, { q: 13, r: 5 }] },
        { id: 'center-rough', name: 'Rough Center', value: 2, contestAdjacent: false, hexes: [{ q: 7, r: 5 }, { q: 8, r: 5 }] },
      ],
    },
    'Terrain S — Philippi Twin Camps (42 BCE)': {
      group: 'history',
      description: 'Twin camps and contested approaches split the battle line.',
      historical: '42 BCE',
      sideLabels: { blue: 'Triumvir', red: 'Liberator', named: true },
      objectives: [
        { id: 'west-camp', name: 'West Camp', value: 1, contestAdjacent: false, hexes: [{ q: 3, r: 8 }, { q: 3, r: 9 }] },
        { id: 'east-camp', name: 'East Camp', value: 1, contestAdjacent: false, hexes: [{ q: 12, r: 3 }, { q: 12, r: 2 }] },
        { id: 'marsh-line', name: 'Marsh Crossing', value: 2, contestAdjacent: true, hexes: [{ q: 7, r: 5 }, { q: 8, r: 5 }] },
      ],
    },
    'History A — Thermopylae Hot Gates (480 BCE)': {
      group: 'history',
      description: 'Narrow pass defense between sea edge and impassable heights.',
      historical: '480 BCE',
      checkpointTurn: 6,
      sideLabels: { blue: 'Greek', red: 'Persian', named: true },
      objectives: [
        { id: 'hot-gate-pass', name: 'Hot Gates Pass', value: 3, contestAdjacent: true, hexes: [{ q: 7, r: 5 }, { q: 8, r: 5 }] },
      ],
    },
  });

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function prefixedGroup(name) {
    const n = String(name || '').toLowerCase();
    if (n.startsWith('demo ')) return 'demo';
    if (n.startsWith('grand ')) return 'grand';
    if (n.startsWith('terrain ')) return 'terrain';
    if (n.startsWith('berserker ')) return 'berserker';
    if (n.startsWith('history ')) return 'history';
    return 'other';
  }

  function legacyFallbackScenarioMeta(name) {
    const n = String(name || '').toLowerCase();
    const out = {
      group: prefixedGroup(name),
      description: '',
      historical: '',
      sideLabels: null,
      objectives: [],
      checkpointTurn: 8,
      pointTarget: null,
      notes: '',
    };

    if (n.includes('marathon')) {
      out.group = 'history';
      out.sideLabels = { blue: 'Greek', red: 'Persian', named: true };
      out.description = 'Fast closing battle over open ground with strong flanks.';
      out.historical = '490 BCE';
    } else if (n.includes('granicus')) {
      out.group = 'history';
      out.sideLabels = { blue: 'Macedonian', red: 'Persian', named: true };
      out.description = 'River crossing pressure and a decisive cavalry breach.';
      out.historical = '334 BCE';
    } else if (n.includes('cannae')) {
      out.group = 'history';
      out.sideLabels = { blue: 'Roman', red: 'Carthaginian', named: true };
      out.description = 'Deep center push under risk of double envelopment.';
      out.historical = '216 BCE';
    } else if (n.includes('pharsalus')) {
      out.group = 'history';
      out.sideLabels = { blue: 'Caesarian', red: 'Pompeian', named: true };
      out.description = 'Reserve timing and cavalry wing stability decide the line.';
      out.historical = '48 BCE';
    } else if (n.includes('zama')) {
      out.group = 'history';
      out.sideLabels = { blue: 'Roman', red: 'Carthaginian', named: true };
      out.description = 'Open lanes for maneuver and a late cavalry decision.';
      out.historical = '202 BCE';
    } else if (n.includes('ilipa')) {
      out.group = 'history';
      out.sideLabels = { blue: 'Roman', red: 'Carthaginian', named: true };
      out.description = 'Reverse deployment and wing timing over broken approach terrain.';
      out.historical = '206 BCE';
    } else if (n.includes('carhae') || n.includes('carrhae')) {
      out.group = 'history';
      out.sideLabels = { blue: 'Roman', red: 'Parthian', named: true };
      out.description = 'Missile pressure and mobility over exposed terrain.';
      out.historical = '53 BCE';
    } else if (n.includes('thapsus')) {
      out.group = 'history';
      out.sideLabels = { blue: 'Caesarian', red: 'Optimates', named: true };
      out.description = 'Coastal pressure and rough-ground friction on the center push.';
      out.historical = '46 BCE';
    } else if (n.includes('philippi')) {
      out.group = 'history';
      out.sideLabels = { blue: 'Triumvir', red: 'Liberator', named: true };
      out.description = 'Twin camps and contested approaches split the battle line.';
      out.historical = '42 BCE';
    } else if (n.includes('tuderberg') || n.includes('teutoburg')) {
      out.group = 'history';
      out.sideLabels = { blue: 'Roman', red: 'Germanic', named: true };
      out.description = 'Column under ambush pressure in restricted movement terrain.';
      out.historical = '9 CE';
    } else if (n.includes('thermopylae') || n.includes('hot gates')) {
      out.group = 'history';
      out.sideLabels = { blue: 'Greek', red: 'Persian', named: true };
      out.description = 'Narrow pass defense between sea edge and impassable heights.';
      out.historical = '480 BCE';
      out.checkpointTurn = 6;
    }

    return out;
  }

  function resolveScenarioMetadata(name, explicitMeta = null) {
    const fallback = legacyFallbackScenarioMeta(name);
    const explicit = (explicitMeta && typeof explicitMeta === 'object') ? explicitMeta : {};
    const byName = SCENARIO_METADATA_BY_NAME[name] || {};
    const sideLabels = explicit.sideLabels || byName.sideLabels || fallback.sideLabels || null;
    const objectives = Array.isArray(explicit.objectives)
      ? explicit.objectives
      : (Array.isArray(byName.objectives) ? byName.objectives : fallback.objectives);

    return {
      group: explicit.group || byName.group || fallback.group || 'other',
      description: explicit.description || byName.description || fallback.description || '',
      historical: explicit.historical || byName.historical || fallback.historical || '',
      sideLabels: sideLabels ? clone(sideLabels) : null,
      objectives: Array.isArray(objectives) ? clone(objectives) : [],
      checkpointTurn: Number.isFinite(Number(explicit.checkpointTurn))
        ? Math.max(1, Math.trunc(Number(explicit.checkpointTurn)))
        : (Number.isFinite(Number(byName.checkpointTurn))
          ? Math.max(1, Math.trunc(Number(byName.checkpointTurn)))
          : fallback.checkpointTurn),
      pointTarget: Number.isFinite(Number(explicit.pointTarget))
        ? Math.max(1, Math.trunc(Number(explicit.pointTarget)))
        : (Number.isFinite(Number(byName.pointTarget))
          ? Math.max(1, Math.trunc(Number(byName.pointTarget)))
          : fallback.pointTarget),
      notes: explicit.notes || byName.notes || fallback.notes || '',
    };
  }

  return {
    SCENARIO_METADATA_BY_NAME,
    legacyFallbackScenarioMeta,
    resolveScenarioMetadata,
  };
});
