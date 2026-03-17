((root, factory) => {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.AdArmaDoctrineUtils = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  'use strict';

  const DEFAULT_COMMAND_COSTS = Object.freeze([1, 2, 3]);
  const DEFAULT_COMMANDS_PER_COST = 3;

  function commandActionSpend(cmd) {
    return Math.max(1, Number(cmd?.cost || 0));
  }

  function resolveCommand(commandById, id) {
    if (!commandById) return null;
    if (typeof commandById.get === 'function') return commandById.get(id) || null;
    if (typeof commandById === 'function') return commandById(id) || null;
    if (typeof commandById === 'object') return commandById[id] || null;
    return null;
  }

  function validateDoctrineLoadout(ids, options = {}) {
    if (!Array.isArray(ids)) return false;
    const costs = Array.isArray(options.commandCosts) ? options.commandCosts : DEFAULT_COMMAND_COSTS;
    const perCost = Number.isFinite(Number(options.commandsPerCost))
      ? Math.max(1, Math.trunc(Number(options.commandsPerCost)))
      : DEFAULT_COMMANDS_PER_COST;
    if (ids.length !== (perCost * costs.length)) return false;
    const uniq = new Set(ids);
    if (uniq.size !== ids.length) return false;
    for (const cost of costs) {
      const count = ids.filter((id) => Number(resolveCommand(options.commandById, id)?.cost || 0) === cost).length;
      if (count !== perCost) return false;
    }
    return true;
  }

  return {
    DEFAULT_COMMAND_COSTS,
    DEFAULT_COMMANDS_PER_COST,
    commandActionSpend,
    validateDoctrineLoadout,
  };
});
