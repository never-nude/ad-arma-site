((root, factory) => {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.AdArmaObjectives = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  'use strict';

  function normalizeScenarioObjectives(rawObjectives, options = {}) {
    const out = [];
    if (!Array.isArray(rawObjectives)) return out;
    const pointToHexKey = typeof options.pointToHexKey === 'function'
      ? options.pointToHexKey
      : ((pt) => {
        const q = Math.trunc(Number(pt?.q));
        const r = Math.trunc(Number(pt?.r));
        return Number.isFinite(q) && Number.isFinite(r) ? `${q},${r}` : null;
      });

    for (let i = 0; i < rawObjectives.length; i++) {
      const raw = rawObjectives[i];
      if (!raw || typeof raw !== 'object') continue;
      const hexes = new Set();
      for (const pt of (Array.isArray(raw.hexes) ? raw.hexes : [])) {
        const hk = pointToHexKey(pt);
        if (hk) hexes.add(hk);
      }
      if (hexes.size === 0) continue;
      const valueNum = Number(raw.value);
      out.push({
        id: String(raw.id || `obj-${i + 1}`),
        name: String(raw.name || `Objective ${i + 1}`),
        value: Number.isFinite(valueNum) ? Math.max(1, Math.trunc(valueNum)) : 1,
        contestAdjacent: !!raw.contestAdjacent,
        hexes: [...hexes],
      });
    }
    return out;
  }

  function evaluateObjectiveControlState(zones, options = {}) {
    const unitAtHex = typeof options.unitAtHex === 'function'
      ? options.unitAtHex
      : (() => null);
    const neighborHexesForKey = typeof options.neighborHexesForKey === 'function'
      ? options.neighborHexesForKey
      : (() => []);

    const normalizedZones = Array.isArray(zones) ? zones : [];
    const details = [];
    let blueValue = 0;
    let redValue = 0;
    let contested = 0;
    let neutral = 0;

    for (const zone of normalizedZones) {
      const zoneSet = new Set(zone.hexes || []);
      let blueOnHex = 0;
      let redOnHex = 0;
      let blueAdj = 0;
      let redAdj = 0;

      for (const hk of zone.hexes || []) {
        const occ = unitAtHex(hk);
        if (occ?.side === 'blue') blueOnHex += 1;
        else if (occ?.side === 'red') redOnHex += 1;

        for (const nk of neighborHexesForKey(hk) || []) {
          if (zoneSet.has(nk)) continue;
          const adj = unitAtHex(nk);
          if (adj?.side === 'blue') blueAdj += 1;
          else if (adj?.side === 'red') redAdj += 1;
        }
      }

      let owner = null;
      if (blueOnHex > 0 && redOnHex === 0) owner = 'blue';
      else if (redOnHex > 0 && blueOnHex === 0) owner = 'red';

      if (zone.contestAdjacent) {
        if (owner === 'blue' && redAdj > 0) owner = null;
        if (owner === 'red' && blueAdj > 0) owner = null;
      }

      const pressure = blueOnHex > 0 || redOnHex > 0 || blueAdj > 0 || redAdj > 0;
      if (owner === 'blue') blueValue += Number(zone.value || 1);
      else if (owner === 'red') redValue += Number(zone.value || 1);
      else if (pressure) contested += 1;
      else neutral += 1;

      details.push({
        id: zone.id,
        name: zone.name,
        value: zone.value,
        owner,
        contested: owner === null && pressure,
      });
    }

    return {
      zones: normalizedZones.length,
      blueValue,
      redValue,
      contested,
      neutral,
      details,
    };
  }

  function objectiveSummaryText(objState) {
    if (!objState || !objState.zones) return 'No key-ground objectives in this scenario.';
    return `Objectives: Blue ${objState.blueValue} · Red ${objState.redValue} · contested ${objState.contested}/${objState.zones}.`;
  }

  return {
    normalizeScenarioObjectives,
    evaluateObjectiveControlState,
    objectiveSummaryText,
  };
});
