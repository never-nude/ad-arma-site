(() => {
  'use strict';

  // ===== Ad Arma (D-Day baseline -> RB01 rules engine alignment) =====
  // This build intentionally keeps the Ad Arma UI calm/legible while
  // tightening the mechanics to the rules spec you provided.

  const GAME_NAME = 'Ad Arma';
  const BUILD_ID = (window.POLEMO_BUILD_ID || window.POLEMO_BUILD || 'DEV');
  const URL_PARAMS = new URLSearchParams(window.location.search || '');
  const ORDER_ATLAS_MODE = (() => {
    const modeParam = String(URL_PARAMS.get('mode') || '').toLowerCase();
    if (modeParam === 'order-atlas' || modeParam === 'warcouncil-atlas' || modeParam === 'directive-atlas') {
      return true;
    }
    const p = String(window.location.pathname || '').toLowerCase();
    return p.includes('/order-atlas/') || p.includes('/warcouncil-atlas/') || p.includes('/directive-atlas/');
  })();
  if (ORDER_ATLAS_MODE) {
    document.documentElement.classList.add('mode-order-atlas');
  }

  // --- Board shape (157-hex "island")
  // Rows are r=0..10, each row is a contiguous run of q.
  const DEFAULT_ROWS = [
    { qStart: 2, len: 12 }, // r=0
    { qStart: 1, len: 13 }, // r=1
    { qStart: 1, len: 14 }, // r=2
    { qStart: 0, len: 15 }, // r=3
    { qStart: 0, len: 16 }, // r=4
    { qStart: -1, len: 17 }, // r=5
    { qStart: 0, len: 16 }, // r=6
    { qStart: 0, len: 15 }, // r=7
    { qStart: 1, len: 14 }, // r=8
    { qStart: 1, len: 13 }, // r=9
    { qStart: 2, len: 12 }, // r=10
  ];

  // --- Terrain
  const TERRAIN_DEFS = [
    { id: 'clear', label: 'Clear' },
    { id: 'hills', label: 'Hills' },
    { id: 'woods', label: 'Woods' },
    { id: 'rough', label: 'Rough' },
    { id: 'water', label: 'Water' },
    { id: 'mountains', label: 'Mountains' },
  ];
  const TERRAIN_IDS = new Set(TERRAIN_DEFS.map(t => t.id));
  const TERRAIN_LABEL_BY_ID = new Map(TERRAIN_DEFS.map(t => [t.id, t.label]));

  const SCENARIO_FILTER_OPTIONS = {
    group: [
      { id: 'all', label: 'All Groups' },
      { id: 'tutorial', label: 'Tutorial' },
      { id: 'demo', label: 'Demo' },
      { id: 'grand', label: 'Grand Battle' },
      { id: 'terrain', label: 'Terrain Pack' },
      { id: 'berserker', label: 'Berserker' },
      { id: 'history', label: 'History Pack' },
      { id: 'other', label: 'Other' },
    ],
    lesson: [
      { id: 'all', label: 'All Lessons' },
      { id: 'lines', label: 'Line Discipline' },
      { id: 'center', label: 'Center Pressure' },
      { id: 'screen', label: 'Screen/Skirmish' },
      { id: 'envelopment', label: 'Envelopment/Flank' },
      { id: 'corridor', label: 'Corridor/Congestion' },
      { id: 'river', label: 'River/Fords' },
      { id: 'terrain', label: 'Terrain Tactics' },
      { id: 'general', label: 'General Practice' },
    ],
    size: [
      { id: 'all', label: 'Any Size' },
      { id: 'small', label: 'Small (<=20 units)' },
      { id: 'medium', label: 'Medium (21-50 units)' },
      { id: 'large', label: 'Large (51+ units)' },
    ],
    terrain: [
      { id: 'all', label: 'Any Map' },
      { id: 'open', label: 'Open Field' },
      { id: 'hills', label: 'Hills' },
      { id: 'woods', label: 'Woods' },
      { id: 'rough', label: 'Rough' },
      { id: 'water', label: 'Water' },
      { id: 'mountains', label: 'Mountains' },
      { id: 'mixed', label: 'Mixed Terrain' },
    ],
  };
  const SCENARIO_FILTER_IDS = Object.fromEntries(
    Object.entries(SCENARIO_FILTER_OPTIONS).map(([k, opts]) => [k, new Set(opts.map(o => o.id))])
  );

  // --- Core rules constants
  const ACT_LIMIT = 3; // activations per turn
  const COMMAND_RADIUS_BY_QUALITY = { green: 3, regular: 4, veteran: 5 };
  const RUNNER_COMMAND_RADIUS = 1;
  const DEFAULT_COMMAND_RADIUS = COMMAND_RADIUS_BY_QUALITY.green;
  // Cavalry shock bonus against unbraced infantry.
  const CAV_FLANK_BONUS = 1;
  const CAV_REAR_BONUS = 2;
  const AI_DIFFICULTY_IDS = new Set(['easy', 'standard', 'hard']);
  // Different pacing/quality profiles by AI difficulty.
  const AI_TIMING_BY_DIFFICULTY = {
    easy: { startMs: 900, stepMs: 1280, intentMs: 560, movePauseMs: 680, combatPauseMs: 1600 },
    standard: { startMs: 680, stepMs: 980, intentMs: 430, movePauseMs: 520, combatPauseMs: 1360 },
    hard: { startMs: 460, stepMs: 760, intentMs: 320, movePauseMs: 420, combatPauseMs: 1180 },
  };
  const RANDOM_START_SCENARIO_NAME = 'Randomized Opening (Auto)';
  const GUIDED_TUTORIAL_SCENARIO_NAME = 'Tutorial — Piece Walkthrough (Mirrored)';
  const TUTORIAL_KEYS = {
    blueGen: '7,2',
    blueRun: '6,2',
    blueMed: '8,2',
    blueInf: '7,4',
    blueInfFrontL: '7,4',
    blueInfFrontR: '8,4',
    blueInfBackL: '6,3',
    blueInfBackC: '7,3',
    blueInfBackR: '8,3',
    blueCav: '4,3',
    blueSkr: '5,4',
    blueArc: '9,3',
    redGen: '7,8',
    redRun: '8,8',
    redMed: '6,8',
    redInf: '7,6',
    redInfFrontL: '6,6',
    redInfFrontR: '7,6',
    redInfBackL: '6,7',
    redInfBackC: '7,7',
    redInfBackR: '8,7',
    redCav: '10,7',
    redSkr: '9,6',
    redArc: '5,7',
  };
  const RANDOM_START_UNITS_PER_SIDE_MIN = 22;
  const RANDOM_START_UNITS_PER_SIDE_MAX = 30;
  const SCENARIO_UNIT_CAP_PER_SIDE = 30;
  const DRAFT_BUDGET_MIN = 20;
  const DRAFT_BUDGET_MAX = 300;
  const DRAFT_BUDGET_DEFAULT = 120;
  const DICE_SETTLE_BASE_MS = 340;
  const DICE_SETTLE_STEP_MS = 210;
  const DICE_SUMMARY_BASE_MS = 520;
  const DICE_SUMMARY_STEP_MS = 210;
  const DICE_POST_HOLD_MS = 420;
  const MOVE_ANIM_MS_HUMAN = 220;
  const MOVE_ANIM_MS_AI = 520;
  const ATTACK_FLASH_MS = 920;
  const TUTORIAL_AUTOPLAY_STEP_MS = 16800;
  const TUTORIAL_AUTOPLAY_AFTER_TASK_MS = 5200;
  const ENABLE_BATTLE_SFX = true;
  const COMMAND_COSTS = [1, 2, 3];
  const COMMANDS_PER_COST = 3;
  const VICTORY_MODE_IDS = new Set(['clear', 'decapitation', 'annihilation', 'points', 'keyground', 'strategic']);
  const POINT_VICTORY_CAPTURE_RATIO = 0.45;
  const STRATEGIC_CAPTURE_RATIO = 0.40;

  const COMMAND_POOL = [
    // Cost 1
    { id: 'quick_dress', name: 'Quick Dress', cost: 1, persistence: 'persistent', category: 'formation', targeting: 'Up to 3 adjacent INF in same row', explain: 'Shift up to 3 adjacent infantry 1 hex sideways in formation. No attacks.', resolver: 'quick_dress' },
    { id: 'runner_burst', name: 'Runner Burst', cost: 1, persistence: 'spent', category: 'command', targeting: '1 RUN + nearby allies', explain: 'One runner gets +3 movement this turn; nearby allies gain temporary command relay support.', resolver: 'runner_burst' },
    { id: 'javelin_volley', name: 'Javelin Volley', cost: 1, persistence: 'spent', category: 'skirmish', targeting: 'Up to 2 SKR/ARC', explain: 'Up to 2 skirmishers/archers gain +2 ranged dice on their next attack this turn.', resolver: 'javelin_volley' },
    { id: 'quick_withdraw', name: 'Quick Withdraw', cost: 1, persistence: 'persistent', category: 'positional', targeting: '1 SKR/ARC not surrounded', explain: 'One unsurrounded skirmisher or archer steps back 1 hex without attacking.', resolver: 'quick_withdraw' },
    { id: 'close_ranks', name: 'Close Ranks', cost: 1, persistence: 'persistent', category: 'infantry', targeting: '1 INF', explain: 'One infantry braces: enemy melee against it is -1 die until enemy turn ends.', resolver: 'close_ranks' },
    { id: 'spur_horses', name: 'Spur the Horses', cost: 1, persistence: 'persistent', category: 'cavalry', targeting: '1 CAV in command', explain: 'One cavalry in command gets +1 movement this turn.', resolver: 'spur_horses' },
    { id: 'signal_call', name: 'Signal Call', cost: 1, persistence: 'spent', category: 'command', targeting: '1 GEN + up to 2 nearby out-of-command units', explain: 'A general briefly extends command to up to two nearby out-of-command units this turn.', resolver: 'signal_call' },
    { id: 'loose_screen', name: 'Loose Screen', cost: 1, persistence: 'persistent', category: 'skirmish', targeting: 'Up to 2 SKR/ARC adjacent to INF', explain: 'Up to 2 skirmishers/archers can slip through friendly infantry by 1 hex.', resolver: 'loose_screen' },
    { id: 'covering_fire', name: 'Covering Fire', cost: 1, persistence: 'spent', category: 'missile', targeting: 'Up to 2 ARC/SKR attacks this turn', explain: 'Your next two ranged attacks ignore terrain-based ranged penalties.', resolver: 'covering_fire' },
    { id: 'hold_fast', name: 'Hold Fast', cost: 1, persistence: 'spent', category: 'formation', targeting: '1 unit', explain: 'One unit ignores two retreat results before your next turn and gains +1 melee defense.', resolver: 'hold_fast' },
    // Cost 2
    { id: 'shield_wall', name: 'Shield Wall', cost: 2, persistence: 'persistent', category: 'infantry', targeting: '3-6 contiguous INF', explain: '3-6 connected infantry form a shield wall: enemy melee -1 die until your next turn.', resolver: 'shield_wall' },
    { id: 'cavalry_exploit', name: 'Cavalry Exploit', cost: 2, persistence: 'persistent', category: 'cavalry', targeting: 'Up to 3 CAV in one sector', explain: 'Up to 3 cavalry gain shock pressure this turn when they move into clear-ground attacks.', resolver: 'cavalry_exploit' },
    { id: 'refuse_flank', name: 'Refuse the Flank', cost: 2, persistence: 'persistent', category: 'formation', targeting: '2-5 INF on one wing', explain: 'Pull 2-5 infantry on one wing backward/inward to avoid being wrapped.', resolver: 'refuse_flank' },
    { id: 'forced_march', name: 'Forced March', cost: 2, persistence: 'persistent', category: 'reserve', targeting: 'Up to 4 INF/SKR in one sector', explain: 'Up to 4 infantry/skirmishers gain +1 move, but they cannot attack this turn.', resolver: 'forced_march' },
    { id: 'strengthen_center', name: 'Strengthen the Center', cost: 2, persistence: 'persistent', category: 'infantry', targeting: 'Up to 4 INF within 2 of GEN', explain: 'Up to 4 central infantry ignore the first retreat result until your next turn.', resolver: 'strengthen_center' },
    { id: 'wing_screen', name: 'Wing Screen', cost: 2, persistence: 'spent', category: 'missile', targeting: 'Up to 4 SKR/ARC on flank', explain: 'Up to 4 flank missile units may attack, then step 1 hex, with +1 move this turn.', resolver: 'wing_screen' },
    { id: 'countercharge', name: 'Countercharge', cost: 2, persistence: 'spent', category: 'cavalry', targeting: 'Up to 3 CAV reaction', explain: 'Up to 3 cavalry can react with a melee strike when enemies close in, with stronger impact.', resolver: 'countercharge' },
    { id: 'jaws_inward', name: 'Jaws Inward', cost: 2, persistence: 'spent', category: 'formation', targeting: '2-5 veteran/regular INF', explain: 'Experienced infantry from both sides of a fight move inward to compress the enemy line.', resolver: 'jaws_inward' },
    { id: 'local_reserve', name: 'Local Reserve', cost: 2, persistence: 'spent', category: 'reserve', targeting: 'Up to 3 rear-line units', explain: 'Release up to 3 reserve/rear units for immediate action this turn.', resolver: 'local_reserve' },
    { id: 'drive_them_back', name: 'Drive Them Back', cost: 2, persistence: 'spent', category: 'infantry', targeting: 'Up to 4 INF', explain: 'Up to 4 infantry gain disarray pressure and +1 attack die this turn.', resolver: 'drive_them_back' },
    // Cost 3
    { id: 'full_line_advance', name: 'Full Line Advance', cost: 3, persistence: 'persistent', category: 'formation', targeting: 'One large row', explain: 'Push one major line forward together; blocked units stay put, others advance.', resolver: 'full_line_advance' },
    { id: 'grand_shield_wall', name: 'Grand Shield Wall', cost: 3, persistence: 'spent', category: 'infantry', targeting: '5-8 contiguous INF', explain: '5-8 infantry form a major wall: very high melee defense, strong retreat resistance, cannot move, persists through your next turn.', resolver: 'grand_shield_wall' },
    { id: 'all_out_cavalry_sweep', name: 'All-Out Cavalry Sweep', cost: 3, persistence: 'spent', category: 'cavalry', targeting: 'Up to 4 CAV on one wing (fallback: up to 3 INF/SKR/ARC)', explain: 'Cavalry wing gains major shock bonuses through your next turn; if cavalry are gone, convert to a strong wing assault package.', resolver: 'all_out_cavalry_sweep' },
    { id: 'commit_reserves', name: 'Commit Reserves', cost: 3, persistence: 'spent', category: 'reserve', targeting: 'Up to 4 rear-third non-GEN units', explain: 'Commit deep reserves: selected units step toward the front and gain command/mobility/attack support through your next turn.', resolver: 'commit_reserves' },
    { id: 'general_assault', name: 'General Assault', cost: 3, persistence: 'persistent', category: 'command', targeting: 'One sector around GEN (up to 4 units)', explain: 'Up to 4 units near a general each get one coordinated move or attack.', resolver: 'general_assault' },
    { id: 'collapse_center', name: 'Collapse the Center', cost: 3, persistence: 'persistent', category: 'formation', targeting: 'Center INF + inward wings', explain: 'Center yields while wings fold inward to set a compression trap.', resolver: 'collapse_center' },
    { id: 'last_push', name: 'Last Push', cost: 3, persistence: 'spent', category: 'formation', targeting: 'Up to 4 INF/CAV', explain: 'Up to 4 infantry/cavalry gain +2 attack dice if they attack this turn.', resolver: 'last_push' },
    { id: 'reforge_line', name: 'Reforge the Line', cost: 3, persistence: 'persistent', category: 'formation', targeting: 'Up to 6 connected INF', explain: 'Reposition up to 6 connected infantry by 1 hex each to rebuild the line.', resolver: 'reforge_line' },
    { id: 'command_surge', name: 'Command Surge', cost: 3, persistence: 'persistent', category: 'command', targeting: '1 GEN', explain: 'One general extends command radius by +1 this turn and pulls units back in command.', resolver: 'command_surge' },
    { id: 'stand_or_die', name: 'Stand or Die', cost: 3, persistence: 'spent', category: 'infantry', targeting: '3-5 INF around GEN', explain: '3-5 infantry near a general ignore retreat results and gain +1 melee defense until your next turn.', resolver: 'stand_or_die' },
  ];
  const COMMAND_BY_ID = new Map(COMMAND_POOL.map(c => [c.id, c]));
  function commandUsageLabel(persistence) {
    return persistence === 'spent' ? 'Single-Use' : 'Reusable';
  }
  function commandActionSpend(cmd) {
    if (!cmd) return 0;
    const rebate = (cmd.persistence === 'spent' && cmd.cost >= 2) ? 1 : 0;
    return Math.max(1, Number(cmd.cost || 0) - rebate);
  }
  function commandUsageBadge(persistence) {
    return persistence === 'spent' ? '1x' : 'R';
  }
  function commandExplainText(cmd) {
    if (!cmd) return '';
    return (typeof cmd.explain === 'string' && cmd.explain.trim())
      ? cmd.explain.trim()
      : String(cmd.targeting || '');
  }
  const COMMAND_LAYMAN_TEXT = {
    quick_dress: 'Slide a short infantry section sideways to tighten your line or close a gap.',
    runner_burst: 'Give one runner a major speed burst and temporarily steady nearby allies with relay support.',
    javelin_volley: 'Two light missile units throw much harder this turn with a big ranged spike.',
    quick_withdraw: 'Pull one exposed skirmisher or archer back before it gets trapped in melee.',
    close_ranks: 'One infantry unit braces with shields, making incoming melee less effective.',
    spur_horses: 'Push one cavalry unit to ride farther and reposition for a better angle.',
    signal_call: 'A general briefly reaches up to two nearby units just outside command range.',
    loose_screen: 'Let light troops pass through your infantry screen to reposition quickly.',
    covering_fire: 'Two missile attacks can ignore terrain firing penalties this turn.',
    hold_fast: 'One unit hardens up, resisting multiple retreats and taking less melee pressure.',
    shield_wall: 'A connected infantry block locks shields and becomes harder to break in melee.',
    cavalry_exploit: 'A cavalry wing gets a stronger open-ground strike against infantry this turn.',
    refuse_flank: 'Pull a wing inward or backward to avoid being surrounded on that side.',
    forced_march: 'Move a small group farther than normal, but they cannot attack this turn.',
    strengthen_center: 'Reinforce the middle so core infantry are less likely to get pushed back.',
    wing_screen: 'A larger flank missile group fires and repositions with extra mobility this turn.',
    countercharge: 'Ready more cavalry to punish enemies that move too close, with stronger impact.',
    jaws_inward: 'Experienced infantry from both sides close in and compress the enemy line.',
    local_reserve: 'Release a larger reserve packet so reinforcements hit the fight immediately.',
    drive_them_back: 'More infantry pressure the enemy line with both stronger hits and disarray risk.',
    full_line_advance: 'Push one major row forward together; units blocked by terrain or bodies stay put.',
    grand_shield_wall: 'Lock a major infantry block into an elite defensive wall that can absorb extreme pressure.',
    all_out_cavalry_sweep: 'Launch a decisive wing assault with major shock power; fallback still hits hard.',
    commit_reserves: 'Release deeper reserves into the fight with temporary command and attack support.',
    general_assault: 'Units near a general execute a coordinated local attack this turn.',
    collapse_center: 'Your center yields while both wings bend inward to create a trap.',
    last_push: 'A short all-in surge: selected attackers spike hard right now.',
    reforge_line: 'Re-shape a connected infantry line by one hex each to restore formation.',
    command_surge: 'One general temporarily projects command farther to re-link nearby units.',
    stand_or_die: 'Infantry near a general hold position, refuse retreats, and harden defense for one turn.',
  };
  function commandLaymanText(cmd) {
    if (!cmd) return '';
    return COMMAND_LAYMAN_TEXT[cmd.id] || commandExplainText(cmd);
  }

  function sentenceize(text) {
    const raw = String(text || '').trim().replace(/\s+/g, ' ');
    if (!raw) return '';
    return /[.!?]$/.test(raw) ? raw : `${raw}.`;
  }

  function commandDictionaryText(cmd) {
    if (!cmd) return '';
    const plain = sentenceize(commandLaymanText(cmd));
    const usage = commandUsageLabel(cmd.persistence);
    const targeting = String(cmd.targeting || 'eligible units').trim();
    const second = sentenceize(`${usage} order targeting ${targeting}`);
    return `${plain} ${second}`.trim();
  }

  // Target selection guidance per directive (for manual multi-pick mode).
  const COMMAND_TARGET_LIMITS = {
    quick_dress: { min: 1, max: 3 },
    runner_burst: { min: 1, max: 1 },
    javelin_volley: { min: 1, max: 2 },
    quick_withdraw: { min: 1, max: 1 },
    close_ranks: { min: 1, max: 1 },
    spur_horses: { min: 1, max: 1 },
    signal_call: { min: 1, max: 2 },
    loose_screen: { min: 1, max: 2 },
    covering_fire: { min: 0, max: 0 },
    hold_fast: { min: 1, max: 1 },
    shield_wall: { min: 3, max: 6 },
    cavalry_exploit: { min: 1, max: 3 },
    refuse_flank: { min: 2, max: 5 },
    forced_march: { min: 1, max: 4 },
    strengthen_center: { min: 1, max: 4 },
    wing_screen: { min: 1, max: 4 },
    countercharge: { min: 1, max: 3 },
    jaws_inward: { min: 2, max: 5 },
    local_reserve: { min: 1, max: 3 },
    drive_them_back: { min: 1, max: 4 },
    full_line_advance: { min: 3, max: 8 },
    grand_shield_wall: { min: 5, max: 8 },
    all_out_cavalry_sweep: { min: 1, max: 4 },
    commit_reserves: { min: 1, max: 4 },
    general_assault: { min: 1, max: 4 },
    collapse_center: { min: 3, max: 9 },
    last_push: { min: 1, max: 4 },
    reforge_line: { min: 3, max: 6 },
    command_surge: { min: 1, max: 1 },
    stand_or_die: { min: 3, max: 5 },
  };

  // Dice faces:
  // 6 = Hit + Disarray
  // 5 = Hit
  // 4 = Retreat
  // 3 = Disarray
  // 1-2 = Miss
  const DIE_HIT = new Set([5, 6]);
  const DIE_RETREAT = 4;
  const DIE_DISARRAY = 3;
  const EVENT_TRACE_MAX = 600;
  const sfx = {
    ctx: null,
    unlocked: false,
    noiseBuffer: null,
  };

  function ensureSfxContext() {
    if (!ENABLE_BATTLE_SFX) return null;
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    if (!sfx.ctx) {
      try {
        sfx.ctx = new Ctor();
      } catch (_) {
        return null;
      }
    }
    return sfx.ctx;
  }

  function ensureSfxNoiseBuffer(ctx) {
    if (!ctx) return null;
    if (sfx.noiseBuffer && sfx.noiseBuffer.sampleRate === ctx.sampleRate) return sfx.noiseBuffer;
    const dur = 0.35;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * 0.9;
    sfx.noiseBuffer = buf;
    return buf;
  }

  function unlockBattleSfx() {
    const ctx = ensureSfxContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    sfx.unlocked = true;
  }

  function playUnitDestroyedSfx() {
    const ctx = ensureSfxContext();
    if (!ctx || !sfx.unlocked) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
      return;
    }

    const t0 = ctx.currentTime + 0.005;
    const out = ctx.createGain();
    out.gain.setValueAtTime(0.0001, t0);
    out.gain.exponentialRampToValueAtTime(0.18, t0 + 0.01);
    out.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.58);
    out.connect(ctx.destination);

    const noise = ctx.createBufferSource();
    noise.buffer = ensureSfxNoiseBuffer(ctx);
    const noiseBand = ctx.createBiquadFilter();
    noiseBand.type = 'bandpass';
    noiseBand.frequency.setValueAtTime(760 + Math.random() * 740, t0);
    noiseBand.Q.setValueAtTime(0.95, t0);
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.11, t0);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.24);
    noise.connect(noiseBand);
    noiseBand.connect(noiseGain);
    noiseGain.connect(out);
    noise.start(t0);
    noise.stop(t0 + 0.25);

    const bass = ctx.createOscillator();
    bass.type = (Math.random() < 0.5) ? 'triangle' : 'sawtooth';
    bass.frequency.setValueAtTime(180 + Math.random() * 45, t0);
    bass.frequency.exponentialRampToValueAtTime(62 + Math.random() * 18, t0 + 0.24);
    const bassGain = ctx.createGain();
    bassGain.gain.setValueAtTime(0.085, t0);
    bassGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.26);
    bass.connect(bassGain);
    bassGain.connect(out);
    bass.start(t0);
    bass.stop(t0 + 0.27);

    if (Math.random() < 0.45) {
      const ping = ctx.createOscillator();
      ping.type = 'square';
      ping.frequency.setValueAtTime(1180 + Math.random() * 220, t0 + 0.02);
      ping.frequency.exponentialRampToValueAtTime(520, t0 + 0.14);
      const pingGain = ctx.createGain();
      pingGain.gain.setValueAtTime(0.018, t0 + 0.02);
      pingGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.15);
      ping.connect(pingGain);
      pingGain.connect(out);
      ping.start(t0 + 0.02);
      ping.stop(t0 + 0.16);
    }

    setTimeout(() => {
      try { out.disconnect(); } catch (_) {}
    }, 900);
  }

  // --- Units (Bannerfall quality-aware stats)
  // HP and UP vary by quality (green / regular / veteran).
  const UNIT_DEFS = [
    // id, label, abbrev, symbol, MP, quality stats, combat profile
    {
      id: 'inf', label: 'Infantry', abbrev: 'INF', symbol: 'INF', move: 1,
      hpByQuality: { green: 3, regular: 4, veteran: 5 },
      upByQuality: { green: 3, regular: 5, veteran: 7 },
      meleeDice: 2, ranged: null,
    },
    {
      id: 'cav', label: 'Cavalry', abbrev: 'CAV', symbol: 'CAV', move: 2,
      hpByQuality: { green: 2, regular: 3, veteran: 4 },
      upByQuality: { green: 6, regular: 8, veteran: 10 },
      meleeDice: 3, ranged: null,
    },
    {
      id: 'skr', label: 'Skirmishers', abbrev: 'SKR', symbol: 'SKR', move: 2,
      hpByQuality: { green: 1, regular: 2, veteran: 3 },
      upByQuality: { green: 2, regular: 3, veteran: 4 },
      meleeDice: 2, ranged: { 2: 1 }, // fixed range 2
    },
    {
      id: 'arc', label: 'Archers', abbrev: 'ARC', symbol: '➶', move: 1,
      hpByQuality: { green: 1, regular: 2, veteran: 3 },
      upByQuality: { green: 2, regular: 4, veteran: 6 },
      meleeDice: 1, ranged: { 2: 2, 3: 1 }, // range 2–3 only
    },
    {
      id: 'gen', label: 'General', abbrev: 'GEN', symbol: '★', move: 2,
      hpByQuality: { green: 2, regular: 3, veteran: 4 },
      upByQuality: { green: 8, regular: 10, veteran: 12 },
      meleeDice: 1, ranged: null,
    },
    {
      id: 'run', label: 'Runner', abbrev: 'RUN', symbol: '👣', move: 3,
      hpByQuality: { green: 2, regular: 2, veteran: 2 },
      upByQuality: { green: 1, regular: 2, veteran: 3 },
      meleeDice: 0, ranged: null,
    },
    {
      // Ancient Greek "iatros" = physician. This unit is a non-combat healer.
      id: 'iat', label: 'Medic', abbrev: 'Medic', symbol: '✚', move: 1,
      hpByQuality: { green: 1, regular: 1, veteran: 1 },
      upByQuality: { green: 4, regular: 4, veteran: 4 },
      meleeDice: 0, ranged: null,
    },
  ];

  const UNIT_BY_ID = new Map(UNIT_DEFS.map(u => [u.id, u]));

  function commandIdsByCost(cost) {
    return COMMAND_POOL.filter(c => c.cost === cost).map(c => c.id);
  }

  function makeDoctrineSideState() {
    return {
      loadout: [],
      byId: {},
      source: 'recommended',
      history: [],
    };
  }

  function cloneArray(arr) {
    return Array.isArray(arr) ? arr.slice() : [];
  }

  function randomSample(arr, count) {
    const src = cloneArray(arr);
    const out = [];
    while (src.length > 0 && out.length < count) {
      const i = Math.floor(Math.random() * src.length);
      out.push(src.splice(i, 1)[0]);
    }
    return out;
  }

  function buildDoctrineByIds(ids, source = 'manual') {
    const sideState = makeDoctrineSideState();
    sideState.source = source;
    sideState.loadout = cloneArray(ids);
    for (const id of sideState.loadout) {
      const cmd = COMMAND_BY_ID.get(id);
      if (!cmd) continue;
      sideState.byId[id] = {
        revealed: false,
        spent: false,
        usedCount: 0,
      };
    }
    return sideState;
  }

  function validateDoctrineLoadout(ids) {
    if (!Array.isArray(ids)) return false;
    if (ids.length !== (COMMANDS_PER_COST * COMMAND_COSTS.length)) return false;
    const uniq = new Set(ids);
    if (uniq.size !== ids.length) return false;
    for (const cost of COMMAND_COSTS) {
      const count = ids.filter(id => COMMAND_BY_ID.get(id)?.cost === cost).length;
      if (count !== COMMANDS_PER_COST) return false;
    }
    return true;
  }

  function makeRandomDoctrineLoadout() {
    const out = [];
    for (const cost of COMMAND_COSTS) {
      out.push(...randomSample(commandIdsByCost(cost), COMMANDS_PER_COST));
    }
    return out;
  }

  function makeRecommendedDoctrineLoadout() {
    // Balanced "combined arms" baseline for quick play.
    return [
      'quick_dress', 'close_ranks', 'hold_fast',
      'shield_wall', 'forced_march', 'cavalry_exploit',
      'full_line_advance', 'general_assault', 'last_push',
    ];
  }

  function buildCompleteDoctrineLoadout(preferredIds) {
    const preferred = Array.isArray(preferredIds) ? preferredIds : [];
    const out = [];
    const used = new Set();
    for (const cost of COMMAND_COSTS) {
      const pref = preferred.filter((id) => {
        if (used.has(id)) return false;
        return COMMAND_BY_ID.get(id)?.cost === cost;
      });
      for (const id of pref) {
        if (out.filter((x) => COMMAND_BY_ID.get(x)?.cost === cost).length >= COMMANDS_PER_COST) break;
        out.push(id);
        used.add(id);
      }
      if (out.filter((x) => COMMAND_BY_ID.get(x)?.cost === cost).length < COMMANDS_PER_COST) {
        const fallback = commandIdsByCost(cost).filter((id) => !used.has(id));
        for (const id of fallback) {
          if (out.filter((x) => COMMAND_BY_ID.get(x)?.cost === cost).length >= COMMANDS_PER_COST) break;
          out.push(id);
          used.add(id);
        }
      }
    }
    return out;
  }

  function scenarioDoctrinePreset(name, side = 'blue') {
    const sc = SCENARIOS[name];
    const meta = (sc && sc.meta && typeof sc.meta === 'object') ? sc.meta : null;
    const explicitPreset = meta && meta.doctrinePreset;
    if (Array.isArray(explicitPreset) && validateDoctrineLoadout(explicitPreset)) {
      return cloneArray(explicitPreset);
    }
    if (explicitPreset && typeof explicitPreset === 'object') {
      const bySide = Array.isArray(explicitPreset[side]) ? explicitPreset[side] : null;
      if (bySide && validateDoctrineLoadout(bySide)) return cloneArray(bySide);
    }

    const n = String(name || '').toLowerCase();
    if (n.includes('thermopylae') || n.includes('hot gates')) {
      return [
        'close_ranks', 'hold_fast', 'signal_call',
        'shield_wall', 'strengthen_center', 'refuse_flank',
        'grand_shield_wall', 'stand_or_die', 'collapse_center',
      ];
    }
    if (n.includes('cannae') || n.includes('zama') || n.includes('ilipa')) {
      return [
        'spur_horses', 'quick_withdraw', 'javelin_volley',
        'cavalry_exploit', 'wing_screen', 'jaws_inward',
        'all_out_cavalry_sweep', 'commit_reserves', 'last_push',
      ];
    }
    if (n.includes('granicus') || n.includes('river') || n.includes('ford')) {
      return [
        'signal_call', 'covering_fire', 'quick_dress',
        'forced_march', 'strengthen_center', 'local_reserve',
        'general_assault', 'command_surge', 'reforge_line',
      ];
    }
    if (n.includes('marathon') || n.includes('pharsalus') || n.includes('thapsus') || n.includes('philippi')) {
      return [
        'close_ranks', 'spur_horses', 'hold_fast',
        'shield_wall', 'cavalry_exploit', 'drive_them_back',
        'full_line_advance', 'general_assault', 'last_push',
      ];
    }
    // Side-aware small variation for default maps.
    return side === 'blue'
      ? makeRecommendedDoctrineLoadout()
      : [
          'quick_withdraw', 'signal_call', 'covering_fire',
          'wing_screen', 'refuse_flank', 'drive_them_back',
          'commit_reserves', 'collapse_center', 'stand_or_die',
        ];
  }

  function qualityStatValue(table, quality, fallback = 0) {
    if (!table || typeof table !== 'object') return fallback;
    if (quality && Object.prototype.hasOwnProperty.call(table, quality)) return table[quality];
    if (Object.prototype.hasOwnProperty.call(table, 'green')) return table.green;
    return fallback;
  }

  function unitMaxHp(type, quality) {
    const def = UNIT_BY_ID.get(type);
    return qualityStatValue(def?.hpByQuality, quality, 1);
  }

  function unitUpValue(type, quality) {
    const def = UNIT_BY_ID.get(type);
    return qualityStatValue(def?.upByQuality, quality, 0);
  }

  function unitMovePoints(unit) {
    if (!unit) return 0;
    const def = UNIT_BY_ID.get(unit.type);
    if (!def) return 0;
    const doctrineMoveBonus = Number(state?.doctrine?.effects?.bonusMove?.[unit.id] || 0) +
      doctrineLongEffectValue('bonusMove', unit.id, unit.side);

    // Runner quality affects mobility only:
    // Green = base, Regular = +1, Veteran = +2.
    if (unit.type === 'run') {
      if (unit.quality === 'veteran') return Math.max(0, def.move + 2 + doctrineMoveBonus);
      if (unit.quality === 'regular') return Math.max(0, def.move + 1 + doctrineMoveBonus);
      return Math.max(0, def.move + doctrineMoveBonus);
    }

    return Math.max(0, def.move + doctrineMoveBonus);
  }

  const FORWARD_AXIS_IDS = new Set(['vertical', 'horizontal', 'diag_tl_br', 'diag_tr_bl']);

  function normalizeForwardAxis(axis) {
    return FORWARD_AXIS_IDS.has(axis) ? axis : 'vertical';
  }

  function normalizeAiDifficulty(level) {
    return AI_DIFFICULTY_IDS.has(level) ? level : 'standard';
  }

  function aiDifficultyLabel(level) {
    const id = normalizeAiDifficulty(level);
    if (id === 'easy') return 'Easy';
    if (id === 'hard') return 'Hard';
    return 'Standard';
  }

  function aiTimingForDifficulty(level) {
    const id = normalizeAiDifficulty(level);
    return AI_TIMING_BY_DIFFICULTY[id] || AI_TIMING_BY_DIFFICULTY.standard;
  }

  function forwardAxisLabel(axis) {
    const a = normalizeForwardAxis(axis);
    if (a === 'horizontal') return 'Horizontal (Blue right)';
    if (a === 'diag_tl_br') return 'Diagonal TL->BR (Blue down-right)';
    if (a === 'diag_tr_bl') return 'Diagonal TR->BL (Blue down-left)';
    return 'Vertical (Blue down)';
  }

  function hexDirectionLabel(dir) {
    switch (dir) {
      case 'e': return '→ East';
      case 'w': return '← West';
      case 'ur': return '↗ Up-Right';
      case 'ul': return '↖ Up-Left';
      case 'dr': return '↘ Down-Right';
      case 'dl': return '↙ Down-Left';
      case 'forward': return 'Forward';
      case 'backward': return 'Backward';
      case 'left': return 'Left';
      case 'right': return 'Right';
      default: return String(dir || '').toUpperCase();
    }
  }

  function sideForwardDirection(side, axis = state.forwardAxis) {
    const a = normalizeForwardAxis(axis);
    if (a === 'horizontal') return (side === 'blue') ? 'e' : 'w';
    if (a === 'diag_tl_br') return (side === 'blue') ? 'dr' : 'ul';
    if (a === 'diag_tr_bl') return (side === 'blue') ? 'dl' : 'ur';
    return (side === 'blue') ? 'down' : 'up';
  }

  function oppositeDirection(dir) {
    switch (dir) {
      case 'e': return 'w';
      case 'w': return 'e';
      case 'ur': return 'dl';
      case 'dl': return 'ur';
      case 'ul': return 'dr';
      case 'dr': return 'ul';
      case 'up': return 'down';
      case 'down': return 'up';
      default: return null;
    }
  }

  function axisLateralDirections(axis = state.forwardAxis) {
    const a = normalizeForwardAxis(axis);
    if (a === 'horizontal') return ['up', 'down'];
    if (a === 'diag_tl_br') return ['ur', 'dl'];
    if (a === 'diag_tr_bl') return ['ul', 'dr'];
    return ['w', 'e'];
  }

  function directionDeltaAtHex(direction, hex) {
    if (!hex) return null;
    const odd = !!(hex.r & 1);

    switch (direction) {
      case 'e': return { dq: +1, dr: 0 };
      case 'w': return { dq: -1, dr: 0 };
      case 'ur': return odd ? { dq: +1, dr: -1 } : { dq: 0, dr: -1 };
      case 'ul': return odd ? { dq: 0, dr: -1 } : { dq: -1, dr: -1 };
      case 'dr': return odd ? { dq: +1, dr: +1 } : { dq: 0, dr: +1 };
      case 'dl': return odd ? { dq: 0, dr: +1 } : { dq: -1, dr: +1 };
      case 'up': return { dq: 0, dr: -1 };
      case 'down': return { dq: 0, dr: +1 };
      default: return null;
    }
  }

  function stepKeyInDirection(fromKey, direction) {
    const h = board.byKey.get(fromKey);
    if (!h) return null;

    const d = directionDeltaAtHex(direction, h);
    if (!d) return null;

    const nk = key(h.q + d.dq, h.r + d.dr);
    if (!board.activeSet.has(nk)) return null;
    if (!h.neigh.includes(nk)) return null;
    return nk;
  }

  function generalCommandRadius(generalUnit) {
    if (!generalUnit || generalUnit.type !== 'gen') return DEFAULT_COMMAND_RADIUS;
    return qualityStatValue(COMMAND_RADIUS_BY_QUALITY, generalUnit.quality, DEFAULT_COMMAND_RADIUS);
  }

  function commandRadiusForUnit(unit) {
    if (!unit) return 0;
    if (unit.type === 'gen') {
      const base = generalCommandRadius(unit);
      const bonusTurn = Number(state?.doctrine?.effects?.commandRadiusBonusByGeneralId?.[unit.id] || 0);
      const bonusLong = doctrineLongEffectValue('commandRadiusBonusByGeneralId', unit.id, unit.side);
      return Math.max(0, base + bonusTurn + bonusLong);
    }
    if (unit.type === 'run') return RUNNER_COMMAND_RADIUS;
    return 0;
  }

  function isCommandSourceUnit(unit) {
    return !!unit && (unit.type === 'gen' || unit.type === 'run');
  }

  // === UNIT ICONS (Berserker) ===
  // White-on-transparent PNGs rendered over blue/red token fills.
  // Cache-busted with BUILD_ID so Safari/GitHub Pages doesn’t haunt you.
  const UNIT_ICON_SOURCES = {
    arc: 'assets/icon_arc.png', // Archer  -> arrow
    inf: 'assets/icon_inf.png', // Infantry -> sword
    skr: 'assets/icon_skr.png', // Skirmisher -> sling
    cav: 'assets/icon_cav.png', // Cavalry -> horse
  };

  const UNIT_ICONS = {};
  let UNIT_ICONS_READY = false;

  function loadUnitIcons() {
    const entries = Object.entries(UNIT_ICON_SOURCES);
    let remaining = entries.length;
    UNIT_ICONS_READY = false;

    for (const [type, src] of entries) {
      const img = new Image();
      img.onload = () => {
        remaining -= 1;
        if (remaining <= 0) {
          UNIT_ICONS_READY = true;
          // Force a redraw once icons are in memory.
          try { draw(); } catch (_) {}
        }
      };
      img.onerror = () => {
        remaining -= 1;
        if (remaining <= 0) {
          // Even if some fail, we can still draw (fallback to text).
          try { draw(); } catch (_) {}
        }
      };
      img.src = `${src}?v=${encodeURIComponent(BUILD_ID)}`;
      UNIT_ICONS[type] = img;
    }
  }

  function unitIconReady(type) {
    const img = UNIT_ICONS[type];
    return !!(img && img.complete && img.naturalWidth > 0);
  }

  // Per-type tuning so icons feel proportional inside the token disc.
  const UNIT_ICON_TUNE = {
    arc: { scale: 1.12, y: -0.08 }, // a touch bigger + slightly up
    inf: { scale: 0.95, y:  0.00, rot: -0.616 },
    skr: { scale: 0.95, y:  0.00 },
    cav: { scale: 0.95, y:  0.00 },
  };

  loadUnitIcons();
  // === END UNIT ICONS ===


  const QUALITY_ORDER = ['green', 'regular', 'veteran'];
  const HEX_DIRECTION_IDS = ['e', 'w', 'ur', 'ul', 'dr', 'dl'];
  const LINE_ADVANCE_AXES = [
    { id: 'ew', neg: 'w', pos: 'e', advanceDirs: ['ur', 'ul', 'dr', 'dl'] },
    { id: 'urdl', neg: 'dl', pos: 'ur', advanceDirs: ['e', 'w', 'ul', 'dr'] },
    { id: 'uldr', neg: 'dr', pos: 'ul', advanceDirs: ['e', 'w', 'ur', 'dl'] },
  ];

  // Odd-r offset neighbors (pointy-top).
  const NEIGH_EVEN = [[+1, 0], [0, -1], [-1, -1], [-1, 0], [-1, +1], [0, +1]];
  const NEIGH_ODD = [[+1, 0], [+1, -1], [0, -1], [-1, 0], [0, +1], [+1, +1]];
  // Clockwise-ish ring used for infantry brace detection.
  const BRACE_DIR_RING = ['e', 'ur', 'ul', 'w', 'dl', 'dr'];

  // --- DOM
  const elCanvas = document.getElementById('c');
  const elBoardStage = document.getElementById('boardStage');
  const elCanvasWrap = document.getElementById('canvasWrap');
  const ctx = elCanvas.getContext('2d');

  const elHudTitle = document.getElementById('hudTitle');
  const elHudMeta = document.getElementById('hudMeta');
  const elHudLast = document.getElementById('hudLast');
  const elStatusMeta = document.getElementById('statusMeta');
  const elStatusLast = document.getElementById('statusLast');

  const elModeBtn = document.getElementById('modeBtn');
  const elGameModeSel = document.getElementById('gameModeSel');
  const elAiDifficultyRow = document.getElementById('aiDifficultyRow');
  const elAiDifficultySel = document.getElementById('aiDifficultySel');
  const elHumanSideRow = document.getElementById('humanSideRow');
  const elHumanSideSel = document.getElementById('humanSideSel');
  const elForwardAxisSel = document.getElementById('forwardAxisSel');
  const elToolUnits = document.getElementById('toolUnits');
  const elToolTerrain = document.getElementById('toolTerrain');

  const elSideBlue = document.getElementById('sideBlue');
  const elSideRed = document.getElementById('sideRed');

  const elTypeBtns = document.getElementById('typeBtns');
  const elEraseBtn = document.getElementById('eraseBtn');

  const elQualityGreen = document.getElementById('qGreen');
  const elQualityRegular = document.getElementById('qRegular');
  const elQualityVeteran = document.getElementById('qVeteran');

  const elTerrainBtns = document.getElementById('terrainBtns');

  const elScenarioSel = document.getElementById('scenarioSel');
  const elScenarioSides = document.getElementById('scenarioSides');
  const elScenarioGroupSel = document.getElementById('scenarioGroupSel');
  const elScenarioLessonSel = document.getElementById('scenarioLessonSel');
  const elScenarioSizeSel = document.getElementById('scenarioSizeSel');
  const elScenarioTerrainSel = document.getElementById('scenarioTerrainSel');
  const elLoadScenarioBtn = document.getElementById('loadScenarioBtn');
  const elClearUnitsBtn = document.getElementById('clearUnitsBtn');
  const elDraftModeSel = document.getElementById('draftModeSel');
  const elDraftBudgetInput = document.getElementById('draftBudgetInput');
  const elStartDraftBtn = document.getElementById('startDraftBtn');
  const elDraftDoneBtn = document.getElementById('draftDoneBtn');
  const elDraftStatus = document.getElementById('draftStatus');
  const elExportStateBtn = document.getElementById('exportStateBtn');
  const elImportStateBtn = document.getElementById('importStateBtn');
  const elStateFileInput = document.getElementById('stateFileInput');
  const elDiceSummary = document.getElementById('diceSummary');
  const elPhysicalDiceRow = document.getElementById('physicalDiceRow');
  const elBoardDiceResult = document.getElementById('boardDiceResult');
  const elCornerDiceHud = document.getElementById('cornerDiceHud');
  const elCornerDiceRow = document.getElementById('cornerDiceRow');
  const elDiceTray = document.getElementById('diceTray');
  const elInspectorTitle = document.getElementById('inspectorTitle');
  const elInspectorMeta = document.getElementById('inspectorMeta');
  const elInspectorSide = document.getElementById('inspectorSide');
  const elInspectorType = document.getElementById('inspectorType');
  const elInspectorQuality = document.getElementById('inspectorQuality');
  const elInspectorHex = document.getElementById('inspectorHex');
  const elInspectorHp = document.getElementById('inspectorHp');
  const elInspectorUp = document.getElementById('inspectorUp');
  const elInspectorCommand = document.getElementById('inspectorCommand');
  const elInspectorRadius = document.getElementById('inspectorRadius');
  const elCombatSummary = document.getElementById('combatSummary');
  const elCombatMath = document.getElementById('combatMath');
  const elCombatTerrain = document.getElementById('combatTerrain');
  const elCombatOutcome = document.getElementById('combatOutcome');
  const elCombatForces = document.getElementById('combatForces');
  const elCombatHint = document.getElementById('combatHint');
  const elOpenQuickRulesBtn = document.getElementById('openQuickRulesBtn');
  const elOpenFullRulesBtn = document.getElementById('openFullRulesBtn');
  const elDoctrineOpenHeroBtn = document.getElementById('doctrineOpenHeroBtn');
  const elOpenCommandRulesBtn = document.getElementById('openCommandRulesBtn');
  const elDoctrineOpenBtn = document.getElementById('doctrineOpenBtn');
  const elDoctrineOpenTurnBtn = document.getElementById('doctrineOpenTurnBtn');
  const elDoctrineRecommendedBtn = document.getElementById('doctrineRecommendedBtn');
  const elDoctrineRandomBtn = document.getElementById('doctrineRandomBtn');
  const elDoctrineBlankBtn = document.getElementById('doctrineBlankBtn');
  const elDoctrineScenarioBtn = document.getElementById('doctrineScenarioBtn');
  const elDoctrineSummary = document.getElementById('doctrineSummary');
  const elOrdersViewBlueBtn = document.getElementById('ordersViewBlueBtn');
  const elOrdersViewRedBtn = document.getElementById('ordersViewRedBtn');
  const elOrdersExplainList = document.getElementById('ordersExplainList');
  const elOrdersPanel = document.getElementById('ordersPanel');
  const elOrdersReadyNote = document.getElementById('ordersReadyNote');
  const elDoctrineOwnList = document.getElementById('doctrineOwnList');
  const elDoctrineKnownList = document.getElementById('doctrineKnownList');
  const elDoctrineSpentList = document.getElementById('doctrineSpentList');
  const elDoctrineHistoryList = document.getElementById('doctrineHistoryList');
  const elCommandSel = document.getElementById('commandSel');
  const elCommandUseBtn = document.getElementById('commandUseBtn');
  const elCommandSkipBtn = document.getElementById('commandSkipBtn');
  const elOpenOrdersKeyBtn = document.getElementById('openOrdersKeyBtn');
  const elCommandPhaseNote = document.getElementById('commandPhaseNote');
  const elDoctrineOverlay = document.getElementById('doctrineOverlay');
  const elCloseDoctrineBtn = document.getElementById('closeDoctrineBtn');
  const elDoctrineSideSel = document.getElementById('doctrineSideSel');
  const elDoctrineRandomizeBtn = document.getElementById('doctrineRandomizeBtn');
  const elDoctrineRecommendBtn = document.getElementById('doctrineRecommendBtn');
  const elDoctrineBlankizeBtn = document.getElementById('doctrineBlankizeBtn');
  const elDoctrineScenarioApplyBtn = document.getElementById('doctrineScenarioApplyBtn');
  const elDoctrineBuilderCounts = document.getElementById('doctrineBuilderCounts');
  const elDoctrineExplain = document.getElementById('doctrineExplain');
  const elDoctrinePreviewCanvas = document.getElementById('doctrinePreviewCanvas');
  const elDoctrinePreviewTitle = document.getElementById('doctrinePreviewTitle');
  const elDoctrinePreviewCaption = document.getElementById('doctrinePreviewCaption');
  const elDoctrineCost1Col = document.getElementById('doctrineCost1Col');
  const elDoctrineCost2Col = document.getElementById('doctrineCost2Col');
  const elDoctrineCost3Col = document.getElementById('doctrineCost3Col');
  const elDoctrineCost1Title = document.getElementById('doctrineCost1Title');
  const elDoctrineCost2Title = document.getElementById('doctrineCost2Title');
  const elDoctrineCost3Title = document.getElementById('doctrineCost3Title');
  const elDoctrineCost1List = document.getElementById('doctrineCost1List');
  const elDoctrineCost2List = document.getElementById('doctrineCost2List');
  const elDoctrineCost3List = document.getElementById('doctrineCost3List');
  const elDoctrineConfirmBtn = document.getElementById('doctrineConfirmBtn');
  const elRulesSideOverlay = document.getElementById('rulesSideOverlay');
  const elCloseRulesSideBtn = document.getElementById('closeRulesSideBtn');
  const elRulesTabQuickBtn = document.getElementById('rulesTabQuickBtn');
  const elRulesTabFullBtn = document.getElementById('rulesTabFullBtn');
  const elRulesTabCommandsBtn = document.getElementById('rulesTabCommandsBtn');
  const elRulesQuickDoc = document.getElementById('rulesQuickDoc');
  const elRulesFullDoc = document.getElementById('rulesFullDoc');
  const elRulesCommandsDoc = document.getElementById('rulesCommandsDoc');
  const elRulesCommandsList = document.getElementById('rulesCommandsList');
  const elRulesCommandsSelectedBtn = document.getElementById('rulesCommandsSelectedBtn');
  const elRulesCommandsAllBtn = document.getElementById('rulesCommandsAllBtn');
  const elRulesCommandsContext = document.getElementById('rulesCommandsContext');
  const COMBAT_RULE_HINT =
    'Rules: 6=hit+disarray, 5=hit, 4=retreat, 3=disarray, 1-2=miss. Woods -1 die (min 1).';
  let diceRenderNonce = 0;
  let rulesCommandsViewMode = 'selected'; // 'selected' | 'all'
  let rulesCommandsViewSide = 'blue';
  let doctrinePreviewRaf = 0;
  let doctrinePreviewTime = 0;
  const PANEL_COLLAPSE_PREF_KEY = 'bannerfall-panel-collapse-v1';
  const PANEL_COLLAPSE_DEFAULTS_TOUCH = {
    turnOrdersPanel: false,
    statusPanel: false,
    setupPanel: true,
    dicePanel: true,
    editorPanel: true,
  };

  const elVictorySel = document.getElementById('victorySel');
  const elEndTurnBtn = document.getElementById('endTurnBtn');
  const elLineAdvanceBtn = document.getElementById('lineAdvanceBtn');
  const elLineAdvanceDirSel = document.getElementById('lineAdvanceDirSel');
  const elOnlineHostBtn = document.getElementById('onlineHostBtn');
  const elOnlineJoinBtn = document.getElementById('onlineJoinBtn');
  const elOnlineLeaveBtn = document.getElementById('onlineLeaveBtn');
  const elOnlineMyCode = document.getElementById('onlineMyCode');
  const elOnlineJoinCode = document.getElementById('onlineJoinCode');
  const elOnlineGuestSideSel = document.getElementById('onlineGuestSideSel');
  const elOnlineInitiativeSel = document.getElementById('onlineInitiativeSel');
  const elOnlineStatus = document.getElementById('onlineStatus');
  const elIntroOverlay = document.getElementById('introOverlay');
  const elIntroActions = document.getElementById('introActions');
  const elIntroPlayNowBtn = document.getElementById('introPlayNowBtn');
  const elIntroSetupBtn = document.getElementById('introSetupBtn');
  const elIntroTutorialBtn = document.getElementById('introTutorialBtn');
  const elIntroTutorialPanel = document.getElementById('introTutorialPanel');
  const elIntroTutorialStartBtn = document.getElementById('introTutorialStartBtn');
  const elIntroTutorialBackBtn = document.getElementById('introTutorialBackBtn');
  const elTutorialGuideOverlay = document.getElementById('tutorialGuideOverlay');
  const elTutorialGuideStepMeta = document.getElementById('tutorialGuideStepMeta');
  const elTutorialGuideStepTitle = document.getElementById('tutorialGuideStepTitle');
  const elTutorialGuideStepText = document.getElementById('tutorialGuideStepText');
  const elTutorialGuideLearn = document.getElementById('tutorialGuideLearn');
  const elTutorialGuideUnitWrap = document.getElementById('tutorialGuideUnitWrap');
  const elTutorialGuideUnitMove = document.getElementById('tutorialGuideUnitMove');
  const elTutorialGuideUnitRole = document.getElementById('tutorialGuideUnitRole');
  const elTutorialGuideUnitNotes = document.getElementById('tutorialGuideUnitNotes');
  const elTutorialGuideTaskWrap = document.getElementById('tutorialGuideTaskWrap');
  const elTutorialGuideTaskText = document.getElementById('tutorialGuideTaskText');
  const elTutorialGuideTaskStatus = document.getElementById('tutorialGuideTaskStatus');
  const elTutorialPrevBtn = document.getElementById('tutorialPrevBtn');
  const elTutorialAutoBtn = document.getElementById('tutorialAutoBtn');
  const elTutorialSkipTaskBtn = document.getElementById('tutorialSkipTaskBtn');
  const elTutorialNextBtn = document.getElementById('tutorialNextBtn');
  const elTutorialExitBtn = document.getElementById('tutorialExitBtn');
  const elTutorialToggleUiBtn = document.getElementById('tutorialToggleUiBtn');
  const elTutorialMinBtn = document.getElementById('tutorialMinBtn');

  // --- State
  const state = {
    introOpen: true,
    introTutorialOpen: false,
    tutorial: {
      active: false,
      autoplay: false,
      showSidePanel: false,
      minimized: false,
      stepIndex: 0,
      timers: [],
      visual: {
        focusKeys: [],
        destinationKeys: [],
        paths: [],
      },
      task: {
        active: false,
        type: '',
        text: '',
        targetKeys: [],
        sourceKeys: [],
        destinationKeys: [],
        enemyKeys: [],
        progress: {},
        done: false,
      },
      unitIdByName: {},
    },

    mode: 'edit', // 'edit' | 'play'
    tool: 'units', // 'units' | 'terrain'

    editSide: 'blue',
    editType: 'inf',
    editQuality: 'green',
    editErase: false,
    editTerrain: 'clear',

    // Play
    gameMode: 'hvai', // 'hvai' | 'online'
    aiDifficulty: 'standard', // 'easy' | 'standard' | 'hard'
    humanSide: 'blue', // 'blue' | 'red'
    forwardAxis: 'vertical', // 'vertical' | 'horizontal' | 'diag_tl_br' | 'diag_tr_bl'
    lineAdvanceDirection: 'ur', // 'e' | 'w' | 'ur' | 'ul' | 'dr' | 'dl' (legacy: forward/backward/left/right)
    turn: 1,
    turnSerial: 1,
    side: 'blue',
    actsUsed: 0,
    actedUnitIds: new Set(),

    // Visual toggles
    showCommand: true,
    terrainTheme: 'battlefield',

    selectedKey: null,

    // Current activation context (only while a unit is selected in Play)
    // {
    //   unitId, committed, moved, attacked, healed, inCommandStart, moveSpent,
    //   postAttackWithdrawOnly, postAttackPursuitOnly, postAttackSixShiftOnly
    // }
    act: null,

    victoryMode: 'decapitation',
    initialUP: { blue: 0, red: 0 },
    capturedUP: { blue: 0, red: 0 },

    gameOver: false,
    winner: null,

    // Minimal "event trace" (future UI can display this without changing rules)
    events: [],
    // Structured replay/event hook stream for future AI + multiplayer + replay.
    // Keep this compact and serializable.
    eventTrace: [],

    lastImport: null, // { source, at }
    aiBusy: false,
    aiTimer: null,
    aiQueuedFollowup: null,
    combatBusy: false,
    combatBusyUntil: 0,
    moveAnim: null,
    moveAnimUntil: 0,
    attackFlash: null,
    animFrame: null,
    lastCombat: null,
    loadedScenarioName: RANDOM_START_SCENARIO_NAME,
    loadedScenarioSides: { blue: 'Blue Army', red: 'Red Army', named: false },
    loadedScenarioMeta: { description: '', historical: '', notes: '', pointTarget: null },
    ordersPreviewSide: 'blue',
    enemyDirectiveNotice: null, // { text, atSerial }

    draft: {
      active: false,
      mode: 'off', // 'off' | 'visible' | 'fog'
      budget: DRAFT_BUDGET_DEFAULT,
      remaining: { blue: 0, red: 0 },
      done: { blue: false, red: false },
      side: 'blue',
      reveal: true,
    },

    online: {
      seats: { host: 'blue', guest: 'red' },
      guestPreferredSide: 'red',
      guestParityPick: 'odds', // 'odds' | 'evens'
      lastInitiativeRoll: null,
      lastInitiativeFirstSide: null,
      lastInitiativeGuestWon: null,
    },

    doctrine: {
      commandPhaseOpen: false,
      commandIssuedThisTurn: false,
      selectedCommandId: '',
      activeCommandThisTurn: null,
      // Active targeting state for "Use Directive":
      // lets players select one or more units before confirming.
      targeting: {
        active: false,
        commandId: '',
        eligibleUnitIds: [],
        selectedUnitIds: [],
      },
      // Temporary resolver context (set only while resolving one command).
      // Used to honor manual target picks when a command supports multi-target use.
      resolveCtx: null,
      bySide: {
        blue: null,
        red: null,
      },
      history: [],
      longEffects: [],
      // temporary effect maps keyed by unitId or side
      effects: {
        bonusMove: {},
        bonusAttackDice: {},
        rangedBonusDice: {},
        meleeDefenseBonus: {},
        ignoreRetreatCount: {},
        ignoreAllRetreat: {},
        cannotMove: {},
        cannotAttack: {},
        commandOverrideUnitIds: {},
        counterchargeUnitIds: {},
        coverFireIgnoreTerrain: {},
        wingScreenUnitIds: {},
        driveThemBackUnitIds: {},
        commandRadiusBonusByGeneralId: {},
        reserveReleaseUnitIds: {},
      },
      builder: {
        open: false,
        side: 'blue',
        preBattleReady: false,
        confirmed: { blue: false, red: false },
        focusCommandId: '',
        draft: {
          blue: [],
          red: [],
        },
      },
    },

    scenarioObjectives: [],
    objectiveCheckpointTurn: 8,
    objectiveLastSummary: null,

    last: 'Booting…',
  };

  const net = {
    peer: null,
    conn: null,
    isHost: false,
    connected: false,
    myCode: '',
    remoteCode: '',
    status: 'Not connected.',
    applyingRemoteSnapshot: false,
  };

  const ONLINE_CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const ONLINE_CODE_LENGTH = 4;
  const ONLINE_PEER_PREFIX = 'cyb-';

  function ensureDoctrineEffectMaps() {
    if (!state.doctrine.effects || typeof state.doctrine.effects !== 'object') {
      state.doctrine.effects = {};
    }
    const maps = [
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
    ];
    for (const k of maps) {
      if (!state.doctrine.effects[k] || typeof state.doctrine.effects[k] !== 'object') {
        state.doctrine.effects[k] = {};
      }
    }
  }

  function clearDoctrineTurnEffects() {
    ensureDoctrineEffectMaps();
    state.doctrine.effects.bonusMove = {};
    state.doctrine.effects.bonusAttackDice = {};
    state.doctrine.effects.rangedBonusDice = {};
    state.doctrine.effects.meleeDefenseBonus = {};
    state.doctrine.effects.ignoreRetreatCount = {};
    state.doctrine.effects.ignoreAllRetreat = {};
    state.doctrine.effects.cannotMove = {};
    state.doctrine.effects.cannotAttack = {};
    state.doctrine.effects.commandOverrideUnitIds = {};
    state.doctrine.effects.counterchargeUnitIds = {};
    state.doctrine.effects.coverFireIgnoreTerrain = {};
    state.doctrine.effects.wingScreenUnitIds = {};
    state.doctrine.effects.driveThemBackUnitIds = {};
    state.doctrine.effects.commandRadiusBonusByGeneralId = {};
    state.doctrine.effects.reserveReleaseUnitIds = {};
  }

  function ensureDoctrineStateInitialized(force = false) {
    if (force || !state.doctrine.bySide.blue) {
      state.doctrine.bySide.blue = buildDoctrineByIds(buildCompleteDoctrineLoadout(makeRecommendedDoctrineLoadout()), 'recommended');
    }
    if (force || !state.doctrine.bySide.red) {
      state.doctrine.bySide.red = buildDoctrineByIds(buildCompleteDoctrineLoadout(makeRecommendedDoctrineLoadout()), 'recommended');
    }
  }

  function doctrineStateForSide(side) {
    ensureDoctrineStateInitialized(false);
    if (side !== 'blue' && side !== 'red') return null;
    return state.doctrine.bySide[side];
  }

  function clearDoctrineLoadoutForSide(side, source = 'blank') {
    if (side !== 'blue' && side !== 'red') return;
    const blank = makeDoctrineSideState();
    blank.source = source;
    state.doctrine.bySide[side] = blank;
  }

  function setDoctrineLoadoutForSide(side, ids, source = 'manual', opts = {}) {
    if (side !== 'blue' && side !== 'red') return false;
    const strict = !!opts.strict;
    const normalized = strict ? cloneArray(ids) : buildCompleteDoctrineLoadout(ids);
    if (!validateDoctrineLoadout(normalized)) return false;
    state.doctrine.bySide[side] = buildDoctrineByIds(normalized, source);
    return true;
  }

  function commandEntryForSide(side, commandId) {
    const ds = doctrineStateForSide(side);
    if (!ds || !ds.byId[commandId]) return null;
    return ds.byId[commandId];
  }

  function isCommandAvailableForUse(side, commandId) {
    const cmd = COMMAND_BY_ID.get(commandId);
    if (!cmd) return false;
    const entry = commandEntryForSide(side, commandId);
    if (!entry) return false;
    if (entry.spent) return false;
    if (state.doctrine.commandIssuedThisTurn) return false;
    if (cmd.cost > (ACT_LIMIT - state.actsUsed)) return false;
    return true;
  }

  function markCommandUsed(side, commandId) {
    const cmd = COMMAND_BY_ID.get(commandId);
    const entry = commandEntryForSide(side, commandId);
    if (!cmd || !entry) return false;

    entry.revealed = true;
    entry.usedCount = (entry.usedCount || 0) + 1;
    if (cmd.persistence === 'spent') entry.spent = true;

    const rec = {
      turn: state.turn,
      side,
      id: cmd.id,
      name: cmd.name,
      cost: cmd.cost,
      persistence: cmd.persistence,
      spent: !!entry.spent,
      at: Date.now(),
    };
    doctrineStateForSide(side).history.push(rec);
    state.doctrine.history.push(rec);
    pushEventTrace('command.used', {
      commandId: cmd.id,
      name: cmd.name,
      side,
      cost: cmd.cost,
      persistence: cmd.persistence,
      revealed: true,
      spent: !!entry.spent,
      usedCount: entry.usedCount,
    });
    return true;
  }

  function openCommandPhaseForCurrentTurn() {
    pruneExpiredDoctrineLongEffects();
    state.doctrine.commandPhaseOpen = false;
    state.doctrine.commandIssuedThisTurn = false;
    state.doctrine.selectedCommandId = '';
    state.doctrine.activeCommandThisTurn = null;
    clearDoctrineTargeting();
    clearDoctrineTurnEffects();
  }

  function closeCommandPhase() {
    state.doctrine.selectedCommandId = '';
  }

  function clearDoctrineTargeting() {
    state.doctrine.targeting.active = false;
    state.doctrine.targeting.commandId = '';
    state.doctrine.targeting.eligibleUnitIds = [];
    state.doctrine.targeting.selectedUnitIds = [];
  }

  function doctrineTargetLimits(commandId) {
    return COMMAND_TARGET_LIMITS[commandId] || { min: 0, max: Infinity };
  }

  function currentDoctrineTargetingEntries() {
    if (!state.doctrine.targeting.active) return [];
    const side = state.side;
    const selected = new Set(state.doctrine.targeting.selectedUnitIds || []);
    if (!selected.size) return [];
    const out = [];
    for (const [hk, u] of unitsByHex) {
      if (!u || u.side !== side) continue;
      if (!selected.has(u.id)) continue;
      out.push({ key: hk, unit: u, hex: board.byKey.get(hk) });
    }
    return out;
  }

  function beginDoctrineTargeting(commandId) {
    if (!commandId) return false;
    if (!isCommandAvailableForUse(state.side, commandId)) {
      log('That directive is not currently available.');
      updateHud();
      return false;
    }
    const legal = legalDoctrineTargets(state.side, commandId);
    const eligibleIds = [];
    const seen = new Set();
    for (const t of legal) {
      if (!t || !t.unitId || seen.has(t.unitId)) continue;
      seen.add(t.unitId);
      eligibleIds.push(t.unitId);
    }
    if (!eligibleIds.length) {
      log('No eligible units for that directive right now.');
      updateHud();
      return false;
    }
    state.doctrine.targeting.active = true;
    state.doctrine.targeting.commandId = commandId;
    state.doctrine.targeting.eligibleUnitIds = eligibleIds;
    state.doctrine.targeting.selectedUnitIds = [];
    state.doctrine.selectedCommandId = commandId;
    clearSelection();
    const cmd = COMMAND_BY_ID.get(commandId);
    const limits = doctrineTargetLimits(commandId);
    const rangeTxt = Number.isFinite(limits.max)
      ? `${limits.min}-${limits.max}`
      : `${limits.min}+`;
    log(
      `${cmd?.name || 'Directive'} target mode: select eligible unit(s) on the board ` +
      `(recommended ${rangeTxt}), then press Confirm Directive.`
    );
    updateHud();
    return true;
  }

  function cancelDoctrineTargeting(reason = '') {
    if (!state.doctrine.targeting.active) return;
    clearDoctrineTargeting();
    if (reason) log(reason);
    updateHud();
  }

  function toggleDoctrineTargetUnitAt(hexKey) {
    if (!state.doctrine.targeting.active) return false;
    const u = unitsByHex.get(hexKey);
    if (!u || u.side !== state.side) return false;
    const eligibleSet = new Set(state.doctrine.targeting.eligibleUnitIds || []);
    if (!eligibleSet.has(u.id)) return false;

    const current = new Set(state.doctrine.targeting.selectedUnitIds || []);
    if (current.has(u.id)) {
      current.delete(u.id);
    } else {
      const limits = doctrineTargetLimits(state.doctrine.targeting.commandId);
      if (Number.isFinite(limits.max) && current.size >= limits.max) {
        log(`This directive allows at most ${limits.max} selected unit(s).`);
        updateHud();
        return true;
      }
      current.add(u.id);
    }
    state.doctrine.targeting.selectedUnitIds = [...current];
    updateHud();
    return true;
  }

  function doctrineTargetIneligibleReason(hexKey) {
    if (!state.doctrine.targeting.active) return 'This unit is not eligible for the selected directive.';
    const commandId = String(state.doctrine.targeting.commandId || '');
    const cmd = COMMAND_BY_ID.get(commandId);
    const unit = unitsByHex.get(hexKey);
    if (!unit) return `No unit at ${hexKey}.`;
    if (unit.side !== state.side) return 'Select a friendly unit.';

    if (commandId === 'spur_horses') {
      if (unit.type !== 'cav') return 'Spur the Horses targets cavalry only.';
      if (!inCommandAt(hexKey, state.side)) return 'That cavalry is out of command for Spur the Horses.';
    }

    return `This unit is not eligible for ${cmd?.name || 'the selected directive'} right now.`;
  }

  function confirmDoctrineTargetingOrExecute(commandId, options = {}) {
    const cmdId = String(commandId || '');
    if (!cmdId) return false;
    if (!state.doctrine.targeting.active || state.doctrine.targeting.commandId !== cmdId) {
      return beginDoctrineTargeting(cmdId);
    }
    let selected = Array.isArray(state.doctrine.targeting.selectedUnitIds)
      ? state.doctrine.targeting.selectedUnitIds.slice()
      : [];
    const limits = doctrineTargetLimits(cmdId);
    if (limits.min > 0 && selected.length === 0) {
      log(`Select at least ${limits.min} unit(s), then press Confirm Directive.`);
      updateHud();
      return false;
    }
    if (selected.length > 0 && selected.length < limits.min) {
      log(
        `Select at least ${limits.min} unit(s) for this directive ` +
        `(${selected.length} selected), then press Confirm Directive.`
      );
      updateHud();
      return false;
    }
    const issueOpts = { ...options };
    if (selected.length) issueOpts.selectedUnitIds = selected;
    else delete issueOpts.selectedUnitIds;
    const ok = issueDoctrineCommand(cmdId, issueOpts);
    if (!ok) {
      const cmd = COMMAND_BY_ID.get(cmdId);
      log(
        `Directive not committed: ${cmd?.name || 'selected directive'}. ` +
        `${selected.length ? 'Adjust targets and confirm again.' : 'Try selecting units manually, then confirm.'}`
      );
      updateHud();
    }
    return ok;
  }

  function activeResolverSelectionIds(side) {
    const ctx = state.doctrine.resolveCtx;
    if (!ctx || ctx.side !== side) return null;
    if (!(ctx.selectedIds instanceof Set) || ctx.selectedIds.size === 0) return null;
    // Normalize for both numeric and string comparisons.
    const normalized = new Set();
    for (const raw of ctx.selectedIds) {
      const n = Number(raw);
      if (Number.isFinite(n)) normalized.add(n);
      const s = String(raw ?? '').trim();
      if (s) normalized.add(s);
    }
    return normalized.size ? normalized : null;
  }

  function addDoctrineLongEffect(effect) {
    if (!effect || typeof effect !== 'object') return;
    state.doctrine.longEffects.push({
      ...effect,
      expiresOnSide: effect.expiresOnSide || state.side,
      expiresAfterSerial: Number.isFinite(effect.expiresAfterSerial) ? effect.expiresAfterSerial : state.turnSerial,
    });
  }

  function pruneExpiredDoctrineLongEffects() {
    state.doctrine.longEffects = state.doctrine.longEffects.filter((eff) => {
      if (!eff) return false;
      if (state.side !== eff.expiresOnSide) return true;
      return state.turnSerial <= eff.expiresAfterSerial;
    });
  }

  function doctrineLongEffectValue(mapName, unitId, side = null) {
    let total = 0;
    for (const eff of state.doctrine.longEffects) {
      if (!eff || eff.map !== mapName) continue;
      if (side && eff.side && eff.side !== side) continue;
      if (unitId != null && eff.unitId != null && eff.unitId !== unitId) continue;
      total += Number(eff.value || 0);
    }
    return total;
  }

  function doctrineLongEffectFlag(mapName, unitId, side = null) {
    for (const eff of state.doctrine.longEffects) {
      if (!eff || eff.map !== mapName) continue;
      if (side && eff.side && eff.side !== side) continue;
      if (unitId != null && eff.unitId != null && eff.unitId !== unitId) continue;
      if (eff.value) return true;
    }
    return false;
  }

  // --- Board model
  function key(q, r) { return `${q},${r}`; }

  function buildBoardFromRows(rows) {
    const active = [];
    const activeSet = new Set();
    let minQ = Infinity, maxQ = -Infinity, minR = Infinity, maxR = -Infinity;

    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      for (let q = row.qStart; q < row.qStart + row.len; q++) {
        const k = key(q, r);
        active.push({ q, r, k, terrain: 'clear', cx: 0, cy: 0, neigh: [] });
        activeSet.add(k);
        minQ = Math.min(minQ, q);
        maxQ = Math.max(maxQ, q);
        minR = Math.min(minR, r);
        maxR = Math.max(maxR, r);
      }
    }

    const byKey = new Map(active.map(h => [h.k, h]));

    // Precompute ACTIVE neighbors (movement & adjacency checks)
    for (const h of active) {
      const deltas = (h.r & 1) ? NEIGH_ODD : NEIGH_EVEN;
      h.neigh = [];
      for (const [dq, dr] of deltas) {
        const nk = key(h.q + dq, h.r + dr);
        if (activeSet.has(nk)) h.neigh.push(nk);
      }
    }

    return { active, activeSet, byKey, minQ, maxQ, minR, maxR };
  }

  const board = buildBoardFromRows(DEFAULT_ROWS);

  // Units live in a Map keyed by hex key.
  const unitsByHex = new Map();
  let nextUnitId = 1;

  // --- Scenarios (tiny demos)
  // We keep the existing demos as placeholders; we can retune them into
  // "Even Lines / Encirclement / Corridor" once RB01 feels solid.
  const SCENARIOS = {
    'Empty (Island)': {
      terrain: [],
      units: [],
    },
    'Demo A — Line Clash': {
      terrain: [],
      units: [
        // Blue
        { q: 2, r: 5, side: 'blue', type: 'gen', quality: 'green' },
        { q: 3, r: 4, side: 'blue', type: 'inf', quality: 'green' },
        { q: 3, r: 6, side: 'blue', type: 'inf', quality: 'green' },
        { q: 4, r: 5, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 2, r: 4, side: 'blue', type: 'arc', quality: 'green' },
        { q: 2, r: 6, side: 'blue', type: 'skr', quality: 'green' },

        // Red
        { q: 13, r: 5, side: 'red', type: 'gen', quality: 'green' },
        { q: 12, r: 4, side: 'red', type: 'inf', quality: 'green' },
        { q: 12, r: 6, side: 'red', type: 'inf', quality: 'green' },
        { q: 11, r: 5, side: 'red', type: 'cav', quality: 'regular' },
        { q: 13, r: 4, side: 'red', type: 'arc', quality: 'green' },
        { q: 13, r: 6, side: 'red', type: 'skr', quality: 'green' },
      ],
    },
    'Demo B — Center Push': {
      terrain: [],
      units: [
        { q: 4, r: 4, side: 'blue', type: 'gen', quality: 'green' },
        { q: 4, r: 5, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 5, r: 6, side: 'blue', type: 'cav', quality: 'green' },
        { q: 3, r: 6, side: 'blue', type: 'arc', quality: 'green' },

        { q: 11, r: 6, side: 'red', type: 'gen', quality: 'green' },
        { q: 10, r: 5, side: 'red', type: 'inf', quality: 'regular' },
        { q: 9, r: 4, side: 'red', type: 'cav', quality: 'green' },
        { q: 12, r: 4, side: 'red', type: 'arc', quality: 'green' },
      ],
    },
    'Demo C — Skirmisher Screen': {
      terrain: [],
      units: [
        { q: 2, r: 5, side: 'blue', type: 'gen', quality: 'green' },
        { q: 3, r: 5, side: 'blue', type: 'inf', quality: 'green' },
        { q: 4, r: 5, side: 'blue', type: 'cav', quality: 'green' },
        { q: 3, r: 4, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 3, r: 6, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 1, r: 5, side: 'blue', type: 'arc', quality: 'green' },

        { q: 13, r: 5, side: 'red', type: 'gen', quality: 'green' },
        { q: 12, r: 5, side: 'red', type: 'inf', quality: 'green' },
        { q: 11, r: 5, side: 'red', type: 'cav', quality: 'green' },
        { q: 12, r: 4, side: 'red', type: 'skr', quality: 'regular' },
        { q: 12, r: 6, side: 'red', type: 'skr', quality: 'regular' },
        { q: 14, r: 5, side: 'red', type: 'arc', quality: 'green' },
      ],
    },
    [GUIDED_TUTORIAL_SCENARIO_NAME]: {
      terrain: [
        { q: 4, r: 4, terrain: 'woods' },
        { q: 10, r: 6, terrain: 'woods' },
        { q: 5, r: 5, terrain: 'hills' },
        { q: 9, r: 5, terrain: 'hills' },
        { q: 6, r: 6, terrain: 'rough' },
        { q: 8, r: 4, terrain: 'rough' },
      ],
      units: [
        { q: 7, r: 2, side: 'blue', type: 'gen', quality: 'regular' },
        { q: 6, r: 2, side: 'blue', type: 'run', quality: 'green' },
        { q: 8, r: 2, side: 'blue', type: 'iat', quality: 'regular' },
        { q: 6, r: 3, side: 'blue', type: 'inf', quality: 'green' },
        { q: 7, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 8, r: 3, side: 'blue', type: 'inf', quality: 'veteran' },
        { q: 7, r: 4, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 8, r: 4, side: 'blue', type: 'inf', quality: 'veteran' },
        { q: 4, r: 3, side: 'blue', type: 'cav', quality: 'veteran' },
        { q: 5, r: 4, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 9, r: 3, side: 'blue', type: 'arc', quality: 'regular' },

        { q: 7, r: 8, side: 'red', type: 'gen', quality: 'regular' },
        { q: 8, r: 8, side: 'red', type: 'run', quality: 'green' },
        { q: 6, r: 8, side: 'red', type: 'iat', quality: 'regular' },
        { q: 6, r: 7, side: 'red', type: 'inf', quality: 'green' },
        { q: 7, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 8, r: 7, side: 'red', type: 'inf', quality: 'veteran' },
        { q: 6, r: 6, side: 'red', type: 'inf', quality: 'veteran' },
        { q: 7, r: 6, side: 'red', type: 'inf', quality: 'regular' },
        { q: 10, r: 7, side: 'red', type: 'cav', quality: 'veteran' },
        { q: 9, r: 6, side: 'red', type: 'skr', quality: 'regular' },
        { q: 5, r: 7, side: 'red', type: 'arc', quality: 'regular' },
      ],
      meta: {
        group: 'tutorial',
        lesson: 'general',
        size: 'small',
        terrain: 'mixed',
        description: 'Mirrored instructional line used by the guided piece tutorial.',
        sideLabels: { blue: 'Blue Trainees', red: 'Red Trainees', named: true },
      },
    },
  
    'Terrain G — Tuderberg Ring Ambush': {
      terrain: [
        { q: 2, r: 2, terrain: 'hills' },
        { q: 4, r: 2, terrain: 'hills' },
        { q: 6, r: 2, terrain: 'hills' },
        { q: 8, r: 2, terrain: 'hills' },
        { q: 10, r: 2, terrain: 'hills' },
        { q: 12, r: 2, terrain: 'hills' },
        { q: 14, r: 2, terrain: 'hills' },
        { q: 1, r: 8, terrain: 'hills' },
        { q: 3, r: 8, terrain: 'hills' },
        { q: 5, r: 8, terrain: 'hills' },
        { q: 7, r: 8, terrain: 'hills' },
        { q: 9, r: 8, terrain: 'hills' },
        { q: 11, r: 8, terrain: 'hills' },
        { q: 13, r: 8, terrain: 'hills' },
        { q: 0, r: 3, terrain: 'woods' },
        { q: 2, r: 3, terrain: 'woods' },
        { q: 4, r: 3, terrain: 'woods' },
        { q: 6, r: 3, terrain: 'woods' },
        { q: 8, r: 3, terrain: 'woods' },
        { q: 10, r: 3, terrain: 'woods' },
        { q: 12, r: 3, terrain: 'woods' },
        { q: 14, r: 3, terrain: 'woods' },
        { q: 0, r: 7, terrain: 'woods' },
        { q: 2, r: 7, terrain: 'woods' },
        { q: 4, r: 7, terrain: 'woods' },
        { q: 6, r: 7, terrain: 'woods' },
        { q: 8, r: 7, terrain: 'woods' },
        { q: 10, r: 7, terrain: 'woods' },
        { q: 12, r: 7, terrain: 'woods' },
        { q: 14, r: 7, terrain: 'woods' },
        { q: 2, r: 4, terrain: 'rough' },
        { q: 4, r: 4, terrain: 'rough' },
        { q: 6, r: 4, terrain: 'rough' },
        { q: 8, r: 4, terrain: 'rough' },
        { q: 10, r: 4, terrain: 'rough' },
        { q: 12, r: 4, terrain: 'rough' },
        { q: 1, r: 5, terrain: 'rough' },
        { q: 3, r: 5, terrain: 'rough' },
        { q: 5, r: 5, terrain: 'rough' },
        { q: 7, r: 5, terrain: 'rough' },
        { q: 9, r: 5, terrain: 'rough' },
        { q: 11, r: 5, terrain: 'rough' },
        { q: 13, r: 5, terrain: 'rough' },
        { q: 2, r: 6, terrain: 'rough' },
        { q: 4, r: 6, terrain: 'rough' },
        { q: 6, r: 6, terrain: 'rough' },
        { q: 8, r: 6, terrain: 'rough' },
        { q: 10, r: 6, terrain: 'rough' },
        { q: 12, r: 6, terrain: 'rough' },
      ],
      units: [
        { q: 1, r: 5, side: 'blue', type: 'gen', quality: 'regular' },
        { q: 13, r: 5, side: 'blue', type: 'gen', quality: 'regular' },
        { q: 7, r: 3, side: 'blue', type: 'run', quality: 'green' },
        { q: 2, r: 5, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 3, r: 5, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 4, r: 5, side: 'blue', type: 'inf', quality: 'veteran' },
        { q: 5, r: 5, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 6, r: 5, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 7, r: 5, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 8, r: 5, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 9, r: 5, side: 'blue', type: 'inf', quality: 'veteran' },
        { q: 10, r: 5, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 11, r: 5, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 12, r: 5, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 3, r: 4, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 5, r: 4, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 7, r: 4, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 9, r: 4, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 11, r: 4, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 3, r: 6, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 5, r: 6, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 7, r: 6, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 9, r: 6, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 11, r: 6, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 1, r: 4, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 1, r: 6, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 13, r: 4, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 13, r: 6, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 0, r: 4, side: 'blue', type: 'arc', quality: 'regular' },
        { q: 14, r: 6, side: 'blue', type: 'arc', quality: 'regular' },
        { q: 0, r: 5, side: 'blue', type: 'skr', quality: 'veteran' },
        { q: 14, r: 5, side: 'blue', type: 'skr', quality: 'veteran' },
        { q: 0, r: 6, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 14, r: 4, side: 'blue', type: 'cav', quality: 'regular' },

        { q: 7, r: 1, side: 'red', type: 'gen', quality: 'veteran' },
        { q: 7, r: 9, side: 'red', type: 'gen', quality: 'regular' },
        { q: 2, r: 2, side: 'red', type: 'arc', quality: 'veteran' },
        { q: 4, r: 2, side: 'red', type: 'arc', quality: 'regular' },
        { q: 6, r: 2, side: 'red', type: 'arc', quality: 'veteran' },
        { q: 8, r: 2, side: 'red', type: 'arc', quality: 'regular' },
        { q: 10, r: 2, side: 'red', type: 'arc', quality: 'veteran' },
        { q: 12, r: 2, side: 'red', type: 'arc', quality: 'regular' },
        { q: 14, r: 2, side: 'red', type: 'arc', quality: 'veteran' },
        { q: 1, r: 8, side: 'red', type: 'arc', quality: 'veteran' },
        { q: 3, r: 8, side: 'red', type: 'arc', quality: 'regular' },
        { q: 5, r: 8, side: 'red', type: 'arc', quality: 'veteran' },
        { q: 7, r: 8, side: 'red', type: 'arc', quality: 'regular' },
        { q: 9, r: 8, side: 'red', type: 'arc', quality: 'veteran' },
        { q: 11, r: 8, side: 'red', type: 'arc', quality: 'regular' },
        { q: 13, r: 8, side: 'red', type: 'arc', quality: 'veteran' },
        { q: 1, r: 3, side: 'red', type: 'skr', quality: 'veteran' },
        { q: 3, r: 3, side: 'red', type: 'skr', quality: 'veteran' },
        { q: 5, r: 3, side: 'red', type: 'skr', quality: 'veteran' },
        { q: 9, r: 3, side: 'red', type: 'skr', quality: 'veteran' },
        { q: 11, r: 3, side: 'red', type: 'skr', quality: 'veteran' },
        { q: 13, r: 3, side: 'red', type: 'skr', quality: 'veteran' },
        { q: 1, r: 7, side: 'red', type: 'skr', quality: 'veteran' },
        { q: 3, r: 7, side: 'red', type: 'skr', quality: 'veteran' },
        { q: 5, r: 7, side: 'red', type: 'skr', quality: 'veteran' },
        { q: 9, r: 7, side: 'red', type: 'skr', quality: 'veteran' },
        { q: 11, r: 7, side: 'red', type: 'skr', quality: 'veteran' },
        { q: 13, r: 7, side: 'red', type: 'skr', quality: 'veteran' },
        { q: 6, r: 1, side: 'red', type: 'inf', quality: 'veteran' },
        { q: 8, r: 1, side: 'red', type: 'inf', quality: 'veteran' },
        { q: 6, r: 9, side: 'red', type: 'inf', quality: 'veteran' },
        { q: 8, r: 9, side: 'red', type: 'inf', quality: 'veteran' },
        { q: 0, r: 3, side: 'red', type: 'cav', quality: 'green' },
        { q: 14, r: 7, side: 'red', type: 'cav', quality: 'green' },
      ],
    },

    'Terrain H — Feigned Retreat In The Narrows': {
      terrain: [
        { q: 0, r: 3, terrain: 'woods' },
        { q: 1, r: 3, terrain: 'woods' },
        { q: 2, r: 3, terrain: 'woods' },
        { q: 3, r: 3, terrain: 'woods' },
        { q: 0, r: 4, terrain: 'woods' },
        { q: 1, r: 4, terrain: 'woods' },
        { q: 2, r: 4, terrain: 'woods' },
        { q: 3, r: 4, terrain: 'woods' },
        { q: -1, r: 5, terrain: 'woods' },
        { q: 0, r: 5, terrain: 'woods' },
        { q: 1, r: 5, terrain: 'woods' },
        { q: 2, r: 5, terrain: 'woods' },
        { q: 0, r: 6, terrain: 'woods' },
        { q: 1, r: 6, terrain: 'woods' },
        { q: 2, r: 6, terrain: 'woods' },
        { q: 3, r: 6, terrain: 'woods' },
        { q: 0, r: 7, terrain: 'woods' },
        { q: 1, r: 7, terrain: 'woods' },
        { q: 2, r: 7, terrain: 'woods' },
        { q: 3, r: 7, terrain: 'woods' },
        { q: 1, r: 8, terrain: 'woods' },
        { q: 2, r: 8, terrain: 'woods' },
        { q: 3, r: 8, terrain: 'woods' },
        { q: 11, r: 3, terrain: 'woods' },
        { q: 12, r: 3, terrain: 'woods' },
        { q: 13, r: 3, terrain: 'woods' },
        { q: 14, r: 3, terrain: 'woods' },
        { q: 12, r: 4, terrain: 'woods' },
        { q: 13, r: 4, terrain: 'woods' },
        { q: 14, r: 4, terrain: 'woods' },
        { q: 15, r: 4, terrain: 'woods' },
        { q: 12, r: 5, terrain: 'woods' },
        { q: 13, r: 5, terrain: 'woods' },
        { q: 14, r: 5, terrain: 'woods' },
        { q: 15, r: 5, terrain: 'woods' },
        { q: 12, r: 6, terrain: 'woods' },
        { q: 13, r: 6, terrain: 'woods' },
        { q: 14, r: 6, terrain: 'woods' },
        { q: 15, r: 6, terrain: 'woods' },
        { q: 11, r: 7, terrain: 'woods' },
        { q: 12, r: 7, terrain: 'woods' },
        { q: 13, r: 7, terrain: 'woods' },
        { q: 14, r: 7, terrain: 'woods' },
        { q: 11, r: 8, terrain: 'woods' },
        { q: 12, r: 8, terrain: 'woods' },
        { q: 13, r: 8, terrain: 'woods' },
        { q: 14, r: 8, terrain: 'woods' },
        { q: 5, r: 4, terrain: 'rough' },
        { q: 6, r: 4, terrain: 'rough' },
        { q: 7, r: 4, terrain: 'rough' },
        { q: 8, r: 4, terrain: 'rough' },
        { q: 9, r: 4, terrain: 'rough' },
        { q: 10, r: 4, terrain: 'rough' },
        { q: 4, r: 5, terrain: 'rough' },
        { q: 5, r: 5, terrain: 'rough' },
        { q: 6, r: 5, terrain: 'rough' },
        { q: 7, r: 5, terrain: 'rough' },
        { q: 8, r: 5, terrain: 'rough' },
        { q: 9, r: 5, terrain: 'rough' },
        { q: 10, r: 5, terrain: 'rough' },
        { q: 11, r: 5, terrain: 'rough' },
        { q: 5, r: 6, terrain: 'rough' },
        { q: 6, r: 6, terrain: 'rough' },
        { q: 7, r: 6, terrain: 'rough' },
        { q: 8, r: 6, terrain: 'rough' },
        { q: 9, r: 6, terrain: 'rough' },
        { q: 10, r: 6, terrain: 'rough' },
        { q: 5, r: 8, terrain: 'hills' },
        { q: 6, r: 8, terrain: 'hills' },
        { q: 7, r: 8, terrain: 'hills' },
        { q: 8, r: 8, terrain: 'hills' },
        { q: 9, r: 8, terrain: 'hills' },
        { q: 10, r: 8, terrain: 'hills' },
        { q: 5, r: 9, terrain: 'hills' },
        { q: 6, r: 9, terrain: 'hills' },
        { q: 7, r: 9, terrain: 'hills' },
        { q: 8, r: 9, terrain: 'hills' },
        { q: 9, r: 9, terrain: 'hills' },
        { q: 6, r: 10, terrain: 'hills' },
        { q: 7, r: 10, terrain: 'hills' },
        { q: 8, r: 10, terrain: 'hills' },
      ],
      units: [
        { q: 5, r: 1, side: 'blue', type: 'gen', quality: 'regular' },
        { q: 9, r: 1, side: 'blue', type: 'gen', quality: 'regular' },
        { q: 7, r: 1, side: 'blue', type: 'run', quality: 'green' },
        { q: 4, r: 0, side: 'blue', type: 'arc', quality: 'regular' },
        { q: 7, r: 0, side: 'blue', type: 'arc', quality: 'regular' },
        { q: 10, r: 0, side: 'blue', type: 'arc', quality: 'regular' },
        { q: 3, r: 1, side: 'blue', type: 'cav', quality: 'veteran' },
        { q: 11, r: 1, side: 'blue', type: 'cav', quality: 'veteran' },
        { q: 1, r: 2, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 13, r: 2, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 2, r: 2, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 3, r: 2, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 4, r: 2, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 5, r: 2, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 6, r: 2, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 7, r: 2, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 8, r: 2, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 9, r: 2, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 10, r: 2, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 11, r: 2, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 12, r: 2, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 2, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 3, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 4, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 5, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 6, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 7, r: 3, side: 'blue', type: 'inf', quality: 'veteran' },
        { q: 8, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 9, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 10, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 11, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 1, r: 3, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 13, r: 3, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 4, r: 4, side: 'blue', type: 'skr', quality: 'green' },
        { q: 10, r: 4, side: 'blue', type: 'skr', quality: 'green' },

        { q: 7, r: 9, side: 'red', type: 'gen', quality: 'regular' },
        { q: 5, r: 9, side: 'red', type: 'gen', quality: 'regular' },
        { q: 11, r: 9, side: 'red', type: 'run', quality: 'green' },
        { q: 4, r: 5, side: 'red', type: 'inf', quality: 'regular' },
        { q: 5, r: 5, side: 'red', type: 'inf', quality: 'regular' },
        { q: 6, r: 5, side: 'red', type: 'inf', quality: 'regular' },
        { q: 7, r: 5, side: 'red', type: 'inf', quality: 'green' },
        { q: 8, r: 5, side: 'red', type: 'inf', quality: 'regular' },
        { q: 9, r: 5, side: 'red', type: 'inf', quality: 'regular' },
        { q: 10, r: 5, side: 'red', type: 'inf', quality: 'regular' },
        { q: 5, r: 4, side: 'red', type: 'inf', quality: 'green' },
        { q: 7, r: 4, side: 'red', type: 'inf', quality: 'green' },
        { q: 9, r: 4, side: 'red', type: 'inf', quality: 'green' },
        { q: 6, r: 4, side: 'red', type: 'skr', quality: 'veteran' },
        { q: 8, r: 4, side: 'red', type: 'skr', quality: 'regular' },
        { q: 3, r: 5, side: 'red', type: 'cav', quality: 'green' },
        { q: 11, r: 5, side: 'red', type: 'cav', quality: 'green' },
        { q: 3, r: 6, side: 'red', type: 'skr', quality: 'regular' },
        { q: 4, r: 6, side: 'red', type: 'skr', quality: 'regular' },
        { q: 10, r: 6, side: 'red', type: 'skr', quality: 'regular' },
        { q: 11, r: 6, side: 'red', type: 'skr', quality: 'regular' },
        { q: 5, r: 8, side: 'red', type: 'arc', quality: 'regular' },
        { q: 7, r: 8, side: 'red', type: 'arc', quality: 'veteran' },
        { q: 9, r: 8, side: 'red', type: 'arc', quality: 'veteran' },
        { q: 6, r: 9, side: 'red', type: 'arc', quality: 'regular' },
        { q: 8, r: 9, side: 'red', type: 'arc', quality: 'regular' },
        { q: 4, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 5, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 6, r: 7, side: 'red', type: 'inf', quality: 'veteran' },
        { q: 7, r: 7, side: 'red', type: 'inf', quality: 'veteran' },
        { q: 8, r: 7, side: 'red', type: 'inf', quality: 'veteran' },
        { q: 9, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 10, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 4, r: 8, side: 'red', type: 'cav', quality: 'veteran' },
        { q: 10, r: 8, side: 'red', type: 'cav', quality: 'regular' },
        { q: 2, r: 7, side: 'red', type: 'cav', quality: 'regular' },
      ],
    },

    'Terrain I — Veteran Ridge Breakthrough': {
      terrain: [
        { q: 4, r: 4, terrain: 'hills' },
        { q: 5, r: 4, terrain: 'hills' },
        { q: 6, r: 4, terrain: 'hills' },
        { q: 7, r: 4, terrain: 'hills' },
        { q: 8, r: 4, terrain: 'hills' },
        { q: 9, r: 4, terrain: 'hills' },
        { q: 10, r: 4, terrain: 'hills' },
        { q: 11, r: 4, terrain: 'hills' },
        { q: 3, r: 5, terrain: 'hills' },
        { q: 4, r: 5, terrain: 'hills' },
        { q: 5, r: 5, terrain: 'hills' },
        { q: 6, r: 5, terrain: 'hills' },
        { q: 7, r: 5, terrain: 'hills' },
        { q: 8, r: 5, terrain: 'hills' },
        { q: 9, r: 5, terrain: 'hills' },
        { q: 10, r: 5, terrain: 'hills' },
        { q: 11, r: 5, terrain: 'hills' },
        { q: 12, r: 5, terrain: 'hills' },
        { q: 4, r: 6, terrain: 'hills' },
        { q: 5, r: 6, terrain: 'hills' },
        { q: 6, r: 6, terrain: 'hills' },
        { q: 7, r: 6, terrain: 'hills' },
        { q: 8, r: 6, terrain: 'hills' },
        { q: 9, r: 6, terrain: 'hills' },
        { q: 10, r: 6, terrain: 'hills' },
        { q: 11, r: 6, terrain: 'hills' },
        { q: 5, r: 3, terrain: 'rough' },
        { q: 6, r: 3, terrain: 'rough' },
        { q: 7, r: 3, terrain: 'rough' },
        { q: 8, r: 3, terrain: 'rough' },
        { q: 9, r: 3, terrain: 'rough' },
        { q: 10, r: 3, terrain: 'rough' },
        { q: 2, r: 5, terrain: 'rough' },
        { q: 13, r: 5, terrain: 'rough' },
        { q: 5, r: 7, terrain: 'rough' },
        { q: 6, r: 7, terrain: 'rough' },
        { q: 7, r: 7, terrain: 'rough' },
        { q: 8, r: 7, terrain: 'rough' },
        { q: 9, r: 7, terrain: 'rough' },
        { q: 10, r: 7, terrain: 'rough' },
        { q: 1, r: 2, terrain: 'woods' },
        { q: 2, r: 2, terrain: 'woods' },
        { q: 3, r: 2, terrain: 'woods' },
        { q: 4, r: 2, terrain: 'woods' },
        { q: 0, r: 3, terrain: 'woods' },
        { q: 1, r: 3, terrain: 'woods' },
        { q: 2, r: 3, terrain: 'woods' },
        { q: 3, r: 3, terrain: 'woods' },
        { q: 0, r: 4, terrain: 'woods' },
        { q: 1, r: 4, terrain: 'woods' },
        { q: 2, r: 4, terrain: 'woods' },
        { q: 0, r: 6, terrain: 'woods' },
        { q: 1, r: 6, terrain: 'woods' },
        { q: 2, r: 6, terrain: 'woods' },
        { q: 0, r: 7, terrain: 'woods' },
        { q: 1, r: 7, terrain: 'woods' },
        { q: 2, r: 7, terrain: 'woods' },
        { q: 3, r: 7, terrain: 'woods' },
        { q: 1, r: 8, terrain: 'woods' },
        { q: 2, r: 8, terrain: 'woods' },
        { q: 3, r: 8, terrain: 'woods' },
        { q: 4, r: 8, terrain: 'woods' },
        { q: 11, r: 2, terrain: 'woods' },
        { q: 12, r: 2, terrain: 'woods' },
        { q: 13, r: 2, terrain: 'woods' },
        { q: 14, r: 2, terrain: 'woods' },
        { q: 11, r: 3, terrain: 'woods' },
        { q: 12, r: 3, terrain: 'woods' },
        { q: 13, r: 3, terrain: 'woods' },
        { q: 14, r: 3, terrain: 'woods' },
        { q: 13, r: 4, terrain: 'woods' },
        { q: 14, r: 4, terrain: 'woods' },
        { q: 15, r: 4, terrain: 'woods' },
        { q: 13, r: 6, terrain: 'woods' },
        { q: 14, r: 6, terrain: 'woods' },
        { q: 15, r: 6, terrain: 'woods' },
        { q: 11, r: 7, terrain: 'woods' },
        { q: 12, r: 7, terrain: 'woods' },
        { q: 13, r: 7, terrain: 'woods' },
        { q: 14, r: 7, terrain: 'woods' },
        { q: 11, r: 8, terrain: 'woods' },
        { q: 12, r: 8, terrain: 'woods' },
        { q: 13, r: 8, terrain: 'woods' },
        { q: 14, r: 8, terrain: 'woods' },
      ],
      units: [
        { q: 5, r: 1, side: 'blue', type: 'gen', quality: 'veteran' },
        { q: 9, r: 1, side: 'blue', type: 'gen', quality: 'regular' },
        { q: 7, r: 1, side: 'blue', type: 'run', quality: 'green' },
        { q: 3, r: 1, side: 'blue', type: 'arc', quality: 'veteran' },
        { q: 7, r: 0, side: 'blue', type: 'arc', quality: 'veteran' },
        { q: 11, r: 1, side: 'blue', type: 'arc', quality: 'regular' },
        { q: 1, r: 1, side: 'blue', type: 'cav', quality: 'veteran' },
        { q: 13, r: 1, side: 'blue', type: 'cav', quality: 'veteran' },
        { q: 1, r: 2, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 13, r: 2, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 2, r: 2, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 3, r: 2, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 4, r: 2, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 5, r: 2, side: 'blue', type: 'inf', quality: 'veteran' },
        { q: 6, r: 2, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 7, r: 2, side: 'blue', type: 'inf', quality: 'veteran' },
        { q: 8, r: 2, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 9, r: 2, side: 'blue', type: 'inf', quality: 'veteran' },
        { q: 10, r: 2, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 11, r: 2, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 12, r: 2, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 2, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 3, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 4, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 5, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 6, r: 3, side: 'blue', type: 'inf', quality: 'veteran' },
        { q: 7, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 8, r: 3, side: 'blue', type: 'inf', quality: 'veteran' },
        { q: 9, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 10, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 11, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 6, r: 4, side: 'blue', type: 'inf', quality: 'veteran' },
        { q: 8, r: 4, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 4, r: 4, side: 'blue', type: 'skr', quality: 'veteran' },
        { q: 10, r: 4, side: 'blue', type: 'skr', quality: 'veteran' },
        { q: 1, r: 3, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 13, r: 3, side: 'blue', type: 'skr', quality: 'regular' },

        { q: 9, r: 9, side: 'red', type: 'gen', quality: 'veteran' },
        { q: 5, r: 9, side: 'red', type: 'gen', quality: 'regular' },
        { q: 7, r: 9, side: 'red', type: 'run', quality: 'green' },
        { q: 3, r: 9, side: 'red', type: 'arc', quality: 'veteran' },
        { q: 7, r: 10, side: 'red', type: 'arc', quality: 'veteran' },
        { q: 11, r: 9, side: 'red', type: 'arc', quality: 'veteran' },
        { q: 1, r: 8, side: 'red', type: 'cav', quality: 'veteran' },
        { q: 13, r: 8, side: 'red', type: 'cav', quality: 'veteran' },
        { q: 2, r: 9, side: 'red', type: 'cav', quality: 'regular' },
        { q: 12, r: 9, side: 'red', type: 'cav', quality: 'regular' },
        { q: 2, r: 8, side: 'red', type: 'inf', quality: 'regular' },
        { q: 3, r: 8, side: 'red', type: 'inf', quality: 'regular' },
        { q: 4, r: 8, side: 'red', type: 'inf', quality: 'veteran' },
        { q: 5, r: 8, side: 'red', type: 'inf', quality: 'regular' },
        { q: 6, r: 8, side: 'red', type: 'inf', quality: 'regular' },
        { q: 7, r: 8, side: 'red', type: 'inf', quality: 'veteran' },
        { q: 8, r: 8, side: 'red', type: 'inf', quality: 'regular' },
        { q: 9, r: 8, side: 'red', type: 'inf', quality: 'regular' },
        { q: 10, r: 8, side: 'red', type: 'inf', quality: 'veteran' },
        { q: 11, r: 8, side: 'red', type: 'inf', quality: 'regular' },
        { q: 12, r: 8, side: 'red', type: 'inf', quality: 'regular' },
        { q: 2, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 3, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 4, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 5, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 6, r: 7, side: 'red', type: 'inf', quality: 'veteran' },
        { q: 7, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 8, r: 7, side: 'red', type: 'inf', quality: 'veteran' },
        { q: 9, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 10, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 11, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 6, r: 6, side: 'red', type: 'inf', quality: 'regular' },
        { q: 8, r: 6, side: 'red', type: 'inf', quality: 'regular' },
        { q: 5, r: 6, side: 'red', type: 'skr', quality: 'veteran' },
        { q: 9, r: 6, side: 'red', type: 'skr', quality: 'veteran' },
        { q: 0, r: 7, side: 'red', type: 'skr', quality: 'regular' },
        { q: 14, r: 7, side: 'red', type: 'skr', quality: 'regular' },
      ],
    },

    'Terrain J — Twin Fords Veteran Stand': {
      terrain: [
        { q: -1, r: 5, terrain: 'water' },
        { q: 0, r: 5, terrain: 'water' },
        { q: 1, r: 5, terrain: 'water' },
        { q: 2, r: 5, terrain: 'water' },
        { q: 3, r: 5, terrain: 'water' },
        { q: 4, r: 5, terrain: 'water' },
        { q: 5, r: 5, terrain: 'water' },
        { q: 7, r: 5, terrain: 'water' },
        { q: 9, r: 5, terrain: 'water' },
        { q: 10, r: 5, terrain: 'water' },
        { q: 11, r: 5, terrain: 'water' },
        { q: 12, r: 5, terrain: 'water' },
        { q: 13, r: 5, terrain: 'water' },
        { q: 14, r: 5, terrain: 'water' },
        { q: 15, r: 5, terrain: 'water' },
        { q: 4, r: 4, terrain: 'rough' },
        { q: 5, r: 4, terrain: 'rough' },
        { q: 6, r: 4, terrain: 'rough' },
        { q: 7, r: 4, terrain: 'rough' },
        { q: 8, r: 4, terrain: 'rough' },
        { q: 9, r: 4, terrain: 'rough' },
        { q: 10, r: 4, terrain: 'rough' },
        { q: 4, r: 6, terrain: 'rough' },
        { q: 5, r: 6, terrain: 'rough' },
        { q: 6, r: 6, terrain: 'rough' },
        { q: 7, r: 6, terrain: 'rough' },
        { q: 8, r: 6, terrain: 'rough' },
        { q: 9, r: 6, terrain: 'rough' },
        { q: 10, r: 6, terrain: 'rough' },
        { q: 1, r: 4, terrain: 'woods' },
        { q: 2, r: 4, terrain: 'woods' },
        { q: 3, r: 4, terrain: 'woods' },
        { q: 11, r: 4, terrain: 'woods' },
        { q: 12, r: 4, terrain: 'woods' },
        { q: 13, r: 4, terrain: 'woods' },
        { q: 14, r: 4, terrain: 'woods' },
        { q: 1, r: 6, terrain: 'woods' },
        { q: 2, r: 6, terrain: 'woods' },
        { q: 3, r: 6, terrain: 'woods' },
        { q: 11, r: 6, terrain: 'woods' },
        { q: 12, r: 6, terrain: 'woods' },
        { q: 13, r: 6, terrain: 'woods' },
        { q: 14, r: 6, terrain: 'woods' },
        { q: 4, r: 3, terrain: 'hills' },
        { q: 5, r: 3, terrain: 'hills' },
        { q: 6, r: 3, terrain: 'hills' },
        { q: 8, r: 3, terrain: 'hills' },
        { q: 9, r: 3, terrain: 'hills' },
        { q: 10, r: 3, terrain: 'hills' },
        { q: 4, r: 7, terrain: 'hills' },
        { q: 5, r: 7, terrain: 'hills' },
        { q: 6, r: 7, terrain: 'hills' },
        { q: 8, r: 7, terrain: 'hills' },
        { q: 9, r: 7, terrain: 'hills' },
        { q: 10, r: 7, terrain: 'hills' },
        { q: 6, r: 2, terrain: 'rough' },
        { q: 8, r: 2, terrain: 'rough' },
        { q: 6, r: 8, terrain: 'rough' },
        { q: 8, r: 8, terrain: 'rough' },
      ],
      units: [
        { q: 5, r: 1, side: 'blue', type: 'gen', quality: 'veteran' },
        { q: 9, r: 1, side: 'blue', type: 'gen', quality: 'regular' },
        { q: 7, r: 1, side: 'blue', type: 'run', quality: 'green' },
        { q: 4, r: 0, side: 'blue', type: 'arc', quality: 'veteran' },
        { q: 6, r: 0, side: 'blue', type: 'arc', quality: 'regular' },
        { q: 8, r: 0, side: 'blue', type: 'arc', quality: 'veteran' },
        { q: 10, r: 1, side: 'blue', type: 'arc', quality: 'regular' },
        { q: 1, r: 3, side: 'blue', type: 'cav', quality: 'veteran' },
        { q: 13, r: 3, side: 'blue', type: 'cav', quality: 'veteran' },
        { q: 2, r: 4, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 12, r: 4, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 2, r: 2, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 3, r: 2, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 4, r: 2, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 5, r: 2, side: 'blue', type: 'inf', quality: 'veteran' },
        { q: 6, r: 2, side: 'blue', type: 'inf', quality: 'veteran' },
        { q: 7, r: 2, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 8, r: 2, side: 'blue', type: 'inf', quality: 'veteran' },
        { q: 9, r: 2, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 10, r: 2, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 11, r: 2, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 12, r: 2, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 3, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 4, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 5, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 6, r: 3, side: 'blue', type: 'inf', quality: 'veteran' },
        { q: 7, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 8, r: 3, side: 'blue', type: 'inf', quality: 'veteran' },
        { q: 9, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 10, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 11, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 6, r: 4, side: 'blue', type: 'inf', quality: 'veteran' },
        { q: 7, r: 4, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 8, r: 4, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 5, r: 4, side: 'blue', type: 'skr', quality: 'veteran' },
        { q: 9, r: 4, side: 'blue', type: 'skr', quality: 'veteran' },
        { q: 1, r: 4, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 13, r: 4, side: 'blue', type: 'skr', quality: 'regular' },

        { q: 7, r: 9, side: 'red', type: 'gen', quality: 'regular' },
        { q: 5, r: 9, side: 'red', type: 'gen', quality: 'regular' },
        { q: 9, r: 9, side: 'red', type: 'run', quality: 'green' },
        { q: 4, r: 10, side: 'red', type: 'arc', quality: 'veteran' },
        { q: 6, r: 9, side: 'red', type: 'arc', quality: 'regular' },
        { q: 8, r: 10, side: 'red', type: 'arc', quality: 'veteran' },
        { q: 10, r: 9, side: 'red', type: 'arc', quality: 'regular' },
        { q: 1, r: 7, side: 'red', type: 'cav', quality: 'veteran' },
        { q: 13, r: 7, side: 'red', type: 'cav', quality: 'veteran' },
        { q: 2, r: 6, side: 'red', type: 'cav', quality: 'regular' },
        { q: 12, r: 6, side: 'red', type: 'cav', quality: 'regular' },
        { q: 2, r: 8, side: 'red', type: 'inf', quality: 'regular' },
        { q: 3, r: 8, side: 'red', type: 'inf', quality: 'regular' },
        { q: 4, r: 8, side: 'red', type: 'inf', quality: 'veteran' },
        { q: 5, r: 8, side: 'red', type: 'inf', quality: 'regular' },
        { q: 6, r: 8, side: 'red', type: 'inf', quality: 'regular' },
        { q: 7, r: 8, side: 'red', type: 'inf', quality: 'veteran' },
        { q: 8, r: 8, side: 'red', type: 'inf', quality: 'regular' },
        { q: 9, r: 8, side: 'red', type: 'inf', quality: 'regular' },
        { q: 10, r: 8, side: 'red', type: 'inf', quality: 'veteran' },
        { q: 11, r: 8, side: 'red', type: 'inf', quality: 'regular' },
        { q: 12, r: 8, side: 'red', type: 'inf', quality: 'regular' },
        { q: 3, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 4, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 5, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 6, r: 7, side: 'red', type: 'inf', quality: 'veteran' },
        { q: 7, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 8, r: 7, side: 'red', type: 'inf', quality: 'veteran' },
        { q: 9, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 10, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 11, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 6, r: 6, side: 'red', type: 'inf', quality: 'veteran' },
        { q: 7, r: 6, side: 'red', type: 'inf', quality: 'regular' },
        { q: 8, r: 6, side: 'red', type: 'inf', quality: 'veteran' },
        { q: 5, r: 6, side: 'red', type: 'skr', quality: 'veteran' },
        { q: 9, r: 6, side: 'red', type: 'skr', quality: 'veteran' },
        { q: 0, r: 7, side: 'red', type: 'skr', quality: 'regular' },
        { q: 14, r: 7, side: 'red', type: 'skr', quality: 'regular' },
      ],
    },

    'Terrain K — Marathon (490 BCE)': {
      terrain: [
        { q: 11, r: 0, terrain: 'water' },
        { q: 12, r: 0, terrain: 'water' },
        { q: 13, r: 0, terrain: 'water' },
        { q: 11, r: 1, terrain: 'water' },
        { q: 12, r: 1, terrain: 'water' },
        { q: 13, r: 1, terrain: 'water' },
        { q: 12, r: 2, terrain: 'water' },
        { q: 13, r: 2, terrain: 'water' },
        { q: 14, r: 2, terrain: 'water' },
        { q: 13, r: 3, terrain: 'water' },
        { q: 14, r: 3, terrain: 'water' },
        { q: 14, r: 4, terrain: 'water' },
        { q: 15, r: 4, terrain: 'water' },
        { q: 0, r: 3, terrain: 'rough' },
        { q: 1, r: 3, terrain: 'rough' },
        { q: 0, r: 4, terrain: 'rough' },
        { q: 1, r: 4, terrain: 'rough' },
        { q: -1, r: 5, terrain: 'rough' },
        { q: 0, r: 5, terrain: 'rough' },
        { q: 1, r: 5, terrain: 'rough' },
        { q: 0, r: 6, terrain: 'rough' },
        { q: 1, r: 6, terrain: 'rough' },
        { q: 12, r: 4, terrain: 'rough' },
        { q: 13, r: 4, terrain: 'rough' },
        { q: 12, r: 5, terrain: 'rough' },
        { q: 13, r: 5, terrain: 'rough' },
        { q: 3, r: 9, terrain: 'hills' },
        { q: 4, r: 9, terrain: 'hills' },
        { q: 10, r: 9, terrain: 'hills' },
        { q: 11, r: 9, terrain: 'hills' },
      ],
      units: [
        { q: 5, r: 9, side: 'blue', type: 'gen', quality: 'regular' },
        { q: 9, r: 9, side: 'blue', type: 'gen', quality: 'regular' },
        { q: 7, r: 9, side: 'blue', type: 'run', quality: 'green' },
        { q: 4, r: 10, side: 'blue', type: 'arc', quality: 'regular' },
        { q: 10, r: 10, side: 'blue', type: 'arc', quality: 'regular' },
        { q: 2, r: 9, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 12, r: 9, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 2, r: 7, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 12, r: 7, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 5, r: 7, side: 'blue', type: 'skr', quality: 'green' },
        { q: 9, r: 7, side: 'blue', type: 'skr', quality: 'green' },
        { q: 2, r: 8, side: 'blue', type: 'inf', quality: 'veteran' },
        { q: 3, r: 8, side: 'blue', type: 'inf', quality: 'veteran' },
        { q: 4, r: 8, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 5, r: 8, side: 'blue', type: 'inf', quality: 'green' },
        { q: 6, r: 8, side: 'blue', type: 'inf', quality: 'green' },
        { q: 7, r: 8, side: 'blue', type: 'inf', quality: 'green' },
        { q: 8, r: 8, side: 'blue', type: 'inf', quality: 'green' },
        { q: 9, r: 8, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 10, r: 8, side: 'blue', type: 'inf', quality: 'veteran' },
        { q: 11, r: 8, side: 'blue', type: 'inf', quality: 'veteran' },
        { q: 12, r: 8, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 3, r: 9, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 4, r: 9, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 6, r: 9, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 8, r: 9, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 10, r: 9, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 11, r: 9, side: 'blue', type: 'inf', quality: 'regular' },

        { q: 6, r: 1, side: 'red', type: 'gen', quality: 'regular' },
        { q: 10, r: 1, side: 'red', type: 'gen', quality: 'regular' },
        { q: 8, r: 1, side: 'red', type: 'run', quality: 'green' },
        { q: 1, r: 4, side: 'red', type: 'cav', quality: 'regular' },
        { q: 14, r: 4, side: 'red', type: 'cav', quality: 'regular' },
        { q: 15, r: 5, side: 'red', type: 'cav', quality: 'green' },
        { q: 3, r: 2, side: 'red', type: 'arc', quality: 'veteran' },
        { q: 5, r: 2, side: 'red', type: 'arc', quality: 'regular' },
        { q: 7, r: 2, side: 'red', type: 'arc', quality: 'regular' },
        { q: 9, r: 2, side: 'red', type: 'arc', quality: 'regular' },
        { q: 11, r: 2, side: 'red', type: 'arc', quality: 'regular' },
        { q: 13, r: 2, side: 'red', type: 'arc', quality: 'veteran' },
        { q: 6, r: 3, side: 'red', type: 'arc', quality: 'green' },
        { q: 10, r: 3, side: 'red', type: 'arc', quality: 'green' },
        { q: 2, r: 3, side: 'red', type: 'skr', quality: 'veteran' },
        { q: 14, r: 3, side: 'red', type: 'skr', quality: 'veteran' },
        { q: 3, r: 4, side: 'red', type: 'skr', quality: 'regular' },
        { q: 5, r: 4, side: 'red', type: 'skr', quality: 'regular' },
        { q: 11, r: 4, side: 'red', type: 'skr', quality: 'regular' },
        { q: 13, r: 4, side: 'red', type: 'skr', quality: 'regular' },
        { q: 4, r: 4, side: 'red', type: 'inf', quality: 'green' },
        { q: 6, r: 4, side: 'red', type: 'inf', quality: 'green' },
        { q: 7, r: 4, side: 'red', type: 'inf', quality: 'green' },
        { q: 8, r: 4, side: 'red', type: 'inf', quality: 'green' },
        { q: 9, r: 4, side: 'red', type: 'inf', quality: 'green' },
        { q: 10, r: 4, side: 'red', type: 'inf', quality: 'green' },
        { q: 4, r: 5, side: 'red', type: 'inf', quality: 'green' },
        { q: 5, r: 5, side: 'red', type: 'inf', quality: 'regular' },
        { q: 7, r: 5, side: 'red', type: 'inf', quality: 'regular' },
        { q: 8, r: 5, side: 'red', type: 'inf', quality: 'regular' },
        { q: 10, r: 5, side: 'red', type: 'inf', quality: 'regular' },
        { q: 11, r: 5, side: 'red', type: 'inf', quality: 'green' },
      ],
    },

    'Terrain L — Granicus River (334 BCE)': {
      terrain: [
        { q: -1, r: 5, terrain: 'water' },
        { q: 0, r: 5, terrain: 'water' },
        { q: 1, r: 5, terrain: 'water' },
        { q: 2, r: 5, terrain: 'water' },
        { q: 3, r: 5, terrain: 'water' },
        { q: 5, r: 5, terrain: 'water' },
        { q: 6, r: 5, terrain: 'water' },
        { q: 7, r: 5, terrain: 'water' },
        { q: 8, r: 5, terrain: 'water' },
        { q: 9, r: 5, terrain: 'water' },
        { q: 11, r: 5, terrain: 'water' },
        { q: 12, r: 5, terrain: 'water' },
        { q: 13, r: 5, terrain: 'water' },
        { q: 14, r: 5, terrain: 'water' },
        { q: 15, r: 5, terrain: 'water' },
        { q: 1, r: 4, terrain: 'rough' },
        { q: 2, r: 4, terrain: 'rough' },
        { q: 3, r: 4, terrain: 'rough' },
        { q: 5, r: 4, terrain: 'rough' },
        { q: 6, r: 4, terrain: 'rough' },
        { q: 7, r: 4, terrain: 'rough' },
        { q: 8, r: 4, terrain: 'rough' },
        { q: 9, r: 4, terrain: 'rough' },
        { q: 11, r: 4, terrain: 'rough' },
        { q: 12, r: 4, terrain: 'rough' },
        { q: 13, r: 4, terrain: 'rough' },
        { q: 1, r: 6, terrain: 'rough' },
        { q: 2, r: 6, terrain: 'rough' },
        { q: 3, r: 6, terrain: 'rough' },
        { q: 5, r: 6, terrain: 'rough' },
        { q: 6, r: 6, terrain: 'rough' },
        { q: 7, r: 6, terrain: 'rough' },
        { q: 8, r: 6, terrain: 'rough' },
        { q: 9, r: 6, terrain: 'rough' },
        { q: 11, r: 6, terrain: 'rough' },
        { q: 12, r: 6, terrain: 'rough' },
        { q: 13, r: 6, terrain: 'rough' },
        { q: 2, r: 2, terrain: 'hills' },
        { q: 4, r: 2, terrain: 'hills' },
        { q: 6, r: 2, terrain: 'hills' },
        { q: 8, r: 2, terrain: 'hills' },
        { q: 10, r: 2, terrain: 'hills' },
        { q: 12, r: 2, terrain: 'hills' },
        { q: 14, r: 2, terrain: 'hills' },
        { q: 5, r: 1, terrain: 'hills' },
        { q: 7, r: 1, terrain: 'hills' },
        { q: 9, r: 1, terrain: 'hills' },
        { q: 11, r: 1, terrain: 'hills' },
        { q: 0, r: 3, terrain: 'woods' },
        { q: 1, r: 3, terrain: 'woods' },
        { q: 13, r: 3, terrain: 'woods' },
        { q: 14, r: 3, terrain: 'woods' },
        { q: 0, r: 7, terrain: 'woods' },
        { q: 1, r: 7, terrain: 'woods' },
        { q: 13, r: 7, terrain: 'woods' },
        { q: 14, r: 7, terrain: 'woods' },
      ],
      units: [
        { q: 6, r: 10, side: 'blue', type: 'gen', quality: 'veteran' },
        { q: 10, r: 10, side: 'blue', type: 'gen', quality: 'regular' },
        { q: 8, r: 10, side: 'blue', type: 'run', quality: 'green' },
        { q: 3, r: 8, side: 'blue', type: 'cav', quality: 'veteran' },
        { q: 4, r: 8, side: 'blue', type: 'cav', quality: 'veteran' },
        { q: 5, r: 8, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 2, r: 9, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 11, r: 8, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 6, r: 8, side: 'blue', type: 'arc', quality: 'regular' },
        { q: 8, r: 8, side: 'blue', type: 'arc', quality: 'regular' },
        { q: 10, r: 8, side: 'blue', type: 'arc', quality: 'regular' },
        { q: 4, r: 7, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 8, r: 7, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 10, r: 7, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 12, r: 7, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 3, r: 9, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 4, r: 9, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 5, r: 9, side: 'blue', type: 'inf', quality: 'veteran' },
        { q: 6, r: 9, side: 'blue', type: 'inf', quality: 'veteran' },
        { q: 7, r: 9, side: 'blue', type: 'inf', quality: 'veteran' },
        { q: 8, r: 9, side: 'blue', type: 'inf', quality: 'veteran' },
        { q: 9, r: 9, side: 'blue', type: 'inf', quality: 'veteran' },
        { q: 10, r: 9, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 11, r: 7, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 12, r: 9, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 3, r: 10, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 5, r: 10, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 7, r: 10, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 9, r: 10, side: 'blue', type: 'inf', quality: 'regular' },

        { q: 6, r: 2, side: 'red', type: 'gen', quality: 'regular' },
        { q: 10, r: 2, side: 'red', type: 'gen', quality: 'regular' },
        { q: 8, r: 2, side: 'red', type: 'run', quality: 'green' },
        { q: 3, r: 4, side: 'red', type: 'cav', quality: 'veteran' },
        { q: 4, r: 4, side: 'red', type: 'cav', quality: 'regular' },
        { q: 5, r: 4, side: 'red', type: 'cav', quality: 'regular' },
        { q: 9, r: 4, side: 'red', type: 'cav', quality: 'regular' },
        { q: 10, r: 4, side: 'red', type: 'cav', quality: 'veteran' },
        { q: 11, r: 4, side: 'red', type: 'cav', quality: 'regular' },
        { q: 12, r: 4, side: 'red', type: 'cav', quality: 'regular' },
        { q: 4, r: 1, side: 'red', type: 'arc', quality: 'regular' },
        { q: 6, r: 1, side: 'red', type: 'arc', quality: 'regular' },
        { q: 8, r: 1, side: 'red', type: 'arc', quality: 'regular' },
        { q: 10, r: 1, side: 'red', type: 'arc', quality: 'regular' },
        { q: 12, r: 1, side: 'red', type: 'arc', quality: 'regular' },
        { q: 4, r: 2, side: 'red', type: 'arc', quality: 'veteran' },
        { q: 12, r: 2, side: 'red', type: 'arc', quality: 'veteran' },
        { q: 2, r: 4, side: 'red', type: 'skr', quality: 'regular' },
        { q: 6, r: 4, side: 'red', type: 'skr', quality: 'regular' },
        { q: 8, r: 4, side: 'red', type: 'skr', quality: 'regular' },
        { q: 13, r: 4, side: 'red', type: 'skr', quality: 'regular' },
        { q: 3, r: 3, side: 'red', type: 'skr', quality: 'veteran' },
        { q: 12, r: 3, side: 'red', type: 'skr', quality: 'veteran' },
        { q: 3, r: 2, side: 'red', type: 'inf', quality: 'regular' },
        { q: 5, r: 2, side: 'red', type: 'inf', quality: 'regular' },
        { q: 7, r: 2, side: 'red', type: 'inf', quality: 'regular' },
        { q: 9, r: 2, side: 'red', type: 'inf', quality: 'regular' },
        { q: 11, r: 2, side: 'red', type: 'inf', quality: 'regular' },
        { q: 5, r: 3, side: 'red', type: 'inf', quality: 'green' },
        { q: 6, r: 3, side: 'red', type: 'inf', quality: 'green' },
        { q: 7, r: 3, side: 'red', type: 'inf', quality: 'green' },
        { q: 8, r: 3, side: 'red', type: 'inf', quality: 'green' },
        { q: 9, r: 3, side: 'red', type: 'inf', quality: 'green' },
      ],
    },

    'Terrain M — Cannae Double Envelopment (216 BCE)': {
      terrain: [
        { q: 13, r: 2, terrain: 'water' },
        { q: 14, r: 2, terrain: 'water' },
        { q: 14, r: 3, terrain: 'water' },
        { q: 15, r: 4, terrain: 'water' },
        { q: 15, r: 5, terrain: 'water' },
        { q: 15, r: 6, terrain: 'water' },
        { q: 14, r: 7, terrain: 'water' },
        { q: 14, r: 8, terrain: 'water' },
        { q: 13, r: 8, terrain: 'water' },
        { q: 0, r: 4, terrain: 'rough' },
        { q: 1, r: 4, terrain: 'rough' },
        { q: 0, r: 5, terrain: 'rough' },
        { q: 1, r: 5, terrain: 'rough' },
        { q: 2, r: 5, terrain: 'rough' },
        { q: 0, r: 6, terrain: 'rough' },
        { q: 1, r: 6, terrain: 'rough' },
        { q: 5, r: 1, terrain: 'hills' },
        { q: 7, r: 1, terrain: 'hills' },
        { q: 9, r: 1, terrain: 'hills' },
        { q: 11, r: 1, terrain: 'hills' },
      ],
      units: [
        { q: 6, r: 10, side: 'blue', type: 'gen', quality: 'regular' },
        { q: 9, r: 10, side: 'blue', type: 'gen', quality: 'regular' },
        { q: 7, r: 10, side: 'blue', type: 'run', quality: 'green' },
        { q: 3, r: 10, side: 'blue', type: 'arc', quality: 'green' },
        { q: 11, r: 10, side: 'blue', type: 'arc', quality: 'green' },
        { q: 2, r: 9, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 12, r: 9, side: 'blue', type: 'cav', quality: 'green' },
        { q: 2, r: 7, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 3, r: 7, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 11, r: 7, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 12, r: 7, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 3, r: 9, side: 'blue', type: 'inf', quality: 'green' },
        { q: 4, r: 9, side: 'blue', type: 'inf', quality: 'green' },
        { q: 5, r: 9, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 6, r: 9, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 7, r: 9, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 8, r: 9, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 9, r: 9, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 10, r: 9, side: 'blue', type: 'inf', quality: 'green' },
        { q: 11, r: 9, side: 'blue', type: 'inf', quality: 'green' },
        { q: 2, r: 8, side: 'blue', type: 'inf', quality: 'green' },
        { q: 3, r: 8, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 4, r: 8, side: 'blue', type: 'inf', quality: 'green' },
        { q: 5, r: 8, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 6, r: 8, side: 'blue', type: 'inf', quality: 'veteran' },
        { q: 7, r: 8, side: 'blue', type: 'inf', quality: 'veteran' },
        { q: 8, r: 8, side: 'blue', type: 'inf', quality: 'veteran' },
        { q: 9, r: 8, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 10, r: 8, side: 'blue', type: 'inf', quality: 'green' },
        { q: 11, r: 8, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 12, r: 8, side: 'blue', type: 'inf', quality: 'green' },
        { q: 4, r: 7, side: 'blue', type: 'inf', quality: 'green' },
        { q: 5, r: 7, side: 'blue', type: 'inf', quality: 'green' },
        { q: 6, r: 7, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 7, r: 7, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 8, r: 7, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 9, r: 7, side: 'blue', type: 'inf', quality: 'green' },
        { q: 10, r: 7, side: 'blue', type: 'inf', quality: 'green' },

        { q: 6, r: 1, side: 'red', type: 'gen', quality: 'regular' },
        { q: 9, r: 1, side: 'red', type: 'gen', quality: 'regular' },
        { q: 7, r: 1, side: 'red', type: 'run', quality: 'green' },
        { q: 1, r: 4, side: 'red', type: 'cav', quality: 'veteran' },
        { q: 2, r: 4, side: 'red', type: 'cav', quality: 'veteran' },
        { q: 3, r: 4, side: 'red', type: 'cav', quality: 'regular' },
        { q: 12, r: 4, side: 'red', type: 'cav', quality: 'veteran' },
        { q: 13, r: 4, side: 'red', type: 'cav', quality: 'regular' },
        { q: 5, r: 2, side: 'red', type: 'arc', quality: 'regular' },
        { q: 7, r: 2, side: 'red', type: 'arc', quality: 'regular' },
        { q: 9, r: 2, side: 'red', type: 'arc', quality: 'regular' },
        { q: 11, r: 2, side: 'red', type: 'arc', quality: 'regular' },
        { q: 4, r: 3, side: 'red', type: 'skr', quality: 'regular' },
        { q: 7, r: 3, side: 'red', type: 'skr', quality: 'regular' },
        { q: 10, r: 3, side: 'red', type: 'skr', quality: 'regular' },
        { q: 4, r: 4, side: 'red', type: 'inf', quality: 'veteran' },
        { q: 5, r: 4, side: 'red', type: 'inf', quality: 'regular' },
        { q: 6, r: 4, side: 'red', type: 'inf', quality: 'green' },
        { q: 7, r: 4, side: 'red', type: 'inf', quality: 'green' },
        { q: 8, r: 4, side: 'red', type: 'inf', quality: 'green' },
        { q: 9, r: 4, side: 'red', type: 'inf', quality: 'regular' },
        { q: 10, r: 4, side: 'red', type: 'inf', quality: 'veteran' },
        { q: 3, r: 5, side: 'red', type: 'inf', quality: 'veteran' },
        { q: 4, r: 5, side: 'red', type: 'inf', quality: 'regular' },
        { q: 5, r: 5, side: 'red', type: 'inf', quality: 'regular' },
        { q: 6, r: 5, side: 'red', type: 'inf', quality: 'green' },
        { q: 7, r: 5, side: 'red', type: 'inf', quality: 'green' },
        { q: 8, r: 5, side: 'red', type: 'inf', quality: 'green' },
        { q: 9, r: 5, side: 'red', type: 'inf', quality: 'regular' },
        { q: 10, r: 5, side: 'red', type: 'inf', quality: 'regular' },
        { q: 11, r: 5, side: 'red', type: 'inf', quality: 'veteran' },
      ],
    },

    'Terrain N — Pharsalus Reserve Counterstroke (48 BCE)': {
      terrain: [
        { q: 0, r: 4, terrain: 'rough' },
        { q: 1, r: 4, terrain: 'rough' },
        { q: 2, r: 4, terrain: 'rough' },
        { q: 0, r: 5, terrain: 'rough' },
        { q: 1, r: 5, terrain: 'rough' },
        { q: 2, r: 5, terrain: 'rough' },
        { q: 3, r: 5, terrain: 'rough' },
        { q: 0, r: 6, terrain: 'rough' },
        { q: 1, r: 6, terrain: 'rough' },
        { q: 2, r: 6, terrain: 'rough' },
        { q: 5, r: 3, terrain: 'hills' },
        { q: 6, r: 3, terrain: 'hills' },
        { q: 7, r: 3, terrain: 'hills' },
        { q: 8, r: 3, terrain: 'hills' },
        { q: 9, r: 3, terrain: 'hills' },
        { q: 12, r: 5, terrain: 'woods' },
        { q: 13, r: 5, terrain: 'woods' },
        { q: 14, r: 5, terrain: 'woods' },
        { q: 12, r: 6, terrain: 'woods' },
        { q: 13, r: 6, terrain: 'woods' },
        { q: 14, r: 6, terrain: 'woods' },
        { q: 10, r: 8, terrain: 'rough' },
        { q: 11, r: 8, terrain: 'rough' },
        { q: 12, r: 8, terrain: 'rough' },
        { q: 10, r: 7, terrain: 'hills' },
        { q: 11, r: 7, terrain: 'hills' },
      ],
      units: [
        { q: 5, r: 10, side: 'blue', type: 'gen', quality: 'veteran' },
        { q: 9, r: 10, side: 'blue', type: 'gen', quality: 'regular' },
        { q: 7, r: 10, side: 'blue', type: 'run', quality: 'green' },
        { q: 3, r: 9, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 11, r: 9, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 12, r: 9, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 4, r: 10, side: 'blue', type: 'arc', quality: 'regular' },
        { q: 8, r: 10, side: 'blue', type: 'arc', quality: 'regular' },
        { q: 10, r: 10, side: 'blue', type: 'arc', quality: 'green' },
        { q: 2, r: 8, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 4, r: 7, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 9, r: 7, side: 'blue', type: 'skr', quality: 'green' },
        { q: 13, r: 7, side: 'blue', type: 'skr', quality: 'green' },
        { q: 3, r: 8, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 4, r: 8, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 5, r: 8, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 6, r: 8, side: 'blue', type: 'inf', quality: 'veteran' },
        { q: 7, r: 8, side: 'blue', type: 'inf', quality: 'veteran' },
        { q: 8, r: 8, side: 'blue', type: 'inf', quality: 'veteran' },
        { q: 10, r: 8, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 11, r: 8, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 4, r: 9, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 5, r: 9, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 6, r: 9, side: 'blue', type: 'inf', quality: 'veteran' },
        { q: 7, r: 9, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 8, r: 9, side: 'blue', type: 'inf', quality: 'veteran' },
        { q: 9, r: 9, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 10, r: 9, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 10, r: 7, side: 'blue', type: 'inf', quality: 'veteran' },
        { q: 11, r: 7, side: 'blue', type: 'inf', quality: 'veteran' },
        { q: 12, r: 7, side: 'blue', type: 'inf', quality: 'regular' },

        { q: 6, r: 1, side: 'red', type: 'gen', quality: 'regular' },
        { q: 10, r: 1, side: 'red', type: 'gen', quality: 'regular' },
        { q: 8, r: 1, side: 'red', type: 'run', quality: 'green' },
        { q: 2, r: 3, side: 'red', type: 'cav', quality: 'regular' },
        { q: 10, r: 3, side: 'red', type: 'cav', quality: 'regular' },
        { q: 11, r: 3, side: 'red', type: 'cav', quality: 'veteran' },
        { q: 12, r: 3, side: 'red', type: 'cav', quality: 'veteran' },
        { q: 13, r: 3, side: 'red', type: 'cav', quality: 'veteran' },
        { q: 14, r: 3, side: 'red', type: 'cav', quality: 'regular' },
        { q: 4, r: 1, side: 'red', type: 'arc', quality: 'regular' },
        { q: 6, r: 2, side: 'red', type: 'arc', quality: 'regular' },
        { q: 8, r: 2, side: 'red', type: 'arc', quality: 'green' },
        { q: 12, r: 1, side: 'red', type: 'arc', quality: 'regular' },
        { q: 1, r: 4, side: 'red', type: 'skr', quality: 'regular' },
        { q: 3, r: 3, side: 'red', type: 'skr', quality: 'regular' },
        { q: 5, r: 3, side: 'red', type: 'skr', quality: 'regular' },
        { q: 9, r: 3, side: 'red', type: 'skr', quality: 'regular' },
        { q: 4, r: 3, side: 'red', type: 'inf', quality: 'regular' },
        { q: 6, r: 3, side: 'red', type: 'inf', quality: 'regular' },
        { q: 7, r: 3, side: 'red', type: 'inf', quality: 'regular' },
        { q: 8, r: 3, side: 'red', type: 'inf', quality: 'regular' },
        { q: 3, r: 4, side: 'red', type: 'inf', quality: 'regular' },
        { q: 4, r: 4, side: 'red', type: 'inf', quality: 'regular' },
        { q: 5, r: 4, side: 'red', type: 'inf', quality: 'regular' },
        { q: 6, r: 4, side: 'red', type: 'inf', quality: 'green' },
        { q: 7, r: 4, side: 'red', type: 'inf', quality: 'green' },
        { q: 8, r: 4, side: 'red', type: 'inf', quality: 'green' },
        { q: 9, r: 4, side: 'red', type: 'inf', quality: 'regular' },
        { q: 10, r: 4, side: 'red', type: 'inf', quality: 'regular' },
        { q: 11, r: 4, side: 'red', type: 'inf', quality: 'regular' },
        { q: 4, r: 5, side: 'red', type: 'inf', quality: 'green' },
        { q: 6, r: 5, side: 'red', type: 'inf', quality: 'green' },
        { q: 8, r: 5, side: 'red', type: 'inf', quality: 'green' },
      ],
    },

    'Terrain O — Zama (202 BCE)': {
      terrain: [
        { q: 1, r: 2, terrain: 'woods' },
        { q: 2, r: 2, terrain: 'woods' },
        { q: 1, r: 3, terrain: 'woods' },
        { q: 2, r: 3, terrain: 'woods' },
        { q: 12, r: 7, terrain: 'woods' },
        { q: 13, r: 7, terrain: 'woods' },
        { q: 12, r: 8, terrain: 'woods' },
        { q: 13, r: 8, terrain: 'woods' },
        { q: 6, r: 4, terrain: 'rough' },
        { q: 8, r: 4, terrain: 'rough' },
        { q: 5, r: 5, terrain: 'rough' },
        { q: 6, r: 5, terrain: 'rough' },
        { q: 8, r: 5, terrain: 'rough' },
        { q: 9, r: 5, terrain: 'rough' },
        { q: 6, r: 6, terrain: 'rough' },
        { q: 8, r: 6, terrain: 'rough' },
        { q: 3, r: 9, terrain: 'hills' },
        { q: 4, r: 9, terrain: 'hills' },
        { q: 10, r: 9, terrain: 'hills' },
        { q: 11, r: 9, terrain: 'hills' },
      ],
      units: [
        { q: 5, r: 10, side: 'blue', type: 'gen', quality: 'regular' },
        { q: 9, r: 10, side: 'blue', type: 'gen', quality: 'regular' },
        { q: 7, r: 10, side: 'blue', type: 'run', quality: 'green' },
        { q: 2, r: 9, side: 'blue', type: 'cav', quality: 'veteran' },
        { q: 3, r: 9, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 11, r: 9, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 12, r: 9, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 4, r: 10, side: 'blue', type: 'arc', quality: 'regular' },
        { q: 6, r: 10, side: 'blue', type: 'arc', quality: 'veteran' },
        { q: 8, r: 10, side: 'blue', type: 'arc', quality: 'regular' },
        { q: 10, r: 10, side: 'blue', type: 'arc', quality: 'regular' },
        { q: 5, r: 9, side: 'blue', type: 'skr', quality: 'veteran' },
        { q: 9, r: 9, side: 'blue', type: 'skr', quality: 'veteran' },
        { q: 4, r: 8, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 7, r: 8, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 10, r: 8, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 4, r: 9, side: 'blue', type: 'inf', quality: 'veteran' },
        { q: 6, r: 9, side: 'blue', type: 'inf', quality: 'veteran' },
        { q: 8, r: 9, side: 'blue', type: 'inf', quality: 'veteran' },
        { q: 10, r: 9, side: 'blue', type: 'inf', quality: 'veteran' },
        { q: 3, r: 8, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 5, r: 8, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 6, r: 8, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 8, r: 8, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 9, r: 8, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 11, r: 8, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 4, r: 7, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 6, r: 7, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 8, r: 7, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 10, r: 7, side: 'blue', type: 'inf', quality: 'regular' },

        { q: 6, r: 1, side: 'red', type: 'gen', quality: 'regular' },
        { q: 10, r: 1, side: 'red', type: 'gen', quality: 'regular' },
        { q: 8, r: 1, side: 'red', type: 'run', quality: 'green' },
        { q: 2, r: 3, side: 'red', type: 'cav', quality: 'regular' },
        { q: 3, r: 3, side: 'red', type: 'cav', quality: 'regular' },
        { q: 12, r: 3, side: 'red', type: 'cav', quality: 'regular' },
        { q: 13, r: 3, side: 'red', type: 'cav', quality: 'veteran' },
        { q: 4, r: 1, side: 'red', type: 'arc', quality: 'regular' },
        { q: 7, r: 1, side: 'red', type: 'arc', quality: 'regular' },
        { q: 9, r: 1, side: 'red', type: 'arc', quality: 'regular' },
        { q: 11, r: 1, side: 'red', type: 'arc', quality: 'veteran' },
        { q: 4, r: 2, side: 'red', type: 'skr', quality: 'regular' },
        { q: 6, r: 2, side: 'red', type: 'skr', quality: 'veteran' },
        { q: 8, r: 2, side: 'red', type: 'skr', quality: 'regular' },
        { q: 10, r: 2, side: 'red', type: 'skr', quality: 'veteran' },
        { q: 12, r: 2, side: 'red', type: 'skr', quality: 'regular' },
        { q: 5, r: 3, side: 'red', type: 'inf', quality: 'veteran' },
        { q: 7, r: 3, side: 'red', type: 'inf', quality: 'veteran' },
        { q: 9, r: 3, side: 'red', type: 'inf', quality: 'veteran' },
        { q: 11, r: 3, side: 'red', type: 'inf', quality: 'veteran' },
        { q: 4, r: 4, side: 'red', type: 'inf', quality: 'regular' },
        { q: 5, r: 4, side: 'red', type: 'inf', quality: 'regular' },
        { q: 6, r: 4, side: 'red', type: 'inf', quality: 'regular' },
        { q: 7, r: 4, side: 'red', type: 'inf', quality: 'regular' },
        { q: 8, r: 4, side: 'red', type: 'inf', quality: 'regular' },
        { q: 9, r: 4, side: 'red', type: 'inf', quality: 'regular' },
        { q: 10, r: 4, side: 'red', type: 'inf', quality: 'regular' },
        { q: 11, r: 4, side: 'red', type: 'inf', quality: 'regular' },
        { q: 6, r: 5, side: 'red', type: 'inf', quality: 'regular' },
        { q: 9, r: 5, side: 'red', type: 'inf', quality: 'regular' },
      ],
    },

    'Terrain P — Ilipa Reverse Deployment (206 BCE)': {
      terrain: [
        { q: 0, r: 4, terrain: 'woods' },
        { q: 1, r: 4, terrain: 'woods' },
        { q: 2, r: 4, terrain: 'woods' },
        { q: 0, r: 5, terrain: 'woods' },
        { q: 1, r: 5, terrain: 'woods' },
        { q: 2, r: 5, terrain: 'woods' },
        { q: 0, r: 6, terrain: 'woods' },
        { q: 1, r: 6, terrain: 'woods' },
        { q: 2, r: 6, terrain: 'woods' },
        { q: 12, r: 3, terrain: 'woods' },
        { q: 13, r: 3, terrain: 'woods' },
        { q: 14, r: 3, terrain: 'woods' },
        { q: 12, r: 4, terrain: 'woods' },
        { q: 13, r: 4, terrain: 'woods' },
        { q: 14, r: 4, terrain: 'woods' },
        { q: 12, r: 5, terrain: 'woods' },
        { q: 13, r: 5, terrain: 'woods' },
        { q: 14, r: 5, terrain: 'woods' },
        { q: 4, r: 5, terrain: 'rough' },
        { q: 5, r: 5, terrain: 'rough' },
        { q: 6, r: 5, terrain: 'rough' },
        { q: 8, r: 5, terrain: 'rough' },
        { q: 9, r: 5, terrain: 'rough' },
        { q: 10, r: 5, terrain: 'rough' },
        { q: 5, r: 6, terrain: 'rough' },
        { q: 6, r: 6, terrain: 'rough' },
        { q: 8, r: 6, terrain: 'rough' },
        { q: 9, r: 6, terrain: 'rough' },
        { q: 5, r: 1, terrain: 'hills' },
        { q: 7, r: 1, terrain: 'hills' },
        { q: 9, r: 1, terrain: 'hills' },
        { q: 11, r: 1, terrain: 'hills' },
        { q: 4, r: 9, terrain: 'hills' },
        { q: 6, r: 9, terrain: 'hills' },
        { q: 8, r: 9, terrain: 'hills' },
        { q: 10, r: 9, terrain: 'hills' },
      ],
      units: [
        { q: 5, r: 10, side: 'blue', type: 'gen', quality: 'regular' },
        { q: 9, r: 10, side: 'blue', type: 'gen', quality: 'regular' },
        { q: 7, r: 10, side: 'blue', type: 'run', quality: 'green' },
        { q: 1, r: 8, side: 'blue', type: 'cav', quality: 'veteran' },
        { q: 2, r: 8, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 12, r: 8, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 13, r: 8, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 4, r: 10, side: 'blue', type: 'arc', quality: 'regular' },
        { q: 8, r: 10, side: 'blue', type: 'arc', quality: 'regular' },
        { q: 10, r: 10, side: 'blue', type: 'arc', quality: 'regular' },
        { q: 6, r: 10, side: 'blue', type: 'arc', quality: 'veteran' },
        { q: 3, r: 7, side: 'blue', type: 'skr', quality: 'veteran' },
        { q: 11, r: 7, side: 'blue', type: 'skr', quality: 'veteran' },
        { q: 5, r: 8, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 7, r: 8, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 9, r: 8, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 3, r: 8, side: 'blue', type: 'inf', quality: 'veteran' },
        { q: 4, r: 8, side: 'blue', type: 'inf', quality: 'veteran' },
        { q: 10, r: 8, side: 'blue', type: 'inf', quality: 'veteran' },
        { q: 11, r: 8, side: 'blue', type: 'inf', quality: 'veteran' },
        { q: 4, r: 9, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 5, r: 9, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 6, r: 9, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 7, r: 9, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 8, r: 9, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 9, r: 9, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 10, r: 9, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 6, r: 8, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 8, r: 8, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 7, r: 7, side: 'blue', type: 'inf', quality: 'regular' },

        { q: 6, r: 1, side: 'red', type: 'gen', quality: 'regular' },
        { q: 10, r: 1, side: 'red', type: 'gen', quality: 'regular' },
        { q: 8, r: 1, side: 'red', type: 'run', quality: 'green' },
        { q: 1, r: 3, side: 'red', type: 'cav', quality: 'regular' },
        { q: 2, r: 3, side: 'red', type: 'cav', quality: 'regular' },
        { q: 12, r: 3, side: 'red', type: 'cav', quality: 'regular' },
        { q: 13, r: 3, side: 'red', type: 'cav', quality: 'veteran' },
        { q: 4, r: 1, side: 'red', type: 'arc', quality: 'regular' },
        { q: 7, r: 1, side: 'red', type: 'arc', quality: 'regular' },
        { q: 9, r: 1, side: 'red', type: 'arc', quality: 'regular' },
        { q: 11, r: 1, side: 'red', type: 'arc', quality: 'veteran' },
        { q: 5, r: 3, side: 'red', type: 'skr', quality: 'veteran' },
        { q: 11, r: 3, side: 'red', type: 'skr', quality: 'veteran' },
        { q: 6, r: 2, side: 'red', type: 'skr', quality: 'regular' },
        { q: 8, r: 2, side: 'red', type: 'skr', quality: 'regular' },
        { q: 10, r: 2, side: 'red', type: 'skr', quality: 'regular' },
        { q: 6, r: 3, side: 'red', type: 'inf', quality: 'veteran' },
        { q: 7, r: 3, side: 'red', type: 'inf', quality: 'veteran' },
        { q: 8, r: 3, side: 'red', type: 'inf', quality: 'veteran' },
        { q: 9, r: 3, side: 'red', type: 'inf', quality: 'veteran' },
        { q: 4, r: 4, side: 'red', type: 'inf', quality: 'regular' },
        { q: 5, r: 4, side: 'red', type: 'inf', quality: 'regular' },
        { q: 6, r: 4, side: 'red', type: 'inf', quality: 'regular' },
        { q: 7, r: 4, side: 'red', type: 'inf', quality: 'regular' },
        { q: 8, r: 4, side: 'red', type: 'inf', quality: 'regular' },
        { q: 9, r: 4, side: 'red', type: 'inf', quality: 'regular' },
        { q: 10, r: 4, side: 'red', type: 'inf', quality: 'regular' },
        { q: 11, r: 4, side: 'red', type: 'inf', quality: 'regular' },
        { q: 7, r: 5, side: 'red', type: 'inf', quality: 'regular' },
        { q: 8, r: 5, side: 'red', type: 'inf', quality: 'regular' },
      ],
    },

    'Terrain Q — Carhae (Carrhae, 53 BCE)': {
      terrain: [
        { q: 4, r: 4, terrain: 'rough' },
        { q: 6, r: 4, terrain: 'rough' },
        { q: 8, r: 4, terrain: 'rough' },
        { q: 10, r: 4, terrain: 'rough' },
        { q: 2, r: 5, terrain: 'rough' },
        { q: 3, r: 5, terrain: 'rough' },
        { q: 5, r: 5, terrain: 'rough' },
        { q: 7, r: 5, terrain: 'rough' },
        { q: 9, r: 5, terrain: 'rough' },
        { q: 11, r: 5, terrain: 'rough' },
        { q: 12, r: 5, terrain: 'rough' },
        { q: 4, r: 6, terrain: 'rough' },
        { q: 6, r: 6, terrain: 'rough' },
        { q: 8, r: 6, terrain: 'rough' },
        { q: 10, r: 6, terrain: 'rough' },
        { q: 2, r: 2, terrain: 'hills' },
        { q: 12, r: 8, terrain: 'hills' },
      ],
      units: [
        { q: 6, r: 10, side: 'blue', type: 'gen', quality: 'regular' },
        { q: 9, r: 10, side: 'blue', type: 'gen', quality: 'regular' },
        { q: 7, r: 10, side: 'blue', type: 'run', quality: 'green' },
        { q: 2, r: 9, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 12, r: 9, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 1, r: 8, side: 'blue', type: 'cav', quality: 'green' },
        { q: 6, r: 7, side: 'blue', type: 'arc', quality: 'regular' },
        { q: 8, r: 7, side: 'blue', type: 'arc', quality: 'regular' },
        { q: 5, r: 7, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 9, r: 7, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 3, r: 9, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 4, r: 9, side: 'blue', type: 'inf', quality: 'veteran' },
        { q: 5, r: 9, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 6, r: 9, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 7, r: 9, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 8, r: 9, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 9, r: 9, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 10, r: 9, side: 'blue', type: 'inf', quality: 'veteran' },
        { q: 11, r: 9, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 3, r: 8, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 4, r: 8, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 5, r: 8, side: 'blue', type: 'inf', quality: 'veteran' },
        { q: 6, r: 8, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 7, r: 8, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 8, r: 8, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 9, r: 8, side: 'blue', type: 'inf', quality: 'veteran' },
        { q: 10, r: 8, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 11, r: 8, side: 'blue', type: 'inf', quality: 'regular' },

        { q: 6, r: 1, side: 'red', type: 'gen', quality: 'regular' },
        { q: 10, r: 1, side: 'red', type: 'gen', quality: 'regular' },
        { q: 8, r: 1, side: 'red', type: 'run', quality: 'green' },
        { q: 1, r: 3, side: 'red', type: 'cav', quality: 'veteran' },
        { q: 2, r: 4, side: 'red', type: 'cav', quality: 'veteran' },
        { q: 12, r: 3, side: 'red', type: 'cav', quality: 'veteran' },
        { q: 13, r: 4, side: 'red', type: 'cav', quality: 'veteran' },
        { q: 0, r: 4, side: 'red', type: 'cav', quality: 'regular' },
        { q: 3, r: 2, side: 'red', type: 'cav', quality: 'regular' },
        { q: 11, r: 2, side: 'red', type: 'cav', quality: 'regular' },
        { q: 14, r: 4, side: 'red', type: 'cav', quality: 'regular' },
        { q: 4, r: 2, side: 'red', type: 'arc', quality: 'veteran' },
        { q: 10, r: 2, side: 'red', type: 'arc', quality: 'veteran' },
        { q: 5, r: 2, side: 'red', type: 'arc', quality: 'regular' },
        { q: 7, r: 2, side: 'red', type: 'arc', quality: 'regular' },
        { q: 9, r: 2, side: 'red', type: 'arc', quality: 'regular' },
        { q: 12, r: 2, side: 'red', type: 'arc', quality: 'regular' },
        { q: 2, r: 3, side: 'red', type: 'skr', quality: 'veteran' },
        { q: 4, r: 3, side: 'red', type: 'skr', quality: 'veteran' },
        { q: 10, r: 3, side: 'red', type: 'skr', quality: 'veteran' },
        { q: 12, r: 4, side: 'red', type: 'skr', quality: 'veteran' },
        { q: 3, r: 3, side: 'red', type: 'skr', quality: 'regular' },
        { q: 5, r: 3, side: 'red', type: 'skr', quality: 'regular' },
        { q: 9, r: 3, side: 'red', type: 'skr', quality: 'regular' },
        { q: 11, r: 4, side: 'red', type: 'skr', quality: 'regular' },
        { q: 6, r: 3, side: 'red', type: 'inf', quality: 'regular' },
        { q: 8, r: 3, side: 'red', type: 'inf', quality: 'green' },
      ],
    },

    'Terrain R — Thapsus Coastal Pressure (46 BCE)': {
      terrain: [
        { q: 14, r: 3, terrain: 'water' },
        { q: 15, r: 4, terrain: 'water' },
        { q: 15, r: 5, terrain: 'water' },
        { q: 15, r: 6, terrain: 'water' },
        { q: 14, r: 7, terrain: 'water' },
        { q: 13, r: 8, terrain: 'water' },
        { q: 4, r: 5, terrain: 'rough' },
        { q: 5, r: 5, terrain: 'rough' },
        { q: 6, r: 5, terrain: 'rough' },
        { q: 7, r: 5, terrain: 'rough' },
        { q: 8, r: 5, terrain: 'rough' },
        { q: 9, r: 5, terrain: 'rough' },
        { q: 10, r: 5, terrain: 'rough' },
        { q: 11, r: 5, terrain: 'rough' },
        { q: 5, r: 6, terrain: 'rough' },
        { q: 6, r: 6, terrain: 'rough' },
        { q: 8, r: 6, terrain: 'rough' },
        { q: 9, r: 6, terrain: 'rough' },
        { q: 1, r: 6, terrain: 'hills' },
        { q: 2, r: 6, terrain: 'hills' },
        { q: 1, r: 7, terrain: 'hills' },
        { q: 2, r: 7, terrain: 'hills' },
        { q: 11, r: 8, terrain: 'woods' },
        { q: 12, r: 8, terrain: 'woods' },
        { q: 11, r: 9, terrain: 'woods' },
        { q: 12, r: 9, terrain: 'woods' },
      ],
      units: [
        { q: 5, r: 10, side: 'blue', type: 'gen', quality: 'regular' },
        { q: 9, r: 10, side: 'blue', type: 'gen', quality: 'regular' },
        { q: 7, r: 10, side: 'blue', type: 'run', quality: 'green' },
        { q: 2, r: 8, side: 'blue', type: 'cav', quality: 'veteran' },
        { q: 3, r: 8, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 11, r: 8, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 12, r: 8, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 4, r: 10, side: 'blue', type: 'arc', quality: 'regular' },
        { q: 6, r: 10, side: 'blue', type: 'arc', quality: 'veteran' },
        { q: 8, r: 10, side: 'blue', type: 'arc', quality: 'regular' },
        { q: 10, r: 10, side: 'blue', type: 'arc', quality: 'regular' },
        { q: 4, r: 7, side: 'blue', type: 'skr', quality: 'veteran' },
        { q: 10, r: 7, side: 'blue', type: 'skr', quality: 'veteran' },
        { q: 5, r: 8, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 7, r: 8, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 9, r: 8, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 4, r: 9, side: 'blue', type: 'inf', quality: 'veteran' },
        { q: 6, r: 9, side: 'blue', type: 'inf', quality: 'veteran' },
        { q: 8, r: 9, side: 'blue', type: 'inf', quality: 'veteran' },
        { q: 10, r: 9, side: 'blue', type: 'inf', quality: 'veteran' },
        { q: 3, r: 9, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 5, r: 9, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 7, r: 9, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 9, r: 9, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 11, r: 9, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 4, r: 8, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 6, r: 8, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 8, r: 8, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 10, r: 8, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 7, r: 7, side: 'blue', type: 'inf', quality: 'regular' },

        { q: 6, r: 1, side: 'red', type: 'gen', quality: 'regular' },
        { q: 10, r: 1, side: 'red', type: 'gen', quality: 'regular' },
        { q: 8, r: 1, side: 'red', type: 'run', quality: 'green' },
        { q: 2, r: 4, side: 'red', type: 'cav', quality: 'regular' },
        { q: 3, r: 4, side: 'red', type: 'cav', quality: 'regular' },
        { q: 12, r: 4, side: 'red', type: 'cav', quality: 'veteran' },
        { q: 13, r: 4, side: 'red', type: 'cav', quality: 'regular' },
        { q: 4, r: 1, side: 'red', type: 'arc', quality: 'regular' },
        { q: 7, r: 1, side: 'red', type: 'arc', quality: 'regular' },
        { q: 9, r: 1, side: 'red', type: 'arc', quality: 'regular' },
        { q: 11, r: 1, side: 'red', type: 'arc', quality: 'veteran' },
        { q: 5, r: 2, side: 'red', type: 'skr', quality: 'veteran' },
        { q: 11, r: 2, side: 'red', type: 'skr', quality: 'veteran' },
        { q: 6, r: 2, side: 'red', type: 'skr', quality: 'regular' },
        { q: 8, r: 2, side: 'red', type: 'skr', quality: 'regular' },
        { q: 10, r: 2, side: 'red', type: 'skr', quality: 'regular' },
        { q: 5, r: 3, side: 'red', type: 'inf', quality: 'veteran' },
        { q: 7, r: 3, side: 'red', type: 'inf', quality: 'veteran' },
        { q: 9, r: 3, side: 'red', type: 'inf', quality: 'veteran' },
        { q: 11, r: 3, side: 'red', type: 'inf', quality: 'veteran' },
        { q: 4, r: 4, side: 'red', type: 'inf', quality: 'regular' },
        { q: 5, r: 4, side: 'red', type: 'inf', quality: 'regular' },
        { q: 6, r: 4, side: 'red', type: 'inf', quality: 'regular' },
        { q: 7, r: 4, side: 'red', type: 'inf', quality: 'regular' },
        { q: 8, r: 4, side: 'red', type: 'inf', quality: 'regular' },
        { q: 9, r: 4, side: 'red', type: 'inf', quality: 'regular' },
        { q: 10, r: 4, side: 'red', type: 'inf', quality: 'regular' },
        { q: 11, r: 4, side: 'red', type: 'inf', quality: 'regular' },
        { q: 6, r: 5, side: 'red', type: 'inf', quality: 'regular' },
        { q: 9, r: 5, side: 'red', type: 'inf', quality: 'regular' },
      ],
    },

    'Terrain S — Philippi Twin Camps (42 BCE)': {
      terrain: [
        { q: 6, r: 5, terrain: 'water' },
        { q: 7, r: 5, terrain: 'water' },
        { q: 8, r: 5, terrain: 'water' },
        { q: 9, r: 5, terrain: 'water' },
        { q: 6, r: 6, terrain: 'water' },
        { q: 7, r: 6, terrain: 'water' },
        { q: 8, r: 6, terrain: 'water' },
        { q: 9, r: 6, terrain: 'water' },
        { q: 2, r: 8, terrain: 'hills' },
        { q: 3, r: 8, terrain: 'hills' },
        { q: 4, r: 8, terrain: 'hills' },
        { q: 2, r: 9, terrain: 'hills' },
        { q: 3, r: 9, terrain: 'hills' },
        { q: 11, r: 2, terrain: 'hills' },
        { q: 12, r: 2, terrain: 'hills' },
        { q: 13, r: 2, terrain: 'hills' },
        { q: 11, r: 3, terrain: 'hills' },
        { q: 12, r: 3, terrain: 'hills' },
        { q: 2, r: 6, terrain: 'rough' },
        { q: 3, r: 6, terrain: 'rough' },
        { q: 11, r: 5, terrain: 'rough' },
        { q: 12, r: 5, terrain: 'rough' },
      ],
      units: [
        { q: 5, r: 10, side: 'blue', type: 'gen', quality: 'regular' },
        { q: 9, r: 10, side: 'blue', type: 'gen', quality: 'regular' },
        { q: 7, r: 10, side: 'blue', type: 'run', quality: 'green' },
        { q: 2, r: 9, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 3, r: 9, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 11, r: 9, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 12, r: 9, side: 'blue', type: 'cav', quality: 'veteran' },
        { q: 4, r: 10, side: 'blue', type: 'arc', quality: 'regular' },
        { q: 6, r: 10, side: 'blue', type: 'arc', quality: 'regular' },
        { q: 8, r: 10, side: 'blue', type: 'arc', quality: 'veteran' },
        { q: 10, r: 10, side: 'blue', type: 'arc', quality: 'regular' },
        { q: 4, r: 8, side: 'blue', type: 'skr', quality: 'veteran' },
        { q: 6, r: 8, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 8, r: 8, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 10, r: 8, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 12, r: 8, side: 'blue', type: 'skr', quality: 'veteran' },
        { q: 4, r: 9, side: 'blue', type: 'inf', quality: 'veteran' },
        { q: 6, r: 9, side: 'blue', type: 'inf', quality: 'veteran' },
        { q: 8, r: 9, side: 'blue', type: 'inf', quality: 'veteran' },
        { q: 10, r: 9, side: 'blue', type: 'inf', quality: 'veteran' },
        { q: 5, r: 9, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 7, r: 9, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 9, r: 9, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 11, r: 7, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 5, r: 8, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 7, r: 8, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 9, r: 8, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 11, r: 8, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 6, r: 7, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 9, r: 7, side: 'blue', type: 'inf', quality: 'regular' },

        { q: 6, r: 1, side: 'red', type: 'gen', quality: 'regular' },
        { q: 10, r: 1, side: 'red', type: 'gen', quality: 'regular' },
        { q: 8, r: 1, side: 'red', type: 'run', quality: 'green' },
        { q: 2, r: 3, side: 'red', type: 'cav', quality: 'veteran' },
        { q: 3, r: 3, side: 'red', type: 'cav', quality: 'regular' },
        { q: 11, r: 3, side: 'red', type: 'cav', quality: 'regular' },
        { q: 12, r: 3, side: 'red', type: 'cav', quality: 'regular' },
        { q: 4, r: 1, side: 'red', type: 'arc', quality: 'regular' },
        { q: 6, r: 2, side: 'red', type: 'arc', quality: 'regular' },
        { q: 8, r: 2, side: 'red', type: 'arc', quality: 'veteran' },
        { q: 11, r: 1, side: 'red', type: 'arc', quality: 'regular' },
        { q: 4, r: 3, side: 'red', type: 'skr', quality: 'veteran' },
        { q: 6, r: 3, side: 'red', type: 'skr', quality: 'regular' },
        { q: 8, r: 3, side: 'red', type: 'skr', quality: 'regular' },
        { q: 10, r: 3, side: 'red', type: 'skr', quality: 'regular' },
        { q: 13, r: 2, side: 'red', type: 'skr', quality: 'veteran' },
        { q: 4, r: 4, side: 'red', type: 'inf', quality: 'veteran' },
        { q: 6, r: 4, side: 'red', type: 'inf', quality: 'veteran' },
        { q: 8, r: 4, side: 'red', type: 'inf', quality: 'veteran' },
        { q: 10, r: 4, side: 'red', type: 'inf', quality: 'veteran' },
        { q: 5, r: 4, side: 'red', type: 'inf', quality: 'regular' },
        { q: 7, r: 4, side: 'red', type: 'inf', quality: 'regular' },
        { q: 9, r: 4, side: 'red', type: 'inf', quality: 'regular' },
        { q: 11, r: 4, side: 'red', type: 'inf', quality: 'regular' },
        { q: 5, r: 5, side: 'red', type: 'inf', quality: 'regular' },
        { q: 6, r: 5, side: 'red', type: 'inf', quality: 'regular' },
        { q: 8, r: 5, side: 'red', type: 'inf', quality: 'regular' },
        { q: 10, r: 5, side: 'red', type: 'inf', quality: 'regular' },
        { q: 6, r: 6, side: 'red', type: 'inf', quality: 'regular' },
        { q: 9, r: 6, side: 'red', type: 'inf', quality: 'regular' },
      ],
    },

    'Terrain T — Twin Tree-Line Crossfire (Archer Test)': {
      terrain: [
        { q: 0, r: 3, terrain: 'woods' },
        { q: 1, r: 3, terrain: 'woods' },
        { q: 2, r: 3, terrain: 'woods' },
        { q: 0, r: 4, terrain: 'woods' },
        { q: 1, r: 4, terrain: 'woods' },
        { q: 2, r: 4, terrain: 'woods' },
        { q: 3, r: 4, terrain: 'woods' },
        { q: -1, r: 5, terrain: 'woods' },
        { q: 0, r: 5, terrain: 'woods' },
        { q: 1, r: 5, terrain: 'woods' },
        { q: 2, r: 5, terrain: 'woods' },
        { q: 3, r: 5, terrain: 'woods' },
        { q: 0, r: 6, terrain: 'woods' },
        { q: 1, r: 6, terrain: 'woods' },
        { q: 2, r: 6, terrain: 'woods' },
        { q: 3, r: 6, terrain: 'woods' },
        { q: 0, r: 7, terrain: 'woods' },
        { q: 1, r: 7, terrain: 'woods' },
        { q: 2, r: 7, terrain: 'woods' },
        { q: 13, r: 3, terrain: 'woods' },
        { q: 14, r: 3, terrain: 'woods' },
        { q: 15, r: 3, terrain: 'woods' },
        { q: 12, r: 4, terrain: 'woods' },
        { q: 13, r: 4, terrain: 'woods' },
        { q: 14, r: 4, terrain: 'woods' },
        { q: 15, r: 4, terrain: 'woods' },
        { q: 12, r: 5, terrain: 'woods' },
        { q: 13, r: 5, terrain: 'woods' },
        { q: 14, r: 5, terrain: 'woods' },
        { q: 15, r: 5, terrain: 'woods' },
        { q: 12, r: 6, terrain: 'woods' },
        { q: 13, r: 6, terrain: 'woods' },
        { q: 14, r: 6, terrain: 'woods' },
        { q: 15, r: 6, terrain: 'woods' },
        { q: 13, r: 7, terrain: 'woods' },
        { q: 14, r: 7, terrain: 'woods' },
        { q: 15, r: 7, terrain: 'woods' },
      ],
      units: [
        { q: 1, r: 5, side: 'blue', type: 'gen', quality: 'regular' },
        { q: 6, r: 5, side: 'blue', type: 'gen', quality: 'regular' },
        { q: 3, r: 4, side: 'blue', type: 'arc', quality: 'regular' },
        { q: 3, r: 5, side: 'blue', type: 'arc', quality: 'veteran' },
        { q: 3, r: 6, side: 'blue', type: 'arc', quality: 'regular' },
        { q: 4, r: 4, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 4, r: 5, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 4, r: 6, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 5, r: 4, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 5, r: 5, side: 'blue', type: 'inf', quality: 'veteran' },
        { q: 5, r: 6, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 6, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 6, r: 4, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 6, r: 6, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 6, r: 7, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 7, r: 4, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 7, r: 5, side: 'blue', type: 'inf', quality: 'veteran' },
        { q: 7, r: 6, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 5, r: 3, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 5, r: 7, side: 'blue', type: 'cav', quality: 'regular' },

        { q: 14, r: 5, side: 'red', type: 'gen', quality: 'regular' },
        { q: 9, r: 5, side: 'red', type: 'gen', quality: 'regular' },
        { q: 12, r: 4, side: 'red', type: 'arc', quality: 'regular' },
        { q: 12, r: 5, side: 'red', type: 'arc', quality: 'veteran' },
        { q: 12, r: 6, side: 'red', type: 'arc', quality: 'regular' },
        { q: 11, r: 4, side: 'red', type: 'inf', quality: 'regular' },
        { q: 11, r: 5, side: 'red', type: 'inf', quality: 'regular' },
        { q: 11, r: 6, side: 'red', type: 'inf', quality: 'regular' },
        { q: 10, r: 4, side: 'red', type: 'inf', quality: 'regular' },
        { q: 10, r: 5, side: 'red', type: 'inf', quality: 'veteran' },
        { q: 10, r: 6, side: 'red', type: 'inf', quality: 'regular' },
        { q: 9, r: 3, side: 'red', type: 'inf', quality: 'regular' },
        { q: 9, r: 4, side: 'red', type: 'inf', quality: 'regular' },
        { q: 9, r: 6, side: 'red', type: 'inf', quality: 'regular' },
        { q: 9, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 8, r: 4, side: 'red', type: 'inf', quality: 'regular' },
        { q: 8, r: 5, side: 'red', type: 'inf', quality: 'veteran' },
        { q: 8, r: 6, side: 'red', type: 'inf', quality: 'regular' },
        { q: 10, r: 3, side: 'red', type: 'cav', quality: 'regular' },
        { q: 10, r: 7, side: 'red', type: 'cav', quality: 'regular' },
      ],
    },

  // === GRAND BATTLE SCENARIOS (Thor) ===
  'Grand A — Even Lines (30v30, mirrored)': {
    terrain: [
        
    ],
    units: [
        { q: 3, r: 1, side: 'blue', type: 'gen', quality: 'green' },
        { q: 6, r: 1, side: 'blue', type: 'gen', quality: 'green' },
        { q: 9, r: 1, side: 'blue', type: 'gen', quality: 'green' },
        { q: 2, r: 2, side: 'blue', type: 'arc', quality: 'green' },
        { q: 5, r: 2, side: 'blue', type: 'arc', quality: 'green' },
        { q: 8, r: 2, side: 'blue', type: 'arc', quality: 'green' },
        { q: 11, r: 2, side: 'blue', type: 'arc', quality: 'green' },
        { q: 3, r: 2, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 6, r: 2, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 9, r: 2, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 12, r: 2, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 2, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 3, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 4, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 5, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 6, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 7, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 8, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 9, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 10, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 11, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 3, r: 4, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 5, r: 4, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 7, r: 4, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 9, r: 4, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 11, r: 4, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 0, r: 4, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 1, r: 4, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 14, r: 4, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 15, r: 4, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 3, r: 9, side: 'red', type: 'gen', quality: 'green' },
        { q: 6, r: 9, side: 'red', type: 'gen', quality: 'green' },
        { q: 9, r: 9, side: 'red', type: 'gen', quality: 'green' },
        { q: 2, r: 8, side: 'red', type: 'arc', quality: 'green' },
        { q: 5, r: 8, side: 'red', type: 'arc', quality: 'green' },
        { q: 8, r: 8, side: 'red', type: 'arc', quality: 'green' },
        { q: 11, r: 8, side: 'red', type: 'arc', quality: 'green' },
        { q: 3, r: 8, side: 'red', type: 'inf', quality: 'regular' },
        { q: 6, r: 8, side: 'red', type: 'inf', quality: 'regular' },
        { q: 9, r: 8, side: 'red', type: 'inf', quality: 'regular' },
        { q: 12, r: 8, side: 'red', type: 'inf', quality: 'regular' },
        { q: 2, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 3, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 4, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 5, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 6, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 7, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 8, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 9, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 10, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 11, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 3, r: 6, side: 'red', type: 'skr', quality: 'regular' },
        { q: 5, r: 6, side: 'red', type: 'skr', quality: 'regular' },
        { q: 7, r: 6, side: 'red', type: 'skr', quality: 'regular' },
        { q: 9, r: 6, side: 'red', type: 'skr', quality: 'regular' },
        { q: 11, r: 6, side: 'red', type: 'skr', quality: 'regular' },
        { q: 0, r: 6, side: 'red', type: 'cav', quality: 'regular' },
        { q: 1, r: 6, side: 'red', type: 'cav', quality: 'regular' },
        { q: 14, r: 6, side: 'red', type: 'cav', quality: 'regular' },
        { q: 15, r: 6, side: 'red', type: 'cav', quality: 'regular' }
    ]
  },

  'Grand B — Center Push (28v28, mirrored)': {
    terrain: [
        { q: 7, r: 5, terrain: 'hills' },
        { q: 8, r: 5, terrain: 'hills' },
        { q: 9, r: 5, terrain: 'hills' },
        { q: 2, r: 5, terrain: 'rough' },
        { q: 14, r: 5, terrain: 'rough' }
    ],
    units: [
        { q: 4, r: 1, side: 'blue', type: 'gen', quality: 'green' },
        { q: 7, r: 1, side: 'blue', type: 'gen', quality: 'green' },
        { q: 10, r: 1, side: 'blue', type: 'gen', quality: 'green' },
        { q: 4, r: 2, side: 'blue', type: 'arc', quality: 'green' },
        { q: 7, r: 2, side: 'blue', type: 'arc', quality: 'green' },
        { q: 10, r: 2, side: 'blue', type: 'arc', quality: 'green' },
        { q: 2, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 3, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 4, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 5, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 6, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 7, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 8, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 9, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 10, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 11, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 12, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 13, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 6, r: 4, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 7, r: 4, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 8, r: 4, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 9, r: 4, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 3, r: 4, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 5, r: 4, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 11, r: 4, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 13, r: 4, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 0, r: 4, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 15, r: 4, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 4, r: 9, side: 'red', type: 'gen', quality: 'green' },
        { q: 7, r: 9, side: 'red', type: 'gen', quality: 'green' },
        { q: 10, r: 9, side: 'red', type: 'gen', quality: 'green' },
        { q: 4, r: 8, side: 'red', type: 'arc', quality: 'green' },
        { q: 7, r: 8, side: 'red', type: 'arc', quality: 'green' },
        { q: 10, r: 8, side: 'red', type: 'arc', quality: 'green' },
        { q: 2, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 3, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 4, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 5, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 6, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 7, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 8, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 9, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 10, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 11, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 12, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 13, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 6, r: 6, side: 'red', type: 'inf', quality: 'regular' },
        { q: 7, r: 6, side: 'red', type: 'inf', quality: 'regular' },
        { q: 8, r: 6, side: 'red', type: 'inf', quality: 'regular' },
        { q: 9, r: 6, side: 'red', type: 'inf', quality: 'regular' },
        { q: 3, r: 6, side: 'red', type: 'skr', quality: 'regular' },
        { q: 5, r: 6, side: 'red', type: 'skr', quality: 'regular' },
        { q: 11, r: 6, side: 'red', type: 'skr', quality: 'regular' },
        { q: 13, r: 6, side: 'red', type: 'skr', quality: 'regular' },
        { q: 0, r: 6, side: 'red', type: 'cav', quality: 'regular' },
        { q: 15, r: 6, side: 'red', type: 'cav', quality: 'regular' }
    ]
  },

  'Grand C — Double Envelopment (30v30, mirrored)': {
    terrain: [
        
    ],
    units: [
        { q: 3, r: 1, side: 'blue', type: 'gen', quality: 'green' },
        { q: 6, r: 1, side: 'blue', type: 'gen', quality: 'green' },
        { q: 9, r: 1, side: 'blue', type: 'gen', quality: 'green' },
        { q: 5, r: 2, side: 'blue', type: 'arc', quality: 'green' },
        { q: 7, r: 2, side: 'blue', type: 'arc', quality: 'green' },
        { q: 9, r: 2, side: 'blue', type: 'arc', quality: 'green' },
        { q: 3, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 4, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 5, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 6, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 7, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 8, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 9, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 10, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 4, r: 2, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 6, r: 2, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 8, r: 2, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 10, r: 2, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 0, r: 4, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 1, r: 4, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 2, r: 4, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 13, r: 4, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 14, r: 4, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 15, r: 4, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 1, r: 3, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 13, r: 3, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 5, r: 4, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 7, r: 4, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 9, r: 4, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 11, r: 4, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 3, r: 9, side: 'red', type: 'gen', quality: 'green' },
        { q: 6, r: 9, side: 'red', type: 'gen', quality: 'green' },
        { q: 9, r: 9, side: 'red', type: 'gen', quality: 'green' },
        { q: 5, r: 8, side: 'red', type: 'arc', quality: 'green' },
        { q: 7, r: 8, side: 'red', type: 'arc', quality: 'green' },
        { q: 9, r: 8, side: 'red', type: 'arc', quality: 'green' },
        { q: 3, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 4, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 5, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 6, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 7, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 8, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 9, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 10, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 4, r: 8, side: 'red', type: 'inf', quality: 'regular' },
        { q: 6, r: 8, side: 'red', type: 'inf', quality: 'regular' },
        { q: 8, r: 8, side: 'red', type: 'inf', quality: 'regular' },
        { q: 10, r: 8, side: 'red', type: 'inf', quality: 'regular' },
        { q: 0, r: 6, side: 'red', type: 'cav', quality: 'regular' },
        { q: 1, r: 6, side: 'red', type: 'cav', quality: 'regular' },
        { q: 2, r: 6, side: 'red', type: 'cav', quality: 'regular' },
        { q: 13, r: 6, side: 'red', type: 'cav', quality: 'regular' },
        { q: 14, r: 6, side: 'red', type: 'cav', quality: 'regular' },
        { q: 15, r: 6, side: 'red', type: 'cav', quality: 'regular' },
        { q: 1, r: 7, side: 'red', type: 'cav', quality: 'regular' },
        { q: 13, r: 7, side: 'red', type: 'cav', quality: 'regular' },
        { q: 5, r: 6, side: 'red', type: 'skr', quality: 'regular' },
        { q: 7, r: 6, side: 'red', type: 'skr', quality: 'regular' },
        { q: 9, r: 6, side: 'red', type: 'skr', quality: 'regular' },
        { q: 11, r: 6, side: 'red', type: 'skr', quality: 'regular' }
    ]
  },

  'Grand D — Massive Screen (26v26, mirrored)': {
    terrain: [
        
    ],
    units: [
        { q: 4, r: 1, side: 'blue', type: 'gen', quality: 'green' },
        { q: 7, r: 1, side: 'blue', type: 'gen', quality: 'green' },
        { q: 10, r: 1, side: 'blue', type: 'gen', quality: 'green' },
        { q: 2, r: 2, side: 'blue', type: 'arc', quality: 'green' },
        { q: 5, r: 2, side: 'blue', type: 'arc', quality: 'green' },
        { q: 8, r: 2, side: 'blue', type: 'arc', quality: 'green' },
        { q: 11, r: 2, side: 'blue', type: 'arc', quality: 'green' },
        { q: 2, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 3, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 4, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 5, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 6, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 7, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 8, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 9, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 10, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 11, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 2, r: 4, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 4, r: 4, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 6, r: 4, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 8, r: 4, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 10, r: 4, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 12, r: 4, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 14, r: 4, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 0, r: 4, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 15, r: 4, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 4, r: 9, side: 'red', type: 'gen', quality: 'green' },
        { q: 7, r: 9, side: 'red', type: 'gen', quality: 'green' },
        { q: 10, r: 9, side: 'red', type: 'gen', quality: 'green' },
        { q: 2, r: 8, side: 'red', type: 'arc', quality: 'green' },
        { q: 5, r: 8, side: 'red', type: 'arc', quality: 'green' },
        { q: 8, r: 8, side: 'red', type: 'arc', quality: 'green' },
        { q: 11, r: 8, side: 'red', type: 'arc', quality: 'green' },
        { q: 2, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 3, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 4, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 5, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 6, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 7, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 8, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 9, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 10, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 11, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 2, r: 6, side: 'red', type: 'skr', quality: 'regular' },
        { q: 4, r: 6, side: 'red', type: 'skr', quality: 'regular' },
        { q: 6, r: 6, side: 'red', type: 'skr', quality: 'regular' },
        { q: 8, r: 6, side: 'red', type: 'skr', quality: 'regular' },
        { q: 10, r: 6, side: 'red', type: 'skr', quality: 'regular' },
        { q: 12, r: 6, side: 'red', type: 'skr', quality: 'regular' },
        { q: 14, r: 6, side: 'red', type: 'skr', quality: 'regular' },
        { q: 0, r: 6, side: 'red', type: 'cav', quality: 'regular' },
        { q: 15, r: 6, side: 'red', type: 'cav', quality: 'regular' }
    ]
  },

  'Grand E — River Fords (24v24, mirrored)': {
    terrain: [
        { q: 0, r: 5, terrain: 'water' },
        { q: 1, r: 5, terrain: 'water' },
        { q: 2, r: 5, terrain: 'water' },
        { q: 3, r: 5, terrain: 'water' },
        { q: 5, r: 5, terrain: 'water' },
        { q: 6, r: 5, terrain: 'water' },
        { q: 7, r: 5, terrain: 'water' },
        { q: 9, r: 5, terrain: 'water' },
        { q: 10, r: 5, terrain: 'water' },
        { q: 11, r: 5, terrain: 'water' },
        { q: 13, r: 5, terrain: 'water' },
        { q: 14, r: 5, terrain: 'water' },
        { q: 15, r: 5, terrain: 'water' },
        { q: -1, r: 5, terrain: 'water' },
        { q: 4, r: 4, terrain: 'woods' },
        { q: 8, r: 4, terrain: 'woods' },
        { q: 12, r: 4, terrain: 'woods' },
        { q: 4, r: 6, terrain: 'woods' },
        { q: 8, r: 6, terrain: 'woods' },
        { q: 12, r: 6, terrain: 'woods' }
    ],
    units: [
        { q: 4, r: 1, side: 'blue', type: 'gen', quality: 'green' },
        { q: 7, r: 1, side: 'blue', type: 'gen', quality: 'green' },
        { q: 10, r: 1, side: 'blue', type: 'gen', quality: 'green' },
        { q: 4, r: 2, side: 'blue', type: 'arc', quality: 'green' },
        { q: 7, r: 2, side: 'blue', type: 'arc', quality: 'green' },
        { q: 10, r: 2, side: 'blue', type: 'arc', quality: 'green' },
        { q: 2, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 3, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 4, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 5, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 6, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 7, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 8, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 9, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 10, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 11, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 12, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 13, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 0, r: 4, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 1, r: 4, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 14, r: 4, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 15, r: 4, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 4, r: 4, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 12, r: 4, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 4, r: 9, side: 'red', type: 'gen', quality: 'green' },
        { q: 7, r: 9, side: 'red', type: 'gen', quality: 'green' },
        { q: 10, r: 9, side: 'red', type: 'gen', quality: 'green' },
        { q: 4, r: 8, side: 'red', type: 'arc', quality: 'green' },
        { q: 7, r: 8, side: 'red', type: 'arc', quality: 'green' },
        { q: 10, r: 8, side: 'red', type: 'arc', quality: 'green' },
        { q: 2, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 3, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 4, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 5, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 6, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 7, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 8, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 9, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 10, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 11, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 12, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 13, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 0, r: 6, side: 'red', type: 'cav', quality: 'regular' },
        { q: 1, r: 6, side: 'red', type: 'cav', quality: 'regular' },
        { q: 14, r: 6, side: 'red', type: 'cav', quality: 'regular' },
        { q: 15, r: 6, side: 'red', type: 'cav', quality: 'regular' },
        { q: 4, r: 6, side: 'red', type: 'skr', quality: 'regular' },
        { q: 12, r: 6, side: 'red', type: 'skr', quality: 'regular' }
    ]
  },

  'Grand F — Corridor Pass (22v22, mirrored)': {
    terrain: [
        { q: 14, r: 2, terrain: 'water' },
        { q: 1, r: 2, terrain: 'water' },
        { q: 2, r: 2, terrain: 'water' },
        { q: 3, r: 2, terrain: 'water' },
        { q: 10, r: 2, terrain: 'water' },
        { q: 11, r: 2, terrain: 'water' },
        { q: 12, r: 2, terrain: 'water' },
        { q: 13, r: 2, terrain: 'water' },
        { q: 0, r: 3, terrain: 'water' },
        { q: 1, r: 3, terrain: 'water' },
        { q: 2, r: 3, terrain: 'water' },
        { q: 3, r: 3, terrain: 'water' },
        { q: 10, r: 3, terrain: 'water' },
        { q: 11, r: 3, terrain: 'water' },
        { q: 12, r: 3, terrain: 'water' },
        { q: 13, r: 3, terrain: 'water' },
        { q: 14, r: 3, terrain: 'water' },
        { q: 0, r: 4, terrain: 'water' },
        { q: 1, r: 4, terrain: 'water' },
        { q: 2, r: 4, terrain: 'water' },
        { q: 3, r: 4, terrain: 'water' },
        { q: 10, r: 4, terrain: 'water' },
        { q: 11, r: 4, terrain: 'water' },
        { q: 12, r: 4, terrain: 'water' },
        { q: 13, r: 4, terrain: 'water' },
        { q: 14, r: 4, terrain: 'water' },
        { q: 15, r: 4, terrain: 'water' },
        { q: 0, r: 5, terrain: 'water' },
        { q: 1, r: 5, terrain: 'water' },
        { q: 2, r: 5, terrain: 'water' },
        { q: 3, r: 5, terrain: 'water' },
        { q: 10, r: 5, terrain: 'water' },
        { q: 11, r: 5, terrain: 'water' },
        { q: 12, r: 5, terrain: 'water' },
        { q: 13, r: 5, terrain: 'water' },
        { q: 14, r: 5, terrain: 'water' },
        { q: 15, r: 5, terrain: 'water' },
        { q: -1, r: 5, terrain: 'water' },
        { q: 0, r: 6, terrain: 'water' },
        { q: 1, r: 6, terrain: 'water' },
        { q: 2, r: 6, terrain: 'water' },
        { q: 3, r: 6, terrain: 'water' },
        { q: 10, r: 6, terrain: 'water' },
        { q: 11, r: 6, terrain: 'water' },
        { q: 12, r: 6, terrain: 'water' },
        { q: 13, r: 6, terrain: 'water' },
        { q: 14, r: 6, terrain: 'water' },
        { q: 15, r: 6, terrain: 'water' },
        { q: 0, r: 7, terrain: 'water' },
        { q: 1, r: 7, terrain: 'water' },
        { q: 2, r: 7, terrain: 'water' },
        { q: 3, r: 7, terrain: 'water' },
        { q: 10, r: 7, terrain: 'water' },
        { q: 11, r: 7, terrain: 'water' },
        { q: 12, r: 7, terrain: 'water' },
        { q: 13, r: 7, terrain: 'water' },
        { q: 14, r: 7, terrain: 'water' },
        { q: 14, r: 8, terrain: 'water' },
        { q: 1, r: 8, terrain: 'water' },
        { q: 2, r: 8, terrain: 'water' },
        { q: 3, r: 8, terrain: 'water' },
        { q: 10, r: 8, terrain: 'water' },
        { q: 11, r: 8, terrain: 'water' },
        { q: 12, r: 8, terrain: 'water' },
        { q: 13, r: 8, terrain: 'water' }
    ],
    units: [
        { q: 5, r: 1, side: 'blue', type: 'gen', quality: 'green' },
        { q: 8, r: 1, side: 'blue', type: 'gen', quality: 'green' },
        { q: 5, r: 0, side: 'blue', type: 'arc', quality: 'green' },
        { q: 8, r: 0, side: 'blue', type: 'arc', quality: 'green' },
        { q: 4, r: 2, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 9, r: 2, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 5, r: 2, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 6, r: 2, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 7, r: 2, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 8, r: 2, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 4, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 5, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 6, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 7, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 8, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 9, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 5, r: 4, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 6, r: 4, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 7, r: 4, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 8, r: 4, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 4, r: 4, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 9, r: 4, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 5, r: 9, side: 'red', type: 'gen', quality: 'green' },
        { q: 8, r: 9, side: 'red', type: 'gen', quality: 'green' },
        { q: 5, r: 10, side: 'red', type: 'arc', quality: 'green' },
        { q: 8, r: 10, side: 'red', type: 'arc', quality: 'green' },
        { q: 4, r: 8, side: 'red', type: 'cav', quality: 'regular' },
        { q: 9, r: 8, side: 'red', type: 'cav', quality: 'regular' },
        { q: 5, r: 8, side: 'red', type: 'inf', quality: 'regular' },
        { q: 6, r: 8, side: 'red', type: 'inf', quality: 'regular' },
        { q: 7, r: 8, side: 'red', type: 'inf', quality: 'regular' },
        { q: 8, r: 8, side: 'red', type: 'inf', quality: 'regular' },
        { q: 4, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 5, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 6, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 7, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 8, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 9, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 5, r: 6, side: 'red', type: 'inf', quality: 'regular' },
        { q: 6, r: 6, side: 'red', type: 'inf', quality: 'regular' },
        { q: 7, r: 6, side: 'red', type: 'inf', quality: 'regular' },
        { q: 8, r: 6, side: 'red', type: 'inf', quality: 'regular' },
        { q: 4, r: 6, side: 'red', type: 'skr', quality: 'regular' },
        { q: 9, r: 6, side: 'red', type: 'skr', quality: 'regular' }
    ]
  },
  // === END GRAND BATTLE SCENARIOS ===,

  // === BERSERKER FORMATIONS (Berserker) ===
  'Berserker A — Wedge vs Shieldwall (26v26)': {
    terrain: [
        
    ],
    units: [
        { q: 4, r: 1, side: 'blue', type: 'gen', quality: 'green' },
        { q: 6, r: 1, side: 'blue', type: 'gen', quality: 'green' },
        { q: 8, r: 1, side: 'blue', type: 'gen', quality: 'green' },
        { q: 3, r: 0, side: 'blue', type: 'arc', quality: 'green' },
        { q: 5, r: 0, side: 'blue', type: 'arc', quality: 'green' },
        { q: 7, r: 0, side: 'blue', type: 'arc', quality: 'green' },
        { q: 9, r: 0, side: 'blue', type: 'arc', quality: 'green' },
        { q: 4, r: 2, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 5, r: 2, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 6, r: 2, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 7, r: 2, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 8, r: 2, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 9, r: 2, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 5, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 6, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 7, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 6, r: 4, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 3, r: 4, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 5, r: 4, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 7, r: 4, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 9, r: 4, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 11, r: 4, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 0, r: 3, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 1, r: 2, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 13, r: 2, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 14, r: 3, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 4, r: 9, side: 'red', type: 'gen', quality: 'green' },
        { q: 6, r: 9, side: 'red', type: 'gen', quality: 'green' },
        { q: 8, r: 9, side: 'red', type: 'gen', quality: 'green' },
        { q: 3, r: 10, side: 'red', type: 'arc', quality: 'green' },
        { q: 5, r: 10, side: 'red', type: 'arc', quality: 'green' },
        { q: 7, r: 10, side: 'red', type: 'arc', quality: 'green' },
        { q: 9, r: 10, side: 'red', type: 'arc', quality: 'green' },
        { q: 2, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 3, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 4, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 5, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 6, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 7, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 8, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 9, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 10, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 11, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 3, r: 6, side: 'red', type: 'skr', quality: 'regular' },
        { q: 5, r: 6, side: 'red', type: 'skr', quality: 'regular' },
        { q: 7, r: 6, side: 'red', type: 'skr', quality: 'regular' },
        { q: 9, r: 6, side: 'red', type: 'skr', quality: 'regular' },
        { q: 11, r: 6, side: 'red', type: 'skr', quality: 'regular' },
        { q: 2, r: 8, side: 'red', type: 'cav', quality: 'regular' },
        { q: 1, r: 8, side: 'red', type: 'cav', quality: 'regular' },
        { q: 12, r: 8, side: 'red', type: 'cav', quality: 'regular' },
        { q: 13, r: 8, side: 'red', type: 'cav', quality: 'regular' }
    ]
  },

  'Berserker B — Crescent vs Columns (28v28)': {
    terrain: [
        
    ],
    units: [
        { q: 4, r: 1, side: 'blue', type: 'gen', quality: 'green' },
        { q: 6, r: 1, side: 'blue', type: 'gen', quality: 'green' },
        { q: 8, r: 1, side: 'blue', type: 'gen', quality: 'green' },
        { q: 3, r: 0, side: 'blue', type: 'arc', quality: 'green' },
        { q: 5, r: 0, side: 'blue', type: 'arc', quality: 'green' },
        { q: 7, r: 0, side: 'blue', type: 'arc', quality: 'green' },
        { q: 9, r: 0, side: 'blue', type: 'arc', quality: 'green' },
        { q: 2, r: 4, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 3, r: 4, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 12, r: 4, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 13, r: 4, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 4, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 5, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 9, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 10, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 6, r: 2, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 8, r: 2, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 0, r: 3, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 2, r: 2, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 1, r: 2, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 14, r: 3, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 12, r: 2, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 13, r: 2, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 5, r: 4, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 7, r: 4, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 9, r: 4, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 11, r: 4, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 14, r: 4, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 4, r: 9, side: 'red', type: 'gen', quality: 'green' },
        { q: 6, r: 9, side: 'red', type: 'gen', quality: 'green' },
        { q: 8, r: 9, side: 'red', type: 'gen', quality: 'green' },
        { q: 2, r: 10, side: 'red', type: 'arc', quality: 'green' },
        { q: 4, r: 10, side: 'red', type: 'arc', quality: 'green' },
        { q: 6, r: 10, side: 'red', type: 'arc', quality: 'green' },
        { q: 8, r: 10, side: 'red', type: 'arc', quality: 'green' },
        { q: 5, r: 9, side: 'red', type: 'inf', quality: 'regular' },
        { q: 5, r: 8, side: 'red', type: 'inf', quality: 'regular' },
        { q: 5, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 7, r: 9, side: 'red', type: 'inf', quality: 'regular' },
        { q: 7, r: 8, side: 'red', type: 'inf', quality: 'regular' },
        { q: 7, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 5, r: 6, side: 'red', type: 'inf', quality: 'regular' },
        { q: 6, r: 6, side: 'red', type: 'inf', quality: 'regular' },
        { q: 7, r: 6, side: 'red', type: 'inf', quality: 'regular' },
        { q: 8, r: 6, side: 'red', type: 'inf', quality: 'regular' },
        { q: 2, r: 8, side: 'red', type: 'cav', quality: 'regular' },
        { q: 1, r: 8, side: 'red', type: 'cav', quality: 'regular' },
        { q: 12, r: 8, side: 'red', type: 'cav', quality: 'regular' },
        { q: 13, r: 8, side: 'red', type: 'cav', quality: 'regular' },
        { q: 5, r: 10, side: 'red', type: 'cav', quality: 'regular' },
        { q: 7, r: 10, side: 'red', type: 'cav', quality: 'regular' },
        { q: 4, r: 6, side: 'red', type: 'skr', quality: 'regular' },
        { q: 9, r: 6, side: 'red', type: 'skr', quality: 'regular' },
        { q: 10, r: 6, side: 'red', type: 'skr', quality: 'regular' },
        { q: 12, r: 6, side: 'red', type: 'skr', quality: 'regular' },
        { q: 14, r: 6, side: 'red', type: 'skr', quality: 'regular' }
    ]
  },

  'Berserker C — Checkerboard vs Line (26v26)': {
    terrain: [
        
    ],
    units: [
        { q: 4, r: 1, side: 'blue', type: 'gen', quality: 'green' },
        { q: 6, r: 1, side: 'blue', type: 'gen', quality: 'green' },
        { q: 8, r: 1, side: 'blue', type: 'gen', quality: 'green' },
        { q: 2, r: 0, side: 'blue', type: 'arc', quality: 'green' },
        { q: 5, r: 0, side: 'blue', type: 'arc', quality: 'green' },
        { q: 8, r: 0, side: 'blue', type: 'arc', quality: 'green' },
        { q: 11, r: 0, side: 'blue', type: 'arc', quality: 'green' },
        { q: 2, r: 2, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 4, r: 2, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 6, r: 2, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 8, r: 2, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 10, r: 2, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 3, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 5, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 7, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 9, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 11, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 2, r: 4, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 5, r: 4, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 8, r: 4, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 11, r: 4, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 14, r: 4, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 0, r: 3, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 14, r: 3, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 1, r: 2, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 13, r: 2, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 4, r: 9, side: 'red', type: 'gen', quality: 'green' },
        { q: 6, r: 9, side: 'red', type: 'gen', quality: 'green' },
        { q: 8, r: 9, side: 'red', type: 'gen', quality: 'green' },
        { q: 2, r: 10, side: 'red', type: 'arc', quality: 'green' },
        { q: 5, r: 10, side: 'red', type: 'arc', quality: 'green' },
        { q: 8, r: 10, side: 'red', type: 'arc', quality: 'green' },
        { q: 11, r: 10, side: 'red', type: 'arc', quality: 'green' },
        { q: 2, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 3, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 4, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 5, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 6, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 7, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 8, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 9, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 10, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 11, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 2, r: 6, side: 'red', type: 'skr', quality: 'regular' },
        { q: 5, r: 6, side: 'red', type: 'skr', quality: 'regular' },
        { q: 8, r: 6, side: 'red', type: 'skr', quality: 'regular' },
        { q: 11, r: 6, side: 'red', type: 'skr', quality: 'regular' },
        { q: 14, r: 6, side: 'red', type: 'skr', quality: 'regular' },
        { q: 2, r: 8, side: 'red', type: 'cav', quality: 'regular' },
        { q: 1, r: 8, side: 'red', type: 'cav', quality: 'regular' },
        { q: 12, r: 8, side: 'red', type: 'cav', quality: 'regular' },
        { q: 13, r: 8, side: 'red', type: 'cav', quality: 'regular' }
    ]
  },

  'Berserker D — Refused Flank vs Wide Wings (28v28)': {
    terrain: [
        
    ],
    units: [
        { q: 4, r: 1, side: 'blue', type: 'gen', quality: 'green' },
        { q: 6, r: 1, side: 'blue', type: 'gen', quality: 'green' },
        { q: 8, r: 1, side: 'blue', type: 'gen', quality: 'green' },
        { q: 3, r: 0, side: 'blue', type: 'arc', quality: 'green' },
        { q: 5, r: 0, side: 'blue', type: 'arc', quality: 'green' },
        { q: 7, r: 0, side: 'blue', type: 'arc', quality: 'green' },
        { q: 9, r: 0, side: 'blue', type: 'arc', quality: 'green' },
        { q: 9, r: 4, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 10, r: 4, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 11, r: 4, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 12, r: 4, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 6, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 7, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 8, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 9, r: 3, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 2, r: 2, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 3, r: 2, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 4, r: 2, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 5, r: 2, side: 'blue', type: 'inf', quality: 'regular' },
        { q: 13, r: 3, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 14, r: 3, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 12, r: 2, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 13, r: 2, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 0, r: 3, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 1, r: 2, side: 'blue', type: 'cav', quality: 'regular' },
        { q: 4, r: 4, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 6, r: 4, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 8, r: 4, side: 'blue', type: 'skr', quality: 'regular' },
        { q: 4, r: 9, side: 'red', type: 'gen', quality: 'green' },
        { q: 6, r: 9, side: 'red', type: 'gen', quality: 'green' },
        { q: 8, r: 9, side: 'red', type: 'gen', quality: 'green' },
        { q: 3, r: 10, side: 'red', type: 'arc', quality: 'green' },
        { q: 5, r: 10, side: 'red', type: 'arc', quality: 'green' },
        { q: 7, r: 10, side: 'red', type: 'arc', quality: 'green' },
        { q: 9, r: 10, side: 'red', type: 'arc', quality: 'green' },
        { q: 1, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 2, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 3, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 4, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 5, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 6, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 7, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 8, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 9, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 10, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 11, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 12, r: 7, side: 'red', type: 'inf', quality: 'regular' },
        { q: 3, r: 8, side: 'red', type: 'cav', quality: 'regular' },
        { q: 1, r: 8, side: 'red', type: 'cav', quality: 'regular' },
        { q: 2, r: 8, side: 'red', type: 'cav', quality: 'regular' },
        { q: 11, r: 8, side: 'red', type: 'cav', quality: 'regular' },
        { q: 12, r: 8, side: 'red', type: 'cav', quality: 'regular' },
        { q: 13, r: 8, side: 'red', type: 'cav', quality: 'regular' },
        { q: 4, r: 6, side: 'red', type: 'skr', quality: 'regular' },
        { q: 6, r: 6, side: 'red', type: 'skr', quality: 'regular' },
        { q: 8, r: 6, side: 'red', type: 'skr', quality: 'regular' }
    ]
  },
  // === END BERSERKER FORMATIONS ===
};

SCENARIOS['History A — Thermopylae Hot Gates (480 BCE)'] = {
  terrain: [
    { q: 4, r: 3, terrain: 'mountains' }, { q: 5, r: 3, terrain: 'mountains' }, { q: 6, r: 3, terrain: 'mountains' },
    { q: 7, r: 3, terrain: 'mountains' }, { q: 8, r: 3, terrain: 'mountains' }, { q: 9, r: 3, terrain: 'mountains' },
    { q: 10, r: 3, terrain: 'mountains' }, { q: 11, r: 3, terrain: 'mountains' }, { q: 12, r: 3, terrain: 'mountains' },
    { q: 5, r: 4, terrain: 'mountains' }, { q: 6, r: 4, terrain: 'mountains' }, { q: 10, r: 4, terrain: 'mountains' }, { q: 11, r: 4, terrain: 'mountains' },
    { q: 4, r: 7, terrain: 'water' }, { q: 5, r: 7, terrain: 'water' }, { q: 6, r: 7, terrain: 'water' },
    { q: 7, r: 7, terrain: 'water' }, { q: 8, r: 7, terrain: 'water' }, { q: 9, r: 7, terrain: 'water' },
    { q: 10, r: 7, terrain: 'water' }, { q: 11, r: 7, terrain: 'water' }, { q: 12, r: 7, terrain: 'water' },
    { q: 5, r: 6, terrain: 'water' }, { q: 6, r: 6, terrain: 'water' }, { q: 10, r: 6, terrain: 'water' }, { q: 11, r: 6, terrain: 'water' },
    { q: 7, r: 5, terrain: 'rough' }, { q: 8, r: 5, terrain: 'rough' },
  ],
  units: [
    { q: 6, r: 9, side: 'blue', type: 'gen', quality: 'veteran' },
    { q: 9, r: 9, side: 'blue', type: 'gen', quality: 'regular' },
    { q: 7, r: 9, side: 'blue', type: 'run', quality: 'green' },
    { q: 6, r: 8, side: 'blue', type: 'inf', quality: 'veteran' },
    { q: 7, r: 8, side: 'blue', type: 'inf', quality: 'veteran' },
    { q: 8, r: 8, side: 'blue', type: 'inf', quality: 'veteran' },
    { q: 9, r: 8, side: 'blue', type: 'inf', quality: 'veteran' },
    { q: 5, r: 8, side: 'blue', type: 'inf', quality: 'regular' },
    { q: 10, r: 8, side: 'blue', type: 'inf', quality: 'regular' },
    { q: 6, r: 7, side: 'blue', type: 'inf', quality: 'veteran' },
    { q: 7, r: 7, side: 'blue', type: 'inf', quality: 'veteran' },
    { q: 8, r: 7, side: 'blue', type: 'inf', quality: 'veteran' },
    { q: 9, r: 7, side: 'blue', type: 'inf', quality: 'veteran' },
    { q: 5, r: 9, side: 'blue', type: 'skr', quality: 'regular' },
    { q: 10, r: 9, side: 'blue', type: 'skr', quality: 'regular' },
    { q: 4, r: 9, side: 'blue', type: 'arc', quality: 'regular' },
    { q: 11, r: 9, side: 'blue', type: 'arc', quality: 'regular' },
    { q: 3, r: 8, side: 'blue', type: 'cav', quality: 'regular' },

    { q: 6, r: 1, side: 'red', type: 'gen', quality: 'regular' },
    { q: 9, r: 1, side: 'red', type: 'gen', quality: 'regular' },
    { q: 7, r: 1, side: 'red', type: 'run', quality: 'green' },
    { q: 4, r: 2, side: 'red', type: 'arc', quality: 'regular' },
    { q: 5, r: 2, side: 'red', type: 'arc', quality: 'regular' },
    { q: 8, r: 2, side: 'red', type: 'arc', quality: 'regular' },
    { q: 10, r: 2, side: 'red', type: 'arc', quality: 'regular' },
    { q: 11, r: 2, side: 'red', type: 'arc', quality: 'regular' },
    { q: 3, r: 3, side: 'red', type: 'inf', quality: 'green' },
    { q: 4, r: 3, side: 'red', type: 'inf', quality: 'green' },
    { q: 5, r: 3, side: 'red', type: 'inf', quality: 'green' },
    { q: 6, r: 3, side: 'red', type: 'inf', quality: 'regular' },
    { q: 7, r: 3, side: 'red', type: 'inf', quality: 'regular' },
    { q: 8, r: 3, side: 'red', type: 'inf', quality: 'regular' },
    { q: 9, r: 3, side: 'red', type: 'inf', quality: 'regular' },
    { q: 10, r: 3, side: 'red', type: 'inf', quality: 'green' },
    { q: 11, r: 3, side: 'red', type: 'inf', quality: 'green' },
    { q: 12, r: 3, side: 'red', type: 'inf', quality: 'green' },
    { q: 4, r: 4, side: 'red', type: 'inf', quality: 'green' },
    { q: 5, r: 4, side: 'red', type: 'inf', quality: 'green' },
    { q: 6, r: 4, side: 'red', type: 'inf', quality: 'regular' },
    { q: 7, r: 4, side: 'red', type: 'inf', quality: 'regular' },
    { q: 8, r: 4, side: 'red', type: 'inf', quality: 'regular' },
    { q: 9, r: 4, side: 'red', type: 'inf', quality: 'green' },
    { q: 10, r: 4, side: 'red', type: 'inf', quality: 'green' },
    { q: 11, r: 4, side: 'red', type: 'inf', quality: 'green' },
    { q: 3, r: 4, side: 'red', type: 'skr', quality: 'regular' },
    { q: 12, r: 4, side: 'red', type: 'skr', quality: 'regular' },
    { q: 2, r: 3, side: 'red', type: 'cav', quality: 'regular' },
    { q: 13, r: 3, side: 'red', type: 'cav', quality: 'regular' },
  ],
  meta: {
    group: 'history',
    historical: '480 BCE',
    description: 'Spartan-led defense in a narrow pass bounded by sea and impassable heights.',
    sideLabels: { blue: 'Greek', red: 'Persian', named: true },
    checkpointTurn: 6,
    objectives: [
      { id: 'hot-gates', name: 'Hot Gates Chokepoint', value: 3, contestAdjacent: true, hexes: [{ q: 7, r: 5 }, { q: 8, r: 5 }] },
    ],
  },
};

// === Terrain Pack (Berserker) ===
// Adds terrain-focused variants of the existing Grand scenarios.
// Board-aware: these generators only emit coordinates on active board hexes.
(function addTerrainPack(){
  const add = (name, baseName, terrainMaker) => {
    const base = SCENARIOS[baseName];
    if (!base) {
      console.warn('[TerrainPack] Missing base scenario:', baseName);
      return;
    }
    if (SCENARIOS[name]) return;
    SCENARIOS[name] = {
      terrain: terrainMaker(),
      units: base.units || [],
    };
  };

  const rows = new Map();
  for (const h of board.active) {
    if (!rows.has(h.r)) rows.set(h.r, []);
    rows.get(h.r).push(h);
  }
  for (const list of rows.values()) {
    list.sort((a, b) => a.q - b.q);
  }

  const centerR = Math.floor((board.minR + board.maxR) / 2);
  const centerRow = rows.get(centerR) || [];
  const centerQ = centerRow.length ? centerRow[Math.floor(centerRow.length / 2)].q : 0;

  function row(r) {
    return rows.get(r) || [];
  }

  function buildTerrain(builder) {
    const t = [];
    const seen = new Set();

    const addHex = (q, r, terrain) => {
      const hk = key(q, r);
      if (!board.activeSet.has(hk)) return;
      const tk = `${hk}:${terrain}`;
      if (seen.has(tk)) return;
      seen.add(tk);
      t.push({ q, r, terrain });
    };

    builder({ addHex, row, all: board.active, centerQ, centerR });
    return t;
  }

  // A: central ridge with two passes
  add('Terrain A — Ridge Line (30v30, mirrored)', 'Grand A — Even Lines (30v30, mirrored)', () =>
    buildTerrain(({ addHex, row, centerQ, centerR }) => {
      const passes = new Set([centerQ - 3, centerQ + 3]);
      for (const h of row(centerR)) {
        if (passes.has(h.q)) continue;
        addHex(h.q, h.r, 'hills');
      }
      for (const flankR of [centerR - 1, centerR + 1]) {
        for (const h of row(flankR)) {
          if ((h.q - centerQ) % 3 === 0) addHex(h.q, h.r, 'hills');
        }
      }
    })
  );

  // B: wide woods belt with a clear road
  add('Terrain B — Woods Belt (28v28, mirrored)', 'Grand B — Center Push (28v28, mirrored)', () =>
    buildTerrain(({ addHex, row, centerQ, centerR }) => {
      const roadQ = centerQ;
      for (const beltR of [centerR - 1, centerR, centerR + 1]) {
        for (const h of row(beltR)) {
          if (h.q === roadQ) continue;
          addHex(h.q, h.r, 'woods');
        }
      }
      for (const h of row(centerR - 2)) {
        if (h.q <= centerQ - 4) addHex(h.q, h.r, 'woods');
      }
      for (const h of row(centerR + 2)) {
        if (h.q >= centerQ + 4) addHex(h.q, h.r, 'woods');
      }
    })
  );

  // C: rough patches that punish cavalry lanes
  add('Terrain C — Broken Ground (30v30, mirrored)', 'Grand C — Double Envelopment (30v30, mirrored)', () =>
    buildTerrain(({ addHex, all, centerQ, centerR }) => {
      for (const h of all) {
        const dr = Math.abs(h.r - centerR);
        const dq = Math.abs(h.q - centerQ);
        if (dr <= 2 && dq >= 3 && ((h.q + h.r) & 1) === 0) addHex(h.q, h.r, 'rough');
      }
      for (const q of [centerQ - 4, centerQ, centerQ + 4]) {
        addHex(q, centerR, 'rough');
      }
    })
  );

  // D: marshy edge (water) that anchors flanks
  add('Terrain D — Marsh Edge (26v26, mirrored)', 'Grand D — Massive Screen (26v26, mirrored)', () =>
    buildTerrain(({ addHex, row, all, centerQ, centerR }) => {
      for (const edgeR of [board.minR, board.maxR]) {
        for (const h of row(edgeR)) {
          if (((h.q + h.r) & 1) === 1) addHex(h.q, h.r, 'water');
        }
      }
      for (const nearEdgeR of [board.minR + 1, board.maxR - 1]) {
        for (const h of row(nearEdgeR)) {
          if (((h.q + h.r) & 1) === 0) addHex(h.q, h.r, 'rough');
        }
      }
      for (const h of all) {
        const dr = Math.abs(h.r - centerR);
        const dq = Math.abs(h.q - centerQ);
        if (dr <= 1 && dq >= 7) addHex(h.q, h.r, 'water');
      }
    })
  );

  // E: mirrored river with three fords
  add('Terrain E — River Fords (24v24, mirrored)', 'Grand E — River Fords (24v24, mirrored)', () =>
    buildTerrain(({ addHex, row, centerQ, centerR }) => {
      const fords = new Set([centerQ - 4, centerQ, centerQ + 4]);
      for (const h of row(centerR)) {
        if (!fords.has(h.q)) addHex(h.q, h.r, 'water');
      }
      for (const bankR of [centerR - 1, centerR + 1]) {
        for (const h of row(bankR)) {
          if (Math.abs(h.q - centerQ) % 3 === 1) addHex(h.q, h.r, 'rough');
        }
      }
    })
  );

  // F: a corridor of clear with rough walls
  add('Terrain F — Corridor Pass (22v22, mirrored)', 'Grand F — Corridor Pass (22v22, mirrored)', () =>
    buildTerrain(({ addHex, all, centerQ, centerR }) => {
      for (const h of all) {
        const dr = Math.abs(h.r - centerR);
        const dq = Math.abs(h.q - centerQ);
        const inCorridor = dq <= 1;
        if (dr <= 2 && dq <= 6 && !inCorridor && ((h.q + h.r) & 1) === 0) {
          addHex(h.q, h.r, 'rough');
        }
      }
      for (const q of [centerQ - 2, centerQ + 2]) {
        addHex(q, centerR - 1, 'hills');
        addHex(q, centerR + 1, 'hills');
      }
      for (const q of [centerQ - 5, centerQ + 5]) {
        addHex(q, centerR, 'hills');
      }
    })
  );
})();



  // --- Geometry helpers
  function toAxial(q, r) {
    // Convert odd-r offset (q=col, r=row) to axial (x,z) where z=r.
    const x = q - ((r - (r & 1)) / 2);
    const z = r;
    return { x, z };
  }

  function axialDistance(aq, ar, bq, br) {
    const a = toAxial(aq, ar);
    const b = toAxial(bq, br);
    const dx = a.x - b.x;
    const dz = a.z - b.z;
    const dy = (-a.x - a.z) - (-b.x - b.z);
    return Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dz));
  }

  // --- Canvas layout
  let R = 28; // will be recalculated
  let HEX_W = 0;
  let HEX_H = 0;
  let STEP_Y = 0;
  let ORIGIN_X = 0;
  let ORIGIN_Y = 0;

  function syncLayoutChromeHeights() {
    const root = document.documentElement;
    if (!root) return;
    const hud = document.getElementById('hud');
    const rail = document.getElementById('combatRail');
    if (hud) {
      const h = Math.max(1, Math.ceil(hud.getBoundingClientRect().height || 0));
      root.style.setProperty('--hud-h', `${h}px`);
    }
    if (rail) {
      const h = Math.max(1, Math.ceil(rail.getBoundingClientRect().height || 0));
      root.style.setProperty('--combat-h', `${h}px`);
    }
  }

  function resize() {
    syncLayoutChromeHeights();
    // Canvas must size to board stage only (not the wrap that also contains dice dock).
    const stage = elBoardStage || elCanvasWrap || document.getElementById('canvasWrap');
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    if (!rect || !Number.isFinite(rect.width) || !Number.isFinite(rect.height)) return;
    if (rect.width <= 0 || rect.height <= 0) return;
    elCanvas.width = Math.floor(rect.width * devicePixelRatio);
    elCanvas.height = Math.floor(rect.height * devicePixelRatio);
    elCanvas.style.width = `${Math.floor(rect.width)}px`;
    elCanvas.style.height = `${Math.floor(rect.height)}px`;
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);

    // Fit board using ACTIVE hex geometry (not sparse q/r ranges),
    // so large displays keep the board legible and centered.
    const active = Array.isArray(board.active) ? board.active : [];
    if (!active.length) return;

    let minNormQ = Infinity;
    let maxNormQ = -Infinity;
    let minNormR = Infinity;
    let maxNormR = -Infinity;
    for (const h of active) {
      const normQ = h.q + ((h.r & 1) ? 0.5 : 0);
      minNormQ = Math.min(minNormQ, normQ);
      maxNormQ = Math.max(maxNormQ, normQ);
      minNormR = Math.min(minNormR, h.r);
      maxNormR = Math.max(maxNormR, h.r);
    }

    const spanNormQ = Math.max(0, maxNormQ - minNormQ);
    const spanNormR = Math.max(0, maxNormR - minNormR);

    const availW = rect.width;
    const availH = rect.height;
    const smallViewport = window.matchMedia('(max-width: 980px)').matches;
    const boardPad = smallViewport ? 8 : 10;
    const fitW = Math.max(1, availW - (boardPad * 2));
    const fitH = Math.max(1, availH - (boardPad * 2));

    // For pointy-top odd-r offset coordinates:
    // width units = sqrt(3) * (spanNormQ + 1)
    // height units = (spanNormR * 1.5) + 2
    const unitsW = Math.sqrt(3) * (spanNormQ + 1);
    const unitsH = (spanNormR * 1.5) + 2;
    const rByW = fitW / Math.max(1e-6, unitsW);
    const rByH = fitH / Math.max(1e-6, unitsH);

    const minRadius = smallViewport ? 8 : 20;
    const maxRadius = smallViewport ? 58 : 120;
    R = Math.max(minRadius, Math.min(maxRadius, Math.floor(Math.min(rByW, rByH))));

    let boardW = unitsW * R;
    let boardH = unitsH * R;

    // Keep the board visually dominant on large/wide displays.
    const targetFillW = smallViewport ? 0.86 : 0.84;
    const targetFillH = smallViewport ? 0.70 : 0.66;
    if (boardW < (fitW * targetFillW) || boardH < (fitH * targetFillH)) {
      const boostW = (fitW * targetFillW) / Math.max(1, boardW);
      const boostH = (fitH * targetFillH) / Math.max(1, boardH);
      const desiredBoost = Math.max(boostW, boostH, 1);
      const hardCapBoost = Math.min(fitW / Math.max(1, boardW), fitH / Math.max(1, boardH));
      const boostedR = Math.floor(R * Math.min(desiredBoost, hardCapBoost));
      R = Math.max(R, Math.min(maxRadius, boostedR));
      boardW = unitsW * R;
      boardH = unitsH * R;
    }

    HEX_W = Math.sqrt(3) * R;
    HEX_H = 2 * R;
    STEP_Y = 1.5 * R;

    const left = boardPad + ((fitW - boardW) / 2);
    const top = boardPad + ((fitH - boardH) / 2) + (smallViewport ? 0 : 4);

    ORIGIN_X = left + (HEX_W / 2);
    ORIGIN_Y = top + R;

    for (const h of active) {
      const normQ = (h.q + ((h.r & 1) ? 0.5 : 0)) - minNormQ;
      const normR = h.r - minNormR;
      h.cx = left + (normQ * HEX_W) + (HEX_W / 2);
      h.cy = top + (normR * STEP_Y) + R;
    }

    draw();
  }

  function hexPath(cx, cy) {
    const p = new Path2D();
    for (let i = 0; i < 6; i++) {
      const ang = (Math.PI / 180) * (60 * i - 30); // pointy top
      const x = cx + R * Math.cos(ang);
      const y = cy + R * Math.sin(ang);
      if (i === 0) p.moveTo(x, y);
      else p.lineTo(x, y);
    }
    p.closePath();
    return p;
  }

  function hexCorners(cx, cy) {
    // Corner order matches hexPath (i=0..5, angle = 60*i - 30)
    const pts = [];
    for (let i = 0; i < 6; i++) {
      const ang = (Math.PI / 180) * (60 * i - 30);
      pts.push({
        x: cx + R * Math.cos(ang),
        y: cy + R * Math.sin(ang),
      });
    }
    return pts;
  }

  function edgeCornerIdx(dir) {
    // Neighbor order is [E, NE, NW, W, SW, SE]
    switch (dir) {
      case 0: return [0, 1]; // E
      case 1: return [5, 0]; // NE
      case 2: return [4, 5]; // NW
      case 3: return [3, 4]; // W
      case 4: return [2, 3]; // SW
      case 5: return [1, 2]; // SE
      default: return [0, 1];
    }
  }

  function commandOutlinePath(sourceKey) {
    const sourceHex = board.byKey.get(sourceKey);
    const sourceUnit = unitsByHex.get(sourceKey);
    if (!sourceHex) return null;
    if (!isCommandSourceUnit(sourceUnit)) return null;

    const radius = commandRadiusForUnit(sourceUnit);
    if (radius <= 0) return null;

    // Command area = all active hexes within this source unit's command radius.
    const inside = new Set();
    for (const h of board.active) {
      if (axialDistance(h.q, h.r, sourceHex.q, sourceHex.r) <= radius) inside.add(h.k);
    }

    const path = new Path2D();

    for (const h of board.active) {
      if (!inside.has(h.k)) continue;

      const corners = hexCorners(h.cx, h.cy);
      const deltas = (h.r & 1) ? NEIGH_ODD : NEIGH_EVEN;

      for (let dir = 0; dir < 6; dir++) {
        const [dq, dr] = deltas[dir];
        const nk = key(h.q + dq, h.r + dr);

        // Only draw boundary edges: inside → outside.
        if (inside.has(nk)) continue;

        const [a, b] = edgeCornerIdx(dir);
        path.moveTo(corners[a].x, corners[a].y);
        path.lineTo(corners[b].x, corners[b].y);
      }
    }

    return path;
  }

  function pickHex(px, py) {
    let best = null;
    let bestD2 = Infinity;
    for (const h of board.active) {
      const dx = px - h.cx;
      const dy = py - h.cy;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestD2) {
        bestD2 = d2;
        best = h;
      }
    }
    if (!best) return null;
    if (bestD2 > (R * R * 0.95)) return null;
    return best;
  }

  // --- Rendering
  // Terrain is intentionally a *tint* over a shared base, not a repaint.
  // That keeps the board calm while still making woods/hills/rough/water read instantly.
  const TERRAIN_THEMES = {
  battlefield: {
    base: '#c7c2a6',
    grid: 'rgba(0,0,0,0.28)',
    tint: {
      hills: 'rgba(176, 120, 40, 0.24)',
      woods: 'rgba(40, 120, 60, 0.22)',
      rough: 'rgba(110, 85, 70, 0.20)',
      water: 'rgba(30, 90, 170, 0.30)',
    },
  },
    // Classic tabletop parchment: subtle but readable.
    classic: {
      base: '#f4f2ea',
      grid: 'rgba(0,0,0,0.35)',
      tint: {
        hills: 'rgba(183, 131, 43, 0.18)',  // warm ochre
        woods: 'rgba(36, 122, 63, 0.20)',   // deep green
        rough: 'rgba(107, 84, 70, 0.16)',   // brown-grey
        water: 'rgba(30, 90, 170, 0.20)',   // river blue
      },
    },
    // Vivid Dusk: more saturation without turning the map into a neon quilt.
    vivid: {
      base: '#f4f2ea',
      grid: 'rgba(0,0,0,0.35)',
      tint: {
        hills: 'rgba(183, 131, 43, 0.26)',
        woods: 'rgba(36, 122, 63, 0.28)',
        rough: 'rgba(107, 84, 70, 0.22)',
        water: 'rgba(30, 90, 170, 0.28)',
      },
    },
    // Dark UI chrome option (kept because some people love it).
    dusk: {
      base: '#2f2d28',
      grid: 'rgba(255,255,255,0.14)',
      tint: {
        hills: 'rgba(183, 131, 43, 0.14)',
        woods: 'rgba(36, 122, 63, 0.16)',
        rough: 'rgba(107, 84, 70, 0.13)',
        water: 'rgba(30, 90, 170, 0.16)',
      },
    },
  };

  const TERRAIN_THEME_ORDER = ['vivid', 'classic', 'dusk'];

  function terrainTheme() {
    const theme = state.terrainTheme || 'vivid';
    return TERRAIN_THEMES[theme] || TERRAIN_THEMES.vivid;
  }

  function terrainBaseFill() {
    return terrainTheme().base || '#f4f2ea';
  }

  function terrainTint(t) {
    if (!t || t === 'clear') return null;
    const pal = terrainTheme();
    return (pal.tint && pal.tint[t]) ? pal.tint[t] : null;
  }

  function gridStroke() {
    return terrainTheme().grid || '#111';
  }
function unitColors(side) {
    return side === 'blue'
      ? { fill: '#0b3d91', stroke: '#8fb4ff', text: '#eaf2ff' }
      : { fill: '#7a1111', stroke: '#ff9a9a', text: '#ffecec' };
  }

  function drawRunnerFootGlyph(cx, cy, size) {
    const s = Math.max(8, size);
    const halfW = s * 0.42;
    const gap = s * 0.19;
    const y0 = cy - gap;

    ctx.save();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(2, s * 0.12);
    ctx.lineCap = 'round';

    // Three clean horizontal "speed" lines.
    ctx.beginPath();
    ctx.moveTo(cx - halfW, y0);
    ctx.lineTo(cx + halfW, y0);
    ctx.moveTo(cx - halfW, y0 + gap);
    ctx.lineTo(cx + halfW, y0 + gap);
    ctx.moveTo(cx - halfW, y0 + (gap * 2));
    ctx.lineTo(cx + halfW, y0 + (gap * 2));
    ctx.stroke();
    ctx.restore();
  }

  function qualityRingColor(q) {
    switch (q) {
      case 'veteran': return '#ffd34d';
      case 'regular': return '#e8f0ff';
      default: return '#4df07b';
    }
  }

  function drawQualityRing(cx, cy, quality) {
    const ringR = R * 0.55;
    const ringW = Math.max(5, Math.floor(R * 0.22));
    const frameW = Math.max(2, Math.floor(ringW * 0.44));
    const frameOffset = (ringW * 0.5) - (frameW * 0.5);

    // Outer dark frame so the ring separates from light terrain.
    ctx.beginPath();
    ctx.arc(cx, cy, ringR + frameOffset, 0, Math.PI * 2);
    ctx.lineWidth = frameW;
    ctx.strokeStyle = 'rgba(8, 10, 14, 0.95)';
    ctx.stroke();

    // Main quality band.
    ctx.beginPath();
    ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
    ctx.lineWidth = ringW;
    ctx.strokeStyle = qualityRingColor(quality);
    ctx.shadowColor = qualityRingColor(quality);
    ctx.shadowBlur = Math.max(2, Math.round(R * 0.08));
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Inner dark frame so silver/gold rings still read against token fills.
    ctx.beginPath();
    ctx.arc(cx, cy, ringR - frameOffset, 0, Math.PI * 2);
    ctx.lineWidth = frameW;
    ctx.strokeStyle = 'rgba(8, 10, 14, 0.95)';
    ctx.stroke();
  }

  function ensureVisualAnimationLoop() {
    if (state.animFrame) return;
    state.animFrame = requestAnimationFrame(function tick() {
      state.animFrame = null;
      const now = Date.now();
      const moveActive = !!(state.moveAnim && now < state.moveAnim.endAt);
      const flashActive = !!(state.attackFlash && now < state.attackFlash.endAt);
      draw();
      if (moveActive || flashActive) ensureVisualAnimationLoop();
    });
  }

  function startMoveAnimation(fromKey, toKey, unit) {
    if (!unit || !fromKey || !toKey || fromKey === toKey) return;
    if (!board.activeSet.has(fromKey) || !board.activeSet.has(toKey)) return;

    const aiSideMove = isAiTurnActive() && unit.side === state.side;
    const durationMs = aiSideMove ? MOVE_ANIM_MS_AI : MOVE_ANIM_MS_HUMAN;
    const now = Date.now();
    state.moveAnim = {
      unitId: unit.id,
      fromKey,
      toKey,
      startAt: now,
      endAt: now + durationMs,
      unit: {
        side: unit.side,
        type: unit.type,
        quality: unit.quality,
        hp: unit.hp,
      },
    };
    state.moveAnimUntil = state.moveAnim.endAt;
    ensureVisualAnimationLoop();
  }

  function setAttackFlash(hexKey, durationMs = ATTACK_FLASH_MS, opts = {}) {
    if (!hexKey || !board.activeSet.has(hexKey)) return;
    const now = Date.now();
    state.attackFlash = {
      hexKey,
      fromKey: (opts && opts.fromKey && board.activeSet.has(opts.fromKey)) ? opts.fromKey : null,
      strikeType: (opts && opts.strikeType) ? String(opts.strikeType) : 'melee',
      attackerType: (opts && opts.attackerType) ? String(opts.attackerType) : '',
      startAt: now,
      endAt: now + Math.max(120, durationMs),
    };
    ensureVisualAnimationLoop();
  }

  function drawAttackTrajectory(anim, phase = 0) {
    if (!anim || !anim.fromKey || !anim.hexKey) return;
    const fromHex = board.byKey.get(anim.fromKey);
    const toHex = board.byKey.get(anim.hexKey);
    if (!fromHex || !toHex) return;

    const t = Math.max(0, Math.min(1, Number.isFinite(phase) ? phase : 0));
    const isRanged =
      anim.strikeType === 'ranged' ||
      anim.attackerType === 'arc' ||
      anim.attackerType === 'skr';

    ctx.save();
    if (isRanged) {
      const midX = (fromHex.cx + toHex.cx) * 0.5;
      const arcLift = Math.max(R * 0.8, Math.abs(fromHex.cx - toHex.cx) * 0.12);
      const midY = Math.min(fromHex.cy, toHex.cy) - arcLift;

      ctx.beginPath();
      ctx.moveTo(fromHex.cx, fromHex.cy);
      ctx.quadraticCurveTo(midX, midY, toHex.cx, toHex.cy);
      ctx.lineWidth = Math.max(2, Math.round(R * 0.08));
      ctx.strokeStyle = 'rgba(247, 223, 162, 0.82)';
      ctx.setLineDash(anim.attackerType === 'skr' ? [4, 7] : [9, 6]);
      ctx.stroke();
      ctx.setLineDash([]);

      const u = 1 - t;
      const px = (u * u * fromHex.cx) + (2 * u * t * midX) + (t * t * toHex.cx);
      const py = (u * u * fromHex.cy) + (2 * u * t * midY) + (t * t * toHex.cy);
      ctx.beginPath();
      ctx.arc(px, py, Math.max(3, Math.round(R * 0.09)), 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 248, 219, 0.95)';
      ctx.shadowColor = 'rgba(250, 222, 133, 0.7)';
      ctx.shadowBlur = Math.max(5, Math.round(R * 0.2));
      ctx.fill();
    } else {
      const x1 = fromHex.cx;
      const y1 = fromHex.cy;
      const x2 = toHex.cx;
      const y2 = toHex.cy;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.lineWidth = Math.max(3, Math.round(R * 0.1));
      ctx.strokeStyle = 'rgba(255, 84, 84, 0.55)';
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawAnimatedUnitToken(anim, nowMs) {
    if (!anim) return;
    const hFrom = board.byKey.get(anim.fromKey);
    const hTo = board.byKey.get(anim.toKey);
    if (!hFrom || !hTo || !anim.unit) return;

    const span = Math.max(1, anim.endAt - anim.startAt);
    const tRaw = (nowMs - anim.startAt) / span;
    const t = Math.max(0, Math.min(1, tRaw));
    const ease = t < 0.5 ? (2 * t * t) : (1 - (Math.pow(-2 * t + 2, 2) / 2));
    const cx = hFrom.cx + ((hTo.cx - hFrom.cx) * ease);
    const cy = hFrom.cy + ((hTo.cy - hFrom.cy) * ease);
    const u = anim.unit;

    const c = unitColors(u.side);
    ctx.save();
    ctx.globalAlpha = 0.98;

    ctx.beginPath();
    ctx.arc(cx, cy, R * 0.55, 0, Math.PI * 2);
    ctx.fillStyle = c.fill;
    ctx.fill();
    ctx.lineWidth = Math.max(1.5, Math.round(R * 0.08));
    ctx.strokeStyle = 'rgba(8, 10, 14, 0.95)';
    ctx.stroke();

    drawQualityRing(cx, cy, u.quality);

    const def = UNIT_BY_ID.get(u.type);
    const canIcon = (u.type !== 'gen') && unitIconReady && unitIconReady(u.type);
    if (u.type === 'run') {
      drawRunnerFootGlyph(cx, cy, R * 0.82);
    } else if (canIcon) {
      const img = UNIT_ICONS && UNIT_ICONS[u.type];
      if (img) {
        const base = R * 0.95;
        const tune = (UNIT_ICON_TUNE && UNIT_ICON_TUNE[u.type]) ? UNIT_ICON_TUNE[u.type] : { scale: 0.95, y: 0 };
        const s = Math.floor(base * (tune.scale || 0.95));
        const yOff = Math.floor(R * (tune.y || 0));
        const rot = (typeof tune.rot === 'number') ? tune.rot : 0;
        if (rot) {
          ctx.save();
          ctx.translate(Math.floor(cx), Math.floor(cy + yOff));
          ctx.rotate(rot);
          ctx.drawImage(img, Math.floor(-s / 2), Math.floor(-s / 2), s, s);
          ctx.restore();
        } else {
          ctx.drawImage(img, Math.floor(cx - s / 2), Math.floor(cy - s / 2 + yOff), s, s);
        }
      }
    } else {
      const textScale = (u.type === 'inf' || u.type === 'cav' || u.type === 'skr') ? 0.83 : 1.0;
      const fontPx = Math.floor(R * 0.55 * textScale);
      ctx.font = `700 ${fontPx}px system-ui, -apple-system, Segoe UI, Roboto, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = c.text;
      ctx.fillText(def ? def.symbol : '?', cx, cy + 1);
    }

    const maxHp = unitMaxHp(u.type, u.quality);
    const pipR = Math.max(2, Math.floor(R * 0.07));
    const startX = cx - (pipR * 2) * (maxHp - 1) * 0.5;
    const y = cy + R * 0.78;
    for (let i = 0; i < maxHp; i++) {
      ctx.beginPath();
      ctx.arc(startX + i * (pipR * 2), y, pipR, 0, Math.PI * 2);
      ctx.fillStyle = (i < u.hp) ? '#fff' : '#ffffff33';
      ctx.fill();
    }

    ctx.restore();
  }

  function draw() {
    const nowMs = Date.now();
    if (state.moveAnim && nowMs >= state.moveAnim.endAt) {
      state.moveAnim = null;
      state.moveAnimUntil = 0;
    }
    if (state.attackFlash && nowMs >= state.attackFlash.endAt) {
      state.attackFlash = null;
    }

    ctx.clearRect(0, 0, elCanvas.width, elCanvas.height);

    // Background
    ctx.fillStyle = '#0b0b0d';
    ctx.fillRect(0, 0, elCanvas.width, elCanvas.height);

    const braceOverlay = (state.mode === 'play') ? computeInfantryBraceOverlay() : null;
    const objectiveOverlay = (() => {
      if (!Array.isArray(state.scenarioObjectives) || state.scenarioObjectives.length === 0) return null;
      const out = new Map();
      const objState = evaluateObjectiveControl();
      const byId = new Map((objState.details || []).map((d) => [d.id, d]));
      for (const zone of state.scenarioObjectives) {
        const detail = byId.get(zone.id) || {};
        for (const hk of zone.hexes || []) {
          const cur = out.get(hk) || { blue: 0, red: 0, contested: 0, value: 0 };
          if (detail.owner === 'blue') cur.blue += 1;
          else if (detail.owner === 'red') cur.red += 1;
          else cur.contested += 1;
          cur.value += Number(zone.value || 1);
          out.set(hk, cur);
        }
      }
      return out;
    })();
    const lineAdvanceOverlay = (state.mode === 'play') ? buildLineAdvanceOverlay() : null;
    const doctrineTargetOverlay = (state.mode === 'play') ? buildDoctrineTargetOverlay() : null;
    const tutorialOverlay = buildTutorialBoardOverlay(nowMs);

    // Hexes
    for (const h of board.active) {
      const p = hexPath(h.cx, h.cy);
      ctx.fillStyle = terrainBaseFill();
      ctx.fill(p);

      const tint = terrainTint(h.terrain);
      if (tint) {
        ctx.fillStyle = tint;
        ctx.fill(p);
      }

      const braceMark = braceOverlay ? braceOverlay.get(h.k) : null;
      if (braceMark) {
        if (braceMark.supporter > 0) {
          const a = 0.10 + (braceMark.supporter * 0.18);
          ctx.save();
          ctx.fillStyle = `rgba(19, 146, 176, ${a.toFixed(3)})`;
          ctx.fill(p);
          ctx.restore();
        }
        if (braceMark.defender > 0) {
          const a = 0.12 + (braceMark.defender * 0.18);
          ctx.save();
          ctx.fillStyle = `rgba(130, 234, 255, ${a.toFixed(3)})`;
          ctx.fill(p);
          ctx.restore();
        }
      }

      const objMark = objectiveOverlay ? objectiveOverlay.get(h.k) : null;
      if (objMark) {
        ctx.save();
        if (objMark.blue > 0 && objMark.red === 0 && objMark.contested === 0) {
          ctx.fillStyle = 'rgba(66, 123, 255, 0.16)';
          ctx.fill(p);
          ctx.strokeStyle = 'rgba(109, 166, 255, 0.72)';
        } else if (objMark.red > 0 && objMark.blue === 0 && objMark.contested === 0) {
          ctx.fillStyle = 'rgba(224, 72, 72, 0.15)';
          ctx.fill(p);
          ctx.strokeStyle = 'rgba(255, 130, 130, 0.72)';
        } else {
          ctx.fillStyle = 'rgba(232, 178, 68, 0.16)';
          ctx.fill(p);
          ctx.strokeStyle = 'rgba(255, 205, 109, 0.78)';
        }
        ctx.lineWidth = Math.max(2.4, Math.round(R * 0.12));
        ctx.setLineDash([5, 6]);
        ctx.stroke(p);
        ctx.setLineDash([]);
        ctx.restore();
      }

      const lineMark = lineAdvanceOverlay ? lineAdvanceOverlay.byHex.get(h.k) : null;
      if (lineMark) {
        if (lineMark.member) {
          ctx.save();
          ctx.fillStyle = lineMark.movingFrom
            ? 'rgba(90, 185, 255, 0.20)'
            : 'rgba(90, 185, 255, 0.12)';
          ctx.fill(p);
          ctx.restore();
        }
        if (lineMark.destination) {
          ctx.save();
          ctx.fillStyle = 'rgba(216, 189, 126, 0.20)';
          ctx.fill(p);
          ctx.strokeStyle = 'rgba(235, 204, 142, 0.86)';
          ctx.lineWidth = Math.max(2.2, Math.round(R * 0.10));
          ctx.setLineDash([6, 5]);
          ctx.stroke(p);
          ctx.setLineDash([]);
          ctx.restore();
        }
        if (lineMark.blockedFrom) {
          ctx.save();
          ctx.strokeStyle = 'rgba(255, 110, 110, 0.88)';
          ctx.lineWidth = Math.max(2.2, Math.round(R * 0.10));
          ctx.setLineDash([3, 5]);
          ctx.stroke(p);
          ctx.setLineDash([]);
          ctx.restore();
        }
      }

      const doctrineMark = doctrineTargetOverlay ? doctrineTargetOverlay.byHex.get(h.k) : null;
      if (doctrineMark) {
        if (doctrineMark.eligible && !doctrineMark.selected) {
          ctx.save();
          // Explicit directive-target hint: strong purple tile for eligible units.
          ctx.fillStyle = 'rgba(138, 84, 232, 0.33)';
          ctx.fill(p);
          ctx.strokeStyle = 'rgba(207, 174, 255, 0.96)';
          ctx.lineWidth = Math.max(2.2, Math.round(R * 0.10));
          ctx.stroke(p);
          // Center pip so small screens still read eligibility instantly.
          ctx.beginPath();
          ctx.arc(h.cx, h.cy, Math.max(2, Math.round(R * 0.085)), 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(238, 224, 255, 0.95)';
          ctx.fill();
          ctx.restore();
        }
        if (doctrineMark.selected) {
          ctx.save();
          ctx.fillStyle = 'rgba(117, 56, 223, 0.42)';
          ctx.fill(p);
          ctx.strokeStyle = 'rgba(232, 214, 255, 0.98)';
          ctx.lineWidth = Math.max(2.8, Math.round(R * 0.13));
          ctx.stroke(p);
          ctx.restore();
        }
        if (doctrineMark.hovered && !doctrineMark.selected) {
          ctx.save();
          ctx.fillStyle = 'rgba(171, 120, 245, 0.36)';
          ctx.fill(p);
          ctx.strokeStyle = 'rgba(248, 238, 255, 0.98)';
          ctx.lineWidth = Math.max(3, Math.round(R * 0.14));
          ctx.stroke(p);
          ctx.restore();
        }
        if (doctrineMark.destination) {
          ctx.save();
          ctx.fillStyle = 'rgba(233, 193, 120, 0.18)';
          ctx.fill(p);
          ctx.strokeStyle = 'rgba(241, 207, 145, 0.82)';
          ctx.lineWidth = Math.max(2.1, Math.round(R * 0.10));
          ctx.setLineDash([5, 4]);
          ctx.stroke(p);
          ctx.setLineDash([]);
          ctx.restore();
        }
      }

      const tutorialMark = tutorialOverlay ? tutorialOverlay.byHex.get(h.k) : null;
      if (tutorialMark) {
        if (tutorialMark.tutorialTaskTarget) {
          ctx.save();
          ctx.fillStyle = `rgba(164, 106, 246, ${(0.24 + (tutorialOverlay.pulse * 0.18)).toFixed(3)})`;
          ctx.fill(p);
          ctx.strokeStyle = 'rgba(236, 220, 255, 0.98)';
          ctx.lineWidth = Math.max(2.8, Math.round(R * 0.13));
          ctx.stroke(p);
          ctx.restore();
        }
        if (tutorialMark.tutorialFocus) {
          ctx.save();
          ctx.fillStyle = `rgba(136, 96, 230, ${(0.18 + (tutorialOverlay.pulse * 0.18)).toFixed(3)})`;
          ctx.fill(p);
          ctx.strokeStyle = 'rgba(219, 195, 255, 0.96)';
          ctx.lineWidth = Math.max(2.2, Math.round(R * 0.10));
          ctx.stroke(p);
          ctx.restore();
        }
        if (tutorialMark.tutorialDestination) {
          ctx.save();
          ctx.fillStyle = 'rgba(226, 190, 115, 0.20)';
          ctx.fill(p);
          ctx.strokeStyle = 'rgba(243, 215, 156, 0.9)';
          ctx.lineWidth = Math.max(2.2, Math.round(R * 0.10));
          ctx.setLineDash([6, 5]);
          ctx.stroke(p);
          ctx.setLineDash([]);
          ctx.restore();
        }
      }

      // Outline
      ctx.strokeStyle = gridStroke();
      ctx.lineWidth = 2;
      ctx.stroke(p);

      // Overlays
      const k = h.k;
      if (state.mode === 'play' && state.selectedKey) {
        if (state._moveTargets?.has(k)) {
          ctx.save();
          ctx.strokeStyle = '#5db8ff';
          ctx.lineWidth = Math.max(4, Math.round(R * 0.18));
          ctx.shadowColor = 'rgba(93, 184, 255, 0.42)';
          ctx.shadowBlur = Math.max(4, Math.round(R * 0.35));
          ctx.setLineDash([6, 6]);
          ctx.stroke(p);
          ctx.setLineDash([]);
          ctx.restore();
        }
        if (state._attackTargets?.has(k)) {
          ctx.strokeStyle = '#ff5050';
          ctx.lineWidth = 3;
          ctx.setLineDash([6, 6]);
          ctx.stroke(p);
          ctx.setLineDash([]);
        }
        if (state._healTargets?.has(k)) {
          ctx.strokeStyle = '#35b36a';
          ctx.lineWidth = 3;
          ctx.setLineDash([4, 5]);
          ctx.stroke(p);
          ctx.setLineDash([]);
        }
      }

      if (state.attackFlash && state.attackFlash.hexKey === k) {
        const span = Math.max(1, state.attackFlash.endAt - state.attackFlash.startAt);
        const phase = Math.max(0, Math.min(1, (nowMs - state.attackFlash.startAt) / span));
        drawAttackTrajectory(state.attackFlash, phase);
        const pulse = 0.55 + (Math.sin((phase * Math.PI * 4)) * 0.25);
        ctx.save();
        ctx.fillStyle = `rgba(255, 60, 60, ${0.15 + (pulse * 0.15)})`;
        ctx.fill(p);
        ctx.strokeStyle = `rgba(255, 88, 88, ${0.70 + (pulse * 0.25)})`;
        ctx.lineWidth = Math.max(4, Math.round(R * 0.22));
        ctx.shadowColor = 'rgba(255, 70, 70, 0.7)';
        ctx.shadowBlur = Math.max(8, Math.round(R * 0.55));
        ctx.stroke(p);
        ctx.restore();
      }

      // Hover
      if (state._hoverKey === k) {
        ctx.strokeStyle = '#ffffff55';
        ctx.lineWidth = 3;
        ctx.stroke(p);
      }
    }

    if (doctrineTargetOverlay && Array.isArray(doctrineTargetOverlay.paths)) {
      for (const mv of doctrineTargetOverlay.paths) {
        const fromHex = board.byKey.get(mv.fromKey);
        if (!fromHex) continue;
        const toHex = mv.toKey ? board.byKey.get(mv.toKey) : null;
        if (!toHex) {
          if (mv.blocked) {
            const p = hexPath(fromHex.cx, fromHex.cy);
            ctx.save();
            ctx.strokeStyle = 'rgba(255, 116, 116, 0.92)';
            ctx.lineWidth = Math.max(2.2, Math.round(R * 0.10));
            ctx.setLineDash([3, 5]);
            ctx.stroke(p);
            ctx.setLineDash([]);
            ctx.restore();
          }
          continue;
        }
        ctx.save();
        const pathStroke = mv.blocked
          ? 'rgba(255, 116, 116, 0.92)'
          : (mv.hover ? 'rgba(210, 238, 255, 0.96)' : 'rgba(130, 206, 255, 0.92)');
        ctx.strokeStyle = pathStroke;
        ctx.lineWidth = Math.max(2.4, Math.round(R * 0.10));
        if (mv.blocked) ctx.setLineDash([3, 5]);
        else if (mv.hover) ctx.setLineDash([2, 4]);
        ctx.beginPath();
        ctx.moveTo(fromHex.cx, fromHex.cy);
        ctx.lineTo(toHex.cx, toHex.cy);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc(toHex.cx, toHex.cy, Math.max(3, Math.round(R * 0.12)), 0, Math.PI * 2);
        ctx.fillStyle = mv.blocked
          ? 'rgba(255, 122, 122, 0.88)'
          : (mv.hover ? 'rgba(228, 244, 255, 0.93)' : 'rgba(144, 221, 255, 0.88)');
        ctx.fill();
        ctx.restore();
      }
    }

    if (tutorialOverlay && Array.isArray(tutorialOverlay.paths)) {
      for (const mv of tutorialOverlay.paths) {
        const fromHex = board.byKey.get(mv.fromKey);
        const toHex = board.byKey.get(mv.toKey);
        if (!fromHex || !toHex) continue;
        const isRanged = mv.kind === 'ranged';
        const isSupport = mv.kind === 'support' || mv.kind === 'command';
        const isRetreat = mv.kind === 'retreat';

        ctx.save();
        ctx.lineWidth = Math.max(2.4, Math.round(R * 0.10));
        if (isRanged) {
          const midX = (fromHex.cx + toHex.cx) * 0.5;
          const arcLift = Math.max(R * 0.8, Math.abs(fromHex.cx - toHex.cx) * 0.15);
          const midY = Math.min(fromHex.cy, toHex.cy) - arcLift;
          ctx.strokeStyle = 'rgba(246, 224, 169, 0.95)';
          ctx.setLineDash([8, 6]);
          ctx.beginPath();
          ctx.moveTo(fromHex.cx, fromHex.cy);
          ctx.quadraticCurveTo(midX, midY, toHex.cx, toHex.cy);
          ctx.stroke();
        } else {
          ctx.strokeStyle = isRetreat
            ? 'rgba(255, 156, 156, 0.96)'
            : (isSupport
              ? 'rgba(158, 220, 255, 0.92)'
              : 'rgba(246, 212, 146, 0.94)');
          ctx.setLineDash(
            isRetreat
              ? [3, 4]
              : (isSupport ? [2, 4] : [6, 5])
          );
          ctx.beginPath();
          ctx.moveTo(fromHex.cx, fromHex.cy);
          ctx.lineTo(toHex.cx, toHex.cy);
          ctx.stroke();
        }
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc(toHex.cx, toHex.cy, Math.max(3, Math.round(R * 0.12)), 0, Math.PI * 2);
        ctx.fillStyle = isRetreat
          ? 'rgba(255, 178, 178, 0.96)'
          : (isSupport ? 'rgba(194, 234, 255, 0.93)' : 'rgba(249, 230, 182, 0.96)');
        ctx.fill();

        // Moving marker to make the tutorial path feel animated and readable.
        const t = tutorialOverlay.travelPhase ?? 0;
        let markerX = fromHex.cx + ((toHex.cx - fromHex.cx) * t);
        let markerY = fromHex.cy + ((toHex.cy - fromHex.cy) * t);
        if (isRanged) {
          const midX = (fromHex.cx + toHex.cx) * 0.5;
          const arcLift = Math.max(R * 0.8, Math.abs(fromHex.cx - toHex.cx) * 0.15);
          const midY = Math.min(fromHex.cy, toHex.cy) - arcLift;
          const inv = 1 - t;
          markerX = (inv * inv * fromHex.cx) + (2 * inv * t * midX) + (t * t * toHex.cx);
          markerY = (inv * inv * fromHex.cy) + (2 * inv * t * midY) + (t * t * toHex.cy);
        }
        ctx.beginPath();
        ctx.arc(markerX, markerY, Math.max(2.4, Math.round(R * 0.10)), 0, Math.PI * 2);
        ctx.fillStyle = isRetreat
          ? 'rgba(255, 162, 162, 0.97)'
          : (isSupport ? 'rgba(166, 227, 255, 0.95)' : 'rgba(255, 233, 178, 0.96)');
        ctx.fill();
        ctx.restore();
      }
    }

    // Command radius outlines (truthy, but calm): dotted perimeter.
    if (state.mode === 'play' && state.showCommand) {
      for (const [hk, u] of unitsByHex) {
        if (!isUnitVisibleForCurrentView(u)) continue;
        if (!isCommandSourceUnit(u)) continue;

        const p = commandOutlinePath(hk);
        if (!p) continue;

        const isSel = (state.selectedKey === hk);
        const isTurnSide = (u.side === state.side);
        const alpha = isSel ? 0.95 : (isTurnSide ? 0.80 : 0.30);
        // Thicker + slightly darker so the command perimeter reads clearly.
        const lw = (isSel ? 3 : (isTurnSide ? 2.25 : 1.75)) * 2;

        ctx.save();
        const strokeRgb = (u.type === 'run') ? '65, 169, 255' : '210, 118, 0';
        ctx.strokeStyle = `rgba(${strokeRgb}, ${alpha})`;
        ctx.lineWidth = lw;
        ctx.setLineDash(u.type === 'run' ? [2, 6] : [4, 6]);
        ctx.lineCap = 'round';
        ctx.stroke(p);
        ctx.restore();
      }
    }

    // Units
    for (const [hk, u] of unitsByHex) {
      if (!isUnitVisibleForCurrentView(u)) continue;
      if (state.moveAnim && state.moveAnim.unitId === u.id && state.moveAnim.toKey === hk) continue;
      const h = board.byKey.get(hk);
      if (!h) continue;

      const isPlay = (state.mode === 'play') && !state.gameOver;
      const isTurnSide = isPlay && (u.side === state.side);
      const isSpent = isTurnSide && state.actedUnitIds.has(u.id);
      const isCmdLocked = isTurnSide && !isSpent && (state.actsUsed < ACT_LIMIT) &&
        (!unitIgnoresCommand(u)) && (u.quality === 'green') && (!inCommandAt(hk, u.side));

      // Visual friction: spent units and unorderable greens read as "not available".
      // - spent: dim
      // - green out-of-command: dim + dashed orange ring
      const alpha = isSpent ? 0.38 : (isCmdLocked ? 0.48 : 1.0);

      const c = unitColors(u.side);

      ctx.save();
      ctx.globalAlpha = alpha;

      // Token disc
      ctx.beginPath();
      ctx.arc(h.cx, h.cy, R * 0.55, 0, Math.PI * 2);
      ctx.fillStyle = c.fill;
      ctx.fill();
      ctx.lineWidth = Math.max(1.5, Math.round(R * 0.08));
      ctx.strokeStyle = 'rgba(8, 10, 14, 0.95)';
      ctx.stroke();

      const braceMark = braceOverlay ? braceOverlay.get(hk) : null;
      if (braceMark) {
        if (braceMark.supporter > 0) {
          const a = 0.10 + (braceMark.supporter * 0.22);
          ctx.beginPath();
          ctx.arc(h.cx, h.cy, R * 0.56, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(27, 153, 186, ${a.toFixed(3)})`;
          ctx.fill();
        }
        if (braceMark.defender > 0) {
          const a = 0.12 + (braceMark.defender * 0.22);
          ctx.beginPath();
          ctx.arc(h.cx, h.cy, R * 0.56, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(161, 242, 255, ${a.toFixed(3)})`;
          ctx.fill();
        }
      }

      // Token ring (quality)
      drawQualityRing(h.cx, h.cy, u.quality);

      // Selection ring
      if (state.selectedKey === hk) {
        ctx.beginPath();
        ctx.arc(h.cx, h.cy, R * 0.70, 0, Math.PI * 2);
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#fff';
        ctx.stroke();
      }
      if (unitIsDisarrayed(u)) {
        ctx.beginPath();
        ctx.arc(h.cx, h.cy, R * 0.43, 0, Math.PI * 2);
        ctx.lineWidth = Math.max(2, Math.round(R * 0.10));
        ctx.strokeStyle = 'rgba(255, 164, 34, 0.95)';
        ctx.setLineDash([3, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      // Unit mark (ICON preferred, text fallback)
      const def = UNIT_BY_ID.get(u.type);

      const img = UNIT_ICONS && UNIT_ICONS[u.type];
      const canIcon = (u.type !== 'gen') && unitIconReady && unitIconReady(u.type);

      if (u.type === 'run') {
        drawRunnerFootGlyph(h.cx, h.cy, R * 0.82);
      } else if (canIcon) {
        const base = R * 0.95;
        const tune = (UNIT_ICON_TUNE && UNIT_ICON_TUNE[u.type]) ? UNIT_ICON_TUNE[u.type] : { scale: 0.95, y: 0 };
        const s = Math.floor(base * (tune.scale || 0.95));
        const yOff = Math.floor(R * (tune.y || 0));

        const rot = (typeof tune.rot === 'number') ? tune.rot : 0;

        ctx.imageSmoothingEnabled = true;
        if (rot) {
          ctx.save();
          ctx.translate(Math.floor(h.cx), Math.floor(h.cy + yOff));
          ctx.rotate(rot);
          ctx.drawImage(img, Math.floor(-s / 2), Math.floor(-s / 2), s, s);
          ctx.restore();
        } else {
          ctx.drawImage(img, Math.floor(h.cx - s / 2), Math.floor(h.cy - s / 2 + yOff), s, s);
        }
} else {
        // Original text symbols (kept as a fallback)
        const textScale = (u.type === 'inf' || u.type === 'cav' || u.type === 'skr') ? 0.83 : 1.0;
        const fontPx = Math.floor(R * 0.55 * textScale);
        ctx.font = `700 ${fontPx}px system-ui, -apple-system, Segoe UI, Roboto, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = c.text;
        ctx.fillText(def.symbol, h.cx, h.cy + 1);
      }
      // HP pips (tiny)
      const maxHp = unitMaxHp(u.type, u.quality);
      const pipR = Math.max(2, Math.floor(R * 0.07));
      const startX = h.cx - (pipR * 2) * (maxHp - 1) * 0.5;
      const y = h.cy + R * 0.78;
      for (let i = 0; i < maxHp; i++) {
        ctx.beginPath();
        ctx.arc(startX + i * (pipR * 2), y, pipR, 0, Math.PI * 2);
        ctx.fillStyle = (i < u.hp) ? '#fff' : '#ffffff33';
        ctx.fill();
      }

      ctx.restore();

      // Extra indicator: green out-of-command can't be activated (dashed orange ring).
      if (isCmdLocked) {
        ctx.beginPath();
        ctx.arc(h.cx, h.cy, R * 0.64, 0, Math.PI * 2);
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(255, 157, 0, 0.9)';
        ctx.setLineDash([3, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    if (state.moveAnim) {
      drawAnimatedUnitToken(state.moveAnim, nowMs);
    }
  }

  // --- UI helpers
  function setActive(btn, isActive) {
    btn.classList.toggle('active', isActive);
  }

  function compactLabel(text, maxLen = 22) {
    const s = String(text || '');
    if (s.length <= maxLen) return s;
    return `${s.slice(0, Math.max(0, maxLen - 1))}…`;
  }

  function formatClock(ts) {
    const d = new Date(ts);
    if (!Number.isFinite(d.getTime())) return '--:--';
    try {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (_) {
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      return `${hh}:${mm}`;
    }
  }

  function humanizeQuality(q) {
    if (!q) return 'Green';
    return String(q).charAt(0).toUpperCase() + String(q).slice(1);
  }

  function setInspectorValue(el, value) {
    if (!el) return;
    el.textContent = String(value);
  }

  function hideLegacyControl(el) {
    if (!el) return;
    const row = el.closest('.row');
    if (row) {
      row.style.display = 'none';
      return;
    }
    const details = el.closest('.details');
    if (details) {
      details.style.display = 'none';
      return;
    }
    el.style.display = 'none';
  }

  function hideLegacyInspectorField(valueEl) {
    if (!valueEl) return;
    const keyEl = valueEl.previousElementSibling;
    if (keyEl && keyEl.classList && keyEl.classList.contains('inspectorKey')) {
      keyEl.style.display = 'none';
    }
    valueEl.style.display = 'none';
  }

  function ensureDefensePanelPlacement() {
    const panel = document.getElementById('defensePanel');
    if (panel) {
      panel.style.display = 'none';
    }

    const legacyBottomDefense = document.querySelector('#combatRail .combatColDefense');
    if (legacyBottomDefense) {
      legacyBottomDefense.style.display = 'none';
    }
  }

  function normalizeBottomRailOrder() {
    const rail = document.getElementById('combatRail');
    if (!rail) return;

    const breakdown = rail.querySelector('.combatColBreakdown');
    const selected = document.getElementById('selectedUnitPanel');
    const modifiers = rail.querySelector('.combatColModifiers');
    const dice = rail.querySelector('.combatColDice');
    const outcome = rail.querySelector('.combatColOutcome');
    const online = rail.querySelector('.combatColOnline');

    // Canonical order: breakdown -> selected -> modifiers -> dice -> outcome -> online.
    if (breakdown && selected && breakdown.nextElementSibling !== selected) {
      rail.insertBefore(selected, breakdown.nextElementSibling);
    }
    if (selected && modifiers && selected.nextElementSibling !== modifiers) {
      rail.insertBefore(modifiers, selected.nextElementSibling);
    }
    if (modifiers && dice && modifiers.nextElementSibling !== dice) {
      rail.insertBefore(dice, modifiers.nextElementSibling);
    }
    if (dice && outcome && dice.nextElementSibling !== outcome) {
      rail.insertBefore(outcome, dice.nextElementSibling);
    }
    if (online) rail.appendChild(online);
  }

  function removeLegacyHelperText() {
    const patterns = [
      'switch game mode to online',
      'create or join a room',
      'online: idle',
      'select a friendly unit in play mode',
    ];
    const scope = document.querySelectorAll('#side .note, #side .statusMeta, #side .statusLast, #side p, #combatRail p, #selectedUnitPanel .inspectorMeta');
    for (const el of scope) {
      const text = String(el.textContent || '').trim().toLowerCase();
      if (!text) continue;
      if (patterns.some(p => text.includes(p))) {
        el.textContent = '';
        el.style.display = 'none';
      }
    }
  }

  function pruneLegacyUiSurface() {
    // Requested removals kept hidden even if cached/older markup is loaded.
    for (const filterEl of [elScenarioGroupSel, elScenarioLessonSel, elScenarioSizeSel, elScenarioTerrainSel]) {
      hideLegacyControl(filterEl);
    }
    for (const saveEl of [elExportStateBtn, elImportStateBtn]) {
      hideLegacyControl(saveEl);
    }

    if (elOnlineStatus) {
      elOnlineStatus.textContent = '';
      elOnlineStatus.style.display = 'none';
    }
    if (elDraftStatus) {
      elDraftStatus.textContent = '';
      elDraftStatus.style.display = 'none';
    }

    if (elInspectorMeta) {
      elInspectorMeta.textContent = '';
      elInspectorMeta.style.display = 'none';
    }
    hideLegacyInspectorField(elInspectorHex);
    hideLegacyInspectorField(elInspectorCommand);
    hideLegacyInspectorField(elInspectorRadius);

    ensureDefensePanelPlacement();
    normalizeBottomRailOrder();
    removeLegacyHelperText();
  }

  function loadPanelCollapsePrefs() {
    try {
      const raw = localStorage.getItem(PANEL_COLLAPSE_PREF_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return {};
      return parsed;
    } catch (_) {
      return {};
    }
  }

  function savePanelCollapsePrefs(prefs) {
    try {
      localStorage.setItem(PANEL_COLLAPSE_PREF_KEY, JSON.stringify(prefs || {}));
    } catch (_) {}
  }

  function applyPanelCollapsedState(panel, collapsed) {
    if (!panel) return;
    const isCollapsed = !!collapsed;
    panel.classList.toggle('panel-collapsed', isCollapsed);
    const btn = panel.querySelector(':scope > .panelTitle > .panelToggleBtn');
    if (btn) {
      btn.textContent = isCollapsed ? 'Show' : 'Hide';
      btn.setAttribute('aria-expanded', String(!isCollapsed));
      btn.setAttribute('aria-label', `${isCollapsed ? 'Show' : 'Hide'} ${panel.id || 'panel'}`);
    }
  }

  function defaultPanelCollapsedOnTouch(panelId) {
    return !!PANEL_COLLAPSE_DEFAULTS_TOUCH[panelId];
  }

  function initPanelCollapseControls() {
    const panels = [...document.querySelectorAll('#side > .panel')];
    if (!panels.length) return;

    const prefs = loadPanelCollapsePrefs();
    const coarsePointer = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
    let prefsChanged = false;

    for (let i = 0; i < panels.length; i++) {
      const panel = panels[i];
      const title = panel.querySelector(':scope > .panelTitle');
      if (!title) continue;

      if (!panel.id) panel.id = `panel${i + 1}`;
      const panelId = panel.id;

      let toggleBtn = title.querySelector('.panelToggleBtn');
      if (!toggleBtn) {
        toggleBtn = document.createElement('button');
        toggleBtn.type = 'button';
        toggleBtn.className = 'panelToggleBtn';
        title.appendChild(toggleBtn);
      }

      toggleBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const nextCollapsed = !panel.classList.contains('panel-collapsed');
        applyPanelCollapsedState(panel, nextCollapsed);
        prefs[panelId] = nextCollapsed;
        savePanelCollapsePrefs(prefs);
        requestAnimationFrame(() => resize());
      });

      let collapsed = false;
      if (Object.prototype.hasOwnProperty.call(prefs, panelId)) {
        collapsed = !!prefs[panelId];
      } else if (coarsePointer) {
        collapsed = defaultPanelCollapsedOnTouch(panelId);
        prefs[panelId] = collapsed;
        prefsChanged = true;
      }

      applyPanelCollapsedState(panel, collapsed);
    }

    if (prefsChanged) savePanelCollapsePrefs(prefs);
  }

  function rulesOverlayOpen() {
    return !!(elRulesSideOverlay && elRulesSideOverlay.classList.contains('open'));
  }

  function renderRulesCommandsGuide(mode = rulesCommandsViewMode, side = rulesCommandsViewSide) {
    if (!elRulesCommandsList) return;
    const chosenMode = (mode === 'all') ? 'all' : 'selected';
    const chosenSide = (side === 'red') ? 'red' : 'blue';
    rulesCommandsViewMode = chosenMode;
    rulesCommandsViewSide = chosenSide;

    if (elRulesCommandsSelectedBtn) elRulesCommandsSelectedBtn.classList.toggle('active', chosenMode === 'selected');
    if (elRulesCommandsAllBtn) elRulesCommandsAllBtn.classList.toggle('active', chosenMode === 'all');

    const selectedIds = (chosenMode === 'selected')
      ? cloneArray(doctrineStateForSide(chosenSide)?.loadout || [])
      : [];

    if (elRulesCommandsContext) {
      if (chosenMode === 'selected') {
        if (selectedIds.length) {
          elRulesCommandsContext.textContent =
            `Showing ${chosenSide.toUpperCase()} selected War Council orders (3 per cost tier).`;
        } else {
          elRulesCommandsContext.textContent =
            `No War Council selected for ${chosenSide.toUpperCase()} yet. Open War Council to pick 3/3/3.`;
        }
      } else {
        elRulesCommandsContext.textContent = 'Showing the full order library.';
      }
    }

    const grouped = COMMAND_COSTS.map((cost) => {
      let rows;
      if (chosenMode === 'selected') {
        rows = selectedIds
          .map((id) => COMMAND_BY_ID.get(id))
          .filter(Boolean)
          .filter((cmd) => cmd.cost === cost);
      } else {
        rows = COMMAND_POOL
          .filter(cmd => cmd.cost === cost)
          .sort((a, b) => {
            if (a.persistence !== b.persistence) return (a.persistence === 'spent') ? 1 : -1;
            return a.name.localeCompare(b.name);
          });
      }
      const reusable = rows.filter(r => r.persistence !== 'spent');
      const single = rows.filter(r => r.persistence === 'spent');
      return { cost, reusable, single };
    });
    const renderList = (rows) => {
      if (!rows.length) return '<div class="rulesCommandEmpty">None</div>';
      return `<ul class="rulesCommandList">${rows.map((cmd) => {
        const use = commandUsageLabel(cmd.persistence);
        const target = cmd.targeting ? ` Target: ${cmd.targeting}.` : '';
        return `<li><b>${cmd.name}</b> <span class="rulesCommandTag">${use}</span><br>${commandLaymanText(cmd)}<br><span class="rulesCommandEffect">Rules effect: ${commandExplainText(cmd)}${target}</span></li>`;
      }).join('')}</ul>`;
    };
    const html = grouped.map((g) => {
      return `<section class="rulesCommandTier">
        <h3>Cost ${g.cost} Orders</h3>
        <div class="rulesCommandColumns">
          <div>
            <h4>Reusable Orders</h4>
            ${renderList(g.reusable)}
          </div>
          <div>
            <h4>Single-Use Orders</h4>
            ${renderList(g.single)}
          </div>
        </div>
      </section>`;
    }).join('');
    elRulesCommandsList.innerHTML = html;
  }

  function setRulesTab(which) {
    const tab = (which === 'full') ? 'full' : (which === 'commands' ? 'commands' : 'quick');
    if (elRulesTabQuickBtn) elRulesTabQuickBtn.classList.toggle('active', tab === 'quick');
    if (elRulesTabFullBtn) elRulesTabFullBtn.classList.toggle('active', tab === 'full');
    if (elRulesTabCommandsBtn) elRulesTabCommandsBtn.classList.toggle('active', tab === 'commands');
    if (elRulesQuickDoc) elRulesQuickDoc.classList.toggle('active', tab === 'quick');
    if (elRulesFullDoc) elRulesFullDoc.classList.toggle('active', tab === 'full');
    if (elRulesCommandsDoc) elRulesCommandsDoc.classList.toggle('active', tab === 'commands');
  }

  function openRulesOverlay(which = 'quick', options = null) {
    if (!elRulesSideOverlay) return;
    if (which === 'commands') {
      const mode = options?.mode || rulesCommandsViewMode;
      const side = options?.side || ((state.side === 'red') ? 'red' : 'blue');
      renderRulesCommandsGuide(mode, side);
    }
    setRulesTab(which);
    elRulesSideOverlay.classList.add('open');
    elRulesSideOverlay.setAttribute('aria-hidden', 'false');
  }

  function closeRulesOverlay() {
    if (!elRulesSideOverlay) return;
    elRulesSideOverlay.classList.remove('open');
    elRulesSideOverlay.setAttribute('aria-hidden', 'true');
  }

  function resetInspector(message = '') {
    setInspectorValue(elInspectorTitle, 'No unit selected.');
    setInspectorValue(elInspectorMeta, message);
    setInspectorValue(elInspectorSide, '-');
    setInspectorValue(elInspectorType, '-');
    setInspectorValue(elInspectorQuality, '-');
    setInspectorValue(elInspectorHex, '');
    setInspectorValue(elInspectorHp, '-');
    setInspectorValue(elInspectorUp, '-');
    setInspectorValue(elInspectorCommand, '');
    setInspectorValue(elInspectorRadius, '');
  }

  function updateInspector() {
    if (!elInspectorTitle) return;

    const selectedKey = state.selectedKey;
    const u = selectedKey ? unitsByHex.get(selectedKey) : null;
    if (!u) {
      resetInspector();
      renderLiveModifierPreview();
      return;
    }

    const def = UNIT_BY_ID.get(u.type);
    if (!def) {
      resetInspector('Selected unit data is unavailable.');
      renderLiveModifierPreview();
      return;
    }

    const qualityText = humanizeQuality(u.quality);
    const disarraySuffix = unitIsDisarrayed(u) ? ', Disarrayed' : '';
    const maxHp = unitMaxHp(u.type, u.quality);
    const up = unitUpValue(u.type, u.quality);
    setInspectorValue(elInspectorTitle, `${u.side.toUpperCase()} ${def.abbrev} (${qualityText}${disarraySuffix})`);
    setInspectorValue(elInspectorMeta, '');
    setInspectorValue(elInspectorSide, u.side.toUpperCase());
    setInspectorValue(elInspectorType, def.label);
    setInspectorValue(elInspectorQuality, qualityText);
    setInspectorValue(elInspectorHex, '');
    setInspectorValue(elInspectorHp, `${u.hp}/${maxHp}`);
    setInspectorValue(elInspectorUp, up);
    setInspectorValue(elInspectorCommand, '');
    setInspectorValue(elInspectorRadius, '');
    renderLiveModifierPreview();
  }

  function diePipIndexes(value) {
    switch (value) {
      case 1: return [4];
      case 2: return [0, 8];
      case 3: return [0, 4, 8];
      case 4: return [0, 2, 6, 8];
      case 5: return [0, 2, 4, 6, 8];
      case 6: return [0, 2, 3, 5, 6, 8];
      default: return [];
    }
  }

  function applyDieFace(face, value) {
    const on = new Set(diePipIndexes(value));
    const pips = face.children;
    for (let i = 0; i < pips.length; i++) {
      pips[i].className = on.has(i) ? 'pip on' : 'pip';
    }
  }

  function makeDieFace(value) {
    const face = document.createElement('div');
    face.className = 'dieFace';
    for (let i = 0; i < 9; i++) {
      const pip = document.createElement('span');
      pip.className = 'pip';
      face.appendChild(pip);
    }
    applyDieFace(face, value);
    return face;
  }

  function applyPhysicalDieFace(face, value) {
    const on = new Set(diePipIndexes(value));
    const pips = face.children;
    for (let i = 0; i < pips.length; i++) {
      pips[i].className = on.has(i) ? 'physicalPip on' : 'physicalPip';
    }
  }

  function makePhysicalDieFace(value) {
    const face = document.createElement('div');
    face.className = 'physicalFace';
    for (let i = 0; i < 9; i++) {
      const pip = document.createElement('span');
      pip.className = 'physicalPip';
      face.appendChild(pip);
    }
    applyPhysicalDieFace(face, value);
    return face;
  }

  function makePhysicalDieShell(value, outcome = 'miss', title = '') {
    const shell = document.createElement('div');
    shell.className = `physicalDie ${outcome}`;
    const face = makePhysicalDieFace(value);
    shell.appendChild(face);
    if (title) shell.title = title;
    return { shell, face };
  }

  function renderIdlePhysicalDice() {
    if (!elPhysicalDiceRow) return;
    elPhysicalDiceRow.innerHTML = '';
    const sample = [1, 3, 5];
    for (const v of sample) {
      const { shell } = makePhysicalDieShell(v, 'miss', `Sample d6 ${v}`);
      shell.style.setProperty('--dice-rot', `${(v - 2) * 2}deg`);
      elPhysicalDiceRow.appendChild(shell);
    }
  }

  function renderIdleCornerDice() {
    if (!elCornerDiceRow) return;
    elCornerDiceRow.innerHTML = '';
    const sample = [1, 3, 5];
    for (const v of sample) {
      const { shell } = makePhysicalDieShell(v, 'miss', `Sample d6 ${v}`);
      shell.className = 'physicalDie miss cornerDie';
      shell.style.setProperty('--dice-rot', `${(v - 2) * 2}deg`);
      elCornerDiceRow.appendChild(shell);
    }
    if (elCornerDiceHud) elCornerDiceHud.classList.add('has-roll');
  }

  function diceAnimationDurationMs(rollCount) {
    const count = Math.max(1, Math.trunc(Number(rollCount) || 1));
    return DICE_SUMMARY_BASE_MS + ((count - 1) * DICE_SUMMARY_STEP_MS) + DICE_POST_HOLD_MS;
  }

  function clearDiceDisplay() {
    diceRenderNonce += 1;
    if (elDiceSummary) elDiceSummary.textContent = 'No rolls yet.';
    if (elDiceTray) elDiceTray.innerHTML = '';
    if (elBoardDiceResult) elBoardDiceResult.textContent = '';
    renderIdlePhysicalDice();
    renderIdleCornerDice();
    state.combatBusy = false;
    state.combatBusyUntil = 0;
    if (elCornerDiceHud) elCornerDiceHud.classList.remove('combat-active');
    clearCombatBreakdown();
  }

  function terrainLabel(terrainId) {
    return TERRAIN_LABEL_BY_ID.get(terrainId) || 'Unknown';
  }

  function clearCombatBreakdown() {
    state.lastCombat = null;
    if (elCombatSummary) elCombatSummary.textContent = 'No combat yet. Select a unit and attack to see exact dice math.';
    if (elCombatMath) elCombatMath.textContent = 'Dice math: -';
    if (elCombatTerrain) elCombatTerrain.textContent = '-';
    if (elCombatOutcome) elCombatOutcome.textContent = 'Outcome: -';
    if (elCombatHint) elCombatHint.textContent = COMBAT_RULE_HINT;
  }

  function renderCombatBreakdown(rolls, info) {
    if (!elCombatSummary || !elCombatMath || !elCombatTerrain || !elCombatOutcome) return;
    if (!info) {
      clearCombatBreakdown();
      return;
    }

    state.lastCombat = { info, rolls: Array.isArray(rolls) ? [...rolls] : [] };

    const posText = (info.impactPosition && info.impactPosition !== 'none') ? ` from ${info.impactPosition}` : '';
    const terrainName = terrainLabel(info.defenderTerrain || 'clear');
    const terrainDelta = Number(info.terrainDiceMod || 0);
    const braceDelta = Number(info.braceDiceMod || 0);
    const terrainMath = terrainDelta
      ? `${terrainName} ${terrainDelta > 0 ? `+${terrainDelta}` : `${terrainDelta}`} die`
      : `${terrainName}: no dice change`;
    const flankText = info.flankBonus ? ` + flank ${info.flankBonus}` : '';
    const rearText = info.rearBonus ? ` + rear ${info.rearBonus}` : '';
    const braceText = braceDelta ? ` - brace ${Math.abs(braceDelta)}` : '';
    const terrainText = terrainDelta ? ` ${terrainDelta > 0 ? '+' : '-'} terrain ${Math.abs(terrainDelta)}` : '';
    const braceRuleText = braceDelta
      ? `Braced INF: attacker -${Math.abs(braceDelta)} die (melee, min 1).`
      : 'Braced INF: not active.';

    elCombatSummary.textContent =
      `${info.attacker} ${info.kind.toUpperCase()} r${info.dist}${posText} vs ${info.defender}.`;
    elCombatMath.textContent =
      `Dice math: base ${info.baseDice}${flankText}${rearText}${braceText}${terrainText} = ${info.dice}.`;
    elCombatTerrain.textContent =
      `${terrainMath}. ${braceRuleText}`;

    const retreatResolved =
      (typeof info.retreatMoved === 'number' || typeof info.retreatBlocked === 'number')
        ? ` · Retreat resolve: moved ${info.retreatMoved || 0}, blocked ${info.retreatBlocked || 0}`
        : '';
    const destroyedText = info.destroyed ? ' · Defender destroyed.' : '';
    const hpText = Number.isFinite(info.defenderHpAfter) ? ` · Defender HP now ${Math.max(0, info.defenderHpAfter)}.` : '';
    elCombatOutcome.textContent =
      `Outcome: hits ${info.hits}, retreats ${info.retreats}, disarray ${info.disarrays || 0}, misses ${info.misses}${retreatResolved}${destroyedText}${hpText}`;

    if (elCombatHint) elCombatHint.textContent = COMBAT_RULE_HINT;
  }

  function formatSigned(n) {
    const v = Number(n || 0);
    if (!Number.isFinite(v) || v === 0) return '0';
    return v > 0 ? `+${v}` : `${v}`;
  }

  function buildAttackModifierPreview(attackerKey, defenderKey) {
    const atk = unitsByHex.get(attackerKey);
    const defU = unitsByHex.get(defenderKey);
    if (!atk || !defU) return '';

    const prof = attackDiceFor(attackerKey, defenderKey, atk);
    if (!prof) return '';

    let impactPosition = 'none';
    if (prof.kind === 'melee') {
      impactPosition = attackApproachPosition(attackerKey, defenderKey, defU.side);
    }

    const atkHex = board.byKey.get(attackerKey);
    const defHex = board.byKey.get(defenderKey);
    const attackerTerrain = atkHex?.terrain || 'clear';
    const defenderTerrain = defHex?.terrain || 'clear';
    let terrainDiceMod = (defenderTerrain === 'woods') ? -1 : 0;
    if (attackerTerrain === 'rough') terrainDiceMod -= 1;
    const braceInfo = (prof.kind === 'melee')
      ? infantryBraceInfoForAttack(attackerKey, defenderKey, atk, defU)
      : { active: false };
    const impact = cavalryAngleBonuses(atk, defU, prof.kind, impactPosition, {
      reinforced: !!braceInfo.active,
    });
    const braceDiceMod = braceInfo.active ? -1 : 0;
    const braceSupportCount = Array.isArray(braceInfo.supportKeys) ? braceInfo.supportKeys.length : 0;
    const baseDice = prof.baseDice ?? prof.dice;
    const commandAttackBonus = doctrineValueForUnit('bonusAttackDice', atk.id, atk.side);
    const commandRangedBonus = (prof.kind === 'ranged')
      ? doctrineValueForUnit('rangedBonusDice', atk.id, atk.side)
      : 0;
    const commandDefenseBonus = (prof.kind === 'melee')
      ? doctrineValueForUnit('meleeDefenseBonus', defU.id, defU.side)
      : 0;
    let coverFireText = '';
    if (prof.kind === 'ranged' && terrainDiceMod < 0 && doctrineFlagForSide('coverFireIgnoreTerrain', atk.side)) {
      terrainDiceMod = 0;
      coverFireText = ', covering-fire ignore terrain';
    }

    const preTerrainDice =
      baseDice +
      impact.totalBonus +
      braceDiceMod +
      commandAttackBonus +
      commandRangedBonus -
      commandDefenseBonus;
    const dice = Math.max(1, preTerrainDice + terrainDiceMod);
    const retreatLaneOpen = prof.kind === 'melee' ? !!retreatPick(attackerKey, defenderKey) : true;
    const angleText = (
      prof.kind === 'melee' &&
      atk.type === 'cav' &&
      defU.type === 'inf' &&
      impactPosition !== 'front' &&
      braceInfo.active
    )
      ? `angle +0 (blocked by reinforcement)${coverFireText}`
      : `angle ${formatSigned(impact.totalBonus)}${coverFireText}`;

    const posText = (impactPosition && impactPosition !== 'none') ? `, ${impactPosition}` : '';
    return (
      `${atk.side.toUpperCase()} ${UNIT_BY_ID.get(atk.type)?.abbrev || atk.type} ` +
      `${prof.kind} vs ${defU.side.toUpperCase()} ${UNIT_BY_ID.get(defU.type)?.abbrev || defU.type}` +
      `${posText} · ` +
      `terrain ${terrainLabel(defenderTerrain)} ${formatSigned(terrainDiceMod)}${attackerTerrain === 'rough' ? ', launch-from-rough -1' : ''}, ` +
      `reinforcement ${formatSigned(braceDiceMod)}${braceInfo.active ? ` (${braceSupportCount} linked INF)` : ''}, ` +
      `attack order ${formatSigned(commandAttackBonus + commandRangedBonus)}, ` +
      `defense order ${formatSigned(-commandDefenseBonus)}, ` +
      `${angleText}, ` +
      `retreat lane ${retreatLaneOpen ? 'open' : 'blocked'} => final ${dice} die${dice === 1 ? '' : 's'}.`
    );
  }

  function retreatRiskSummaryForUnit(unitKey, side) {
    const h = board.byKey.get(unitKey);
    if (!h) return { threats: 0, blocked: 0 };
    let threats = 0;
    let blocked = 0;
    for (const nk of h.neigh) {
      const enemy = unitsByHex.get(nk);
      if (!enemy || enemy.side === side) continue;
      threats += 1;
      if (!retreatPick(nk, unitKey)) blocked += 1;
    }
    return { threats, blocked };
  }

  function buildUnitPositionModifierSummary(unitKey, u) {
    const h = board.byKey.get(unitKey);
    const terrainId = h?.terrain || 'clear';
    const terrainTxt = (terrainId === 'woods')
      ? 'Woods (attacker -1 die vs defender here)'
      : terrainId === 'rough'
        ? 'Rough (attacks launched from this hex are -1 die)'
        : terrainId === 'hills'
          ? 'Hills (no direct dice change; movement/position terrain)'
          : `${terrainLabel(terrainId)} (no direct defense dice change)`;

    const parts = [`Terrain ${terrainTxt}.`];

    if (u.type === 'inf') {
      const brace = infantryBraceInfoForHover(unitKey);
      if (brace.active) {
        const supporters = Array.isArray(brace.supportKeys) ? brace.supportKeys.length : 0;
        parts.push(`Reinforced: YES (${supporters} linked INF support; covered melee arcs impose attacker -1 die).`);
      } else {
        parts.push('Reinforced: no linked INF brace.');
      }
    } else {
      parts.push('Reinforced: n/a (INF-only brace).');
    }

    if (unitIsDisarrayed(u)) parts.push('Disarrayed (cannot move/attack this activation; auto-clears after one full turn).');
    if (isEngaged(unitKey, u.side)) parts.push('Engaged: movement restricted unless withdrawal rule applies.');
    const retreatRisk = retreatRiskSummaryForUnit(unitKey, u.side);
    if (retreatRisk.threats > 0) {
      if (retreatRisk.blocked >= retreatRisk.threats) {
        parts.push('Retreat risk: CRITICAL (all adjacent attack vectors currently block legal retreat).');
      } else {
        parts.push(
          `Retreat risk: ${retreatRisk.blocked}/${retreatRisk.threats} adjacent attack vectors currently block legal retreat.`
        );
      }
    }

    if (unitIgnoresCommand(u)) {
      parts.push('Command: independent.');
    } else {
      const cmd = inCommandAt(unitKey, u.side);
      if (cmd) {
        parts.push('Command: in range.');
      } else if (u.quality === 'green') {
        parts.push('Command: OUT (Green cannot activate).');
      } else {
        parts.push('Command: OUT (Regular can attack, cannot move).');
      }
    }

    const meleeDefense = doctrineValueForUnit('meleeDefenseBonus', u.id, u.side);
    if (meleeDefense) parts.push(`Order effect: melee defense ${formatSigned(-meleeDefense)} attacker dice.`);
    const ignoreRetreat = doctrineValueForUnit('ignoreRetreatCount', u.id, u.side);
    if (ignoreRetreat) parts.push(`Order effect: ignores next ${ignoreRetreat} retreat${ignoreRetreat === 1 ? '' : 's'}.`);
    if (doctrineFlagForUnit('ignoreAllRetreat', u.id, u.side)) parts.push('Order effect: ignores all retreat results.');
    if (doctrineFlagForUnit('cannotMove', u.id, u.side)) parts.push('Order effect: cannot move this turn.');
    if (doctrineFlagForUnit('cannotAttack', u.id, u.side)) parts.push('Order effect: cannot attack this turn.');

    return parts.join(' ');
  }

  function terrainHoverCombatText(terrainId = 'clear') {
    if (terrainId === 'woods') return 'Defender here imposes attacker -1 die.';
    if (terrainId === 'rough') return 'Any attack launched from this rough hex is -1 die.';
    if (terrainId === 'hills') return 'No direct dice modifier on hills in this ruleset.';
    if (terrainId === 'water') return 'Impassable: units cannot enter or retreat through this hex.';
    if (terrainId === 'mountains') return 'Impassable: units cannot enter or retreat through this hex.';
    return `No direct combat dice modifier in ${terrainLabel(terrainId)}.`;
  }

  function buildTerrainHoverModifierSummary(hexKey, selectedKey = null, selectedUnit = null) {
    const h = board.byKey.get(hexKey);
    if (!h) return '-';
    const terrainId = h.terrain || 'clear';
    const parts = [
      `${terrainLabel(terrainId)} terrain.`,
      `Terrain effect: ${terrainHoverCombatText(terrainId)}`
    ];

    if (selectedUnit && selectedKey) {
      const moveCost = terrainMoveCost(selectedUnit.type, terrainId);
      const mp = unitMovePoints(selectedUnit);
      const canEnter = Number.isFinite(moveCost);
      const typeLabel = (UNIT_BY_ID.get(selectedUnit.type)?.abbrev || selectedUnit.type).toUpperCase();
      if (!canEnter) {
        parts.push(`${typeLabel} movement: impassable.`);
      } else {
        parts.push(`${typeLabel} movement: cost ${moveCost}/${mp} MP.`);
        if (selectedUnit.type === 'inf' && terrainId === 'woods') {
          parts.push('INF woods rule: entering this hex applies a movement pause on next own activation.');
        }
        if (selectedUnit.type === 'cav' && terrainId === 'woods') {
          parts.push('CAV woods rule: cavalry may enter and move through woods (slower pace).');
        }
        if (terrainId === 'rough') {
          parts.push('Rough combat rule: attacks launched from rough are -1 die.');
        }
      }

      if (state._moveTargets && state._moveTargets.has(hexKey)) {
        parts.push('Current activation: legal move target.');
      } else if (selectedKey === hexKey) {
        parts.push('Current activation: selected unit position.');
      } else if (state.mode === 'play' && selectedUnit.side === state.side) {
        parts.push('Current activation: not currently reachable.');
      }
    } else {
      parts.push('Tip: select a unit, then hover hexes to preview unit-specific movement cost/legality.');
    }

    return parts.join(' ');
  }

  function renderLiveModifierPreview() {
    if (!elCombatTerrain) return;
    const hoverKey = state._hoverKey;
    const hoverUnit = hoverKey ? unitsByHex.get(hoverKey) : null;

    if (state.mode !== 'play') {
      if (hoverKey) {
        elCombatTerrain.textContent = hoverUnit
          ? buildUnitPositionModifierSummary(hoverKey, hoverUnit)
          : buildTerrainHoverModifierSummary(hoverKey, null, null);
        return;
      }
      if (!state.lastCombat) elCombatTerrain.textContent = '-';
      return;
    }

    const selectedKey = state.selectedKey;
    const selectedUnit = selectedKey ? unitsByHex.get(selectedKey) : null;

    if (
      selectedUnit &&
      hoverUnit &&
      selectedKey !== hoverKey &&
      hoverUnit.side !== selectedUnit.side &&
      state._attackTargets &&
      state._attackTargets.has(hoverKey)
    ) {
      const preview = buildAttackModifierPreview(selectedKey, hoverKey);
      if (preview) {
        elCombatTerrain.textContent = preview;
        return;
      }
    }

    const focusKey = selectedUnit ? selectedKey : (hoverUnit ? hoverKey : null);
    const focusUnit = focusKey ? unitsByHex.get(focusKey) : null;
    if (focusKey && focusUnit) {
      elCombatTerrain.textContent = buildUnitPositionModifierSummary(focusKey, focusUnit);
      return;
    }

    if (hoverKey) {
      elCombatTerrain.textContent = buildTerrainHoverModifierSummary(hoverKey, selectedKey, selectedUnit);
      return;
    }

    // If there is a previous combat breakdown on screen, keep it visible.
    if (state.lastCombat?.info) return;
    elCombatTerrain.textContent = '-';
  }

  function renderDiceDisplay(rolls, info) {
    if (!elDiceSummary || !elDiceTray) return;

    diceRenderNonce += 1;
    const renderNonce = diceRenderNonce;
    state.combatBusy = true;
    state.combatBusyUntil = Date.now() + diceAnimationDurationMs(Array.isArray(rolls) ? rolls.length : 0);
    if (elCornerDiceHud) elCornerDiceHud.classList.add('combat-active');
    updateHud();

    const posText = (info.impactPosition && info.impactPosition !== 'none') ? `, ${info.impactPosition}` : '';
    const flankText = info.flankBonus ? `, flank +${info.flankBonus}` : '';
    const rearText = info.rearBonus ? `, rear +${info.rearBonus}` : '';
    const braceText = info.braceDiceMod ? `, brace ${info.braceDiceMod}` : '';
    const terrainName = terrainLabel(info.defenderTerrain || 'clear');
    const terrainText = info.terrainDiceMod ? `, ${terrainName.toLowerCase()} ${info.terrainDiceMod > 0 ? '+' : ''}${info.terrainDiceMod}` : `, ${terrainName.toLowerCase()} 0`;
    const finalSummary =
      `${info.attacker} ${info.kind.toUpperCase()} r${info.dist} vs ${info.defender} · ` +
      `rolled ${info.dice} dice (base ${info.baseDice}${posText}${flankText}${rearText}${braceText}${terrainText}) · ` +
      `H ${info.hits} / R ${info.retreats} / D ${info.disarrays || 0} / M ${info.misses}`;
    elDiceSummary.textContent = `Rolling ${info.dice} dice…`;
    if (elBoardDiceResult) elBoardDiceResult.textContent = 'Rolling…';

    elDiceTray.innerHTML = '';
    if (elPhysicalDiceRow) elPhysicalDiceRow.innerHTML = '';
    if (elCornerDiceRow) {
      elCornerDiceRow.innerHTML = '';
      if (elCornerDiceHud) elCornerDiceHud.classList.add('has-roll');
    }
    for (let i = 0; i < rolls.length; i++) {
      const roll = rolls[i];
      const die = document.createElement('div');
      die.className = 'die rolling';

      const face = makeDieFace(1 + Math.floor(Math.random() * 6));
      die.appendChild(face);

      const mark = document.createElement('span');
      mark.className = 'dieBadge';
      mark.textContent = '?';
      die.appendChild(mark);

      die.title = 'Rolling…';
      elDiceTray.appendChild(die);

      let physicalDie = null;
      let physicalFace = null;
      if (elPhysicalDiceRow) {
        const shell = makePhysicalDieShell(1 + Math.floor(Math.random() * 6), 'rolling', 'Rolling…');
        physicalDie = shell.shell;
        physicalFace = shell.face;
        physicalDie.className = 'physicalDie rolling';
        physicalDie.style.setProperty('--dice-rot', `${Math.floor(Math.random() * 19) - 9}deg`);
        elPhysicalDiceRow.appendChild(physicalDie);
      }

      let cornerDie = null;
      let cornerFace = null;
      if (elCornerDiceRow) {
        const shell = makePhysicalDieShell(1 + Math.floor(Math.random() * 6), 'rolling', 'Rolling…');
        cornerDie = shell.shell;
        cornerFace = shell.face;
        cornerDie.className = 'physicalDie rolling cornerDie';
        cornerDie.style.setProperty('--dice-rot', `${Math.floor(Math.random() * 13) - 6}deg`);
        elCornerDiceRow.appendChild(cornerDie);
      }

      const settleDelay = DICE_SETTLE_BASE_MS + (i * DICE_SETTLE_STEP_MS);
      setTimeout(() => {
        if (renderNonce !== diceRenderNonce) return;

        let outcome = 'miss';
        let badge = 'M';
        if (roll === 6) {
          outcome = 'hit';
          badge = 'HD';
        } else if (roll === 5) {
          outcome = 'hit';
          badge = 'H';
        } else if (roll === DIE_RETREAT) {
          outcome = 'retreat';
          badge = 'R';
        } else if (roll === DIE_DISARRAY) {
          outcome = 'disarray';
          badge = 'D';
        }

        applyDieFace(face, roll);
        die.className = `die ${outcome}`;
        mark.textContent = badge;
        die.title = `Roll ${roll} (${badge})`;

        if (physicalDie && physicalFace) {
          applyPhysicalDieFace(physicalFace, roll);
          physicalDie.className = `physicalDie ${outcome}`;
          physicalDie.style.setProperty('--dice-rot', `${Math.floor(Math.random() * 11) - 5}deg`);
          physicalDie.title = `Roll ${roll} (${badge})`;
        }

        if (cornerDie && cornerFace) {
          applyPhysicalDieFace(cornerFace, roll);
          cornerDie.className = `physicalDie ${outcome} cornerDie`;
          cornerDie.style.setProperty('--dice-rot', `${Math.floor(Math.random() * 9) - 4}deg`);
          cornerDie.title = `Roll ${roll} (${badge})`;
        }
      }, settleDelay);
    }

    const summaryDelay = DICE_SUMMARY_BASE_MS + (Math.max(0, rolls.length - 1) * DICE_SUMMARY_STEP_MS);
    setTimeout(() => {
      if (renderNonce !== diceRenderNonce) return;
      elDiceSummary.textContent = finalSummary;
      if (elBoardDiceResult) {
        const labels = rolls.map((v) => {
          if (v === 6) return 'Hit + Disarray';
          if (v === 5) return 'Hit';
          if (v === DIE_RETREAT) return 'Retreat';
          if (v === DIE_DISARRAY) return 'Disarray';
          return 'Miss';
        });
        elBoardDiceResult.textContent = labels.join(' • ');
      }
      setTimeout(() => {
        if (renderNonce !== diceRenderNonce) return;
        state.combatBusy = false;
        state.combatBusyUntil = 0;
        if (elCornerDiceHud) elCornerDiceHud.classList.remove('combat-active');
        updateHud();
      }, DICE_POST_HOLD_MS);
    }, summaryDelay);
  }

  function log(msg) {
    state.last = msg;
    elHudLast.textContent = msg;
    if (elStatusLast) elStatusLast.textContent = msg;

    state.events.push({ t: Date.now(), msg });
    if (state.events.length > 50) state.events.shift();
  }

  function pushEventTrace(kind, payload = {}) {
    const evt = {
      t: Date.now(),
      turn: state.turn,
      serial: state.turnSerial,
      side: state.side,
      kind: String(kind || 'event'),
      payload: cloneJson(payload, {}),
    };
    state.eventTrace.push(evt);
    if (state.eventTrace.length > EVENT_TRACE_MAX) {
      state.eventTrace.splice(0, state.eventTrace.length - EVENT_TRACE_MAX);
    }
  }

  function totals(side) {
    let up = 0;
    let hp = 0;
    let gens = 0;
    let units = 0;

    for (const u of unitsByHex.values()) {
      if (u.side !== side) continue;
      up += unitUpValue(u.type, u.quality);
      hp += u.hp;
      units += 1;
      if (u.type === 'gen') gens += 1;
    }

    return { up, hp, gens, units };
  }

  function cloneJson(value, fallback) {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (_) {
      return fallback;
    }
  }

  function scenarioRecord(name) {
    const sc = SCENARIOS[name];
    if (!sc || typeof sc !== 'object') return null;
    return sc;
  }

  function scenarioStaticMetaFromName(name) {
    const n = String(name || '').toLowerCase();
    const out = {
      group: 'other',
      description: '',
      historical: '',
      sideLabels: null,
      objectives: [],
      checkpointTurn: 8,
      pointTarget: null,
      notes: '',
    };

    if (n.startsWith('demo ')) out.group = 'tutorial';
    else if (n.startsWith('grand ')) out.group = 'grand';
    else if (n.startsWith('terrain ')) out.group = 'terrain';
    else if (n.startsWith('berserker ')) out.group = 'berserker';

    if (n.includes('marathon')) {
      out.group = 'history';
      out.sideLabels = { blue: 'Greek', red: 'Persian', named: true };
      out.description = 'Fast closing battle over open ground with strong flanks.';
      out.historical = '490 BCE';
      out.checkpointTurn = 7;
      out.objectives = [
        { id: 'center-plain', name: 'Center Plain', value: 2, contestAdjacent: true, hexes: [{ q: 6, r: 5 }, { q: 7, r: 5 }, { q: 8, r: 5 }] },
        { id: 'left-wing', name: 'West Wing Ground', value: 1, contestAdjacent: false, hexes: [{ q: 3, r: 5 }, { q: 3, r: 6 }] },
        { id: 'right-wing', name: 'East Wing Ground', value: 1, contestAdjacent: false, hexes: [{ q: 11, r: 5 }, { q: 11, r: 6 }] },
      ];
      out.pointTarget = 22;
    } else if (n.includes('granicus')) {
      out.group = 'history';
      out.sideLabels = { blue: 'Macedonian', red: 'Persian', named: true };
      out.description = 'River crossing pressure and a decisive cavalry breach.';
      out.historical = '334 BCE';
      out.checkpointTurn = 8;
      out.objectives = [
        { id: 'ford', name: 'River Ford', value: 2, contestAdjacent: true, hexes: [{ q: 7, r: 4 }, { q: 7, r: 5 }, { q: 8, r: 5 }] },
        { id: 'north-bank', name: 'North Bank', value: 1, contestAdjacent: false, hexes: [{ q: 7, r: 2 }, { q: 8, r: 2 }] },
      ];
    } else if (n.includes('cannae')) {
      out.group = 'history';
      out.sideLabels = { blue: 'Roman', red: 'Carthaginian', named: true };
      out.description = 'Deep center push under risk of double envelopment.';
      out.historical = '216 BCE';
      out.checkpointTurn = 7;
      out.objectives = [
        { id: 'kill-zone', name: 'Center Kill Zone', value: 2, contestAdjacent: true, hexes: [{ q: 7, r: 5 }, { q: 8, r: 5 }, { q: 7, r: 6 }, { q: 8, r: 6 }] },
        { id: 'left-horn', name: 'Western Horn', value: 1, contestAdjacent: false, hexes: [{ q: 3, r: 5 }, { q: 2, r: 5 }] },
        { id: 'right-horn', name: 'Eastern Horn', value: 1, contestAdjacent: false, hexes: [{ q: 12, r: 5 }, { q: 13, r: 5 }] },
      ];
      out.pointTarget = 24;
    } else if (n.includes('pharsalus')) {
      out.group = 'history';
      out.sideLabels = { blue: 'Caesarian', red: 'Pompeian', named: true };
      out.description = 'Reserve timing and cavalry wing stability decide the line.';
      out.historical = '48 BCE';
      out.checkpointTurn = 8;
      out.objectives = [
        { id: 'center-line', name: 'Center Line', value: 2, contestAdjacent: true, hexes: [{ q: 6, r: 5 }, { q: 7, r: 5 }, { q: 8, r: 5 }, { q: 9, r: 5 }] },
        { id: 'reserve-wing', name: 'Reserve Wing', value: 1, contestAdjacent: false, hexes: [{ q: 11, r: 4 }, { q: 11, r: 5 }] },
      ];
    } else if (n.includes('zama')) {
      out.group = 'history';
      out.sideLabels = { blue: 'Roman', red: 'Carthaginian', named: true };
      out.historical = '202 BCE';
      out.description = 'Open lanes for maneuver and late cavalry decision.';
      out.objectives = [
        { id: 'main-lanes', name: 'Battle Lanes', value: 2, contestAdjacent: true, hexes: [{ q: 6, r: 5 }, { q: 7, r: 5 }, { q: 8, r: 5 }] },
      ];
    } else if (n.includes('ilipa')) {
      out.group = 'history';
      out.sideLabels = { blue: 'Roman', red: 'Carthaginian', named: true };
      out.historical = '206 BCE';
      out.description = 'Reverse deployment and wing timing over broken approach terrain.';
      out.objectives = [
        { id: 'center-open', name: 'Open Center', value: 2, contestAdjacent: true, hexes: [{ q: 7, r: 5 }, { q: 8, r: 5 }] },
      ];
    } else if (n.includes('carhae') || n.includes('carrhae')) {
      out.group = 'history';
      out.sideLabels = { blue: 'Roman', red: 'Parthian', named: true };
      out.historical = '53 BCE';
      out.description = 'Missile pressure and mobility over exposed terrain.';
      out.objectives = [
        { id: 'exposed-center', name: 'Exposed Center', value: 2, contestAdjacent: true, hexes: [{ q: 7, r: 5 }, { q: 8, r: 5 }] },
      ];
    } else if (n.includes('thapsus')) {
      out.group = 'history';
      out.sideLabels = { blue: 'Caesarian', red: 'Optimates', named: true };
      out.historical = '46 BCE';
      out.description = 'Coastal pressure and rough-ground friction on the center push.';
      out.objectives = [
        { id: 'coast-road', name: 'Coastal Road', value: 1, contestAdjacent: true, hexes: [{ q: 12, r: 5 }, { q: 13, r: 5 }] },
        { id: 'center-rough', name: 'Rough Center', value: 2, contestAdjacent: false, hexes: [{ q: 7, r: 5 }, { q: 8, r: 5 }] },
      ];
    } else if (n.includes('philippi')) {
      out.group = 'history';
      out.sideLabels = { blue: 'Triumvir', red: 'Liberator', named: true };
      out.historical = '42 BCE';
      out.description = 'Twin camps and contested approaches split the battle line.';
      out.objectives = [
        { id: 'west-camp', name: 'West Camp', value: 1, contestAdjacent: false, hexes: [{ q: 3, r: 8 }, { q: 3, r: 9 }] },
        { id: 'east-camp', name: 'East Camp', value: 1, contestAdjacent: false, hexes: [{ q: 12, r: 3 }, { q: 12, r: 2 }] },
        { id: 'marsh-line', name: 'Marsh Crossing', value: 2, contestAdjacent: true, hexes: [{ q: 7, r: 5 }, { q: 8, r: 5 }] },
      ];
    } else if (n.includes('tuderberg') || n.includes('teutoburg')) {
      out.group = 'history';
      out.sideLabels = { blue: 'Roman', red: 'Germanic', named: true };
      out.historical = '9 CE';
      out.description = 'Column under ambush pressure in restricted movement terrain.';
      out.objectives = [
        { id: 'ambush-corridor', name: 'Ambush Corridor', value: 2, contestAdjacent: true, hexes: [{ q: 7, r: 5 }, { q: 8, r: 5 }] },
      ];
    } else if (n.includes('thermopylae') || n.includes('hot gates')) {
      out.group = 'history';
      out.sideLabels = { blue: 'Greek', red: 'Persian', named: true };
      out.historical = '480 BCE';
      out.description = 'Narrow pass defense between sea edge and impassable heights.';
      out.checkpointTurn = 6;
      out.objectives = [
        { id: 'hot-gate-pass', name: 'Hot Gates Pass', value: 3, contestAdjacent: true, hexes: [{ q: 7, r: 5 }, { q: 8, r: 5 }] },
      ];
    }

    return out;
  }

  function scenarioMetadata(name) {
    const sc = scenarioRecord(name) || {};
    const inferred = scenarioStaticMetaFromName(name);
    const explicit = (sc.meta && typeof sc.meta === 'object') ? sc.meta : {};
    const sideLabels = (explicit.sideLabels && typeof explicit.sideLabels === 'object')
      ? { ...inferred.sideLabels, ...explicit.sideLabels }
      : inferred.sideLabels;

    return {
      group: explicit.group || inferred.group || 'other',
      description: explicit.description || inferred.description || '',
      historical: explicit.historical || inferred.historical || '',
      sideLabels: sideLabels || null,
      objectives: Array.isArray(explicit.objectives) ? explicit.objectives : (Array.isArray(inferred.objectives) ? inferred.objectives : []),
      checkpointTurn: clampInt(explicit.checkpointTurn, 1, 99, inferred.checkpointTurn || 8),
      pointTarget: Number.isFinite(Number(explicit.pointTarget)) ? Math.max(1, Math.trunc(Number(explicit.pointTarget))) : inferred.pointTarget,
      notes: explicit.notes || inferred.notes || '',
    };
  }

  function victoryModeLabel(id) {
    if (id === 'annihilation') return 'Annihilation';
    if (id === 'decapitation') return 'Decapitation';
    if (id === 'points') return 'Point Victory';
    if (id === 'keyground') return 'Key Ground';
    if (id === 'strategic') return 'Strategic Mix';
    return 'Clear Victory';
  }

  function aiControlledSide() {
    if (state.gameMode !== 'hvai') return null;
    return state.humanSide === 'red' ? 'blue' : 'red';
  }

  function localPlayerSide() {
    if (state.gameMode === 'hvai') return state.humanSide === 'red' ? 'red' : 'blue';
    if (state.gameMode === 'online' && net.connected) return onlineExpectedLocalSide();
    return null;
  }

  function notifyEnemyDirectiveUsed(side, cmd, actionSpend = null) {
    if (!cmd || !side) return;
    const localSide = localPlayerSide();
    if (!localSide || localSide === side) return;
    const spend = Number.isFinite(actionSpend) ? Math.max(1, Math.trunc(actionSpend)) : commandActionSpend(cmd);
    const message =
      `Enemy directive: ${side.toUpperCase()} used ${cmd.name} ` +
      `(${commandUsageLabel(cmd.persistence)}, spent ${spend} action${spend === 1 ? '' : 's'}).`;
    state.enemyDirectiveNotice = { text: message, atSerial: state.turnSerial };
    log(`⚠️ ${message}`);
  }

  function scenarioSideLabels(name) {
    const fromMeta = scenarioMetadata(name).sideLabels;
    if (fromMeta && fromMeta.blue && fromMeta.red) {
      return {
        blue: fromMeta.blue,
        red: fromMeta.red,
        named: !!fromMeta.named,
      };
    }
    return { blue: 'Blue Army', red: 'Red Army', named: false };
  }

  function updateScenarioSidesLegend(name) {
    if (!elScenarioSides) return;
    const sides = scenarioSideLabels(name);
    elScenarioSides.textContent = `Blue: ${sides.blue} • Red: ${sides.red}`;
  }

  function objectiveHexKeyFromPoint(pt) {
    if (!pt || typeof pt !== 'object') return null;
    const q = Math.trunc(Number(pt.q));
    const r = Math.trunc(Number(pt.r));
    if (!Number.isFinite(q) || !Number.isFinite(r)) return null;
    const hk = key(q, r);
    if (!board.activeSet.has(hk)) return null;
    return hk;
  }

  function normalizeScenarioObjectives(rawObjectives) {
    const out = [];
    if (!Array.isArray(rawObjectives)) return out;

    for (let i = 0; i < rawObjectives.length; i++) {
      const raw = rawObjectives[i];
      if (!raw || typeof raw !== 'object') continue;
      const hexesRaw = Array.isArray(raw.hexes) ? raw.hexes : [];
      const hexSet = new Set();
      for (const pt of hexesRaw) {
        const hk = objectiveHexKeyFromPoint(pt);
        if (hk) hexSet.add(hk);
      }
      if (hexSet.size === 0) continue;
      const valueNum = Number(raw.value);
      const value = Number.isFinite(valueNum) ? Math.max(1, Math.trunc(valueNum)) : 1;
      out.push({
        id: String(raw.id || `obj-${i + 1}`),
        name: String(raw.name || `Objective ${i + 1}`),
        value,
        contestAdjacent: !!raw.contestAdjacent,
        hexes: [...hexSet],
      });
    }
    return out;
  }

  function loadScenarioObjectives(name) {
    const meta = scenarioMetadata(name);
    const sc = scenarioRecord(name) || {};
    const fromScenario = Array.isArray(sc.objectives) ? sc.objectives : [];
    const fromMeta = Array.isArray(meta.objectives) ? meta.objectives : [];
    const mergedRaw = fromScenario.length ? fromScenario : fromMeta;
    state.scenarioObjectives = normalizeScenarioObjectives(mergedRaw);
    state.objectiveCheckpointTurn = clampInt(meta.checkpointTurn, 1, 99, 8);
    state.objectiveLastSummary = null;
    state.loadedScenarioMeta = {
      description: meta.description || '',
      historical: meta.historical || '',
      notes: meta.notes || '',
      pointTarget: meta.pointTarget,
    };
  }

  function objectiveOccupants(zone) {
    let blueOnHex = 0;
    let redOnHex = 0;
    for (const hk of zone.hexes) {
      const u = unitsByHex.get(hk);
      if (!u) continue;
      if (u.side === 'blue') blueOnHex += 1;
      else if (u.side === 'red') redOnHex += 1;
    }
    return { blueOnHex, redOnHex };
  }

  function objectiveAdjacentPressure(zone) {
    let blueAdj = 0;
    let redAdj = 0;
    const zoneSet = new Set(zone.hexes);
    for (const hk of zone.hexes) {
      const h = board.byKey.get(hk);
      if (!h) continue;
      for (const nk of h.neigh) {
        if (zoneSet.has(nk)) continue;
        const u = unitsByHex.get(nk);
        if (!u) continue;
        if (u.side === 'blue') blueAdj += 1;
        else if (u.side === 'red') redAdj += 1;
      }
    }
    return { blueAdj, redAdj };
  }

  function evaluateObjectiveControl() {
    const zones = Array.isArray(state.scenarioObjectives) ? state.scenarioObjectives : [];
    const details = [];
    let blueValue = 0;
    let redValue = 0;
    let contested = 0;
    let neutral = 0;

    for (const zone of zones) {
      const occ = objectiveOccupants(zone);
      const adj = objectiveAdjacentPressure(zone);
      let owner = null;

      if (occ.blueOnHex > 0 && occ.redOnHex === 0) owner = 'blue';
      else if (occ.redOnHex > 0 && occ.blueOnHex === 0) owner = 'red';

      if (zone.contestAdjacent) {
        if (owner === 'blue' && adj.redAdj > 0) owner = null;
        if (owner === 'red' && adj.blueAdj > 0) owner = null;
      }

      if (owner === 'blue') blueValue += zone.value;
      else if (owner === 'red') redValue += zone.value;
      else if (occ.blueOnHex > 0 || occ.redOnHex > 0 || adj.blueAdj > 0 || adj.redAdj > 0) contested += 1;
      else neutral += 1;

      details.push({
        id: zone.id,
        name: zone.name,
        value: zone.value,
        owner,
        contested: owner === null && (occ.blueOnHex > 0 || occ.redOnHex > 0 || adj.blueAdj > 0 || adj.redAdj > 0),
      });
    }

    return {
      zones: zones.length,
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

  function logObjectiveStateIfChanged(force = false) {
    const objState = evaluateObjectiveControl();
    const summary = objectiveSummaryText(objState);
    if (force || summary !== state.objectiveLastSummary) {
      state.objectiveLastSummary = summary;
      log(summary);
      pushEventTrace('objective.state', {
        summary,
        blueValue: objState.blueValue,
        redValue: objState.redValue,
        contested: objState.contested,
        neutral: objState.neutral,
        zones: objState.details,
      });
    }
  }

  function normalizeDraftMode(mode) {
    if (mode === 'visible' || mode === 'fog') return mode;
    return 'off';
  }

  function parseDraftBudget(value) {
    return clampInt(value, DRAFT_BUDGET_MIN, DRAFT_BUDGET_MAX, DRAFT_BUDGET_DEFAULT);
  }

  function draftModeLabel(mode) {
    if (mode === 'visible') return 'Visible Placement';
    if (mode === 'fog') return 'Hidden Placement';
    return 'Off';
  }

  function draftMinimumUnitCost() {
    let min = Infinity;
    for (const def of UNIT_DEFS) {
      if (!def || !def.id) continue;
      const quality = normalizeQuality(def.id, 'green');
      const cost = unitUpValue(def.id, quality);
      if (cost > 0 && cost < min) min = cost;
    }
    return Number.isFinite(min) ? min : 1;
  }

  function draftCanSpend(side) {
    if (side !== 'blue' && side !== 'red') return false;
    return state.draft.remaining[side] >= draftMinimumUnitCost();
  }

  function isUnitVisibleForCurrentView(unit) {
    if (!unit) return false;
    if (!state.draft.active) return true;
    if (state.draft.mode !== 'fog') return true;
    if (state.draft.reveal) return true;
    return unit.side === state.draft.side;
  }

  function resetDraftState({ keepBudget = true } = {}) {
    const budget = keepBudget ? parseDraftBudget(state.draft.budget) : DRAFT_BUDGET_DEFAULT;
    state.draft.active = false;
    state.draft.mode = 'off';
    state.draft.budget = budget;
    state.draft.remaining.blue = 0;
    state.draft.remaining.red = 0;
    state.draft.done.blue = false;
    state.draft.done.red = false;
    state.draft.side = 'blue';
    state.draft.reveal = true;
  }

  function finalizeDraftSetup() {
    if (!state.draft.active) return;
    state.draft.active = false;
    state.draft.reveal = true;
    state.draft.done.blue = true;
    state.draft.done.red = true;
    state.editSide = 'blue';
    clearSelection();
    clearDoctrineTargeting();
    log('Custom army setup complete. Review the board, then click Start Battle.');
  }

  function draftSwitchTurnVisible(currentSide) {
    const other = (currentSide === 'blue') ? 'red' : 'blue';
    if (!state.draft.done[other] && draftCanSpend(other)) {
      state.draft.side = other;
      return true;
    }
    if (!state.draft.done[currentSide] && draftCanSpend(currentSide)) {
      state.draft.side = currentSide;
      return true;
    }
    return false;
  }

  function startCustomDraftSetup() {
    const mode = normalizeDraftMode(elDraftModeSel?.value);
    if (mode === 'off') {
      log('Choose a draft mode first: Visible Placement or Hidden Placement.');
      updateHud();
      return;
    }

    const budget = parseDraftBudget(elDraftBudgetInput?.value);
    stopAiLoop();
    enterEdit();
    clearUnits();
    clearDiceDisplay();
    clearSelection();

    state.draft.active = true;
    state.draft.mode = mode;
    state.draft.budget = budget;
    state.draft.remaining.blue = budget;
    state.draft.remaining.red = budget;
    state.draft.done.blue = false;
    state.draft.done.red = false;
    state.draft.side = 'blue';
    state.draft.reveal = (mode !== 'fog');
    if (state.gameMode !== 'online') state.gameMode = 'hvai';

    state.tool = 'units';
    state.editErase = false;
    state.editSide = 'blue';
    state.editType = 'inf';
    if (state.editType === 'iat') state.editQuality = 'regular';

    log(
      `Custom draft started (${draftModeLabel(mode)}). ` +
      `Budget: ${budget} UP per side. BLUE places first.`
    );
    updateHud();
  }

  function finishDraftForCurrentSide(manual = true) {
    if (!state.draft.active) return;
    const side = state.draft.side;
    state.draft.done[side] = true;

    if (state.draft.mode === 'visible') {
      const advanced = draftSwitchTurnVisible(side);
      if (!advanced) {
        finalizeDraftSetup();
      } else {
        state.editSide = state.draft.side;
        if (manual) {
          log(`${side.toUpperCase()} is done drafting. ${state.draft.side.toUpperCase()} continues.`);
        }
      }
      updateHud();
      return;
    }

    // Fog mode: each side drafts privately, then reveal.
    if (side === 'blue' && !state.draft.done.red && draftCanSpend('red')) {
      state.draft.side = 'red';
      state.editSide = 'red';
      clearSelection();
      log('BLUE locked in. RED drafts privately now.');
      updateHud();
      return;
    }

    finalizeDraftSetup();
    updateHud();
  }

  function handleDraftPlacement(hexKey) {
    if (!state.draft.active) return false;

    const side = state.draft.side;
    state.editSide = side;

    const existing = unitsByHex.get(hexKey);
    if (state.editErase) {
      if (!existing) {
        log('No unit to remove on that hex.');
        updateHud();
        return true;
      }
      if (existing.side !== side) {
        log('During draft, you can only remove your own units.');
        updateHud();
        return true;
      }

      const refund = unitUpValue(existing.type, existing.quality);
      unitsByHex.delete(hexKey);
      state.draft.remaining[side] += refund;
      state.draft.done[side] = false;
      log(`Removed ${side.toUpperCase()} ${UNIT_BY_ID.get(existing.type)?.abbrev || existing.type}. Refunded ${refund} UP.`);
      updateHud();
      return true;
    }

    if (state.tool !== 'units') {
      log('Custom draft only allows unit placement.');
      updateHud();
      return true;
    }
    if (state.draft.done[side]) {
      log(`${side.toUpperCase()} is already locked in.`);
      updateHud();
      return true;
    }

    const type = state.editType;
    const def = UNIT_BY_ID.get(type);
    if (!def) {
      updateHud();
      return true;
    }
    const quality = normalizeQuality(type, state.editQuality);
    const newCost = unitUpValue(type, quality);

    if (existing && existing.side !== side) {
      log('That hex is already occupied.');
      updateHud();
      return true;
    }

    const oldCost = existing ? unitUpValue(existing.type, existing.quality) : 0;
    const delta = newCost - oldCost;
    if (delta > state.draft.remaining[side]) {
      log(
        `Not enough UP: ${side.toUpperCase()} has ${state.draft.remaining[side]} UP left, ` +
        `needs ${delta} more for ${def.abbrev} (${quality}).`
      );
      updateHud();
      return true;
    }

    if (existing) {
      existing.side = side;
      existing.type = type;
      existing.quality = quality;
      existing.hp = unitMaxHp(type, quality);
      existing.disarray = false;
      log(`Draft replace at ${hexKey} -> ${side.toUpperCase()} ${def.abbrev} (${newCost} UP).`);
    } else {
      unitsByHex.set(hexKey, {
        id: nextUnitId++,
        side,
        type,
        quality,
        hp: unitMaxHp(type, quality),
        disarray: false,
      });
      log(`Draft placed ${side.toUpperCase()} ${def.abbrev} at ${hexKey} (${newCost} UP).`);
    }

    state.draft.remaining[side] -= delta;

    if (!draftCanSpend(side)) {
      state.draft.done[side] = true;
    }

    if (state.draft.mode === 'visible') {
      const advanced = draftSwitchTurnVisible(side);
      if (!advanced) {
        finalizeDraftSetup();
      } else {
        state.editSide = state.draft.side;
      }
      updateHud();
      return true;
    }

    // Fog mode: current side keeps placing until Done (or no UP left).
    if (state.draft.done[side]) {
      finishDraftForCurrentSide(false);
      return true;
    }

    updateHud();
    return true;
  }

  function updateDraftStatusUi() {
    if (!elDraftStatus) return;
    // Hidden by design in current UX pass.
    elDraftStatus.textContent = '';
    elDraftStatus.style.display = 'none';
  }

  function onlineModeActive() {
    return state.gameMode === 'online';
  }

  function onlineLibReady() {
    return typeof window.Peer === 'function';
  }

  function normalizeOnlineCode(raw) {
    const source = String(raw || '').toUpperCase();
    let out = '';
    for (const ch of source) {
      if (ONLINE_CODE_ALPHABET.includes(ch)) out += ch;
      if (out.length >= ONLINE_CODE_LENGTH) break;
    }
    return out;
  }

  function randomOnlineCode() {
    let out = '';
    for (let i = 0; i < ONLINE_CODE_LENGTH; i++) {
      const idx = Math.floor(Math.random() * ONLINE_CODE_ALPHABET.length);
      out += ONLINE_CODE_ALPHABET[idx];
    }
    return out;
  }

  function onlinePeerIdForCode(code) {
    return `${ONLINE_PEER_PREFIX}${normalizeOnlineCode(code)}`;
  }

  function onlineCodeFromPeerId(peerId) {
    const s = String(peerId || '');
    if (s.startsWith(ONLINE_PEER_PREFIX)) {
      return normalizeOnlineCode(s.slice(ONLINE_PEER_PREFIX.length));
    }
    return normalizeOnlineCode(s);
  }

  function setOnlineStatus(msg) {
    net.status = String(msg || 'Not connected.');
    if (elOnlineStatus) {
      elOnlineStatus.textContent = '';
      elOnlineStatus.style.display = 'none';
    }
  }

  function normalizeBattleSide(side, fallback = 'blue') {
    if (side === 'red' || side === 'blue') return side;
    return fallback === 'red' ? 'red' : 'blue';
  }

  function oppositeBattleSide(side) {
    return side === 'red' ? 'blue' : 'red';
  }

  function normalizeParityPick(v) {
    return String(v || '').toLowerCase() === 'evens' ? 'evens' : 'odds';
  }

  function applyGuestSidePreference(preferredSide) {
    const guestSide = normalizeBattleSide(preferredSide, 'red');
    state.online.seats.guest = guestSide;
    state.online.seats.host = oppositeBattleSide(guestSide);
    state.online.guestPreferredSide = guestSide;
  }

  function localOnlineSide() {
    if (!onlineModeActive()) return state.side;
    return net.isHost ? state.online.seats.host : state.online.seats.guest;
  }

  function sendGuestPregamePrefs() {
    if (!onlineModeActive() || !net.connected || net.isHost) return;
    onlineSendPacket({
      kind: 'pregame_prefs',
      guestPreferredSide: state.online.guestPreferredSide,
      guestParityPick: state.online.guestParityPick,
    });
  }

  function renderInitiativeRoll(roll, {
    guestParity = 'odds',
    guestWon = false,
    firstSide = 'blue',
  } = {}) {
    diceRenderNonce += 1;
    const dieValue = Math.max(1, Math.min(6, Math.trunc(Number(roll) || 1)));
    const parityLabel = (dieValue % 2 === 0) ? 'Even' : 'Odd';
    const guestCall = normalizeParityPick(guestParity);
    const first = normalizeBattleSide(firstSide, 'blue');

    if (elDiceTray) {
      elDiceTray.innerHTML = '';
      const die = document.createElement('div');
      die.className = 'die hit';
      const face = makeDieFace(dieValue);
      die.appendChild(face);
      const badge = document.createElement('span');
      badge.className = 'dieBadge';
      badge.textContent = String(dieValue);
      die.appendChild(badge);
      die.title = `Initiative d6: ${dieValue}`;
      elDiceTray.appendChild(die);
    }

    if (elPhysicalDiceRow) {
      elPhysicalDiceRow.innerHTML = '';
      const shell = makePhysicalDieShell(dieValue, 'hit', `Initiative d6: ${dieValue}`).shell;
      shell.style.setProperty('--dice-rot', `${(Math.floor(Math.random() * 9) - 4)}deg`);
      elPhysicalDiceRow.appendChild(shell);
    }
    if (elCornerDiceRow) {
      elCornerDiceRow.innerHTML = '';
      const shell = makePhysicalDieShell(dieValue, 'hit', `Initiative d6: ${dieValue}`).shell;
      shell.className = 'physicalDie hit cornerDie';
      shell.style.setProperty('--dice-rot', `${(Math.floor(Math.random() * 7) - 3)}deg`);
      elCornerDiceRow.appendChild(shell);
      if (elCornerDiceHud) elCornerDiceHud.classList.add('has-roll');
    }
    if (elCornerDiceHud) elCornerDiceHud.classList.remove('combat-active');
    state.combatBusy = false;
    state.combatBusyUntil = 0;

    const guestResult = guestWon ? 'wins call' : 'loses call';
    if (elDiceSummary) {
      elDiceSummary.textContent =
        `Initiative roll d6=${dieValue} (${parityLabel}). Guest called ${guestCall} and ${guestResult}.`;
    }
    if (elBoardDiceResult) {
      elBoardDiceResult.textContent = `${first.toUpperCase()} acts first`;
    }
  }

  function ensureOnlineMode() {
    if (state.gameMode === 'online') return;
    stopAiLoop();
    state.gameMode = 'online';
    if (elGameModeSel) elGameModeSel.value = 'online';
  }

  function onlineSendPacket(packet) {
    if (!net.conn || !net.connected) return false;
    try {
      net.conn.send(packet);
      return true;
    } catch (err) {
      setOnlineStatus(`Online send failed: ${err && err.message ? err.message : String(err)}`);
      return false;
    }
  }

  function onlineBroadcastSnapshot(reason = 'sync') {
    if (!onlineModeActive()) return;
    if (!net.isHost || !net.connected) return;
    const snapshot = buildStateSnapshot();
    snapshot.state.gameMode = 'online';
    onlineSendPacket({ kind: 'snapshot', reason, snapshot });
  }

  function onlineCloseConnection() {
    if (net.conn) {
      try { net.conn.close(); } catch (_) {}
    }
    net.conn = null;
    net.connected = false;
    net.remoteCode = '';
  }

  function onlineDestroyPeer() {
    onlineCloseConnection();
    if (net.peer) {
      try { net.peer.destroy(); } catch (_) {}
    }
    net.peer = null;
    net.myCode = '';
    net.isHost = false;
  }

  function onlineLeaveSession(statusText = 'Online: idle.') {
    onlineDestroyPeer();
    applyGuestSidePreference('red');
    state.online.guestParityPick = 'odds';
    state.online.lastInitiativeRoll = null;
    state.online.lastInitiativeFirstSide = null;
    state.online.lastInitiativeGuestWon = null;
    setOnlineStatus(statusText);
    updateHud();
  }

  function onlineExpectedLocalSide() {
    return localOnlineSide();
  }

  function executeOnlineActionLocal(action) {
    if (!action || typeof action !== 'object') return false;
    switch (action.type) {
      case 'click': {
        if (typeof action.hexKey !== 'string') return false;
        if (!board.activeSet.has(action.hexKey)) return false;
        clickPlay(action.hexKey);
        return true;
      }
      case 'pass':
        passSelected();
        return true;
      case 'command_use': {
        const commandId = String(action.commandId || '');
        if (!commandId) return false;
        const selectedUnitIds = Array.isArray(action.selectedUnitIds) ? action.selectedUnitIds.slice() : [];
        issueDoctrineCommand(commandId, { selectedUnitIds });
        return true;
      }
      case 'command_skip':
        skipDoctrineCommandPhase();
        return true;
      case 'line_advance':
        if (typeof action.direction === 'string') {
          state.lineAdvanceDirection = normalizeLineAdvanceDirection(action.direction);
        }
        lineAdvanceFromSelection();
        return true;
      case 'end_turn':
        endTurn();
        return true;
      default:
        return false;
    }
  }

  function forwardOnlineAction(action) {
    if (!onlineModeActive() || !net.connected) return false;

    const localSide = onlineExpectedLocalSide();
    if (state.mode !== 'play' || state.gameOver) {
      log('Online: enter Play mode to act.');
      updateHud();
      return true;
    }
    if (state.side !== localSide) {
      log(`Online: waiting for ${state.side.toUpperCase()} player.`);
      updateHud();
      return true;
    }

    if (net.isHost) {
      executeOnlineActionLocal(action);
    } else {
      const ok = onlineSendPacket({ kind: 'action', action });
      if (!ok) {
        log('Online: failed to send action to host.');
        updateHud();
      }
    }
    return true;
  }

  function onOnlinePacket(packet) {
    if (!packet || typeof packet !== 'object') return;

    if (packet.kind === 'hello') {
      if (net.isHost) onlineBroadcastSnapshot('hello');
      return;
    }

    if (packet.kind === 'snapshot') {
      if (net.isHost) return;
      net.applyingRemoteSnapshot = true;
      applyImportedState(packet.snapshot, 'online sync', { silent: true, skipAiKick: true });
      net.applyingRemoteSnapshot = false;
      return;
    }

    if (packet.kind === 'action') {
      if (!net.isHost || !onlineModeActive() || !net.connected) return;
      if (state.mode !== 'play' || state.gameOver) return;
      if (state.side !== state.online.seats.guest) {
        onlineBroadcastSnapshot('turn-mismatch');
        return;
      }
      executeOnlineActionLocal(packet.action);
      return;
    }

    if (packet.kind === 'pregame_prefs') {
      if (!net.isHost || !onlineModeActive()) return;
      const nextSide = normalizeBattleSide(packet.guestPreferredSide, state.online.guestPreferredSide || 'red');
      const nextParity = normalizeParityPick(packet.guestParityPick || state.online.guestParityPick);
      state.online.guestParityPick = nextParity;
      applyGuestSidePreference(nextSide);
      log(`Online setup: guest picked ${nextSide.toUpperCase()} and called ${nextParity.toUpperCase()}.`);
      updateHud();
      onlineBroadcastSnapshot('pregame-prefs');
      return;
    }

    if (packet.kind === 'initiative_result') {
      if (net.isHost || !onlineModeActive()) return;
      const guestSide = normalizeBattleSide(packet.guestSide, state.online.guestPreferredSide || 'red');
      const hostSide = normalizeBattleSide(packet.hostSide, oppositeBattleSide(guestSide));
      state.online.seats.guest = guestSide;
      state.online.seats.host = hostSide;
      state.online.guestPreferredSide = guestSide;
      state.online.guestParityPick = normalizeParityPick(packet.guestParityPick || state.online.guestParityPick);
      state.online.lastInitiativeRoll = Math.max(1, Math.min(6, Math.trunc(Number(packet.roll) || 1)));
      state.online.lastInitiativeGuestWon = !!packet.guestWon;
      state.online.lastInitiativeFirstSide = normalizeBattleSide(packet.firstSide, 'blue');
      renderInitiativeRoll(state.online.lastInitiativeRoll, {
        guestParity: state.online.guestParityPick,
        guestWon: state.online.lastInitiativeGuestWon,
        firstSide: state.online.lastInitiativeFirstSide,
      });
      updateHud();
      return;
    }
  }

  function bindOnlineConnection(conn) {
    if (!conn) return;
    onlineCloseConnection();
    net.conn = conn;
    if (typeof conn.peer === 'string') net.remoteCode = onlineCodeFromPeerId(conn.peer);

    conn.on('open', () => {
      net.connected = true;
      if (typeof conn.peer === 'string') net.remoteCode = onlineCodeFromPeerId(conn.peer);
      if (net.isHost) {
        setOnlineStatus(`Connected. Room ${net.myCode || '----'} is live.`);
      } else {
        setOnlineStatus(`Connected to room ${net.remoteCode || '----'}.`);
      }
      if (net.isHost) onlineBroadcastSnapshot('peer-open');
      else {
        onlineSendPacket({ kind: 'hello' });
        sendGuestPregamePrefs();
      }
      updateHud();
    });
    conn.on('data', onOnlinePacket);
    conn.on('close', () => {
      if (net.conn !== conn) return;
      onlineCloseConnection();
      setOnlineStatus('Online: connection closed.');
      updateHud();
    });
    conn.on('error', (err) => {
      setOnlineStatus(`Online connection error: ${err && err.message ? err.message : String(err)}`);
      updateHud();
    });
  }

  function startOnlineHost() {
    ensureOnlineMode();
    if (!onlineLibReady()) {
      setOnlineStatus('Online unavailable: PeerJS failed to load.');
      updateHud();
      return;
    }

    onlineDestroyPeer();
    net.isHost = true;
    net.myCode = randomOnlineCode();

    function openHostPeer(triesLeft) {
      const roomCode = net.myCode || randomOnlineCode();
      const peerId = onlinePeerIdForCode(roomCode);
      let opened = false;
      const peer = new window.Peer(peerId);
      net.peer = peer;
      setOnlineStatus(`Creating room ${roomCode}...`);

      peer.on('open', (id) => {
        if (net.peer !== peer) return;
        opened = true;
        net.myCode = onlineCodeFromPeerId(id) || roomCode;
        setOnlineStatus(`Room ${net.myCode} ready. Share this code. Guest chooses side + odds/evens.`);
        updateHud();
      });
      peer.on('connection', (incomingConn) => {
        if (net.peer !== peer || !net.isHost) {
          try { incomingConn.close(); } catch (_) {}
          return;
        }
        if (net.conn && net.connected) {
          try { incomingConn.close(); } catch (_) {}
          return;
        }
        bindOnlineConnection(incomingConn);
      });
      peer.on('error', (err) => {
        if (net.peer !== peer) return;
        const errText = String(err?.type || err?.message || err || '').toLowerCase();
        if (!opened && triesLeft > 0 && (errText.includes('unavailable') || errText.includes('taken') || errText.includes('id'))) {
          try { peer.destroy(); } catch (_) {}
          net.peer = null;
          net.myCode = randomOnlineCode();
          openHostPeer(triesLeft - 1);
          return;
        }
        setOnlineStatus(`Online host error: ${err && err.message ? err.message : String(err)}`);
        updateHud();
      });
      peer.on('close', () => {
        if (net.peer !== peer) return;
        onlineDestroyPeer();
        setOnlineStatus('Online: room closed.');
        updateHud();
      });
    }

    openHostPeer(8);
    updateHud();
  }

  function startOnlineJoin() {
    ensureOnlineMode();
    if (!onlineLibReady()) {
      setOnlineStatus('Online unavailable: PeerJS failed to load.');
      updateHud();
      return;
    }

    const hostCode = normalizeOnlineCode(elOnlineJoinCode?.value || '');
    if (elOnlineJoinCode) elOnlineJoinCode.value = hostCode;
    if (hostCode.length !== ONLINE_CODE_LENGTH) {
      setOnlineStatus(`Enter a ${ONLINE_CODE_LENGTH}-character room code.`);
      updateHud();
      return;
    }

    onlineDestroyPeer();
    net.isHost = false;
    net.remoteCode = hostCode;
    setOnlineStatus(`Connecting to room ${hostCode}...`);

    const peer = new window.Peer();
    net.peer = peer;

    peer.on('open', () => {
      if (net.peer !== peer) return;
      net.myCode = '';
      const conn = peer.connect(onlinePeerIdForCode(hostCode), { reliable: true });
      bindOnlineConnection(conn);
      updateHud();
    });
    peer.on('error', (err) => {
      if (net.peer !== peer) return;
      const errType = String(err?.type || '').toLowerCase();
      if (errType.includes('peer-unavailable')) {
        setOnlineStatus(`Room ${hostCode} not found. Check code and try again.`);
      } else {
        setOnlineStatus(`Online join error: ${err && err.message ? err.message : String(err)}`);
      }
      updateHud();
    });
    peer.on('close', () => {
      if (net.peer !== peer) return;
      onlineDestroyPeer();
      setOnlineStatus('Online: join closed.');
      updateHud();
    });

    updateHud();
  }

  function doctrineKnownForViewer(viewerSide, ownerSide) {
    const ds = doctrineStateForSide(ownerSide);
    if (!ds) return [];
    return ds.loadout
      .map((id) => {
        const cmd = COMMAND_BY_ID.get(id);
        const st = ds.byId[id];
        if (!cmd || !st) return null;
        const visible = (viewerSide === ownerSide) || st.revealed;
        if (!visible) return { id, hidden: true, spent: false, cmd, st };
        return { id, hidden: false, spent: !!st.spent, cmd, st };
      })
      .filter(Boolean)
      .sort((a, b) => (a.cmd.cost - b.cmd.cost) || a.cmd.name.localeCompare(b.cmd.name));
  }

  function renderDoctrineList(el, rows, mode = 'generic') {
    if (!el) return;
    if (!rows.length) {
      el.innerHTML = '<div class="doctrineChip hidden">No doctrine loaded.</div>';
      return;
    }
    const html = rows.map((r) => {
      if (r.hidden) {
        return `<div class="doctrineChip hidden"><span class="monoVal">[?]</span>Hidden command</div>`;
      }
      const tag = commandUsageBadge(r.cmd.persistence);
      const cls = r.spent ? 'doctrineChip spent' : 'doctrineChip';
      if (mode === 'own') {
        const eligible = isCommandAvailableForUse(state.side, r.id) && legalDoctrineTargets(state.side, r.id).length > 0;
        const revealTxt = r.st?.revealed ? 'revealed' : 'hidden';
        const eligibleTxt = eligible ? 'ready' : 'locked';
        return `<div class="${cls}"><span class="monoVal">[${r.cmd.cost}${tag}]</span>${r.cmd.name} <span class="monoVal">${commandUsageLabel(r.cmd.persistence)} · ${revealTxt}, ${eligibleTxt}</span></div>`;
      }
      if (mode === 'known') {
        return `<div class="${cls}"><span class="monoVal">[${r.cmd.cost}${tag}]</span>${r.cmd.name} <span class="monoVal">revealed · ${commandUsageLabel(r.cmd.persistence)}</span></div>`;
      }
      if (mode === 'spent') {
        return `<div class="${cls}"><span class="monoVal">[${r.cmd.cost}${tag}]</span>${r.cmd.name} <span class="monoVal">single-use consumed</span></div>`;
      }
      return `<div class="${cls}"><span class="monoVal">[${r.cmd.cost}${tag}]</span>${r.cmd.name}</div>`;
    }).join('');
    el.innerHTML = html;
  }

  function renderOrdersExplainList() {
    if (!elOrdersExplainList) return;
    const side = state.ordersPreviewSide === 'red' ? 'red' : 'blue';
    if (elOrdersViewBlueBtn) setActive(elOrdersViewBlueBtn, side === 'blue');
    if (elOrdersViewRedBtn) setActive(elOrdersViewRedBtn, side === 'red');

    const ds = doctrineStateForSide(side);
    const loadout = Array.isArray(ds?.loadout) ? ds.loadout : [];
    if (!loadout.length) {
      elOrdersExplainList.innerHTML = '<div class="ordersExplainEmpty">No orders loaded for this side yet.</div>';
      return;
    }

    const byCost = new Map([[1, []], [2, []], [3, []]]);
    for (const id of loadout) {
      const cmd = COMMAND_BY_ID.get(id);
      if (!cmd) continue;
      const group = byCost.get(cmd.cost);
      if (group) group.push(cmd);
    }
    for (const rows of byCost.values()) {
      rows.sort((a, b) => {
        if (a.persistence !== b.persistence) return (a.persistence === 'spent') ? 1 : -1;
        return a.name.localeCompare(b.name);
      });
    }

    const tierHtml = COMMAND_COSTS.map((cost) => {
      const rows = byCost.get(cost) || [];
      const items = rows.map((cmd) => {
        const use = commandUsageLabel(cmd.persistence);
        const target = cmd.targeting ? ` Target: ${cmd.targeting}.` : '';
        return `<article class="ordersExplainItem">
          <div class="ordersExplainHead">
            <div class="ordersExplainName">${cmd.name}</div>
            <div class="ordersExplainMeta">${use}</div>
          </div>
          <div class="ordersExplainLayman">${commandLaymanText(cmd)}</div>
          <div class="ordersExplainBody">Rules effect: ${commandExplainText(cmd)}${target}</div>
        </article>`;
      }).join('');
      return `<section class="ordersExplainTier">
        <h4 class="ordersExplainTierTitle">Cost ${cost}</h4>
        ${items || '<div class="ordersExplainEmpty">No selected orders in this cost tier.</div>'}
      </section>`;
    }).join('');

    elOrdersExplainList.innerHTML = tierHtml;
  }

  function renderDoctrineIntel() {
    const own = doctrineKnownForViewer(state.side, state.side);
    const enemySide = state.side === 'blue' ? 'red' : 'blue';
    const knownEnemy = doctrineKnownForViewer(state.side, enemySide).filter(r => !r.hidden && !r.spent);
    const spentEnemy = doctrineKnownForViewer(state.side, enemySide).filter(r => !r.hidden && r.spent);
    renderDoctrineList(elDoctrineOwnList, own, 'own');
    renderDoctrineList(elDoctrineKnownList, knownEnemy, 'known');
    renderDoctrineList(elDoctrineSpentList, spentEnemy, 'spent');
    if (elDoctrineHistoryList) {
      const items = Array.isArray(state.doctrine.history) ? state.doctrine.history.slice(-6) : [];
      if (!items.length) {
        elDoctrineHistoryList.innerHTML = '<div class="doctrineChip hidden">No commands used yet.</div>';
      } else {
        const html = items.map((it) => {
          const p = commandUsageBadge(it.persistence);
          const s = it.side === 'red' ? 'RED' : 'BLUE';
          return `<div class="doctrineChip ${it.spent ? 'spent' : ''}"><span class="monoVal">${s} T${it.turn}</span>${it.name} [${it.cost}${p}]</div>`;
        }).join('');
        elDoctrineHistoryList.innerHTML = html;
      }
    }
  }

  function legalDoctrineTargets(side, commandId) {
    const cmd = COMMAND_BY_ID.get(commandId);
    if (!cmd || (side !== 'blue' && side !== 'red')) return [];
    const allFriendly = friendlyEntries(side);
    const byId = (entries) => entries.map((e) => ({ key: e.key, unitId: e.unit.id, type: e.unit.type }));

    switch (commandId) {
      case 'quick_dress': {
        const inf = friendlyEntries(side, (u, hk) => u.type === 'inf' && unitCanActivate(u, hk));
        const picks = chooseAdjacentRowEntries(inf, 3, 1);
        if (!picks.length) return [];
        const lateral = axisLateralDirections(state.forwardAxis);
        const hasMove = picks.some((e) =>
          lateral.some((dir) => {
            const toKey = stepKeyInDirection(e.key, dir);
            return canCommandRelocateUnit(e.key, toKey, { unit: e.unit });
          })
        );
        return byId(hasMove ? picks : []);
      }
      case 'runner_burst':
        return byId(byFrontlinePriority(friendlyEntries(side, (u) => u.type === 'run'), side));
      case 'javelin_volley':
        return byId(byFrontlinePriority(friendlyEntries(side, (u) => u.type === 'skr' || u.type === 'arc'), side));
      case 'quick_withdraw':
        return byId(byFrontlinePriority(
          quickWithdrawCandidates(side),
          side
        ));
      case 'close_ranks':
        return byId(byFrontlinePriority(friendlyEntries(side, (u) => u.type === 'inf'), side));
      case 'spur_horses':
        // Allow manual selection among ALL eligible cavalry in command.
        // The directive still resolves to exactly one target via target limits.
        return byId(byFrontlinePriority(
          friendlyEntries(side, (u, hk) => u.type === 'cav' && inCommandAt(hk, side)),
          side
        ));
      case 'signal_call': {
        const gens = friendlyEntries(side, (u) => u.type === 'gen');
        const targets = [];
        for (const e of friendlyEntries(side, (u) => u.type !== 'gen')) {
          const h = e.hex;
          if (!h) continue;
          let exactlyOutside = false;
          for (const g of gens) {
            const radius = commandRadiusForUnit(g.unit);
            const d = axialDistance(h.q, h.r, g.hex.q, g.hex.r);
            if (d > radius && d <= radius + 2) { exactlyOutside = true; break; }
          }
          if (exactlyOutside) targets.push(e);
        }
        return byId(byFrontlinePriority(targets, side));
      }
      case 'loose_screen':
        return byId(byFrontlinePriority(
          friendlyEntries(side, (u, hk) => (u.type === 'skr' || u.type === 'arc') && hasAdjacentFriendlyInf(hk, side)),
          side
        ));
      case 'covering_fire':
        return byId(byFrontlinePriority(friendlyEntries(side, (u) => u.type === 'arc' || u.type === 'skr'), side));
      case 'hold_fast':
        return byId(byFrontlinePriority(allFriendly, side));
      case 'shield_wall': {
        const inf = friendlyEntries(side, (u) => u.type === 'inf');
        const picks = findLargestContiguousGroup(inf, 6);
        return byId(picks.length >= 3 ? picks : []);
      }
      case 'cavalry_exploit':
        return byId(byFrontlinePriority(friendlyEntries(side, (u) => u.type === 'cav'), side));
      case 'refuse_flank':
      {
        const picks = chooseWingEntries(friendlyEntries(side, (u) => u.type === 'inf'), side, 5).slice(0, 5);
        if (picks.length < 2) return [];
        const backDir = oppositeDirection(sideForwardDirection(side, state.forwardAxis));
        const hasMove = picks.some((e) => {
          const candidates = [];
          if (backDir) candidates.push(stepKeyInDirection(e.key, backDir));
          const inwardDir = inwardLateralDirectionForKey(e.key);
          if (inwardDir) candidates.push(stepKeyInDirection(e.key, inwardDir));
          return candidates.some((k) => canCommandRelocateUnit(e.key, k, { unit: e.unit }));
        });
        return byId(hasMove ? picks : []);
      }
      case 'forced_march':
        return byId(byFrontlinePriority(friendlyEntries(side, (u) => u.type === 'inf' || u.type === 'skr'), side));
      case 'strengthen_center': {
        const gen = pickNearestGeneral(side);
        if (!gen) return [];
        return byId(byFrontlinePriority(
          friendlyEntries(side, (u, hk) => u.type === 'inf' && axialDistance(gen.hex.q, gen.hex.r, board.byKey.get(hk).q, board.byKey.get(hk).r) <= 2),
          side
        ));
      }
      case 'wing_screen':
        return byId(chooseWingEntries(friendlyEntries(side, (u) => u.type === 'skr' || u.type === 'arc'), side, 4));
      case 'countercharge':
        return byId(byFrontlinePriority(
          friendlyEntries(side, (u, hk) => u.type === 'cav' && !isSurrounded(hk, side)),
          side
        ));
      case 'jaws_inward':
      {
        const picks = selectJawsInwardVeteranEntries(side, 4);
        if (picks.length < 2) return [];
        const hasMove = picks.some((e) => {
          const inwardDir = inwardLateralDirectionForKey(e.key);
          const toKey = inwardDir ? stepKeyInDirection(e.key, inwardDir) : null;
          return canCommandRelocateUnit(e.key, toKey, { unit: e.unit });
        });
        return byId(hasMove ? picks : []);
      }
      case 'local_reserve': {
        const geom = buildAxisGeometry(state.forwardAxis);
        return byId(byFrontlinePriority(
          friendlyEntries(side, (u, hk) => geom.frontDepthForSide(side, hk) >= 0.58),
          side
        ));
      }
      case 'drive_them_back':
        return byId(byFrontlinePriority(friendlyEntries(side, (u) => u.type === 'inf'), side));
      case 'full_line_advance':
      {
        const picks = chooseRowEntries(friendlyEntries(side), 8);
        if (picks.length < 3) return [];
        const hasMove = picks.some((e) => {
          const toKey = forwardStepKey(e.key, e.unit.side);
          return canCommandRelocateUnit(e.key, toKey, { unit: e.unit });
        });
        return byId(hasMove ? picks : []);
      }
      case 'grand_shield_wall': {
        const inf = friendlyEntries(side, (u) => u.type === 'inf');
        const picks = findLargestContiguousGroup(inf, 8).slice(0, Math.min(8, inf.length));
        return byId(picks.length >= 5 ? picks : []);
      }
      case 'all_out_cavalry_sweep': {
        const cavWing = chooseWingEntries(friendlyEntries(side, (u) => u.type === 'cav'), side, 4);
        if (cavWing.length) return byId(cavWing);
        const fallbackWing = chooseWingEntries(
          friendlyEntries(side, (u) => u.type === 'inf' || u.type === 'skr' || u.type === 'arc'),
          side,
          3
        );
        return byId(fallbackWing);
      }
      case 'commit_reserves': {
        return byId(selectReserveEntries(side, 4));
      }
      case 'general_assault': {
        const gen = pickNearestGeneral(side);
        if (!gen) return [];
        const picks = byFrontlinePriority(
          friendlyEntries(side, (u, hk) => {
            if (u.id === gen.unit.id) return false;
            const h = board.byKey.get(hk);
            return axialDistance(gen.hex.q, gen.hex.r, h.q, h.r) <= (commandRadiusForUnit(gen.unit) + 1);
          }),
          side
        ).slice(0, 4);
        return byId(picks);
      }
      case 'collapse_center':
      {
        const geom = buildAxisGeometry(state.forwardAxis);
        const allInf = friendlyEntries(side, (u) => u.type === 'inf');
        const centerInf = collapseCenterCandidates(side, 5);
        if (centerInf.length < 3) return [];
        const centerKeys = new Set(centerInf.map((e) => e.key));
        const leftWing = [];
        const rightWing = [];
        for (const e of allInf) {
          if (centerKeys.has(e.key)) continue;
          const lateral = geom.lateralForSide(side, e.key);
          if (lateral < -0.18) leftWing.push({ e, score: Math.abs(lateral) });
          else if (lateral > 0.18) rightWing.push({ e, score: Math.abs(lateral) });
        }
        leftWing.sort((a, b) => b.score - a.score);
        rightWing.sort((a, b) => b.score - a.score);
        const wingPicks = [...leftWing.slice(0, 2).map((x) => x.e), ...rightWing.slice(0, 2).map((x) => x.e)];

        const backDir = oppositeDirection(sideForwardDirection(side, state.forwardAxis));
        const centerMovable = centerInf.some((e) => {
          const toKey = backDir ? stepKeyInDirection(e.key, backDir) : null;
          return canCommandRelocateUnit(e.key, toKey, { unit: e.unit });
        });
        const wingMovable = wingPicks.some((e) => {
          const inwardDir = inwardLateralDirectionForKey(e.key);
          const toKey = inwardDir ? stepKeyInDirection(e.key, inwardDir) : null;
          return canCommandRelocateUnit(e.key, toKey, { unit: e.unit });
        });
        if (!centerMovable && !wingMovable) return [];

        const merged = [...centerInf];
        for (const w of wingPicks) {
          if (!merged.some((m) => m.key === w.key)) merged.push(w);
        }
        return byId(merged);
      }
      case 'last_push':
        return byId(byFrontlinePriority(friendlyEntries(side, (u) => u.type === 'inf' || u.type === 'cav'), side));
      case 'reforge_line': {
        const inf = friendlyEntries(side, (u) => u.type === 'inf');
        const picks = findLargestContiguousGroup(inf, 6);
        if (picks.length < 3) return [];
        const hasMove = picks.some((e) => {
          const opts = [
            sideForwardDirection(side, state.forwardAxis),
            ...axisLateralDirections(state.forwardAxis),
            oppositeDirection(sideForwardDirection(side, state.forwardAxis)),
          ];
          return opts.some((dir) => {
            const toKey = stepKeyInDirection(e.key, dir);
            return canCommandRelocateUnit(e.key, toKey, { unit: e.unit });
          });
        });
        return byId(hasMove ? picks : []);
      }
      case 'command_surge':
        return byId(friendlyEntries(side, (u) => u.type === 'gen').slice(0, 1));
      case 'stand_or_die': {
        const gen = pickNearestGeneral(side);
        if (!gen) return [];
        const picks = byFrontlinePriority(
          friendlyEntries(side, (u, hk) => {
            if (u.type !== 'inf') return false;
            const h = board.byKey.get(hk);
            return axialDistance(gen.hex.q, gen.hex.r, h.q, h.r) <= 2;
          }),
          side
        ).slice(0, 5);
        return byId(picks.length >= 3 ? picks : []);
      }
      default:
        return [];
    }
  }

  function legalCommandsForSide(side) {
    const ds = doctrineStateForSide(side);
    if (!ds) return [];
    return ds.loadout
      .map((id) => COMMAND_BY_ID.get(id))
      .filter(Boolean)
      .filter((cmd) => isCommandAvailableForUse(side, cmd.id))
      .filter((cmd) => legalDoctrineTargets(side, cmd.id).length > 0);
  }

  function populateTurnCommandSelect() {
    if (!elCommandSel) return;
    elCommandSel.innerHTML = '';
    const legal = legalCommandsForSide(state.side);
    if (!legal.length) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = 'No legal commands';
      elCommandSel.appendChild(opt);
      return;
    }
    for (const cmd of legal.sort((a, b) => (a.cost - b.cost) || a.name.localeCompare(b.name))) {
      const targetCount = legalDoctrineTargets(state.side, cmd.id).length;
      const opt = document.createElement('option');
      opt.value = cmd.id;
      opt.textContent = `[${cmd.cost}] ${cmd.name} (${commandUsageLabel(cmd.persistence)} · targets ${targetCount})`;
      opt.title = `${commandLaymanText(cmd)} Rules effect: ${commandExplainText(cmd)} Targeting: ${cmd.targeting}. Legal target groups: ${targetCount}.`;
      elCommandSel.appendChild(opt);
    }
    const targetingCmdId = state.doctrine.targeting.active ? String(state.doctrine.targeting.commandId || '') : '';
    if (targetingCmdId) {
      if (legal.some((c) => c.id === targetingCmdId)) {
        elCommandSel.value = targetingCmdId;
        state.doctrine.selectedCommandId = targetingCmdId;
        return;
      }
      // Targeting command no longer legal (board changed): close target mode cleanly.
      clearDoctrineTargeting();
      log('Directive target mode canceled: selected directive is no longer legal this turn.');
    }
    if (state.doctrine.selectedCommandId && legal.some(c => c.id === state.doctrine.selectedCommandId)) {
      elCommandSel.value = state.doctrine.selectedCommandId;
    } else {
      elCommandSel.value = legal[0].id;
      state.doctrine.selectedCommandId = elCommandSel.value;
    }
  }

  function skipDoctrineCommandPhase() {
    if (state.mode !== 'play' || state.gameOver) return;
    if (state.doctrine.targeting.active) {
      clearDoctrineTargeting();
      log('Directive target mode canceled.');
      updateHud();
      return;
    }
    if (state.doctrine.commandIssuedThisTurn) {
      log('Command already committed this turn.');
      updateHud();
      return;
    }
    state.doctrine.commandIssuedThisTurn = true;
    state.doctrine.activeCommandThisTurn = null;
    closeCommandPhase();
    clearDoctrineTargeting();
    log(`${state.side.toUpperCase()} chose not to issue a command this turn.`);
    pushEventTrace('command.skip', { side: state.side });
    updateHud();
  }

  function ensureDoctrineConfirmState() {
    if (!state.doctrine.builder.confirmed || typeof state.doctrine.builder.confirmed !== 'object') {
      state.doctrine.builder.confirmed = { blue: false, red: false };
    }
    if (typeof state.doctrine.builder.confirmed.blue !== 'boolean') state.doctrine.builder.confirmed.blue = false;
    if (typeof state.doctrine.builder.confirmed.red !== 'boolean') state.doctrine.builder.confirmed.red = false;
  }

  function doctrineBothSidesConfirmed() {
    ensureDoctrineConfirmState();
    return !!state.doctrine.builder.confirmed.blue && !!state.doctrine.builder.confirmed.red;
  }

  function doctrinePreviewScene(commandId) {
    const s = {
      cols: 8,
      rows: 4,
      caption: '',
      tokens: [],
      arrows: [],
    };

    const setScene = (caption, tokens, arrows, rows = 4, cols = 8) => {
      s.caption = caption;
      s.tokens = tokens;
      s.arrows = arrows;
      s.rows = rows;
      s.cols = cols;
    };

    switch (commandId) {
      case 'quick_dress':
        setScene(
          'Quick Dress: adjacent infantry slide laterally in the same row while keeping formation.',
          [
            { side: 'blue', type: 'inf', c: 1, r: 2, mc: 2, mr: 2 },
            { side: 'blue', type: 'inf', c: 2, r: 2, mc: 3, mr: 2 },
            { side: 'blue', type: 'inf', c: 3, r: 2, mc: 4, mr: 2 },
            { side: 'red', type: 'inf', c: 5, r: 2 },
          ],
          [
            { from: [1, 2], to: [2, 2], kind: 'move' },
            { from: [2, 2], to: [3, 2], kind: 'move' },
            { from: [3, 2], to: [4, 2], kind: 'move' },
          ]
        );
        break;
      case 'runner_burst':
        setScene(
          'Runner Burst: one runner surges and extends local command relay support.',
          [
            { side: 'blue', type: 'run', c: 1, r: 3, mc: 4, mr: 2 },
            { side: 'blue', type: 'inf', c: 3, r: 2 },
            { side: 'blue', type: 'cav', c: 4, r: 1 },
          ],
          [
            { from: [1, 3], to: [4, 2], kind: 'move' },
            { from: [4, 2], to: [3, 2], kind: 'command' },
            { from: [4, 2], to: [4, 1], kind: 'command' },
          ]
        );
        break;
      case 'javelin_volley':
        setScene(
          'Javelin Volley: up to two light missile units throw with boosted ranged impact.',
          [
            { side: 'blue', type: 'skr', c: 2, r: 2 },
            { side: 'blue', type: 'arc', c: 3, r: 2 },
            { side: 'red', type: 'inf', c: 4, r: 1 },
            { side: 'red', type: 'inf', c: 5, r: 2 },
          ],
          [
            { from: [2, 2], to: [4, 1], kind: 'ranged' },
            { from: [3, 2], to: [5, 2], kind: 'ranged' },
          ]
        );
        break;
      case 'quick_withdraw':
        setScene(
          'Quick Withdraw: an exposed skirmisher/archer steps back out of pressure.',
          [
            { side: 'blue', type: 'skr', c: 3, r: 2, mc: 2, mr: 1 },
            { side: 'blue', type: 'inf', c: 2, r: 2 },
            { side: 'red', type: 'inf', c: 4, r: 2 },
          ],
          [{ from: [3, 2], to: [2, 1], kind: 'move' }]
        );
        break;
      case 'close_ranks':
        setScene(
          'Close Ranks: one infantry unit braces and absorbs melee pressure.',
          [
            { side: 'blue', type: 'inf', c: 3, r: 2 },
            { side: 'blue', type: 'inf', c: 2, r: 2 },
            { side: 'red', type: 'cav', c: 4, r: 2 },
          ],
          [
            { from: [4, 2], to: [3, 2], kind: 'attack' },
            { from: [2, 2], to: [3, 2], kind: 'hold' },
          ]
        );
        break;
      case 'spur_horses':
        setScene(
          'Spur the Horses: one cavalry gains extra reach to claim better attack angles.',
          [
            { side: 'blue', type: 'cav', c: 1, r: 2, mc: 4, mr: 1 },
            { side: 'red', type: 'inf', c: 5, r: 2 },
          ],
          [
            { from: [1, 2], to: [4, 1], kind: 'move' },
            { from: [4, 1], to: [5, 2], kind: 'attack' },
          ]
        );
        break;
      case 'signal_call':
        setScene(
          'Signal Call: a general briefly pulls nearby out-of-command units back into control.',
          [
            { side: 'blue', type: 'gen', c: 2, r: 2 },
            { side: 'blue', type: 'inf', c: 4, r: 1 },
            { side: 'blue', type: 'inf', c: 5, r: 2 },
          ],
          [
            { from: [2, 2], to: [4, 1], kind: 'command' },
            { from: [2, 2], to: [5, 2], kind: 'command' },
          ]
        );
        break;
      case 'loose_screen':
        setScene(
          'Loose Screen: light troops slip through adjacent infantry by one hex to reposition.',
          [
            { side: 'blue', type: 'inf', c: 3, r: 2 },
            { side: 'blue', type: 'inf', c: 4, r: 2 },
            { side: 'blue', type: 'skr', c: 3, r: 3, mc: 4, mr: 2 },
            { side: 'blue', type: 'arc', c: 2, r: 2, mc: 3, mr: 1 },
            { side: 'red', type: 'inf', c: 6, r: 2 },
          ],
          [
            { from: [3, 3], to: [4, 2], kind: 'move' },
            { from: [2, 2], to: [3, 1], kind: 'move' },
          ]
        );
        break;
      case 'covering_fire':
        setScene(
          'Covering Fire: missile attacks ignore terrain firing penalties this turn.',
          [
            { side: 'blue', type: 'arc', c: 2, r: 2 },
            { side: 'blue', type: 'skr', c: 3, r: 2 },
            { side: 'red', type: 'inf', c: 5, r: 2 },
            { side: 'red', type: 'inf', c: 6, r: 1 },
          ],
          [
            { from: [2, 2], to: [5, 2], kind: 'ranged' },
            { from: [3, 2], to: [6, 1], kind: 'ranged' },
          ]
        );
        break;
      case 'hold_fast':
        setScene(
          'Hold Fast: one unit resists retreat pressure and keeps local cohesion.',
          [
            { side: 'blue', type: 'inf', c: 3, r: 2 },
            { side: 'red', type: 'inf', c: 4, r: 2 },
          ],
          [
            { from: [4, 2], to: [3, 2], kind: 'attack' },
            { from: [3, 2], to: [3, 2], kind: 'hold' },
          ]
        );
        break;

      case 'shield_wall':
        setScene(
          'Shield Wall: a contiguous infantry block hardens and becomes harder to break in melee.',
          [
            { side: 'blue', type: 'inf', c: 2, r: 2 },
            { side: 'blue', type: 'inf', c: 3, r: 2 },
            { side: 'blue', type: 'inf', c: 4, r: 2 },
            { side: 'red', type: 'cav', c: 5, r: 2 },
          ],
          [
            { from: [5, 2], to: [4, 2], kind: 'attack' },
            { from: [2, 2], to: [4, 2], kind: 'hold' },
          ]
        );
        break;
      case 'cavalry_exploit':
        setScene(
          'Cavalry Exploit: a cavalry wing moves into open-ground attack lanes for stronger shock.',
          [
            { side: 'blue', type: 'cav', c: 1, r: 2, mc: 4, mr: 1 },
            { side: 'blue', type: 'cav', c: 2, r: 3, mc: 5, mr: 2 },
            { side: 'red', type: 'inf', c: 5, r: 2 },
          ],
          [
            { from: [1, 2], to: [4, 1], kind: 'move' },
            { from: [4, 1], to: [5, 2], kind: 'attack' },
            { from: [2, 3], to: [5, 2], kind: 'move' },
          ],
          5
        );
        break;
      case 'refuse_flank':
        setScene(
          'Refuse the Flank: wing infantry pull inward/back to avoid getting wrapped.',
          [
            { side: 'blue', type: 'inf', c: 1, r: 2, mc: 1, mr: 3 },
            { side: 'blue', type: 'inf', c: 2, r: 2, mc: 2, mr: 3 },
            { side: 'blue', type: 'inf', c: 3, r: 2, mc: 3, mr: 2 },
          ],
          [
            { from: [1, 2], to: [1, 3], kind: 'move' },
            { from: [2, 2], to: [2, 3], kind: 'move' },
          ]
        );
        break;
      case 'forced_march':
        setScene(
          'Forced March: up to four infantry/skirmishers surge forward but cannot attack this turn.',
          [
            { side: 'blue', type: 'inf', c: 2, r: 3, mc: 3, mr: 2 },
            { side: 'blue', type: 'skr', c: 3, r: 3, mc: 4, mr: 2 },
            { side: 'blue', type: 'inf', c: 4, r: 3, mc: 5, mr: 2 },
          ],
          [
            { from: [2, 3], to: [3, 2], kind: 'move' },
            { from: [3, 3], to: [4, 2], kind: 'move' },
            { from: [4, 3], to: [5, 2], kind: 'move' },
          ]
        );
        break;
      case 'strengthen_center':
        setScene(
          'Strengthen the Center: infantry near the general anchor and resist retreat pressure.',
          [
            { side: 'blue', type: 'gen', c: 2, r: 2 },
            { side: 'blue', type: 'inf', c: 3, r: 2 },
            { side: 'blue', type: 'inf', c: 4, r: 2 },
            { side: 'blue', type: 'inf', c: 3, r: 1 },
          ],
          [
            { from: [2, 2], to: [3, 2], kind: 'command' },
            { from: [2, 2], to: [4, 2], kind: 'command' },
            { from: [2, 2], to: [3, 1], kind: 'command' },
          ]
        );
        break;
      case 'wing_screen':
        setScene(
          'Wing Screen: flank missile units fire, then reposition 1 hex.',
          [
            { side: 'blue', type: 'skr', c: 2, r: 3, mc: 3, mr: 2 },
            { side: 'blue', type: 'arc', c: 3, r: 3, mc: 4, mr: 2 },
            { side: 'red', type: 'inf', c: 5, r: 2 },
          ],
          [
            { from: [2, 3], to: [5, 2], kind: 'ranged' },
            { from: [2, 3], to: [3, 2], kind: 'move' },
            { from: [3, 3], to: [4, 2], kind: 'move' },
          ]
        );
        break;
      case 'countercharge':
        setScene(
          'Countercharge: cavalry react when enemies close, striking immediately.',
          [
            { side: 'blue', type: 'cav', c: 2, r: 2 },
            { side: 'red', type: 'inf', c: 4, r: 2, mc: 3, mr: 2 },
          ],
          [
            { from: [4, 2], to: [3, 2], kind: 'move' },
            { from: [2, 2], to: [3, 2], kind: 'attack' },
          ]
        );
        break;
      case 'jaws_inward':
        setScene(
          'Jaws Inward: experienced infantry close from both sides to compress an enemy pocket.',
          [
            { side: 'blue', type: 'inf', c: 1, r: 2, mc: 2, mr: 2 },
            { side: 'blue', type: 'inf', c: 5, r: 2, mc: 4, mr: 2 },
            { side: 'red', type: 'inf', c: 3, r: 2 },
          ],
          [
            { from: [1, 2], to: [2, 2], kind: 'move' },
            { from: [5, 2], to: [4, 2], kind: 'move' },
          ]
        );
        break;
      case 'local_reserve':
        setScene(
          'Local Reserve: rear-line units are released to act immediately.',
          [
            { side: 'blue', type: 'inf', c: 2, r: 3, mc: 3, mr: 2 },
            { side: 'blue', type: 'inf', c: 3, r: 3, mc: 4, mr: 2 },
            { side: 'blue', type: 'cav', c: 4, r: 3, mc: 5, mr: 2 },
          ],
          [
            { from: [2, 3], to: [3, 2], kind: 'move' },
            { from: [3, 3], to: [4, 2], kind: 'move' },
            { from: [4, 3], to: [5, 2], kind: 'move' },
          ]
        );
        break;
      case 'drive_them_back':
        setScene(
          'Drive Them Back: infantry attacks spike pressure to force disarray and retreats.',
          [
            { side: 'blue', type: 'inf', c: 2, r: 2 },
            { side: 'blue', type: 'inf', c: 3, r: 2 },
            { side: 'red', type: 'inf', c: 4, r: 2 },
          ],
          [
            { from: [2, 2], to: [4, 2], kind: 'attack' },
            { from: [3, 2], to: [4, 2], kind: 'attack' },
          ]
        );
        break;

      case 'full_line_advance':
        setScene(
          'Full Line Advance: one major row advances together; blocked units hold.',
          [
            { side: 'blue', type: 'inf', c: 1, r: 2, mc: 2, mr: 2 },
            { side: 'blue', type: 'inf', c: 2, r: 2, mc: 3, mr: 2 },
            { side: 'blue', type: 'inf', c: 3, r: 2, mc: 4, mr: 2 },
            { side: 'blue', type: 'inf', c: 4, r: 2, mc: 5, mr: 2 },
          ],
          [
            { from: [1, 2], to: [2, 2], kind: 'move' },
            { from: [2, 2], to: [3, 2], kind: 'move' },
            { from: [3, 2], to: [4, 2], kind: 'move' },
            { from: [4, 2], to: [5, 2], kind: 'move' },
          ]
        );
        break;
      case 'grand_shield_wall':
        setScene(
          'Grand Shield Wall: a larger infantry mass locks in, trading mobility for heavy staying power.',
          [
            { side: 'blue', type: 'inf', c: 1, r: 2 },
            { side: 'blue', type: 'inf', c: 2, r: 2 },
            { side: 'blue', type: 'inf', c: 3, r: 2 },
            { side: 'blue', type: 'inf', c: 4, r: 2 },
            { side: 'blue', type: 'inf', c: 5, r: 2 },
            { side: 'red', type: 'cav', c: 6, r: 2 },
          ],
          [
            { from: [6, 2], to: [5, 2], kind: 'attack' },
            { from: [1, 2], to: [5, 2], kind: 'hold' },
          ],
          4,
          9
        );
        break;
      case 'all_out_cavalry_sweep':
        setScene(
          'All-Out Cavalry Sweep: a wing cavalry package surges for decisive flank shock.',
          [
            { side: 'blue', type: 'cav', c: 1, r: 3, mc: 4, mr: 2 },
            { side: 'blue', type: 'cav', c: 2, r: 3, mc: 5, mr: 1 },
            { side: 'red', type: 'inf', c: 5, r: 2 },
            { side: 'red', type: 'inf', c: 6, r: 1 },
          ],
          [
            { from: [1, 3], to: [4, 2], kind: 'move' },
            { from: [2, 3], to: [5, 1], kind: 'move' },
            { from: [4, 2], to: [5, 2], kind: 'attack' },
            { from: [5, 1], to: [6, 1], kind: 'attack' },
          ],
          5
        );
        break;
      case 'commit_reserves':
        setScene(
          'Commit Reserves: deep reserves push toward contact and receive a strong support package.',
          [
            { side: 'blue', type: 'inf', c: 1, r: 4, mc: 2, mr: 3 },
            { side: 'blue', type: 'inf', c: 2, r: 4, mc: 3, mr: 3 },
            { side: 'blue', type: 'skr', c: 3, r: 4, mc: 4, mr: 3 },
          ],
          [
            { from: [1, 4], to: [2, 3], kind: 'move' },
            { from: [2, 4], to: [3, 3], kind: 'move' },
            { from: [3, 4], to: [4, 3], kind: 'move' },
          ],
          5,
          9
        );
        break;
      case 'general_assault':
        setScene(
          'General Assault: units around a general execute one coordinated local strike package.',
          [
            { side: 'blue', type: 'gen', c: 2, r: 2 },
            { side: 'blue', type: 'inf', c: 3, r: 2 },
            { side: 'blue', type: 'inf', c: 4, r: 1 },
            { side: 'blue', type: 'cav', c: 4, r: 3 },
            { side: 'red', type: 'inf', c: 5, r: 2 },
          ],
          [
            { from: [2, 2], to: [3, 2], kind: 'command' },
            { from: [2, 2], to: [4, 1], kind: 'command' },
            { from: [2, 2], to: [4, 3], kind: 'command' },
            { from: [4, 1], to: [5, 2], kind: 'attack' },
          ],
          5,
          9
        );
        break;
      case 'collapse_center':
        setScene(
          'Collapse the Center: center yields while wings fold inward to create a trap shape.',
          [
            { side: 'blue', type: 'inf', c: 2, r: 2, mc: 2, mr: 3 },
            { side: 'blue', type: 'inf', c: 3, r: 2, mc: 3, mr: 3 },
            { side: 'blue', type: 'inf', c: 1, r: 2, mc: 2, mr: 2 },
            { side: 'blue', type: 'inf', c: 4, r: 2, mc: 3, mr: 2 },
          ],
          [
            { from: [2, 2], to: [2, 3], kind: 'move' },
            { from: [3, 2], to: [3, 3], kind: 'move' },
            { from: [1, 2], to: [2, 2], kind: 'move' },
            { from: [4, 2], to: [3, 2], kind: 'move' },
          ]
        );
        break;
      case 'last_push':
        setScene(
          'Last Push: selected attackers commit for maximum short-term striking power.',
          [
            { side: 'blue', type: 'inf', c: 2, r: 2 },
            { side: 'blue', type: 'cav', c: 3, r: 2 },
            { side: 'red', type: 'inf', c: 4, r: 2 },
            { side: 'red', type: 'inf', c: 4, r: 1 },
          ],
          [
            { from: [2, 2], to: [4, 2], kind: 'attack' },
            { from: [3, 2], to: [4, 1], kind: 'attack' },
          ]
        );
        break;
      case 'reforge_line':
        setScene(
          'Reforge the Line: connected infantry re-shape one hex each to rebuild structure.',
          [
            { side: 'blue', type: 'inf', c: 1, r: 2, mc: 2, mr: 2 },
            { side: 'blue', type: 'inf', c: 2, r: 2, mc: 2, mr: 1 },
            { side: 'blue', type: 'inf', c: 3, r: 2, mc: 4, mr: 2 },
            { side: 'blue', type: 'inf', c: 4, r: 2, mc: 5, mr: 2 },
          ],
          [
            { from: [1, 2], to: [2, 2], kind: 'move' },
            { from: [2, 2], to: [2, 1], kind: 'move' },
            { from: [3, 2], to: [4, 2], kind: 'move' },
            { from: [4, 2], to: [5, 2], kind: 'move' },
          ]
        );
        break;
      case 'command_surge':
        setScene(
          'Command Surge: one general temporarily expands command radius and snaps units back in-control.',
          [
            { side: 'blue', type: 'gen', c: 2, r: 2 },
            { side: 'blue', type: 'inf', c: 5, r: 1 },
            { side: 'blue', type: 'inf', c: 5, r: 3 },
            { side: 'blue', type: 'cav', c: 6, r: 2 },
          ],
          [
            { from: [2, 2], to: [5, 1], kind: 'command' },
            { from: [2, 2], to: [5, 3], kind: 'command' },
            { from: [2, 2], to: [6, 2], kind: 'command' },
          ],
          5,
          9
        );
        break;
      case 'stand_or_die':
        setScene(
          'Stand or Die: infantry around a general hold ground and ignore retreat pressure.',
          [
            { side: 'blue', type: 'gen', c: 2, r: 2 },
            { side: 'blue', type: 'inf', c: 3, r: 2 },
            { side: 'blue', type: 'inf', c: 3, r: 1 },
            { side: 'blue', type: 'inf', c: 3, r: 3 },
            { side: 'red', type: 'cav', c: 5, r: 2 },
          ],
          [
            { from: [5, 2], to: [3, 2], kind: 'attack' },
            { from: [2, 2], to: [3, 2], kind: 'hold' },
            { from: [2, 2], to: [3, 1], kind: 'hold' },
            { from: [2, 2], to: [3, 3], kind: 'hold' },
          ]
        );
        break;

      default:
        setScene(
          'Select directives that match your current battlefield geometry and timing.',
          [
            { side: 'blue', type: 'inf', c: 2, r: 2 },
            { side: 'blue', type: 'gen', c: 1, r: 2 },
            { side: 'red', type: 'inf', c: 5, r: 2 },
          ],
          [{ from: [2, 2], to: [5, 2], kind: 'attack' }]
        );
        break;
    }
    return s;
  }


    function drawDoctrinePreviewCanvas(timeSec = 0) {
    if (!elDoctrinePreviewCanvas) return;
    const pctx = elDoctrinePreviewCanvas.getContext('2d');
    if (!pctx) return;

    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const cssW = Math.max(320, Math.round(elDoctrinePreviewCanvas.clientWidth || 520));
    const cssH = Math.max(180, Math.round(elDoctrinePreviewCanvas.clientHeight || 180));
    const pxW = Math.max(2, Math.round(cssW * dpr));
    const pxH = Math.max(2, Math.round(cssH * dpr));
    if (elDoctrinePreviewCanvas.width !== pxW || elDoctrinePreviewCanvas.height !== pxH) {
      elDoctrinePreviewCanvas.width = pxW;
      elDoctrinePreviewCanvas.height = pxH;
    }
    pctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const cmd = COMMAND_BY_ID.get(state.doctrine.builder.focusCommandId || '');
    const scene = doctrinePreviewScene(cmd ? cmd.id : '');
    const w = cssW;
    const h = cssH;
    const readCoord = (v) => (Number.isFinite(v) ? Number(v) : null);
    const sceneCoords = [];
    const pushCoord = (c, r) => {
      if (!Number.isFinite(c) || !Number.isFinite(r)) return;
      sceneCoords.push({ c: Number(c), r: Number(r) });
    };

    for (const tok of (scene.tokens || [])) {
      if (!tok) continue;
      pushCoord(readCoord(tok.c), readCoord(tok.r));
      pushCoord(readCoord(tok.mc), readCoord(tok.mr));
      if (Array.isArray(tok.path)) {
        for (const step of tok.path) {
          if (!Array.isArray(step) || step.length < 2) continue;
          pushCoord(readCoord(step[0]), readCoord(step[1]));
        }
      }
    }
    for (const fx of (scene.arrows || [])) {
      if (!fx) continue;
      if (Array.isArray(fx.from) && fx.from.length >= 2) pushCoord(readCoord(fx.from[0]), readCoord(fx.from[1]));
      if (Array.isArray(fx.to) && fx.to.length >= 2) pushCoord(readCoord(fx.to[0]), readCoord(fx.to[1]));
    }
    for (const t of (scene.terrain || [])) {
      if (!t) continue;
      pushCoord(readCoord(t.c), readCoord(t.r));
    }
    if (!sceneCoords.length) {
      pushCoord(0, 0);
      pushCoord(7, 3);
    }

    let minC = Infinity;
    let maxC = -Infinity;
    let minR = Infinity;
    let maxR = -Infinity;
    for (const hPos of sceneCoords) {
      if (hPos.c < minC) minC = hPos.c;
      if (hPos.c > maxC) maxC = hPos.c;
      if (hPos.r < minR) minR = hPos.r;
      if (hPos.r > maxR) maxR = hPos.r;
    }

    // Expand bounds slightly so preview geometry has breathing room,
    // but keep units close enough to read movement and adjacency clearly.
    minC -= 1;
    maxC += 1;
    minR -= 1;
    maxR += 1;

    const colsSpan = Math.max(2, (maxC - minC) + 1);
    const rowsSpan = Math.max(2, (maxR - minR) + 1);

    const padX = Math.max(16, Math.round(w * 0.035));
    const padY = Math.max(12, Math.round(h * 0.05));
    const usableW = Math.max(140, w - (padX * 2));
    const usableH = Math.max(110, h - (padY * 2));

    const sqrt3 = Math.sqrt(3);
    const rFromW = usableW / ((sqrt3 * (colsSpan + 0.5)) + 2.0);
    const rFromH = usableH / (((rowsSpan - 1) * 1.5) + 2.1);
    const hexR = Math.max(13, Math.min(34, Math.floor(Math.min(rFromW, rFromH))));

    const stepX = sqrt3 * hexR;
    const stepY = 1.5 * hexR;
    const boardW = (sqrt3 * hexR * (colsSpan + 0.5)) + (hexR * 2);
    const boardH = (((rowsSpan - 1) * 1.5 * hexR) + (hexR * 2));
    const originX = Math.max(4, Math.round((w - boardW) * 0.5));
    const originY = Math.max(4, Math.round((h - boardH) * 0.5));

    const offsetToAxial = (c, r) => ({ q: c - ((r - (r & 1)) / 2), r });
    const axialToOffset = (q, r) => ({ c: q + ((r - (r & 1)) / 2), r });
    const axialToCube = (a) => ({ x: a.q, z: a.r, y: -a.q - a.r });
    const cubeToAxial = (c) => ({ q: c.x, r: c.z });
    const cubeRound = (c) => {
      let rx = Math.round(c.x);
      let ry = Math.round(c.y);
      let rz = Math.round(c.z);
      const xDiff = Math.abs(rx - c.x);
      const yDiff = Math.abs(ry - c.y);
      const zDiff = Math.abs(rz - c.z);
      if (xDiff > yDiff && xDiff > zDiff) rx = -ry - rz;
      else if (yDiff > zDiff) ry = -rx - rz;
      else rz = -rx - ry;
      return { x: rx, y: ry, z: rz };
    };
    const hexLineOffset = (c1, r1, c2, r2) => {
      const a = axialToCube(offsetToAxial(c1, r1));
      const b = axialToCube(offsetToAxial(c2, r2));
      const n = Math.max(1, Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y), Math.abs(a.z - b.z)));
      const out = [];
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        const c = cubeRound({
          x: a.x + ((b.x - a.x) * t),
          y: a.y + ((b.y - a.y) * t),
          z: a.z + ((b.z - a.z) * t),
        });
        const ax = cubeToAxial(c);
        const off = axialToOffset(ax.q, ax.r);
        if (!out.length || out[out.length - 1].c !== off.c || out[out.length - 1].r !== off.r) out.push(off);
      }
      return out;
    };

    const toXY = (c, r) => {
      const x = originX + hexR + ((c - minC) * stepX) + ((r & 1) ? (stepX * 0.5) : 0);
      const y = originY + hexR + ((r - minR) * stepY);
      return { x, y };
    };

    const buildHexPath = (x, y, r) => {
      const p = new Path2D();
      for (let i = 0; i < 6; i++) {
        const a = ((Math.PI / 180) * (60 * i - 30));
        const px = x + Math.cos(a) * r;
        const py = y + Math.sin(a) * r;
        if (i === 0) p.moveTo(px, py);
        else p.lineTo(px, py);
      }
      p.closePath();
      return p;
    };

    const drawRunnerGlyphPreview = (x, y, size) => {
      const halfW = size * 0.42;
      const gap = size * 0.19;
      const y0 = y - gap;
      pctx.save();
      pctx.strokeStyle = '#ffffff';
      pctx.lineWidth = Math.max(1.8, size * 0.12);
      pctx.lineCap = 'round';
      pctx.beginPath();
      pctx.moveTo(x - halfW, y0);
      pctx.lineTo(x + halfW, y0);
      pctx.moveTo(x - halfW, y0 + gap);
      pctx.lineTo(x + halfW, y0 + gap);
      pctx.moveTo(x - halfW, y0 + (gap * 2));
      pctx.lineTo(x + halfW, y0 + (gap * 2));
      pctx.stroke();
      pctx.restore();
    };

    const drawQualityRingPreview = (x, y, tokenR, quality) => {
      const ringR = tokenR;
      const ringW = Math.max(3, tokenR * 0.34);
      const frameW = Math.max(1.4, ringW * 0.40);
      const frameOffset = (ringW * 0.5) - (frameW * 0.5);

      pctx.beginPath();
      pctx.arc(x, y, ringR + frameOffset, 0, Math.PI * 2);
      pctx.lineWidth = frameW;
      pctx.strokeStyle = 'rgba(8, 10, 14, 0.95)';
      pctx.stroke();

      const qc = qualityRingColor(quality);
      pctx.beginPath();
      pctx.arc(x, y, ringR, 0, Math.PI * 2);
      pctx.lineWidth = ringW;
      pctx.strokeStyle = qc;
      pctx.shadowColor = qc;
      pctx.shadowBlur = Math.max(2, Math.round(tokenR * 0.18));
      pctx.stroke();
      pctx.shadowBlur = 0;

      pctx.beginPath();
      pctx.arc(x, y, ringR - frameOffset, 0, Math.PI * 2);
      pctx.lineWidth = frameW;
      pctx.strokeStyle = 'rgba(8, 10, 14, 0.95)';
      pctx.stroke();
    };

    const drawTokenPreview = (tok, pt) => {
      const side = tok.side === 'red' ? 'red' : 'blue';
      const c = unitColors(side);
      const tokenR = hexR * 0.55;
      const discR = tokenR * 0.92;
      const quality = tok.quality || 'regular';
      const hp = Number.isFinite(tok.hp) ? tok.hp : unitMaxHp(tok.type, quality);
      const hpMax = unitMaxHp(tok.type, quality);

      pctx.save();
      pctx.beginPath();
      pctx.arc(pt.x, pt.y, discR, 0, Math.PI * 2);
      pctx.fillStyle = c.fill;
      pctx.fill();
      pctx.lineWidth = Math.max(1.2, Math.round(hexR * 0.09));
      pctx.strokeStyle = 'rgba(8,10,14,0.95)';
      pctx.stroke();

      drawQualityRingPreview(pt.x, pt.y, tokenR, quality);

      const canIcon = (tok.type !== 'gen') && unitIconReady && unitIconReady(tok.type);
      if (tok.type === 'run') {
        drawRunnerGlyphPreview(pt.x, pt.y, hexR * 0.86);
      } else if (canIcon) {
        const img = UNIT_ICONS && UNIT_ICONS[tok.type];
        if (img) {
          const tune = (UNIT_ICON_TUNE && UNIT_ICON_TUNE[tok.type]) ? UNIT_ICON_TUNE[tok.type] : { scale: 0.95, y: 0 };
          const s = Math.floor((hexR * 0.98) * (tune.scale || 0.95));
          const yOff = Math.floor(hexR * (tune.y || 0));
          const rot = (typeof tune.rot === 'number') ? tune.rot : 0;
          if (rot) {
            pctx.save();
            pctx.translate(Math.floor(pt.x), Math.floor(pt.y + yOff));
            pctx.rotate(rot);
            pctx.drawImage(img, Math.floor(-s / 2), Math.floor(-s / 2), s, s);
            pctx.restore();
          } else {
            pctx.drawImage(img, Math.floor(pt.x - s / 2), Math.floor(pt.y - s / 2 + yOff), s, s);
          }
        }
      } else {
        const def = UNIT_BY_ID.get(tok.type);
        const symbol = def ? def.symbol : String(tok.type || '?').toUpperCase();
        pctx.font = '700 ' + Math.max(10, Math.floor(hexR * 0.58)) + 'px "Source Sans 3", sans-serif';
        pctx.textAlign = 'center';
        pctx.textBaseline = 'middle';
        pctx.fillStyle = c.text;
        pctx.fillText(symbol, pt.x, pt.y + 1);
      }

      const pipR = Math.max(1.8, Math.floor(hexR * 0.09));
      const startX = pt.x - (pipR * 2) * (hpMax - 1) * 0.5;
      const y = pt.y + (hexR * 0.82);
      for (let i = 0; i < hpMax; i++) {
        pctx.beginPath();
        pctx.arc(startX + (i * (pipR * 2)), y, pipR, 0, Math.PI * 2);
        pctx.fillStyle = (i < hp) ? '#fff' : 'rgba(255,255,255,0.28)';
        pctx.fill();
      }
      pctx.restore();
    };

    const easeInOut = (v) => {
      const t = Math.max(0, Math.min(1, v));
      return (t < 0.5) ? (2 * t * t) : (1 - (Math.pow(-2 * t + 2, 2) / 2));
    };

    const tokenEntries = (scene.tokens || []).map((tok, idx) => {
      let path = [];
      if (Array.isArray(tok.path) && tok.path.length > 0) {
        path = tok.path
          .filter((p) => Array.isArray(p) && p.length >= 2)
          .map((p) => ({ c: Number(p[0]), r: Number(p[1]) }))
          .filter((p) => Number.isFinite(p.c) && Number.isFinite(p.r));
      }
      if (!path.length && Number.isFinite(tok.c) && Number.isFinite(tok.r)) {
        path.push({ c: tok.c, r: tok.r });
      }
      if (Number.isFinite(tok.mc) && Number.isFinite(tok.mr) && path.length) {
        const last = path[path.length - 1];
        const line = hexLineOffset(last.c, last.r, tok.mc, tok.mr);
        for (let i = 1; i < line.length; i++) path.push(line[i]);
      }
      if (!path.length) path = [{ c: 0, r: 0 }];
      return {
        ...tok,
        __path: path,
        __phase: Number.isFinite(tok.phase) ? tok.phase : (idx * 0.17),
      };
    });

    const tokenPose = (entry, tSec) => {
      const pts = entry.__path.map((p) => toXY(p.c, p.r));
      if (pts.length <= 1) return pts[0];
      const segDur = Number.isFinite(entry.segDur) ? entry.segDur : 0.68;
      const holdDur = Number.isFinite(entry.holdDur) ? entry.holdDur : 0.22;
      const segs = pts.length - 1;
      const cycle = Math.max(0.1, segs * (segDur + holdDur));
      let t = (tSec + entry.__phase) % cycle;
      for (let i = 0; i < segs; i++) {
        if (t <= segDur) {
          const e = easeInOut(t / segDur);
          return {
            x: pts[i].x + ((pts[i + 1].x - pts[i].x) * e),
            y: pts[i].y + ((pts[i + 1].y - pts[i].y) * e),
          };
        }
        t -= segDur;
        if (t <= holdDur) return pts[i + 1];
        t -= holdDur;
      }
      return pts[pts.length - 1];
    };

    const pulse = (Math.sin(timeSec * 2.1) + 1) * 0.5;

    pctx.clearRect(0, 0, w, h);
    const grad = pctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, 'rgba(20,23,33,0.96)');
    grad.addColorStop(1, 'rgba(12,14,21,0.97)');
    pctx.fillStyle = grad;
    pctx.fillRect(0, 0, w, h);

    const boardCells = [];
    for (let r = minR; r <= maxR; r++) {
      for (let c = minC; c <= maxC; c++) {
        boardCells.push({ c, r });
      }
    }

    const terrainMap = new Map();
    for (const t of (scene.terrain || [])) {
      if (!t) continue;
      const key = String(t.c) + ',' + String(t.r);
      terrainMap.set(key, t.t || 'clear');
    }

    for (const cell of boardCells) {
      const p = toXY(cell.c, cell.r);
      const path = buildHexPath(p.x, p.y, hexR);
      pctx.fillStyle = '#d7d2bb';
      pctx.fill(path);
      const tt = terrainMap.get(cell.c + ',' + cell.r);
      if (tt === 'woods') {
        pctx.fillStyle = 'rgba(71, 142, 84, 0.24)';
        pctx.fill(path);
      } else if (tt === 'hills') {
        pctx.fillStyle = 'rgba(184, 137, 66, 0.24)';
        pctx.fill(path);
      } else if (tt === 'rough') {
        pctx.fillStyle = 'rgba(118, 95, 79, 0.22)';
        pctx.fill(path);
      } else if (tt === 'water') {
        pctx.fillStyle = 'rgba(52, 111, 187, 0.28)';
        pctx.fill(path);
      }
      pctx.strokeStyle = 'rgba(0,0,0,0.34)';
      pctx.lineWidth = 1.2;
      pctx.stroke(path);
    }

    for (const entry of tokenEntries) {
      if (!entry.__path || entry.__path.length <= 1) continue;
      pctx.save();
      pctx.strokeStyle = entry.side === 'red' ? 'rgba(255, 140, 140, 0.58)' : 'rgba(126, 203, 255, 0.58)';
      pctx.lineWidth = 1.8;
      pctx.setLineDash([4, 5]);
      pctx.beginPath();
      entry.__path.forEach((step, i) => {
        const pt = toXY(step.c, step.r);
        if (i === 0) pctx.moveTo(pt.x, pt.y);
        else pctx.lineTo(pt.x, pt.y);
      });
      pctx.stroke();
      pctx.setLineDash([]);
      pctx.restore();
    }

    const arrowColor = (kind) => {
      if (kind === 'attack') return 'rgba(232, 96, 96,' + (0.48 + (pulse * 0.38)).toFixed(3) + ')';
      if (kind === 'ranged') return 'rgba(245, 205, 110,' + (0.46 + (pulse * 0.35)).toFixed(3) + ')';
      if (kind === 'command') return 'rgba(184, 148, 255,' + (0.46 + (pulse * 0.35)).toFixed(3) + ')';
      if (kind === 'hold') return 'rgba(116, 218, 171,' + (0.46 + (pulse * 0.35)).toFixed(3) + ')';
      return 'rgba(126, 203, 255,' + (0.46 + (pulse * 0.35)).toFixed(3) + ')';
    };

    const drawEffect = (effect) => {
      if (!effect || !effect.from || !effect.to) return;
      if (effect.kind === 'move') return;
      const a = toXY(effect.from[0], effect.from[1]);
      const b = toXY(effect.to[0], effect.to[1]);
      const color = arrowColor(effect.kind);

      if (effect.from[0] === effect.to[0] && effect.from[1] === effect.to[1]) {
        pctx.save();
        pctx.strokeStyle = color;
        pctx.lineWidth = 2.3;
        pctx.beginPath();
        pctx.arc(a.x, a.y, Math.max(8, hexR * (0.58 + (pulse * 0.28))), 0, Math.PI * 2);
        pctx.stroke();
        pctx.restore();
        return;
      }

      pctx.save();
      pctx.strokeStyle = color;
      pctx.lineWidth = effect.kind === 'attack' ? 2.8 : 2.2;

      if (effect.kind === 'ranged') {
        const midX = (a.x + b.x) * 0.5;
        const arcLift = Math.max(hexR * 0.8, Math.abs(a.x - b.x) * 0.15);
        const midY = Math.min(a.y, b.y) - arcLift;
        pctx.setLineDash([7, 5]);
        pctx.beginPath();
        pctx.moveTo(a.x, a.y);
        pctx.quadraticCurveTo(midX, midY, b.x, b.y);
        pctx.stroke();
        pctx.setLineDash([]);
        const t = pulse;
        const u = 1 - t;
        const px = (u * u * a.x) + (2 * u * t * midX) + (t * t * b.x);
        const py = (u * u * a.y) + (2 * u * t * midY) + (t * t * b.y);
        pctx.beginPath();
        pctx.arc(px, py, Math.max(2.2, hexR * 0.15), 0, Math.PI * 2);
        pctx.fillStyle = color;
        pctx.fill();
      } else {
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const len = Math.max(1, Math.hypot(dx, dy));
        const ux = dx / len;
        const uy = dy / len;
        const sx = a.x + (ux * (hexR + 4));
        const sy = a.y + (uy * (hexR + 4));
        const ex = b.x - (ux * (hexR + 6));
        const ey = b.y - (uy * (hexR + 6));
        if (effect.kind === 'command' || effect.kind === 'hold') pctx.setLineDash([3, 4]);
        pctx.beginPath();
        pctx.moveTo(sx, sy);
        pctx.lineTo(ex, ey);
        pctx.stroke();
        pctx.setLineDash([]);
        const hx = ex - (ux * 8);
        const hy = ey - (uy * 8);
        pctx.beginPath();
        pctx.moveTo(ex, ey);
        pctx.lineTo(hx - (uy * 5), hy + (ux * 5));
        pctx.lineTo(hx + (uy * 5), hy - (ux * 5));
        pctx.closePath();
        pctx.fillStyle = color;
        pctx.fill();
      }

      pctx.restore();
    };

    for (const effect of (scene.arrows || [])) drawEffect(effect);

    for (const entry of tokenEntries) {
      const pos = tokenPose(entry, timeSec);
      drawTokenPreview(entry, pos);
    }

    if (elDoctrinePreviewTitle) {
      elDoctrinePreviewTitle.textContent = cmd
        ? `Previewing: ${cmd.name}`
        : 'Previewing: Select an order';
    }

    if (elDoctrinePreviewCaption) {
      const head = cmd
        ? (cmd.name + ': ' + commandLaymanText(cmd))
        : 'Select a directive to preview its movement and combat pattern.';
      const tail = scene.caption ? (' ' + scene.caption) : '';
      elDoctrinePreviewCaption.textContent = head + tail;
    }
  }

function stopDoctrinePreviewLoop() {
    if (doctrinePreviewRaf) {
      cancelAnimationFrame(doctrinePreviewRaf);
      doctrinePreviewRaf = 0;
    }
  }

  function startDoctrinePreviewLoop() {
    if (!elDoctrinePreviewCanvas) return;
    if (doctrinePreviewRaf) return;
    let lastTs = 0;
    const tick = (ts) => {
      if (!state.doctrine.builder.open || !elDoctrineOverlay?.classList.contains('open')) {
        stopDoctrinePreviewLoop();
        return;
      }
      if (!lastTs) lastTs = ts;
      const dt = Math.max(0, Math.min(64, ts - lastTs));
      lastTs = ts;
      doctrinePreviewTime += (dt / 1000);
      drawDoctrinePreviewCanvas(doctrinePreviewTime);
      doctrinePreviewRaf = requestAnimationFrame(tick);
    };
    doctrinePreviewRaf = requestAnimationFrame(tick);
  }

  function openDoctrineBuilder(side = null) {
    ensureDoctrineStateInitialized(false);
    ensureDoctrineConfirmState();
    if (!elDoctrineOverlay) return;
    const editSide = (side === 'red') ? 'red' : 'blue';
    state.doctrine.builder.open = true;
    state.doctrine.builder.side = editSide;
    state.doctrine.builder.draft.blue = cloneArray(doctrineStateForSide('blue')?.loadout || makeRecommendedDoctrineLoadout());
    state.doctrine.builder.draft.red = cloneArray(doctrineStateForSide('red')?.loadout || makeRecommendedDoctrineLoadout());
    const seed = state.doctrine.builder.draft[editSide] || [];
    state.doctrine.builder.focusCommandId = (Array.isArray(seed) && seed.length) ? seed[0] : '';
    if (state.mode === 'play') {
      const legalSeed = (Array.isArray(seed) ? seed : []).filter((id) => !!COMMAND_BY_ID.get(id));
      if (legalSeed.length) state.doctrine.builder.focusCommandId = legalSeed[0];
    }
    if (elDoctrineSideSel) elDoctrineSideSel.value = editSide;
    renderDoctrineBuilder();
    elDoctrineOverlay.classList.add('open');
    elDoctrineOverlay.setAttribute('aria-hidden', 'false');
    if (elCloseDoctrineBtn) elCloseDoctrineBtn.textContent = 'Minimize';
    startDoctrinePreviewLoop();
    maybeCompleteTutorialTaskOnDoctrineOpen();
  }

  function closeDoctrineBuilder() {
    if (!elDoctrineOverlay) return;
    state.doctrine.builder.open = false;
    elDoctrineOverlay.classList.remove('open');
    elDoctrineOverlay.setAttribute('aria-hidden', 'true');
    stopDoctrinePreviewLoop();
    if (state.mode === 'edit') {
      state.doctrine.builder.preBattleReady = doctrineBothSidesConfirmed();
      if (!state.doctrine.builder.preBattleReady) {
        log('War Council minimized. Confirm both sides at 3/3/3 before starting battle.');
      }
    }
  }

  function currentDoctrineBuilderDraft(side) {
    if (side !== 'blue' && side !== 'red') return [];
    return cloneArray(state.doctrine.builder.draft[side] || []);
  }

  function setDoctrineBuilderDraft(side, ids) {
    if (side !== 'blue' && side !== 'red') return;
    state.doctrine.builder.draft[side] = cloneArray(ids);
    ensureDoctrineConfirmState();
    state.doctrine.builder.confirmed[side] = false;
  }

  function renderDoctrineTierState(colEl, titleEl, cost, count) {
    if (titleEl) titleEl.textContent = `Cost ${cost} (${count}/${COMMANDS_PER_COST})`;
    if (!colEl) return;
    const complete = count === COMMANDS_PER_COST;
    colEl.classList.toggle('is-complete', complete);
    colEl.classList.toggle('is-incomplete', !complete);
  }

  function renderDoctrineBuilderList(el, side, cost, readOnly = false) {
    if (!el) return;
    const draft = new Set(currentDoctrineBuilderDraft(side));
    const selectedOnly = !!readOnly;
    const cmds = COMMAND_POOL
      .filter((c) => c.cost === cost && (!selectedOnly || draft.has(c.id)))
      .sort((a, b) => {
        if (a.persistence !== b.persistence) return (a.persistence === 'spent') ? 1 : -1;
        return a.name.localeCompare(b.name);
      });

    el.classList.toggle('doctrineBuilderListReadOnly', selectedOnly);

    const renderRows = (rows) => rows.map((cmd) => {
      const checked = draft.has(cmd.id) ? 'checked' : '';
      const activeCls = (state.doctrine.builder.focusCommandId === cmd.id) ? ' doctrinePickActive' : '';
      if (selectedOnly) {
        return `<div class="doctrinePick doctrinePickLocked${activeCls}" data-doctrine-item="1" data-doctrine-id="${cmd.id}">
          <span class="doctrinePickLockDot" aria-hidden="true">●</span>
          <span>
            <span class="doctrinePickName">${cmd.name}</span>
            <span class="doctrinePickMeta">Cost ${cmd.cost} · ${commandUsageLabel(cmd.persistence)}</span>
            <span class="doctrinePickExplain">${commandDictionaryText(cmd)}</span>
          </span>
        </div>`;
      }
      return `<label class="doctrinePick${activeCls}" data-doctrine-item="1" data-doctrine-id="${cmd.id}">
        <input type="checkbox" data-doctrine-id="${cmd.id}" data-cost="${cost}" ${checked}>
        <span>
          <span class="doctrinePickName">${cmd.name}</span>
          <span class="doctrinePickMeta">Cost ${cmd.cost} · ${commandUsageLabel(cmd.persistence)}</span>
          <span class="doctrinePickExplain">${commandDictionaryText(cmd)}</span>
        </span>
      </label>`;
    }).join('');

    const reusable = cmds.filter(c => c.persistence !== 'spent');
    const singleUse = cmds.filter(c => c.persistence === 'spent');
    const html = `${reusable.length ? `<div class="doctrinePickGroup">Reusable Orders</div>${renderRows(reusable)}` : ''}${singleUse.length ? `<div class="doctrinePickGroup">Single-Use Orders</div>${renderRows(singleUse)}` : ''}`;
    el.innerHTML = html || '<div class="note">No orders in this cost tier.</div>';
  }

  function renderDoctrineBuilderFocusOnly() {
    const focusId = state.doctrine.builder.focusCommandId || '';
    for (const el of [elDoctrineCost1List, elDoctrineCost2List, elDoctrineCost3List]) {
      if (!el) continue;
      for (const node of el.querySelectorAll('[data-doctrine-item][data-doctrine-id]')) {
        const id = node.getAttribute('data-doctrine-id') || '';
        node.classList.toggle('doctrinePickActive', id === focusId);
      }
    }
    if (!elDoctrineExplain) return;
    const cmd = COMMAND_BY_ID.get(focusId);
    if (!cmd) {
      elDoctrineExplain.textContent = 'Select an order to view its full effect and targeting.';
      drawDoctrinePreviewCanvas(doctrinePreviewTime);
      return;
    }
    const targetTxt = cmd.targeting ? `Targeting: ${cmd.targeting}.` : 'Targeting: See order conditions.';
    elDoctrineExplain.innerHTML =
      `<div class="doctrineExplainTitle">${cmd.name} · Cost ${cmd.cost} · ${commandUsageLabel(cmd.persistence)}</div>` +
      `<div>${commandDictionaryText(cmd)}</div>` +
      `<div>Rules effect: ${commandExplainText(cmd)}</div>` +
      `<div class="doctrineExplainTarget">${targetTxt}</div>`;
    drawDoctrinePreviewCanvas(doctrinePreviewTime);
  }

  function renderDoctrineBuilder() {
    const side = (state.doctrine.builder.side === 'red') ? 'red' : 'blue';
    const readOnly = (state.mode === 'play');
    const all = COMMAND_POOL;
    if (!state.doctrine.builder.focusCommandId || !COMMAND_BY_ID.get(state.doctrine.builder.focusCommandId)) {
      state.doctrine.builder.focusCommandId = all.length ? all[0].id : '';
    }
    renderDoctrineBuilderList(elDoctrineCost1List, side, 1, readOnly);
    renderDoctrineBuilderList(elDoctrineCost2List, side, 2, readOnly);
    renderDoctrineBuilderList(elDoctrineCost3List, side, 3, readOnly);
    const draft = currentDoctrineBuilderDraft(side);
    const count1 = draft.filter(id => COMMAND_BY_ID.get(id)?.cost === 1).length;
    const count2 = draft.filter(id => COMMAND_BY_ID.get(id)?.cost === 2).length;
    const count3 = draft.filter(id => COMMAND_BY_ID.get(id)?.cost === 3).length;
    const tierValid = (count1 === COMMANDS_PER_COST) && (count2 === COMMANDS_PER_COST) && (count3 === COMMANDS_PER_COST);
    renderDoctrineTierState(elDoctrineCost1Col, elDoctrineCost1Title, 1, count1);
    renderDoctrineTierState(elDoctrineCost2Col, elDoctrineCost2Title, 2, count2);
    renderDoctrineTierState(elDoctrineCost3Col, elDoctrineCost3Title, 3, count3);
    ensureDoctrineConfirmState();
    const blueOk = !!state.doctrine.builder.confirmed.blue;
    const redOk = !!state.doctrine.builder.confirmed.red;
    if (elDoctrineBuilderCounts) {
      if (readOnly) {
        elDoctrineBuilderCounts.textContent = `${side.toUpperCase()} doctrine loaded · Cost 1: ${count1}/3 · Cost 2: ${count2}/3 · Cost 3: ${count3}/3`;
      } else {
        elDoctrineBuilderCounts.textContent =
          `${side.toUpperCase()} picks: cost1 ${count1}/3 · cost2 ${count2}/3 · cost3 ${count3}/3 · ` +
          `Pick exactly 3 in each cost tier. Confirmed: Blue ${blueOk ? 'yes' : 'no'} · Red ${redOk ? 'yes' : 'no'}.`;
      }
    }
    if (elDoctrineOverlay) {
      elDoctrineOverlay.classList.toggle('play-lock', readOnly);
    }
    if (elDoctrineSideSel) elDoctrineSideSel.disabled = readOnly;
    if (elDoctrineRandomizeBtn) elDoctrineRandomizeBtn.disabled = readOnly;
    if (elDoctrineRecommendBtn) elDoctrineRecommendBtn.disabled = readOnly;
    if (elDoctrineBlankizeBtn) elDoctrineBlankizeBtn.disabled = readOnly;
    if (elDoctrineScenarioApplyBtn) elDoctrineScenarioApplyBtn.disabled = readOnly;
    if (elDoctrineConfirmBtn) {
      // Keep this clickable in Setup mode so users always get explicit feedback
      // about what is missing, instead of a dead-looking button.
      elDoctrineConfirmBtn.disabled = readOnly;
      elDoctrineConfirmBtn.textContent = readOnly
        ? 'Doctrine Locked In Play'
        : (tierValid ? 'Confirm Doctrine' : 'Confirm Doctrine (Need 3/3/3)');
    }
    renderDoctrineBuilderFocusOnly();
  }

  function doctrineBuilderToggle(side, commandId, checked) {
    const cmd = COMMAND_BY_ID.get(commandId);
    if (!cmd) return;
    state.doctrine.builder.focusCommandId = commandId;
    const draft = currentDoctrineBuilderDraft(side);
    const draftSet = new Set(draft);
    const costCount = draft.filter(id => COMMAND_BY_ID.get(id)?.cost === cmd.cost).length;
    if (checked) {
      if (costCount >= COMMANDS_PER_COST) {
        log(`Cost ${cmd.cost} is full. Uncheck one order in that column, then pick a different one.`);
        return;
      }
      draftSet.add(commandId);
    } else {
      draftSet.delete(commandId);
    }
    setDoctrineBuilderDraft(side, [...draftSet]);
    renderDoctrineBuilder();
  }

  function applyDoctrineFromBuilder(side) {
    ensureDoctrineConfirmState();
    const draft = currentDoctrineBuilderDraft(side);
    const c1 = draft.filter(id => COMMAND_BY_ID.get(id)?.cost === 1).length;
    const c2 = draft.filter(id => COMMAND_BY_ID.get(id)?.cost === 2).length;
    const c3 = draft.filter(id => COMMAND_BY_ID.get(id)?.cost === 3).length;
    const tierValid = (c1 === COMMANDS_PER_COST) && (c2 === COMMANDS_PER_COST) && (c3 === COMMANDS_PER_COST);
    if (!tierValid) {
      const msg =
        `${side.toUpperCase()} doctrine incomplete: ` +
        `Cost 1 ${c1}/${COMMANDS_PER_COST}, ` +
        `Cost 2 ${c2}/${COMMANDS_PER_COST}, ` +
        `Cost 3 ${c3}/${COMMANDS_PER_COST}.`;
      if (elDoctrineBuilderCounts) {
        elDoctrineBuilderCounts.textContent = `${msg} Pick exactly 3 per cost tier.`;
      }
      log(msg);
      updateHud();
      return false;
    }
    if (!validateDoctrineLoadout(draft)) {
      if (elDoctrineBuilderCounts) {
        elDoctrineBuilderCounts.textContent = `${side.toUpperCase()} doctrine invalid: choose exactly 3 commands at each cost tier.`;
      }
      log(`${side.toUpperCase()} doctrine invalid: must pick exactly 3 commands at each cost.`);
      updateHud();
      return false;
    }
    setDoctrineLoadoutForSide(side, draft, 'manual', { strict: true });
    state.doctrine.builder.confirmed[side] = true;
    log(`${side.toUpperCase()} doctrine confirmed (${draft.length} commands: 3/3/3).`);
    updateHud();
    return true;
  }

  function updateHud() {
    const blue = totals('blue');
    const red = totals('red');
    document.body.dataset.mode = state.mode;
    document.body.dataset.combat = state.combatBusy ? 'on' : 'off';
    applyTutorialLayoutState();

    elHudTitle.textContent = GAME_NAME;
    ensureDoctrineStateInitialized(false);

    const hideOpponentDuringFog = state.draft.active && state.draft.mode === 'fog' && !state.draft.reveal;
    const modeLabel = (state.mode === 'play') ? 'Play Mode' : 'Setup Mode';
    const sideLabel = (state.side === 'blue') ? 'Blue' : 'Red';
    const aiSide = aiControlledSide();
    const humanSideLabel = state.humanSide === 'red' ? 'Red' : 'Blue';
    const aiSideLabel = aiSide ? aiSide.toUpperCase() : '-';
    const aiMeta = (state.gameMode === 'hvai')
      ? ` • Human ${humanSideLabel} vs ${aiSideLabel} AI (${aiDifficultyLabel(state.aiDifficulty)})`
      : '';
    const modeMeta =
      state.gameMode === 'online' ? ' • Online mode' :
      aiMeta;
    const headerMeta = [];
    if (state.gameOver && state.winner) {
      headerMeta.push(`${state.winner.toUpperCase()} wins`);
    }
    if (state.draft.active) {
      headerMeta.push('Draft Setup');
      headerMeta.push(`${state.draft.side.toUpperCase()} placing`);
      if (hideOpponentDuringFog) {
        headerMeta.push(`${state.draft.side.toUpperCase()} UP left ${state.draft.remaining[state.draft.side]}`);
      } else {
        headerMeta.push(`UP left B ${state.draft.remaining.blue} / R ${state.draft.remaining.red}`);
      }
    } else if (state.mode === 'play') {
      headerMeta.push(`Turn ${state.turn}`);
      headerMeta.push(`${sideLabel} to act`);
      headerMeta.push(`Actions ${state.actsUsed}/${ACT_LIMIT}`);
      if (state.doctrine.commandIssuedThisTurn && state.doctrine.activeCommandThisTurn) {
        const cmd = COMMAND_BY_ID.get(state.doctrine.activeCommandThisTurn);
        if (cmd) headerMeta.push(`Directive ${cmd.name} (-${commandActionSpend(cmd)})`);
      }
    } else {
      headerMeta.push('Battle Setup');
    }
    if (state.aiBusy) headerMeta.push('AI thinking...');
    if (state.combatBusy) headerMeta.push('Resolving combat...');
    elHudMeta.textContent = headerMeta.join('  ·  ');

    const statusLines = [
      `Mode: ${modeLabel}${modeMeta}`,
      `Turn ${state.turn}: ${sideLabel} • Actions ${state.actsUsed}/${ACT_LIMIT}`,
      hideOpponentDuringFog
        ? `Forces: hidden during fog setup`
        : `Forces: Blue ${blue.up} UP / ${blue.hp} HP • Red ${red.up} UP / ${red.hp} HP`,
      `Captured UP: Blue ${state.capturedUP.blue} • Red ${state.capturedUP.red}`,
      `Victory goal: ${victoryModeLabel(state.victoryMode)}`,
    ];
    if (state.loadedScenarioMeta?.description) {
      const hist = state.loadedScenarioMeta.historical ? ` (${state.loadedScenarioMeta.historical})` : '';
      statusLines.push(`Scenario: ${compactLabel(state.loadedScenarioName || '')}${hist}`);
      statusLines.push(`Brief: ${state.loadedScenarioMeta.description}`);
    }
    if (state.enemyDirectiveNotice?.text) {
      const noticeAge = state.turnSerial - Number(state.enemyDirectiveNotice.atSerial || 0);
      if (noticeAge <= 2) {
        statusLines.push(`Alert: ${state.enemyDirectiveNotice.text}`);
      } else {
        state.enemyDirectiveNotice = null;
      }
    }
    if (state.gameMode === 'online') {
      statusLines.push(
        `Online seats: Host ${state.online.seats.host.toUpperCase()} • Guest ${state.online.seats.guest.toUpperCase()}`
      );
      statusLines.push(`Guest call: ${state.online.guestParityPick.toUpperCase()}`);
      if (Number.isFinite(state.online.lastInitiativeRoll)) {
        statusLines.push(
          `Initiative: d6=${state.online.lastInitiativeRoll} • First side ${String(state.online.lastInitiativeFirstSide || '-').toUpperCase()}`
        );
      }
    }
    const objState = evaluateObjectiveControl();
    if (objState.zones > 0) {
      statusLines.push(objectiveSummaryText(objState));
      if (state.victoryMode === 'keyground') {
        statusLines.push(`Checkpoint: key ground can decide from turn ${state.objectiveCheckpointTurn}.`);
      }
    }
    if (state.victoryMode === 'points') {
      const ptDefault = Math.ceil(Math.max(state.initialUP.blue, state.initialUP.red) * POINT_VICTORY_CAPTURE_RATIO);
      const pt = Math.max(1, Number(state.loadedScenarioMeta?.pointTarget || ptDefault));
      statusLines.push(`Point target: first side to ${pt} captured UP.`);
    }
    if (state.lastImport && state.lastImport.source) {
      statusLines.push(`Loaded save: ${compactLabel(state.lastImport.source)} at ${formatClock(state.lastImport.at)}`);
    }
    if (state.aiBusy) statusLines.push('AI is choosing actions...');
    if (state.combatBusy) statusLines.push('Combat resolving: dice rolling...');
    if (state.draft.active) {
      if (hideOpponentDuringFog) {
        statusLines.push(
          `Draft: ${draftModeLabel(state.draft.mode)} • ${state.draft.side.toUpperCase()} placing • ` +
          `${state.draft.side.toUpperCase()} UP left ${state.draft.remaining[state.draft.side]}`
        );
      } else {
        statusLines.push(
          `Draft: ${draftModeLabel(state.draft.mode)} • ${state.draft.side.toUpperCase()} placing • ` +
          `UP B ${state.draft.remaining.blue} / R ${state.draft.remaining.red}`
        );
      }
    }
    if (state.mode === 'play') {
      if (state.doctrine.commandIssuedThisTurn) {
        if (state.doctrine.activeCommandThisTurn) {
          const cmd = COMMAND_BY_ID.get(state.doctrine.activeCommandThisTurn);
          if (cmd) {
            const spend = commandActionSpend(cmd);
            statusLines.push(
              `Directive used: ${cmd.name} (${commandUsageLabel(cmd.persistence)}) • ` +
              `spent ${spend} action${spend === 1 ? '' : 's'} this turn.`
            );
          } else {
            statusLines.push(`Directive used: ${state.doctrine.activeCommandThisTurn}.`);
          }
        } else {
          statusLines.push('Directive: intentionally skipped this turn.');
        }
      } else {
        statusLines.push('Directive: optional once per turn. You may issue one any time before actions run out.');
      }
    }
    statusLines.push(`Build ${BUILD_ID}`);
    if (elStatusMeta) {
      elStatusMeta.textContent = statusLines.join('\n');
    }
    if (elStatusLast) {
      elStatusLast.textContent = state.last || '-';
    }

    if (elCombatForces) {
      elCombatForces.textContent = `Forces: Blue ${blue.up} UP / ${blue.hp} HP • Red ${red.up} UP / ${red.hp} HP`;
    }

    elModeBtn.textContent = state.mode === 'edit' ? 'Start Battle' : 'Back to Setup';
    if (elGameModeSel) {
      elGameModeSel.value = state.gameMode;
      elGameModeSel.disabled = (state.mode === 'play' && state.aiBusy) || (onlineModeActive() && net.connected);
    }
    const onlineMode = onlineModeActive();
    const combatRail = document.getElementById('combatRail');
    if (combatRail) {
      combatRail.classList.toggle('no-online', !onlineMode);
    }
    const guestOnlineLock = onlineMode && net.connected && !net.isHost;
    const ordersUnlocked = (
      state.mode === 'edit' &&
      !state.draft.active &&
      (state.gameMode !== 'online' || (net.connected && !!net.peer))
    );
    if (!ordersUnlocked && state.doctrine.builder.open) {
      closeDoctrineBuilder();
    }
    if (elOrdersPanel) {
      elOrdersPanel.style.display = ordersUnlocked ? '' : 'none';
    }
    if (elOrdersReadyNote) {
      elOrdersReadyNote.textContent = ordersUnlocked
        ? 'Players ready. Build your 3/3/3 orders before starting the battle.'
        : (state.gameMode === 'online'
          ? 'Waiting for both commanders to connect. Orders unlock once the room is connected.'
          : 'Choose game mode and scenario. Orders unlock in setup mode.');
    }
    const aiMode = (state.gameMode === 'hvai');
    if (elAiDifficultyRow) {
      elAiDifficultyRow.style.display = aiMode ? '' : 'none';
      elAiDifficultyRow.style.opacity = '1';
    }
    if (elAiDifficultySel) {
      elAiDifficultySel.value = normalizeAiDifficulty(state.aiDifficulty);
      elAiDifficultySel.disabled = state.aiBusy || guestOnlineLock;
    }
    if (elHumanSideRow) {
      elHumanSideRow.style.display = aiMode ? '' : 'none';
      elHumanSideRow.style.opacity = '1';
    }
    if (elHumanSideSel) {
      elHumanSideSel.value = (state.humanSide === 'red') ? 'red' : 'blue';
      elHumanSideSel.disabled = state.aiBusy || guestOnlineLock;
    }
    const shownCode = normalizeOnlineCode(net.isHost ? net.myCode : net.remoteCode);
    elModeBtn.disabled = guestOnlineLock;
    if (elOnlineMyCode) {
      elOnlineMyCode.textContent = shownCode || '----';
      elOnlineMyCode.classList.toggle('empty', !shownCode);
    }
    if (elOnlineStatus) elOnlineStatus.textContent = net.status;
    if (elOnlineHostBtn) setActive(elOnlineHostBtn, onlineMode && !!net.peer && net.isHost);
    if (elOnlineJoinBtn) setActive(elOnlineJoinBtn, onlineMode && !!net.peer && !net.isHost);
    const hostDisabled = (net.connected && net.isHost) || (net.peer && !net.isHost);
    const joinDisabled = (net.connected && !net.isHost) || (net.peer && net.isHost);
    const leaveDisabled = (!net.peer && !net.connected);
    const normalizedJoinCode = normalizeOnlineCode(elOnlineJoinCode?.value || '');
    if (elOnlineJoinCode) {
      elOnlineJoinCode.disabled = joinDisabled;
      if (elOnlineJoinCode.value !== normalizedJoinCode) elOnlineJoinCode.value = normalizedJoinCode;
    }
    if (elOnlineHostBtn) elOnlineHostBtn.disabled = hostDisabled;
    if (elOnlineJoinBtn) elOnlineJoinBtn.disabled = joinDisabled;
    if (elOnlineLeaveBtn) elOnlineLeaveBtn.disabled = leaveDisabled;
    if (elOnlineGuestSideSel) {
      elOnlineGuestSideSel.value = state.online.guestPreferredSide;
      const guestCanEdit = onlineMode && (!net.connected || !net.isHost);
      elOnlineGuestSideSel.disabled = !guestCanEdit;
    }
    if (elOnlineInitiativeSel) {
      elOnlineInitiativeSel.value = state.online.guestParityPick;
      const guestCanEdit = onlineMode && (!net.connected || !net.isHost);
      elOnlineInitiativeSel.disabled = !guestCanEdit;
    }
    if (state.loadedScenarioName) {
      updateScenarioSidesLegend(state.loadedScenarioName);
    } else {
      updateScenarioSidesLegend(elScenarioSel?.value || '');
    }
    if (elForwardAxisSel) {
      elForwardAxisSel.value = normalizeForwardAxis(state.forwardAxis);
      elForwardAxisSel.disabled = (state.mode === 'play' && state.aiBusy) || (onlineMode && net.connected);
    }
    if (state.draft.active) {
      elToolTerrain.disabled = true;
      if (state.tool === 'terrain') state.tool = 'units';
    } else {
      elToolTerrain.disabled = guestOnlineLock;
    }
    setActive(elToolUnits, state.tool === 'units');
    setActive(elToolTerrain, state.tool === 'terrain');
    if (elToolUnits) elToolUnits.disabled = guestOnlineLock;

    if (state.draft.active) {
      elSideBlue.disabled = true;
      elSideRed.disabled = true;
      state.editSide = state.draft.side;
    } else {
      elSideBlue.disabled = guestOnlineLock;
      elSideRed.disabled = guestOnlineLock;
    }
    setActive(elSideBlue, state.editSide === 'blue');
    setActive(elSideRed, state.editSide === 'red');

    // Type buttons
    for (const b of elTypeBtns.querySelectorAll('button[data-type]')) {
      setActive(b, state.editType === b.dataset.type);
      b.disabled = guestOnlineLock;
    }
    setActive(elEraseBtn, state.editErase);
    if (elEraseBtn) elEraseBtn.disabled = guestOnlineLock;

    // Quality buttons
    const qualityLockedType = (state.editType === 'iat');
    const effectiveEditQuality = qualityLockedType ? 'regular' : state.editQuality;
    setActive(elQualityGreen, effectiveEditQuality === 'green');
    setActive(elQualityRegular, effectiveEditQuality === 'regular');
    setActive(elQualityVeteran, effectiveEditQuality === 'veteran');
    elQualityGreen.disabled = qualityLockedType || guestOnlineLock;
    elQualityRegular.disabled = qualityLockedType || guestOnlineLock;
    elQualityVeteran.disabled = qualityLockedType || guestOnlineLock;

    // Terrain buttons
    for (const b of elTerrainBtns.querySelectorAll('button[data-terrain]')) {
      setActive(b, state.editTerrain === b.dataset.terrain);
      b.disabled = state.draft.active || guestOnlineLock;
    }

    if (elDraftModeSel) {
      elDraftModeSel.value = state.draft.active ? state.draft.mode : normalizeDraftMode(elDraftModeSel.value);
      elDraftModeSel.disabled = state.draft.active || guestOnlineLock;
    }
    if (elDraftBudgetInput) {
      elDraftBudgetInput.value = String(parseDraftBudget(state.draft.active ? state.draft.budget : elDraftBudgetInput.value));
      elDraftBudgetInput.disabled = state.draft.active || guestOnlineLock;
    }
    if (elStartDraftBtn) {
      elStartDraftBtn.disabled = state.mode !== 'edit' || state.draft.active || guestOnlineLock;
    }
    if (elDraftDoneBtn) {
      elDraftDoneBtn.disabled = !state.draft.active || guestOnlineLock;
    }
    if (guestOnlineLock) {
      if (elScenarioSel) elScenarioSel.disabled = true;
      if (elScenarioGroupSel) elScenarioGroupSel.disabled = true;
      if (elScenarioLessonSel) elScenarioLessonSel.disabled = true;
      if (elScenarioSizeSel) elScenarioSizeSel.disabled = true;
      if (elScenarioTerrainSel) elScenarioTerrainSel.disabled = true;
      if (elLoadScenarioBtn) elLoadScenarioBtn.disabled = true;
      if (elClearUnitsBtn) elClearUnitsBtn.disabled = true;
      if (elExportStateBtn) elExportStateBtn.disabled = true;
      if (elImportStateBtn) elImportStateBtn.disabled = true;
    }

    if (guestOnlineLock && state.tool === 'terrain') {
      state.tool = 'units';
    }
    updateDraftStatusUi();

    elEndTurnBtn.disabled = (state.mode !== 'play') || state.gameOver || isAiTurnActive();
    if (elLineAdvanceBtn) {
      elLineAdvanceBtn.disabled = !canIssueLineAdvance();
    }
    if (elLineAdvanceDirSel) {
      const ctx = getLineAdvanceContext(state.selectedKey);
      const dirs = ctx?.dirs?.length ? ctx.dirs.slice() : ['ur', 'ul', 'dr', 'dl'];
      const current = normalizeLineAdvanceDirection(ctx?.activeDir || state.lineAdvanceDirection);
      const have = new Set([...elLineAdvanceDirSel.options].map((o) => String(o.value || '').toLowerCase()));
      const needsRebuild = (elLineAdvanceDirSel.options.length !== dirs.length) || dirs.some((d) => !have.has(d));
      if (needsRebuild) {
        elLineAdvanceDirSel.innerHTML = '';
        for (const d of dirs) {
          const opt = document.createElement('option');
          opt.value = d;
          opt.textContent = hexDirectionLabel(d);
          elLineAdvanceDirSel.appendChild(opt);
        }
      }
      if (!dirs.includes(current)) {
        state.lineAdvanceDirection = dirs[0];
      } else {
        state.lineAdvanceDirection = current;
      }
      elLineAdvanceDirSel.value = state.lineAdvanceDirection;
      elLineAdvanceDirSel.disabled =
        state.mode !== 'play' ||
        state.gameOver ||
        isAiTurnActive() ||
        !state.selectedKey ||
        !ctx;
    }

    const canIssueCommandNow =
      (state.mode === 'play') &&
      !state.gameOver &&
      !isAiTurnActive() &&
      !state.doctrine.commandIssuedThisTurn &&
      state.actsUsed < ACT_LIMIT;

    if (elCommandSel) {
      if (state.mode === 'play') populateTurnCommandSelect();
      elCommandSel.disabled = !canIssueCommandNow || state.doctrine.targeting.active;
    }
    if (elCommandUseBtn) {
      const selectedCommandId = elCommandSel?.value || '';
      const targetingActiveForCurrent =
        state.doctrine.targeting.active &&
        state.doctrine.targeting.commandId === selectedCommandId;
      elCommandUseBtn.disabled = !canIssueCommandNow || !selectedCommandId;
      elCommandUseBtn.textContent = targetingActiveForCurrent ? 'Confirm Directive' : 'Use Directive';
    }
    if (elCommandSkipBtn) {
      elCommandSkipBtn.disabled = !canIssueCommandNow;
    }
    if (elDoctrineOpenTurnBtn) {
      elDoctrineOpenTurnBtn.disabled = false;
      const prefix = 'Open War Council';
      elDoctrineOpenTurnBtn.textContent = (state.mode === 'edit')
        ? prefix
        : `${prefix} (3/3/3)`;
    }
    if (elOpenOrdersKeyBtn) {
      const keySide = (state.side === 'red') ? 'red' : 'blue';
      const hasDoctrine = (doctrineStateForSide(keySide)?.loadout?.length || 0) > 0;
      elOpenOrdersKeyBtn.disabled = !hasDoctrine;
    }
    if (elCommandPhaseNote) {
      if (state.doctrine.targeting.active) {
        const cmd = COMMAND_BY_ID.get(state.doctrine.targeting.commandId);
        const picked = (state.doctrine.targeting.selectedUnitIds || []).length;
        const eligible = (state.doctrine.targeting.eligibleUnitIds || []).length;
        const limits = doctrineTargetLimits(state.doctrine.targeting.commandId);
        const rangeTxt = Number.isFinite(limits.max)
          ? `${limits.min}-${limits.max}`
          : `${limits.min}+`;
        elCommandPhaseNote.textContent =
          `Targeting ${cmd?.name || 'directive'}: ${picked} selected of ${eligible} eligible ` +
          `(pick ${rangeTxt}). Rule: ${cmd?.targeting || 'see command text'}. ` +
          'Hover eligible units to preview paths, click to toggle selection, then Confirm Directive.';
      } else {
        elCommandPhaseNote.textContent = state.doctrine.commandIssuedThisTurn
        ? (state.doctrine.activeCommandThisTurn
          ? `Directive committed: ${commandLabel(state.doctrine.activeCommandThisTurn)}`
          : 'Directive skipped for this turn.')
        : (state.actsUsed >= ACT_LIMIT
          ? 'No actions left this turn.'
          : 'Optional: issue one directive any time this turn, or continue moving units.');
      }
    }

    if (elDoctrineSummary) {
      const blueCount = doctrineStateForSide('blue')?.loadout?.length || 0;
      const redCount = doctrineStateForSide('red')?.loadout?.length || 0;
      elDoctrineSummary.textContent = `Doctrine loaded · Blue ${blueCount}/9 · Red ${redCount}/9.`;
    }
    if (elDoctrineOpenBtn) elDoctrineOpenBtn.disabled = !ordersUnlocked || guestOnlineLock;
    if (elDoctrineOpenHeroBtn) elDoctrineOpenHeroBtn.disabled = !ordersUnlocked || guestOnlineLock;
    if (elDoctrineRecommendedBtn) elDoctrineRecommendedBtn.disabled = !ordersUnlocked || guestOnlineLock;
    if (elDoctrineRandomBtn) elDoctrineRandomBtn.disabled = !ordersUnlocked || guestOnlineLock;
    if (elDoctrineBlankBtn) elDoctrineBlankBtn.disabled = !ordersUnlocked || guestOnlineLock;
    if (elDoctrineScenarioBtn) elDoctrineScenarioBtn.disabled = !ordersUnlocked || guestOnlineLock;
    if (elOrdersViewBlueBtn) elOrdersViewBlueBtn.disabled = !ordersUnlocked;
    if (elOrdersViewRedBtn) elOrdersViewRedBtn.disabled = !ordersUnlocked;
    renderOrdersExplainList();
    renderDoctrineIntel();
    renderTutorialGuide();

    syncLayoutChromeHeights();
    updateInspector();
    draw();

    if (onlineMode && net.isHost && net.connected && !net.applyingRemoteSnapshot) {
      onlineBroadcastSnapshot('hud-sync');
    }
  }

  function isAiControlledSide(side) {
    return state.gameMode === 'hvai' && side === aiControlledSide();
  }

  function isAiTurnActive() {
    return state.mode === 'play' && !state.gameOver && isAiControlledSide(state.side);
  }

  function stopAiLoop() {
    if (state.aiTimer) {
      clearTimeout(state.aiTimer);
      state.aiTimer = null;
    }
    state.aiQueuedFollowup = null;
    state.aiBusy = false;
  }

  function scheduleAiStep(delayMs = aiTimingForDifficulty(state.aiDifficulty).stepMs, handler = runAiTurnStep) {
    if (state.aiTimer) clearTimeout(state.aiTimer);
    state.aiTimer = setTimeout(() => {
      state.aiTimer = null;
      handler();
    }, delayMs);
  }

  function aiPostActionDelayMs(plan) {
    const timing = aiTimingForDifficulty(state.aiDifficulty);
    let delay = Math.max(180, timing.stepMs || 0);

    if (plan?.type === 'move') {
      delay = Math.max(delay, (timing.stepMs || 0) + (timing.movePauseMs || 0));
    }
    if (plan?.type === 'attack') {
      delay = Math.max(delay, timing.combatPauseMs || 0);
    }

    const moveRemaining = Math.max(0, (state.moveAnimUntil || 0) - Date.now());
    if (moveRemaining > 0) {
      delay = Math.max(delay, moveRemaining + 120);
    }

    const combatRemaining = Math.max(0, (state.combatBusyUntil || 0) - Date.now());
    if (combatRemaining > 0) {
      delay = Math.max(delay, combatRemaining + 140);
    }

    return delay;
  }

  function nearestEnemyDistance(fromKey, side) {
    const from = board.byKey.get(fromKey);
    if (!from) return Infinity;

    let best = Infinity;
    for (const [hk, u] of unitsByHex) {
      if (u.side === side) continue;
      const h = board.byKey.get(hk);
      if (!h) continue;
      const d = axialDistance(from.q, from.r, h.q, h.r);
      if (d < best) best = d;
    }
    return best;
  }

  function aiAttackScore(attackerKey, targetKey, attackerUnit, difficulty = 'standard') {
    const prof = attackDiceFor(attackerKey, targetKey, attackerUnit);
    if (!prof) return -Infinity;

    const target = unitsByHex.get(targetKey);
    if (!target) return -Infinity;

    let score = 0;
    score += prof.dice * 6;
    if (prof.kind === 'melee') score += 2;
    if (target.type === 'gen') score += 20;
    score += unitUpValue(target.type, target.quality);
    score += Math.max(0, 3 - target.hp) * 2;
    if (!retreatPick(attackerKey, targetKey)) score += 2;

    const level = normalizeAiDifficulty(difficulty);
    if (level === 'easy') {
      // Easy AI often misses strategic command targets.
      if (target.type === 'gen') score -= 10;
      if (prof.kind === 'ranged') score += 1;
    } else if (level === 'hard') {
      if (target.type === 'gen') score += 8;
      if (target.hp <= 2) score += 6;
      if (prof.kind === 'melee' && !retreatPick(attackerKey, targetKey)) score += 3;
    }
    return score;
  }

  function bestAiAttackFrom(attackerKey, attackerUnit, difficulty = 'standard') {
    let bestTargetKey = null;
    let bestScore = -Infinity;
    const targets = computeAttackTargets(attackerKey, attackerUnit);
    for (const targetKey of targets) {
      const score = aiAttackScore(attackerKey, targetKey, attackerUnit, difficulty);
      if (score > bestScore) {
        bestScore = score;
        bestTargetKey = targetKey;
      }
    }
    if (!bestTargetKey) return null;
    return { targetKey: bestTargetKey, score: bestScore };
  }

  function aiMoveScore(fromKey, destKey, unit, actCtx, difficulty = 'standard') {
    let score = 0;
    const level = normalizeAiDifficulty(difficulty);

    const fromDist = nearestEnemyDistance(fromKey, unit.side);
    const toDist = nearestEnemyDistance(destKey, unit.side);
    if (Number.isFinite(fromDist) && Number.isFinite(toDist)) {
      score += (fromDist - toDist) * 5;
      score += Math.max(0, 8 - toDist) * 0.5;
    }

    const follow = bestAiAttackFrom(destKey, unit, difficulty);
    if (follow) {
      if (level === 'easy') score += 1.5 + follow.score * 0.1;
      else if (level === 'hard') score += 6 + follow.score * 0.34;
      else score += 4 + follow.score * 0.2;
    }

    if (isEngaged(destKey, unit.side)) score += 2;

    if (!unitIgnoresCommand(unit)) {
      const inCmd = inCommandAt(destKey, unit.side);
      if (!inCmd) {
        // Prefer not drifting command-dependent units away from command links.
        score -= (level === 'hard') ? 6 : 3;
      } else if (actCtx.inCommandStart) {
        score += 0.5;
      }
    }

    const h = board.byKey.get(destKey);
    if (h) {
      if (h.terrain === 'hills') score += 0.5;
      if (h.terrain === 'woods' && unit.type !== 'cav') score += 0.5;
      if (h.terrain === 'rough' && unit.type === 'cav') score -= 0.75;
    }

    if (level === 'easy') {
      if (Number.isFinite(toDist) && toDist <= 2) score -= 1.5;
    } else if (level === 'hard') {
      if (Number.isFinite(toDist) && toDist <= 2) score += 1.25;
      if (unit.type === 'gen' && isEngaged(destKey, unit.side)) score -= 6;
    }

    return score;
  }

  function chooseAiPassPlan() {
    for (const [fromKey, u] of unitsByHex) {
      if (!unitCanActivate(u, fromKey)) continue;
      return { type: 'pass', fromKey };
    }
    return null;
  }

  function collectAiCandidatePlans(difficulty = 'standard') {
    const attacks = [];
    const moves = [];
    let passPlan = null;

    for (const [fromKey, u] of unitsByHex) {
      if (!unitCanActivate(u, fromKey)) continue;

      if (!passPlan) passPlan = { type: 'pass', fromKey };

      const attackTargets = computeAttackTargets(fromKey, u);
      for (const targetKey of attackTargets) {
        const score = aiAttackScore(fromKey, targetKey, u, difficulty);
        attacks.push({
          type: 'attack',
          fromKey,
          targetKey,
          score,
        });
      }

      const actCtx = {
        inCommandStart: unitIgnoresCommand(u) ? true : inCommandAt(fromKey, u.side),
      };
      const moveTargets = computeMoveTargets(fromKey, u, actCtx);
      for (const destKey of moveTargets) {
        const score = aiMoveScore(fromKey, destKey, u, actCtx, difficulty);
        moves.push({
          type: 'move',
          fromKey,
          destKey,
          score,
        });
      }
    }

    return { attacks, moves, passPlan };
  }

  function chooseAiActionPlanEasy() {
    const { attacks, moves, passPlan } = collectAiCandidatePlans('easy');
    const pool = [...attacks, ...moves];
    if (!pool.length) return passPlan;

    // Easy AI intentionally picks from weaker options more often.
    pool.sort((a, b) => a.score - b.score);
    const weakPoolSize = Math.max(1, Math.ceil(pool.length * 0.55));
    const weakIndex = Math.floor(Math.random() * weakPoolSize);
    if (passPlan && Math.random() < 0.18) return passPlan;
    return pool[weakIndex];
  }

  function chooseAiActionPlanStandard() {
    const { attacks, moves, passPlan } = collectAiCandidatePlans('standard');
    let bestAttack = null;
    let bestAttackScore = -Infinity;
    for (const a of attacks) {
      if (a.score > bestAttackScore) {
        bestAttackScore = a.score;
        bestAttack = a;
      }
    }

    let bestMove = null;
    let bestMoveScore = -Infinity;
    for (const m of moves) {
      if (m.score > bestMoveScore) {
        bestMoveScore = m.score;
        bestMove = m;
      }
    }

    if (bestAttack) return bestAttack;
    if (bestMove) return bestMove;
    return passPlan;
  }

  function chooseAiActionPlanHard() {
    const { attacks, moves, passPlan } = collectAiCandidatePlans('hard');
    const all = [...attacks, ...moves];
    if (!all.length) return passPlan;

    all.sort((a, b) => b.score - a.score);
    const topCount = Math.min(3, all.length);
    return all[Math.floor(Math.random() * topCount)];
  }

  function chooseAiActionPlan() {
    const level = normalizeAiDifficulty(state.aiDifficulty);
    if (level === 'easy') return chooseAiActionPlanEasy();
    if (level === 'hard') return chooseAiActionPlanHard();
    return chooseAiActionPlanStandard();
  }

  function chooseAiDoctrineCommandId(opts = {}) {
    const remainingActions = Math.max(0, ACT_LIMIT - state.actsUsed);
    const maxCostRaw = Number.isFinite(opts.maxCost) ? Number(opts.maxCost) : remainingActions;
    const maxCost = Math.max(1, Math.min(ACT_LIMIT, Math.trunc(maxCostRaw)));

    let legal = legalCommandsForSide(state.side).filter((cmd) => cmd.cost <= maxCost);
    if (!legal.length) return null;

    const actionsUsed = Number.isFinite(opts.actionsUsed) ? Math.max(0, Math.trunc(opts.actionsUsed)) : state.actsUsed;
    const level = normalizeAiDifficulty(state.aiDifficulty);

    // Opening preference: keep command spend low so AI still has room for multiple unit activations.
    if (actionsUsed <= 0) {
      const costOne = legal.filter((cmd) => cmd.cost === 1);
      if (costOne.length) legal = costOne;
    }

    const sorted = cloneArray(legal).sort((a, b) => {
      if (level === 'hard') return (Math.abs(2 - a.cost) - Math.abs(2 - b.cost)) || a.name.localeCompare(b.name);
      if (level === 'easy') return a.cost - b.cost || a.name.localeCompare(b.name);
      return a.cost - b.cost || a.name.localeCompare(b.name);
    });
    return sorted[0]?.id || null;
  }

  function shouldAiIssueDirectiveNow(cmd, actionsUsed = state.actsUsed) {
    if (!cmd) return false;
    const level = normalizeAiDifficulty(state.aiDifficulty);
    const used = Math.max(0, Math.trunc(actionsUsed));

    // Keep AI turn readability high: only consider directives at turn start.
    if (used > 0) return false;

    // Opening command use is intentionally uncommon to avoid "AI only moved twice"
    // confusion unless a directive clearly helps.
    let chance = (level === 'hard') ? 0.22 : (level === 'easy' ? 0.08 : 0.15);
    if (cmd.cost === 1) chance += 0.05;
    chance = Math.max(0, Math.min(0.75, chance));
    return Math.random() < chance;
  }

  function executeAiActionPlan(plan, options = {}) {
    if (!plan) return false;
    const actsBefore = state.actsUsed;
    const alreadySelected = !!options.alreadySelected;

    if (!alreadySelected || state.selectedKey !== plan.fromKey) {
      selectUnit(plan.fromKey);
      if (state.selectedKey !== plan.fromKey) return false;
    }

    if (plan.type === 'attack') {
      if (!state._attackTargets || !state._attackTargets.has(plan.targetKey)) {
        clearSelection();
        updateHud();
        return false;
      }
      attackFromSelection(plan.targetKey);
      return state.actsUsed > actsBefore || state.gameOver;
    }

    if (plan.type === 'move') {
      if (!state._moveTargets || !state._moveTargets.has(plan.destKey)) {
        clearSelection();
        updateHud();
        return false;
      }
      moveSelectedTo(plan.destKey);

      // Optional post-move attack: choose best available, else forfeit.
      if (state.selectedKey === plan.destKey && state._attackTargets && state._attackTargets.size > 0) {
        const movedUnit = unitsByHex.get(plan.destKey);
        let bestTargetKey = null;
        let bestScore = -Infinity;
        if (movedUnit) {
          for (const targetKey of state._attackTargets) {
            const score = aiAttackScore(plan.destKey, targetKey, movedUnit, state.aiDifficulty);
            if (score > bestScore) {
              bestScore = score;
              bestTargetKey = targetKey;
            }
          }
        }
        if (bestTargetKey && state._attackTargets.has(bestTargetKey)) {
          if (isAiTurnActive()) {
            const timing = aiTimingForDifficulty(state.aiDifficulty);
            state.aiQueuedFollowup = {
              fromKey: plan.destKey,
              targetKey: bestTargetKey,
              delayMs: Math.max(180, timing.movePauseMs || 0),
            };
          } else {
            attackFromSelection(bestTargetKey);
          }
        } else {
          clearSelection();
          updateHud();
        }
      } else {
        clearSelection();
        updateHud();
      }
      return state.actsUsed > actsBefore || state.gameOver;
    }

    if (plan.type === 'pass') {
      passSelected();
      return state.actsUsed > actsBefore || state.gameOver;
    }

    clearSelection();
    updateHud();
    return false;
  }

  function beginAiPlanExecution(plan) {
    if (!plan) return false;
    const timing = aiTimingForDifficulty(state.aiDifficulty);
    const intentMs = Math.max(
      120,
      plan.type === 'pass'
        ? Math.floor((timing.intentMs || 260) * 0.7)
        : (timing.intentMs || 260)
    );

    clearSelection();
    selectUnit(plan.fromKey);
    if (state.selectedKey !== plan.fromKey) return false;

    const u = unitsByHex.get(plan.fromKey);
    const unitDef = u ? UNIT_BY_ID.get(u.type) : null;
    const unitLabel = u ? `${u.side.toUpperCase()} ${unitDef ? unitDef.abbrev : u.type}` : 'unit';
    if (plan.type === 'attack') {
      log(`AI lining up attack with ${unitLabel}...`);
    } else if (plan.type === 'move') {
      log(`AI maneuvering ${unitLabel}...`);
    } else {
      log(`AI considering pass with ${unitLabel}...`);
    }
    updateHud();

    scheduleAiStep(intentMs, () => {
      if (!isAiTurnActive()) {
        stopAiLoop();
        updateHud();
        return;
      }

      const acted = executeAiActionPlan(plan, { alreadySelected: true });
      if (!isAiTurnActive()) {
        stopAiLoop();
        updateHud();
        return;
      }

      if (!acted) {
        // Fallback once: try pass with any legal unit, else end turn.
        if (plan.type !== 'pass') {
          const passPlan = chooseAiPassPlan();
          if (passPlan && beginAiPlanExecution(passPlan)) return;
        }
        stopAiLoop();
        endTurn();
        return;
      }

      if (state.actsUsed >= ACT_LIMIT) {
        stopAiLoop();
        endTurn();
        return;
      }

      if (state.aiQueuedFollowup) {
        const queued = state.aiQueuedFollowup;
        state.aiQueuedFollowup = null;
        scheduleAiStep(queued.delayMs, () => {
          if (!isAiTurnActive()) {
            stopAiLoop();
            updateHud();
            return;
          }

          if (state.selectedKey === queued.fromKey && state._attackTargets && state._attackTargets.has(queued.targetKey)) {
            const atkUnit = unitsByHex.get(queued.fromKey);
            const prof = atkUnit ? attackDiceFor(queued.fromKey, queued.targetKey, atkUnit) : null;
            setAttackFlash(queued.targetKey, ATTACK_FLASH_MS + 180, {
              fromKey: queued.fromKey,
              strikeType: prof?.kind || 'melee',
              attackerType: atkUnit?.type || '',
            });
            attackFromSelection(queued.targetKey);
          } else {
            clearSelection();
            updateHud();
          }

          if (!isAiTurnActive()) {
            stopAiLoop();
            updateHud();
            return;
          }
          if (state.actsUsed >= ACT_LIMIT) {
            stopAiLoop();
            endTurn();
            return;
          }
          scheduleAiStep(aiPostActionDelayMs({ type: 'attack' }));
        });
        return;
      }

      scheduleAiStep(aiPostActionDelayMs(plan));
    });

    return true;
  }

  function runAiTurnStep() {
    if (!isAiTurnActive()) {
      stopAiLoop();
      updateHud();
      return;
    }

    const remainingActions = Math.max(0, ACT_LIMIT - state.actsUsed);
    // Keep AI turns legible:
    // - only consider directives at action 0
    // - only allow low-cost directives automatically
    // - always preserve room for at least two unit activations afterward
    if (!state.doctrine.commandIssuedThisTurn && state.actsUsed === 0 && remainingActions > 2) {
      const commandId = chooseAiDoctrineCommandId({
        maxCost: 1,
        actionsUsed: state.actsUsed,
      });
      const cmd = commandId ? COMMAND_BY_ID.get(commandId) : null;
      if (cmd && shouldAiIssueDirectiveNow(cmd, state.actsUsed) && issueDoctrineCommand(commandId)) {
        const spend = commandActionSpend(cmd);
        log(`AI directive committed: ${cmd.name} (spent ${spend} action${spend === 1 ? '' : 's'}).`);
        if (!isAiTurnActive()) {
          stopAiLoop();
          updateHud();
          return;
        }
        if (state.actsUsed >= ACT_LIMIT) {
          stopAiLoop();
          endTurn();
          return;
        }
        scheduleAiStep(Math.max(160, aiTimingForDifficulty(state.aiDifficulty).intentMs || 240));
        return;
      }
    }

    if (state.actsUsed >= ACT_LIMIT) {
      stopAiLoop();
      endTurn();
      return;
    }

    const plan = chooseAiActionPlan();
    if (!plan) {
      stopAiLoop();
      endTurn();
      return;
    }

    if (!beginAiPlanExecution(plan)) {
      const passPlan = chooseAiPassPlan();
      if (!passPlan || !beginAiPlanExecution(passPlan)) {
        stopAiLoop();
        endTurn();
        return;
      }
    }
  }

  function maybeStartAiTurn() {
    if (!isAiTurnActive()) {
      stopAiLoop();
      return;
    }
    if (state.aiBusy) return;

    state.aiBusy = true;
    clearSelection();
    log(`AI turn: ${state.side.toUpperCase()} is acting (${aiDifficultyLabel(state.aiDifficulty)}).`);
    updateHud();
    scheduleAiStep(aiTimingForDifficulty(state.aiDifficulty).startMs);
  }

  // --- Rules helpers
  function isOccupied(hk) {
    return unitsByHex.has(hk);
  }

  function doctrineTurnValue(mapName, unitId) {
    const map = state.doctrine.effects[mapName] || {};
    return Number(map[unitId] || 0);
  }

  function doctrineTurnFlag(mapName, unitId) {
    const map = state.doctrine.effects[mapName] || {};
    return !!map[unitId];
  }

  function doctrineValueForUnit(mapName, unitId, side = null) {
    return doctrineTurnValue(mapName, unitId) + doctrineLongEffectValue(mapName, unitId, side);
  }

  function doctrineFlagForUnit(mapName, unitId, side = null) {
    return doctrineTurnFlag(mapName, unitId) || doctrineLongEffectFlag(mapName, unitId, side);
  }

  function doctrineFlagForSide(mapName, side) {
    const map = state.doctrine.effects[mapName] || {};
    if (map[side]) return true;
    return doctrineLongEffectFlag(mapName, null, side);
  }

  function terrainMoveCost(unitType, terrainId) {
    if (terrainId === 'water' || terrainId === 'mountains') return Infinity;
    if (terrainId === 'clear') return 1;
    if (terrainId === 'woods') {
      // Requested rule updates:
      // - INF can enter woods (but is slowed by a next-turn pause).
      // - CAV can enter and move through woods.
      if (unitType === 'inf') return 1;
      if (unitType === 'cav') return 2;
      return 2;
    }

    // hills/rough
    return (unitType === 'cav') ? 3 : 2;
  }

  function applyPostMoveTerrainEffects(unit, toKey) {
    if (!unit || !toKey) return;
    const toHex = board.byKey.get(toKey);
    if (!toHex) return;

    // Infantry moving into woods must pause their next own activation.
    // This is modeled as a temporary cannotMove effect that expires after that turn.
    if (unit.type === 'inf' && toHex.terrain === 'woods') {
      addDoctrineLongEffect({
        map: 'cannotMove',
        unitId: unit.id,
        value: 1,
        side: unit.side,
        expiresOnSide: unit.side,
        expiresAfterSerial: state.turnSerial + 2,
      });
      log('Infantry entered woods: next activation is movement-paused.');
    }
  }

  function isEngaged(hexKey, side) {
    const h = board.byKey.get(hexKey);
    if (!h) return false;

    for (const nk of h.neigh) {
      const u = unitsByHex.get(nk);
      if (u && u.side !== side) return true;
    }

    return false;
  }

  function friendlyCommandSourceKeys(side) {
    const out = [];
    for (const [hk, u] of unitsByHex) {
      if (u.side === side && isCommandSourceUnit(u)) out.push(hk);
    }
    return out;
  }

  function linkedGeneralKeys(side) {
    const out = [];
    for (const [hk, u] of unitsByHex) {
      if (u.side === side && u.type === 'gen') out.push(hk);
    }
    return out;
  }

  function runnerLinkedToGeneral(runnerKey, side) {
    const rHex = board.byKey.get(runnerKey);
    const rUnit = unitsByHex.get(runnerKey);
    if (!rHex || !rUnit || rUnit.type !== 'run' || rUnit.side !== side) return false;
    const generals = linkedGeneralKeys(side);
    for (const gk of generals) {
      const gHex = board.byKey.get(gk);
      const gUnit = unitsByHex.get(gk);
      if (!gHex || !gUnit) continue;
      const gRadius = commandRadiusForUnit(gUnit);
      if (gRadius <= 0) continue;
      const d = axialDistance(rHex.q, rHex.r, gHex.q, gHex.r);
      if (d <= gRadius) return true;
    }
    return false;
  }

  function inCommandAt(hexKey, side) {
    const h = board.byKey.get(hexKey);
    if (!h) return false;
    const hereUnit = unitsByHex.get(hexKey);
    if (hereUnit && hereUnit.side === side && doctrineFlagForUnit('commandOverrideUnitIds', hereUnit.id, side)) {
      return true;
    }

    const generals = linkedGeneralKeys(side);
    if (generals.length === 0) return false;

    // Direct command from a general.
    for (const gk of generals) {
      const gh = board.byKey.get(gk);
      const gu = unitsByHex.get(gk);
      if (!gh || !gu) continue;
      const radius = commandRadiusForUnit(gu);
      if (radius <= 0) continue;
      const d = axialDistance(h.q, h.r, gh.q, gh.r);
      if (d <= radius) return true;
    }

    // Runner relay: runners extend command only if runner itself is linked to a general.
    for (const [rk, ru] of unitsByHex) {
      if (!ru || ru.side !== side || ru.type !== 'run') continue;
      if (!runnerLinkedToGeneral(rk, side)) continue;
      const rh = board.byKey.get(rk);
      if (!rh) continue;
      const d = axialDistance(h.q, h.r, rh.q, rh.r);
      if (d <= RUNNER_COMMAND_RADIUS) return true;
    }
    return false;
  }

  function unitIsDisarrayed(u) {
    return !!(u && u.disarray);
  }

  function applyDisarrayToUnit(u, keyHint = '') {
    if (!u) return false;
    const was = !!u.disarray;
    u.disarray = true;
    u.disarrayAppliedSerial = state.turnSerial;
    if (!was) {
      const where = keyHint ? ` at ${keyHint}` : '';
      log(`${u.side.toUpperCase()} ${UNIT_BY_ID.get(u.type)?.abbrev || 'UNIT'} fell into disarray${where}.`);
    }
    return !was;
  }

  function clearDisarrayOnUnit(u, reason = '') {
    if (!u || !u.disarray) return false;
    u.disarray = false;
    delete u.disarrayAppliedSerial;
    if (reason) {
      log(`${u.side.toUpperCase()} ${UNIT_BY_ID.get(u.type)?.abbrev || 'UNIT'} recovered from disarray (${reason}).`);
    }
    return true;
  }

  function clearExpiredDisarrayForEndedSide(endedSide) {
    if (endedSide !== 'blue' && endedSide !== 'red') return;
    for (const u of unitsByHex.values()) {
      if (!u || u.side !== endedSide || !u.disarray) continue;
      const appliedSerial = Number.isFinite(u.disarrayAppliedSerial)
        ? Number(u.disarrayAppliedSerial)
        : state.turnSerial;
      // Disarray lasts through the unit side's next full turn, then auto-clears.
      if (state.turnSerial > (appliedSerial + 1)) {
        clearDisarrayOnUnit(u, 'one-turn disarray elapsed');
      }
    }
  }

  function unitIgnoresCommand(u) {
    if (u.type === 'gen') return true;
    if (u.type === 'run') return true;
    if (u.type === 'cav') return true;
    if (u.quality === 'veteran') return true;
    return false;
  }

  function unitCanActivate(u, hexKey) {
    if (state.mode !== 'play') return false;
    if (state.gameOver) return false;
    if (u.side !== state.side) return false;
    if (state.actsUsed >= ACT_LIMIT) return false;
    if (state.actedUnitIds.has(u.id)) return false;

    // Green command-dependent units out-of-command cannot be activated.
    if (!unitIgnoresCommand(u) && u.quality === 'green') {
      const cmd = inCommandAt(hexKey, u.side);
      if (!cmd) return false;
    }

    return true;
  }

  function activationBlockReason(u, hexKey) {
    if (state.mode !== 'play') return 'Not in Play mode.';
    if (state.gameOver) return 'Game over.';
    if (u.side !== state.side) return null; // stay calm; don’t narrate enemy clicks
    if (state.actsUsed >= ACT_LIMIT) return 'No activations left — End Turn.';
    if (state.actedUnitIds.has(u.id)) return 'Already acted this turn.';

    if (!unitIgnoresCommand(u) && u.quality === 'green') {
      const cmd = inCommandAt(hexKey, u.side);
      if (!cmd) return 'Out of command: Green units need GEN or RUN in range.';
    }

    return null;
  }

  function canWithdrawFromEngagement(u) {
    return u.type === 'skr' || u.type === 'run' || u.quality === 'veteran';
  }

  function disengageTargets(fromKey, u) {
    const out = new Set();
    const h = board.byKey.get(fromKey);
    if (!h) return out;

    const mp = unitMovePoints(u);

    for (const nk of h.neigh) {
      if (isOccupied(nk)) continue;
      const nh = board.byKey.get(nk);
      if (!nh) continue;

      const cost = terrainMoveCost(u.type, nh.terrain);
      if (!Number.isFinite(cost) || cost > mp) continue;

      // Withdrawal must end NOT adjacent to any enemy.
      if (isEngaged(nk, u.side)) continue;

      out.add(nk);
    }

    return out;
  }

  function unitCanMoveThisActivation(u, actCtx, startKey) {
    if (doctrineFlagForUnit('cannotMove', u.id, u.side)) return false;
    if (unitIsDisarrayed(u)) return false;
    // Engagement makes the line sticky.
    const engaged = isEngaged(startKey, u.side);

    // Skirmishers and veterans may withdraw 1 hex if they can break contact.
    if (engaged) {
      return canWithdrawFromEngagement(u);
    }

    // Command dependence
    if (unitIgnoresCommand(u)) return true;

    // Regular INF/ARC/SKR require command to move.
    if (u.quality === 'regular') return !!actCtx.inCommandStart;

    // Green INF/ARC/SKR require command to move (but if green, activation gating already enforced).
    return !!actCtx.inCommandStart;
  }

  // --- Movement (MP + terrain costs)
  function computeMoveTargets(fromKey, u, actCtx) {
    const mp = unitMovePoints(u);

    // If movement isn't allowed, return empty set.
    if (!unitCanMoveThisActivation(u, actCtx, fromKey)) return new Set();

    const engaged = isEngaged(fromKey, u.side);

    // Engaged withdrawal: SKR and veterans may disengage 1 hex.
    if (engaged && canWithdrawFromEngagement(u)) {
      return disengageTargets(fromKey, u);
    }

    // Normal movement: least-cost reachability within MP budget.
    const out = new Set();
    const best = new Map();

    // Tiny board → a simple priority queue is fine.
    const pq = [{ k: fromKey, c: 0 }];
    best.set(fromKey, 0);

    while (pq.length) {
      // pop min cost
      pq.sort((a, b) => a.c - b.c);
      const cur = pq.shift();
      if (!cur) break;

      const h = board.byKey.get(cur.k);
      if (!h) continue;

      for (const nk of h.neigh) {
        if (isOccupied(nk)) continue;
        const nh = board.byKey.get(nk);
        if (!nh) continue;

        const stepCost = terrainMoveCost(u.type, nh.terrain);
        if (!Number.isFinite(stepCost)) continue; // water/impassable

        const nc = cur.c + stepCost;
        if (nc > mp) continue;

        const prevBest = best.get(nk);
        if (prevBest !== undefined && nc >= prevBest) continue;

        best.set(nk, nc);
        out.add(nk);
        pq.push({ k: nk, c: nc });
      }
    }

    // Loose/Wing screen: SKR/ARC may pass through adjacent friendly INF by one hex.
    if ((u.type === 'skr' || u.type === 'arc') && doctrineFlagForUnit('wingScreenUnitIds', u.id, u.side)) {
      const fromHex = board.byKey.get(fromKey);
      if (fromHex) {
        for (const nk of fromHex.neigh) {
          const blocker = unitsByHex.get(nk);
          if (!blocker || blocker.side !== u.side || blocker.type !== 'inf') continue;
          const bHex = board.byKey.get(nk);
          if (!bHex) continue;
          for (const landing of bHex.neigh) {
            if (landing === fromKey || landing === nk) continue;
            if (isOccupied(landing)) continue;
            const lh = board.byKey.get(landing);
            if (!lh) continue;
            const cost = terrainMoveCost(u.type, lh.terrain);
            if (!Number.isFinite(cost)) continue;
            out.add(landing);
          }
        }
      }
    }

    return out;
  }

  function movementPathCost(fromKey, toKey, unit) {
    if (fromKey === toKey) return 0;
    if (!unit) return null;
    const mp = unitMovePoints(unit);
    if (mp <= 0) return null;

    const best = new Map();
    const pq = [{ k: fromKey, c: 0 }];
    best.set(fromKey, 0);

    while (pq.length) {
      pq.sort((a, b) => a.c - b.c);
      const cur = pq.shift();
      if (!cur) break;
      if (cur.k === toKey) return cur.c;

      const h = board.byKey.get(cur.k);
      if (!h) continue;

      for (const nk of h.neigh) {
        if (isOccupied(nk) && nk !== toKey) continue;
        const nh = board.byKey.get(nk);
        if (!nh) continue;

        const stepCost = terrainMoveCost(unit.type, nh.terrain);
        if (!Number.isFinite(stepCost)) continue;

        const nc = cur.c + stepCost;
        if (nc > mp) continue;

        const prevBest = best.get(nk);
        if (prevBest !== undefined && nc >= prevBest) continue;

        best.set(nk, nc);
        pq.push({ k: nk, c: nc });
      }
    }

    return null;
  }

  function normalizeLineAdvanceDirection(dir) {
    const d = String(dir || '').toLowerCase();
    if (HEX_DIRECTION_IDS.includes(d)) return d;
    if (d === 'forward' || d === 'backward' || d === 'left' || d === 'right') return d;
    return 'ur';
  }

  function lineAdvanceStepDirection(side, axis = state.forwardAxis, mode = state.lineAdvanceDirection) {
    const normalized = normalizeLineAdvanceDirection(mode);
    if (HEX_DIRECTION_IDS.includes(normalized)) return normalized;
    const forward = sideForwardDirection(side, axis);
    const back = oppositeDirection(forward);
    const [left, right] = axisLateralDirections(axis);
    const m = normalized;
    if (m === 'backward' && back) return back;
    if (m === 'left') return left;
    if (m === 'right') return right;
    return forward;
  }

  function forwardStepKey(fromKey, side, mode = 'forward') {
    const dir = lineAdvanceStepDirection(side, state.forwardAxis, mode);
    return stepKeyInDirection(fromKey, dir);
  }

  function canLineAdvanceInfAt(hexKey, u) {
    if (!u || u.type !== 'inf') return false;
    if (u.side !== state.side) return false;
    if (!unitCanActivate(u, hexKey)) return false;
    if (isEngaged(hexKey, u.side)) return false;

    const inCmd = unitIgnoresCommand(u) ? true : inCommandAt(hexKey, u.side);
    return unitCanMoveThisActivation(u, { inCommandStart: inCmd }, hexKey);
  }

  function collectLineAlongAxis(anchorKey, axisDef) {
    if (!axisDef) return [];
    const anchorUnit = unitsByHex.get(anchorKey);
    if (!anchorUnit) return [];
    if (!canLineAdvanceInfAt(anchorKey, anchorUnit)) return [];

    const before = [];
    const after = [];

    function walk(dir, out) {
      let cur = anchorKey;
      while (true) {
        const next = stepKeyInDirection(cur, dir);
        if (!next) break;
        const u = unitsByHex.get(next);
        if (!canLineAdvanceInfAt(next, u)) break;
        out.push(next);
        cur = next;
      }
    }

    walk(axisDef.neg, before);
    walk(axisDef.pos, after);
    before.reverse();
    return [...before, anchorKey, ...after];
  }

  function collectLineAdvanceFormationWithAxis(anchorKey) {
    let best = { formation: [], axis: null };
    for (const axisDef of LINE_ADVANCE_AXES) {
      const formation = collectLineAlongAxis(anchorKey, axisDef);
      if (formation.length > best.formation.length) {
        best = { formation, axis: axisDef };
      }
    }
    return best;
  }

  function collectLineAdvanceFormation(anchorKey) {
    const picked = collectLineAdvanceFormationWithAxis(anchorKey);
    return picked.formation || [];
  }

  function getLineAdvanceContext(anchorKey = state.selectedKey) {
    if (!anchorKey) return null;
    const picked = collectLineAdvanceFormationWithAxis(anchorKey);
    const formation = picked.formation || [];
    const axisDef = picked.axis;
    if (!axisDef || formation.length === 0) return null;

    const dirs = Array.isArray(axisDef.advanceDirs) ? axisDef.advanceDirs.slice() : [];
    if (!dirs.length) return null;

    const plansByDir = new Map();
    for (const d of dirs) {
      plansByDir.set(d, lineAdvanceMovePlan(formation, d));
    }

    let activeDir = normalizeLineAdvanceDirection(state.lineAdvanceDirection);
    if (!dirs.includes(activeDir)) {
      const firstWithMove = dirs.find((d) => (plansByDir.get(d)?.moves?.length || 0) > 0);
      activeDir = firstWithMove || dirs[0];
    }
    const plan = plansByDir.get(activeDir) || { moves: [], blocked: [] };
    return { formation, axisDef, dirs, activeDir, plan, plansByDir };
  }

  function buildLineAdvanceOverlay(anchorKey = state.selectedKey) {
    const ctx = getLineAdvanceContext(anchorKey);
    if (!ctx) return null;

    const byHex = new Map();
    const mark = (hexKey, field) => {
      if (!hexKey) return;
      const cur = byHex.get(hexKey) || {
        member: false,
        movingFrom: false,
        blockedFrom: false,
        destination: false,
      };
      cur[field] = true;
      byHex.set(hexKey, cur);
    };

    for (const hk of ctx.formation) mark(hk, 'member');
    for (const mv of ctx.plan.moves || []) {
      mark(mv.fromKey, 'movingFrom');
      mark(mv.toKey, 'destination');
    }
    for (const bl of ctx.plan.blocked || []) {
      mark(bl.fromKey, 'blockedFrom');
    }

    return {
      byHex,
      direction: ctx.activeDir,
      formationCount: ctx.formation.length,
      canAdvance: (ctx.plan.moves?.length || 0) > 0,
    };
  }

  function doctrinePreviewMoveTarget(commandId, entry, side) {
    if (!entry || !entry.key || !entry.unit) return null;
    const fromKey = entry.key;
    const u = entry.unit;
    switch (commandId) {
      case 'quick_dress': {
        const lateral = axisLateralDirections(state.forwardAxis);
        for (const dir of lateral) {
          const toKey = stepKeyInDirection(fromKey, dir);
          if (toKey && canCommandRelocateUnit(fromKey, toKey, { unit: u })) return { fromKey, toKey, blocked: false };
        }
        return { fromKey, toKey: null, blocked: true };
      }
      case 'quick_withdraw': {
        const outTargets = [...disengageTargets(fromKey, u)];
        const toKey = outTargets[0] || null;
        if (!toKey) return { fromKey, toKey: null, blocked: true };
        return { fromKey, toKey, blocked: !canCommandRelocateUnit(fromKey, toKey, { unit: u }) };
      }
      case 'refuse_flank': {
        const backDir = oppositeDirection(sideForwardDirection(side, state.forwardAxis));
        const inwardDir = inwardLateralDirectionForKey(fromKey);
        const candidates = [];
        if (backDir) candidates.push(stepKeyInDirection(fromKey, backDir));
        if (inwardDir) candidates.push(stepKeyInDirection(fromKey, inwardDir));
        for (const toKey of candidates) {
          if (toKey && canCommandRelocateUnit(fromKey, toKey, { unit: u })) return { fromKey, toKey, blocked: false };
        }
        return { fromKey, toKey: null, blocked: true };
      }
      case 'jaws_inward': {
        const inwardDir = inwardLateralDirectionForKey(fromKey);
        const toKey = inwardDir ? stepKeyInDirection(fromKey, inwardDir) : null;
        if (!toKey) return { fromKey, toKey: null, blocked: true };
        return { fromKey, toKey, blocked: !canCommandRelocateUnit(fromKey, toKey, { unit: u }) };
      }
      case 'forced_march': {
        const toKey = forwardStepKey(fromKey, side);
        if (!toKey) return { fromKey, toKey: null, blocked: true };
        const selectedIds = new Set((state.doctrine.targeting?.selectedUnitIds || []).map(Number));
        const occ = unitsByHex.get(toKey);
        const steppingIntoSelected = !!(occ && selectedIds.has(occ.id));
        const blocked = !canCommandRelocateUnit(fromKey, toKey, {
          unit: u,
          allowOccupied: steppingIntoSelected,
        });
        return { fromKey, toKey, blocked };
      }
      case 'full_line_advance':
      case 'all_out_cavalry_sweep':
      case 'commit_reserves': {
        const toKey = forwardStepKey(fromKey, side);
        if (!toKey) return { fromKey, toKey: null, blocked: true };
        return { fromKey, toKey, blocked: !canCommandRelocateUnit(fromKey, toKey, { unit: u }) };
      }
      case 'collapse_center': {
        const center = collapseCenterCandidates(side, 6).some((e) => e.unit.id === u.id);
        if (center) {
          const backDir = oppositeDirection(sideForwardDirection(side, state.forwardAxis));
          const toKey = backDir ? stepKeyInDirection(fromKey, backDir) : null;
          if (!toKey) return { fromKey, toKey: null, blocked: true };
          return { fromKey, toKey, blocked: !canCommandRelocateUnit(fromKey, toKey, { unit: u }) };
        }
        const inwardDir = inwardLateralDirectionForKey(fromKey);
        const toKey = inwardDir ? stepKeyInDirection(fromKey, inwardDir) : null;
        if (!toKey) return { fromKey, toKey: null, blocked: true };
        return { fromKey, toKey, blocked: !canCommandRelocateUnit(fromKey, toKey, { unit: u }) };
      }
      case 'reforge_line': {
        const opts = [
          sideForwardDirection(side, state.forwardAxis),
          ...axisLateralDirections(state.forwardAxis),
          oppositeDirection(sideForwardDirection(side, state.forwardAxis)),
        ];
        for (const dir of opts) {
          const toKey = stepKeyInDirection(fromKey, dir);
          if (toKey && canCommandRelocateUnit(fromKey, toKey, { unit: u })) return { fromKey, toKey, blocked: false };
        }
        return { fromKey, toKey: null, blocked: true };
      }
      default:
        return null;
    }
  }

  function buildDoctrineTargetOverlay() {
    const t = state.doctrine.targeting;
    if (!t || !t.active || !t.commandId) return null;
    const side = state.side;
    const byHex = new Map();
    const paths = [];

    const eligibleIdSet = new Set(t.eligibleUnitIds || []);
    for (const [hk, u] of unitsByHex) {
      if (!u || u.side !== side) continue;
      if (!eligibleIdSet.has(u.id)) continue;
      byHex.set(hk, {
        eligible: true,
        selected: false,
        destination: false,
        blockedFrom: false,
      });
    }

    const selectedEntries = currentDoctrineTargetingEntries();
    const selectedFromKeys = new Set(selectedEntries.map((e) => e.key));
    for (const e of selectedEntries) {
      const cur = byHex.get(e.key) || { eligible: false, selected: false, destination: false, blockedFrom: false };
      cur.selected = true;
      byHex.set(e.key, cur);
      const preview = doctrinePreviewMoveTarget(t.commandId, e, side);
      if (preview) {
        paths.push(preview);
        if (preview.toKey) {
          const toCur = byHex.get(preview.toKey) || { eligible: false, selected: false, destination: false, blockedFrom: false };
          toCur.destination = true;
          byHex.set(preview.toKey, toCur);
        } else if (preview.blocked) {
          cur.blockedFrom = true;
          byHex.set(e.key, cur);
        }
      }
    }

    const hoverKey = state._hoverKey;
    if (hoverKey && !selectedFromKeys.has(hoverKey)) {
      const hoverUnit = unitsByHex.get(hoverKey);
      if (hoverUnit && hoverUnit.side === side && eligibleIdSet.has(hoverUnit.id)) {
        const hoverMark = byHex.get(hoverKey) || { eligible: false, selected: false, destination: false, blockedFrom: false };
        hoverMark.hovered = true;
        byHex.set(hoverKey, hoverMark);
        const hoverEntry = { key: hoverKey, unit: hoverUnit, hex: board.byKey.get(hoverKey) };
        const hoverPreview = doctrinePreviewMoveTarget(t.commandId, hoverEntry, side);
        if (hoverPreview) {
          hoverPreview.hover = true;
          paths.push(hoverPreview);
          if (hoverPreview.toKey) {
            const toCur = byHex.get(hoverPreview.toKey) || { eligible: false, selected: false, destination: false, blockedFrom: false };
            toCur.destination = true;
            byHex.set(hoverPreview.toKey, toCur);
          } else if (hoverPreview.blocked) {
            hoverMark.blockedFrom = true;
            byHex.set(hoverKey, hoverMark);
          }
        }
      }
    }

    return { byHex, paths };
  }

  function buildTutorialBoardOverlay(nowMs = Date.now()) {
    if (!state.tutorial.active) return null;
    const visual = state.tutorial.visual || {};
    const byHex = new Map();
    const focusKeys = Array.isArray(visual.focusKeys) ? visual.focusKeys : [];
    const destinationKeys = Array.isArray(visual.destinationKeys) ? visual.destinationKeys : [];
    const paths = Array.isArray(visual.paths) ? visual.paths : [];
    const pulse = 0.55 + (Math.sin((nowMs / 360) * Math.PI) * 0.25);
    const travelPhase = (nowMs % 1500) / 1500;
    const taskKeys = (state.tutorial.task?.active && !state.tutorial.task?.done)
      ? (Array.isArray(state.tutorial.task.targetKeys) ? state.tutorial.task.targetKeys : [])
      : [];

    for (const hk of focusKeys) {
      if (!board.activeSet.has(hk)) continue;
      const cur = byHex.get(hk) || {
        tutorialFocus: false,
        tutorialDestination: false,
      };
      cur.tutorialFocus = true;
      byHex.set(hk, cur);
    }
    for (const hk of destinationKeys) {
      if (!board.activeSet.has(hk)) continue;
      const cur = byHex.get(hk) || {
        tutorialFocus: false,
        tutorialDestination: false,
      };
      cur.tutorialDestination = true;
      byHex.set(hk, cur);
    }
    for (const hk of taskKeys) {
      if (!board.activeSet.has(hk)) continue;
      const cur = byHex.get(hk) || {
        tutorialFocus: false,
        tutorialDestination: false,
      };
      cur.tutorialTaskTarget = true;
      byHex.set(hk, cur);
    }

    const legalPaths = paths.filter((p) => p && p.fromKey && p.toKey && board.activeSet.has(p.fromKey) && board.activeSet.has(p.toKey));
    return { byHex, paths: legalPaths, pulse, travelPhase };
  }

  function lineAdvanceMovePlan(formation, direction = state.lineAdvanceDirection) {
    if (!Array.isArray(formation) || formation.length === 0) {
      return { moves: [], blocked: [] };
    }
    const dir = lineAdvanceStepDirection(state.side, state.forwardAxis, direction);
    const formationSet = new Set(formation);
    const moves = [];
    const blocked = [];
    const infMove = UNIT_BY_ID.get('inf')?.move ?? 1;

    for (const fromKey of formation) {
      const u = unitsByHex.get(fromKey);
      if (!u) continue;

      const toKey = stepKeyInDirection(fromKey, dir);
      if (!toKey) {
        blocked.push({ fromKey, reason: 'off-board' });
        continue;
      }
      if (!board.activeSet.has(toKey)) {
        blocked.push({ fromKey, reason: 'off-board' });
        continue;
      }

      if (unitsByHex.has(toKey) && !formationSet.has(toKey)) {
        blocked.push({ fromKey, reason: 'occupied' });
        continue;
      }

      const toHex = board.byKey.get(toKey);
      if (!toHex) {
        blocked.push({ fromKey, reason: 'off-board' });
        continue;
      }

      const cost = terrainMoveCost('inf', toHex.terrain);
      if (!Number.isFinite(cost) || cost > infMove) {
        blocked.push({ fromKey, reason: 'terrain' });
        continue;
      }

      moves.push({ fromKey, toKey, unit: u });
    }

    return { moves, blocked };
  }

  function canIssueLineAdvance() {
    if (state.mode !== 'play' || state.gameOver) return false;
    if (isAiTurnActive()) return false;
    if (state.actsUsed >= ACT_LIMIT) return false;
    if (!state.selectedKey) return false;

    const u = unitsByHex.get(state.selectedKey);
    if (!u || u.side !== state.side || u.type !== 'inf') return false;
    const ctx = getLineAdvanceContext(state.selectedKey);
    if (!ctx) return false;
    return (ctx.plan.moves.length > 0);
  }

  function lineAdvanceFromSelection() {
    if (state.mode !== 'play') return;
    if (state.gameOver) return;
    if (isAiTurnActive()) return;
    if (state.actsUsed >= ACT_LIMIT) {
      log('No activations left — End Turn.');
      updateHud();
      return;
    }
    if (!state.selectedKey) {
      log('Line Advance: select a friendly INF first.');
      updateHud();
      return;
    }

    const anchorKey = state.selectedKey;
    const anchor = unitsByHex.get(anchorKey);
    if (!anchor || anchor.side !== state.side || anchor.type !== 'inf') {
      log('Line Advance requires a selected friendly INF.');
      updateHud();
      return;
    }

    const ctx = getLineAdvanceContext(anchorKey);
    if (!ctx || ctx.formation.length === 0) {
      log('Line Advance unavailable: selected INF cannot form an eligible line.');
      updateHud();
      return;
    }
    state.lineAdvanceDirection = ctx.activeDir;
    const formation = ctx.formation;
    const plan = ctx.plan;
    const moves = plan.moves;
    const blocked = plan.blocked;

    if (moves.length === 0) {
      log('Line Advance blocked: no INF in the line can step forward.');
      updateHud();
      return;
    }

    // Formation order consumes one activation and marks every participant as spent.
    state.actsUsed = Math.min(ACT_LIMIT, state.actsUsed + 1);
    for (const hk of formation) {
      const u = unitsByHex.get(hk);
      if (u) state.actedUnitIds.add(u.id);
    }

    for (const m of moves) unitsByHex.delete(m.fromKey);
    for (const m of moves) unitsByHex.set(m.toKey, m.unit);

    clearSelection();

    const byReason = { offBoard: 0, occupied: 0, terrain: 0 };
    for (const b of blocked) {
      if (b.reason === 'off-board') byReason.offBoard += 1;
      else if (b.reason === 'occupied') byReason.occupied += 1;
      else if (b.reason === 'terrain') byReason.terrain += 1;
    }

    const blockParts = [];
    if (byReason.offBoard) blockParts.push(`off-board ${byReason.offBoard}`);
    if (byReason.occupied) blockParts.push(`occupied ${byReason.occupied}`);
    if (byReason.terrain) blockParts.push(`terrain ${byReason.terrain}`);
    const blockText = blockParts.length ? ` blocked(${blockParts.join(', ')})` : '';

    const dirLabel = hexDirectionLabel(state.lineAdvanceDirection);
    log(`Line Advance (${dirLabel}): ${moves.length}/${formation.length} INF advanced.${blockText}`);
    updateHud();
    maybeAutoEndTurnAtActionLimit();
  }

  // --- Doctrine command system (secondary tactical layer)
  function friendlyEntries(side, filterFn = null) {
    const out = [];
    for (const [hk, u] of unitsByHex) {
      if (!u || u.side !== side) continue;
      if (typeof filterFn === 'function' && !filterFn(u, hk)) continue;
      out.push({ key: hk, unit: u, hex: board.byKey.get(hk) });
    }
    return out;
  }

  function enemyEntries(side) {
    return friendlyEntries(side === 'blue' ? 'red' : 'blue');
  }

  function nearestEnemyDistanceForSide(hexKey, side) {
    const d = nearestEnemyDistance(hexKey, side);
    return Number.isFinite(d) ? d : 999;
  }

  function byFrontlinePriority(entries, side) {
    const sel = activeResolverSelectionIds(side);
    const source = sel ? entries.filter((e) => sel.has(e.unit.id)) : entries;
    return cloneArray(source).sort((a, b) =>
      nearestEnemyDistanceForSide(a.key, side) - nearestEnemyDistanceForSide(b.key, side)
    );
  }

  function addCommandEffectValue(mapName, unitId, delta = 0) {
    const map = state.doctrine.effects[mapName];
    if (!map || !unitId) return;
    map[unitId] = Number(map[unitId] || 0) + Number(delta || 0);
  }

  function setCommandEffectFlag(mapName, unitId, value = true) {
    const map = state.doctrine.effects[mapName];
    if (!map || !unitId) return;
    map[unitId] = !!value;
  }

  function setCommandSideFlag(mapName, side, value = true) {
    const map = state.doctrine.effects[mapName];
    if (!map || (side !== 'blue' && side !== 'red')) return;
    map[side] = value;
  }

  function canCommandRelocateUnit(fromKey, toKey, options = {}) {
    const u = options.unit || unitsByHex.get(fromKey);
    if (!u || !toKey || !board.activeSet.has(toKey)) return false;
    if (!options.allowOccupied && isOccupied(toKey)) return false;
    const toHex = board.byKey.get(toKey);
    if (!toHex) return false;
    return Number.isFinite(terrainMoveCost(u.type, toHex.terrain));
  }

  function commandRelocateUnit(fromKey, toKey) {
    const u = unitsByHex.get(fromKey);
    if (!u) return false;
    if (!canCommandRelocateUnit(fromKey, toKey, { unit: u })) return false;
    unitsByHex.delete(fromKey);
    unitsByHex.set(toKey, u);
    return true;
  }

  function hasAdjacentFriendlyInf(hexKey, side) {
    const h = board.byKey.get(hexKey);
    if (!h) return false;
    for (const nk of h.neigh) {
      const u = unitsByHex.get(nk);
      if (u && u.side === side && u.type === 'inf') return true;
    }
    return false;
  }

  function isSurrounded(hexKey, side) {
    const h = board.byKey.get(hexKey);
    if (!h) return false;
    let hostile = 0;
    for (const nk of h.neigh) {
      const u = unitsByHex.get(nk);
      if (u && u.side !== side) hostile += 1;
    }
    return hostile >= 4;
  }

  function findLargestContiguousGroup(entries, maxCount = 6) {
    const sel = activeResolverSelectionIds(entries[0]?.unit?.side || state.side);
    const source = sel ? entries.filter((e) => sel.has(e.unit.id)) : entries;
    if (!source.length) return [];
    const byKey = new Map(source.map(e => [e.key, e]));
    const seen = new Set();
    let best = [];
    for (const e of source) {
      if (seen.has(e.key)) continue;
      const stack = [e.key];
      const group = [];
      seen.add(e.key);
      while (stack.length) {
        const k = stack.pop();
        const item = byKey.get(k);
        if (!item) continue;
        group.push(item);
        const h = board.byKey.get(k);
        if (!h) continue;
        for (const nk of h.neigh) {
          if (seen.has(nk) || !byKey.has(nk)) continue;
          seen.add(nk);
          stack.push(nk);
        }
      }
      if (group.length > best.length) best = group;
    }
    return byFrontlinePriority(best, source[0]?.unit?.side || state.side).slice(0, maxCount);
  }

  function chooseRowEntries(entries, count = 3) {
    const sel = activeResolverSelectionIds(entries[0]?.unit?.side || state.side);
    const source = sel ? entries.filter((e) => sel.has(e.unit.id)) : entries;
    if (!source.length) return [];
    const byRow = new Map();
    for (const e of source) {
      const h = e.hex || board.byKey.get(e.key);
      if (!h) continue;
      // Row is depth-relative to current forward axis (not always literal board r).
      const rk = String(axisScalarsForHex(h, state.forwardAxis).approachRaw);
      if (!byRow.has(rk)) byRow.set(rk, []);
      byRow.get(rk).push(e);
    }
    let best = [];
    for (const rowEntries of byRow.values()) {
      if (rowEntries.length > best.length) best = rowEntries;
    }
    return byFrontlinePriority(best, source[0]?.unit?.side || state.side).slice(0, count);
  }

  function entriesAdjacent(a, b) {
    if (!a || !b) return false;
    const ah = a.hex || board.byKey.get(a.key);
    const bh = b.hex || board.byKey.get(b.key);
    if (!ah || !bh) return false;
    return ah.neigh.includes(bh.k);
  }

  function chooseAdjacentRowEntries(entries, count = 3, minCount = 1) {
    const sel = activeResolverSelectionIds(entries[0]?.unit?.side || state.side);
    const source = sel ? entries.filter((e) => sel.has(e.unit.id)) : entries;
    if (!source.length) return [];
    const byRow = new Map();
    for (const e of source) {
      const h = e.hex || board.byKey.get(e.key);
      if (!h) continue;
      const rk = String(axisScalarsForHex(h, state.forwardAxis).approachRaw);
      if (!byRow.has(rk)) byRow.set(rk, []);
      byRow.get(rk).push(e);
    }

    let bestComponent = [];
    for (const rowEntries of byRow.values()) {
      const byKey = new Map(rowEntries.map((e) => [e.key, e]));
      const seen = new Set();
      for (const e of rowEntries) {
        if (seen.has(e.key)) continue;
        const stack = [e];
        const component = [];
        seen.add(e.key);
        while (stack.length) {
          const cur = stack.pop();
          component.push(cur);
          for (const candidate of rowEntries) {
            if (seen.has(candidate.key)) continue;
            if (!entriesAdjacent(cur, candidate)) continue;
            seen.add(candidate.key);
            stack.push(candidate);
          }
        }
        if (component.length > bestComponent.length) bestComponent = component;
      }
    }

    if (bestComponent.length < minCount) return [];
    return byFrontlinePriority(bestComponent, source[0]?.unit?.side || state.side).slice(0, count);
  }

  function quickWithdrawCandidates(side) {
    return friendlyEntries(side, (u, hk) => {
      if (u.type !== 'skr' && u.type !== 'arc') return false;
      if (!isEngaged(hk, side)) return false;
      if (isSurrounded(hk, side)) return false;
      return disengageTargets(hk, u).size > 0;
    });
  }

  function inwardLateralDirectionForKey(hexKey, axis = state.forwardAxis) {
    const h = board.byKey.get(hexKey);
    if (!h) return null;
    const geom = buildAxisGeometry(axis);
    const current = geom.byKey.get(hexKey);
    if (!current) return null;
    const currentAbs = Math.abs(current.lateralN - 0.5);
    let best = null;
    let bestAbs = currentAbs;
    for (const dir of axisLateralDirections(axis)) {
      const nk = stepKeyInDirection(hexKey, dir);
      if (!nk) continue;
      const nm = geom.byKey.get(nk);
      if (!nm) continue;
      const nAbs = Math.abs(nm.lateralN - 0.5);
      if (nAbs < bestAbs) {
        bestAbs = nAbs;
        best = dir;
      }
    }
    return best;
  }

  function selectJawsInwardVeteranEntries(side, maxCount = 4) {
    const geom = buildAxisGeometry(state.forwardAxis);
    const sel = activeResolverSelectionIds(side);
    const vets = friendlyEntries(side, (u) => {
      if (u.type !== 'inf' || u.quality !== 'veteran') return false;
      if (sel && !sel.has(u.id)) return false;
      return true;
    });
    const left = [];
    const right = [];
    for (const e of vets) {
      const lateral = geom.lateralForSide(side, e.key);
      if (lateral < 0) left.push({ e, score: Math.abs(lateral) });
      else if (lateral > 0) right.push({ e, score: Math.abs(lateral) });
    }
    left.sort((a, b) => b.score - a.score);
    right.sort((a, b) => b.score - a.score);
    if (!left.length || !right.length) return [];

    const out = [left.shift().e, right.shift().e];
    while (out.length < maxCount && (left.length || right.length)) {
      const nextLeft = left[0] || null;
      const nextRight = right[0] || null;
      if (nextLeft && (!nextRight || nextLeft.score >= nextRight.score)) out.push(left.shift().e);
      else if (nextRight) out.push(right.shift().e);
    }
    return out.slice(0, maxCount);
  }

  function collapseCenterCandidates(side, maxCenter = 5) {
    const geom = buildAxisGeometry(state.forwardAxis);
    const sel = activeResolverSelectionIds(side);
    const allInf = friendlyEntries(side, (u) => {
      if (u.type !== 'inf') return false;
      if (sel && !sel.has(u.id)) return false;
      return true;
    });
    return byFrontlinePriority(
      allInf.filter((e) => Math.abs(geom.lateralForSide(side, e.key)) <= 0.22),
      side
    ).slice(0, maxCenter);
  }

  function chooseWingEntries(entries, side, count) {
    const sel = activeResolverSelectionIds(side);
    const source = sel ? entries.filter((e) => sel.has(e.unit.id)) : entries;
    if (!source.length) return [];
    const geom = buildAxisGeometry(state.forwardAxis);
    const scored = cloneArray(source).map((e) => {
      const depth = geom.frontDepthForSide(side, e.key);
      const lateral = geom.lateralForSide(side, e.key);
      return { entry: e, score: Math.abs(lateral) + (depth * 0.2) };
    });
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, count).map(x => x.entry);
  }

  function selectReserveEntries(side, maxCount = 3) {
    const geom = buildAxisGeometry(state.forwardAxis);
    const sel = activeResolverSelectionIds(side);
    const scoredPrimary = friendlyEntries(side, (u, hk) => {
      if (u.type === 'gen') return false;
      if (sel && !sel.has(u.id)) return false;
      if (isEngaged(hk, side)) return false;
      return geom.frontDepthForSide(side, hk) >= 0.56;
    }).map((e) => ({ e, depth: geom.frontDepthForSide(side, e.key) }));
    scoredPrimary.sort((a, b) => b.depth - a.depth);

    if (scoredPrimary.length) return scoredPrimary.slice(0, maxCount).map((x) => x.e);

    const scoredFallback = friendlyEntries(side, (u, hk) => {
      if (u.type === 'gen') return false;
      if (sel && !sel.has(u.id)) return false;
      return geom.frontDepthForSide(side, hk) >= 0.42;
    }).map((e) => ({ e, depth: geom.frontDepthForSide(side, e.key) }));
    scoredFallback.sort((a, b) => b.depth - a.depth);
    return scoredFallback.slice(0, maxCount).map((x) => x.e);
  }

  function addDoctrineBuffThroughNextOwnTurn(mapName, unitId, value, side) {
    addDoctrineLongEffect({
      map: mapName,
      unitId,
      value,
      side,
      expiresOnSide: side,
      expiresAfterSerial: state.turnSerial + 2,
    });
  }

  function pickNearestGeneral(side) {
    const gens = friendlyEntries(side, (u) => u.type === 'gen');
    if (!gens.length) return null;
    return byFrontlinePriority(gens, side)[0];
  }

  function commandResult(ok, message, affectedUnitIds = [], spendTargets = false) {
    return { ok, message, affectedUnitIds, spendTargets };
  }

  function resolveDoctrineQuickDress(side) {
    const inf = friendlyEntries(side, (u, hk) => u.type === 'inf' && unitCanActivate(u, hk));
    if (!inf.length) return commandResult(false, 'No eligible infantry for Quick Dress.');
    const picks = chooseAdjacentRowEntries(inf, 3, 1);
    if (!picks.length) return commandResult(false, 'No adjacent infantry line available for Quick Dress.');
    const lateral = axisLateralDirections(state.forwardAxis);
    const moved = [];
    for (const e of picks) {
      let movedOne = false;
      for (const dir of lateral) {
        const toKey = stepKeyInDirection(e.key, dir);
        if (!toKey) continue;
        if (commandRelocateUnit(e.key, toKey)) {
          moved.push(unitsByHex.get(toKey)?.id || e.unit.id);
          movedOne = true;
          break;
        }
      }
      if (!movedOne) moved.push(e.unit.id);
    }
    return commandResult(true, `Quick Dress shifted ${picks.length} infantry laterally.`, moved, true);
  }

  function resolveDoctrineRunnerBurst(side) {
    const runners = byFrontlinePriority(friendlyEntries(side, (u) => u.type === 'run'), side);
    const pick = runners[0];
    if (!pick) return commandResult(false, 'No runner available for Runner Burst.');
    addCommandEffectValue('bonusMove', pick.unit.id, 3);
    setCommandEffectFlag('cannotAttack', pick.unit.id, true);
    const supported = [];
    for (const e of friendlyEntries(side, (u, hk) => u.id !== pick.unit.id && axialDistance(pick.hex.q, pick.hex.r, board.byKey.get(hk).q, board.byKey.get(hk).r) <= 1)) {
      setCommandEffectFlag('commandOverrideUnitIds', e.unit.id, true);
      supported.push(e.unit.id);
    }
    return commandResult(
      true,
      `Runner Burst set on ${side.toUpperCase()} RUN at ${pick.key} (+3 move, relay support to ${supported.length} nearby unit(s)).`,
      [pick.unit.id, ...supported],
      false
    );
  }

  function resolveDoctrineJavelinVolley(side) {
    const picks = byFrontlinePriority(friendlyEntries(side, (u) => u.type === 'skr' || u.type === 'arc'), side).slice(0, 2);
    if (!picks.length) return commandResult(false, 'No skirmisher/archer units available for Javelin Volley.');
    for (const e of picks) addCommandEffectValue('rangedBonusDice', e.unit.id, 2);
    return commandResult(true, `Javelin Volley primed ${picks.length} light missile unit(s) with +2 ranged dice.`, picks.map(e => e.unit.id), false);
  }

  function resolveDoctrineQuickWithdraw(side) {
    const picks = byFrontlinePriority(quickWithdrawCandidates(side), side);
    const pick = picks[0];
    if (!pick) return commandResult(false, 'No engaged skirmisher/archer available for Quick Withdraw.');
    const outTargets = [...disengageTargets(pick.key, pick.unit)];
    const toKey = outTargets[0];
    if (!toKey) return commandResult(false, 'Quick Withdraw failed: no safe hex available.');
    const moved = commandRelocateUnit(pick.key, toKey);
    if (!moved) return commandResult(false, 'Quick Withdraw blocked by terrain or occupancy.');
    return commandResult(true, `Quick Withdraw moved ${UNIT_BY_ID.get(pick.unit.type)?.abbrev || pick.unit.type} to ${toKey}.`, [pick.unit.id], true);
  }

  function resolveDoctrineCloseRanks(side) {
    const inf = byFrontlinePriority(friendlyEntries(side, (u) => u.type === 'inf'), side);
    const pick = inf[0];
    if (!pick) return commandResult(false, 'No infantry available for Close Ranks.');
    addCommandEffectValue('meleeDefenseBonus', pick.unit.id, 1);
    setCommandEffectFlag('cannotMove', pick.unit.id, true);
    return commandResult(true, `Close Ranks applied to INF at ${pick.key}.`, [pick.unit.id], false);
  }

  function resolveDoctrineSpurHorses(side) {
    const sel = activeResolverSelectionIds(side);
    const cav = byFrontlinePriority(
      friendlyEntries(side, (u, hk) => {
        if (u.type !== 'cav') return false;
        if (!inCommandAt(hk, side)) return false;
        if (sel && !sel.has(u.id)) return false;
        return true;
      }),
      side
    );
    const pick = cav[0];
    if (!pick) return commandResult(false, 'No cavalry in command for Spur the Horses.');
    addCommandEffectValue('bonusMove', pick.unit.id, 1);
    return commandResult(true, `Spur the Horses applied to CAV at ${pick.key}.`, [pick.unit.id], false);
  }

  function resolveDoctrineSignalCall(side) {
    const gens = friendlyEntries(side, (u) => u.type === 'gen');
    if (!gens.length) return commandResult(false, 'No general available for Signal Call.');
    const targets = [];
    for (const e of friendlyEntries(side, (u) => u.type !== 'gen')) {
      const h = e.hex;
      if (!h) continue;
      let exactlyOutside = false;
      for (const g of gens) {
        const radius = commandRadiusForUnit(g.unit);
        const d = axialDistance(h.q, h.r, g.hex.q, g.hex.r);
        if (d > radius && d <= radius + 2) {
          exactlyOutside = true;
          break;
        }
      }
      if (exactlyOutside) targets.push(e);
    }
    const picks = byFrontlinePriority(targets, side).slice(0, 2);
    if (!picks.length) return commandResult(false, 'No nearby out-of-command units found for Signal Call.');
    for (const p of picks) setCommandEffectFlag('commandOverrideUnitIds', p.unit.id, true);
    return commandResult(true, `Signal Call temporarily extended command to ${picks.length} unit(s).`, picks.map(p => p.unit.id), false);
  }

  function resolveDoctrineLooseScreen(side) {
    const picks = byFrontlinePriority(
      friendlyEntries(side, (u, hk) => (u.type === 'skr' || u.type === 'arc') && hasAdjacentFriendlyInf(hk, side)),
      side
    ).slice(0, 2);
    if (!picks.length) return commandResult(false, 'No adjacent screen units available for Loose Screen.');
    for (const e of picks) setCommandEffectFlag('wingScreenUnitIds', e.unit.id, true);
    return commandResult(true, `Loose Screen enabled for ${picks.length} unit(s).`, picks.map(e => e.unit.id), false);
  }

  function resolveDoctrineCoveringFire(side) {
    setCommandSideFlag('coverFireIgnoreTerrain', side, 2);
    return commandResult(true, 'Covering Fire primed: next two ranged attacks ignore terrain ranged penalties.', [], false);
  }

  function resolveDoctrineHoldFast(side) {
    const pick = byFrontlinePriority(friendlyEntries(side), side)[0];
    if (!pick) return commandResult(false, 'No unit available for Hold Fast.');
    addDoctrineLongEffect({
      map: 'ignoreRetreatCount',
      unitId: pick.unit.id,
      value: 2,
      side,
      expiresOnSide: side,
      expiresAfterSerial: state.turnSerial,
    });
    addDoctrineLongEffect({
      map: 'meleeDefenseBonus',
      unitId: pick.unit.id,
      value: 1,
      side,
      expiresOnSide: side,
      expiresAfterSerial: state.turnSerial,
    });
    return commandResult(true, `Hold Fast applied to unit at ${pick.key} (ignore 2 retreats, +1 melee defense).`, [pick.unit.id], false);
  }

  function resolveDoctrineShieldWall(side) {
    const inf = friendlyEntries(side, (u) => u.type === 'inf');
    if (inf.length < 3) return commandResult(false, 'Shield Wall requires at least 3 infantry.');
    const picks = findLargestContiguousGroup(inf, 6).slice(0, Math.min(6, inf.length));
    if (picks.length < 3) return commandResult(false, 'No contiguous infantry block for Shield Wall.');
    for (const e of picks) {
      addDoctrineLongEffect({ map: 'meleeDefenseBonus', unitId: e.unit.id, value: 1, side, expiresOnSide: side, expiresAfterSerial: state.turnSerial });
      addDoctrineLongEffect({ map: 'cannotMove', unitId: e.unit.id, value: 1, side, expiresOnSide: side, expiresAfterSerial: state.turnSerial });
    }
    return commandResult(true, `Shield Wall formed with ${picks.length} infantry.`, picks.map(e => e.unit.id), false);
  }

  function resolveDoctrineCavalryExploit(side) {
    const picks = byFrontlinePriority(friendlyEntries(side, (u) => u.type === 'cav'), side).slice(0, 3);
    if (!picks.length) return commandResult(false, 'No cavalry available for Cavalry Exploit.');
    for (const e of picks) addCommandEffectValue('bonusAttackDice', e.unit.id, 1);
    return commandResult(true, `Cavalry Exploit primed ${picks.length} cavalry unit(s).`, picks.map(e => e.unit.id), false);
  }

  function resolveDoctrineRefuseFlank(side) {
    const picks = chooseWingEntries(friendlyEntries(side, (u) => u.type === 'inf'), side, 5).slice(0, 5);
    if (picks.length < 2) return commandResult(false, 'Refuse the Flank requires 2 infantry on one wing.');
    const affectedIds = picks.map((e) => e.unit.id);
    let movedCount = 0;
    const backDir = oppositeDirection(sideForwardDirection(side, state.forwardAxis));
    for (const e of picks) {
      const candidates = [];
      if (backDir) candidates.push(stepKeyInDirection(e.key, backDir));
      const inwardDir = inwardLateralDirectionForKey(e.key);
      if (inwardDir) candidates.push(stepKeyInDirection(e.key, inwardDir));
      const toKey = candidates.find((k) => k && !isOccupied(k));
      if (toKey && commandRelocateUnit(e.key, toKey)) movedCount += 1;
    }
    if (movedCount <= 0) return commandResult(false, 'Refuse the Flank failed: no selected infantry could reposition.');
    return commandResult(true, `Refuse the Flank repositioned ${movedCount}/${picks.length} infantry.`, affectedIds, true);
  }

  function resolveDoctrineForcedMarch(side) {
    const picks = byFrontlinePriority(
      friendlyEntries(side, (u) => u.type === 'inf' || u.type === 'skr'),
      side
    ).slice(0, 4);
    if (!picks.length) return commandResult(false, 'No INF/SKR available for Forced March.');

    const affectedIds = picks.map((e) => e.unit.id);
    const sourceSet = new Set(picks.map((e) => e.key));
    const planned = [];
    const blocked = [];

    // Build a coordinated move plan first, then apply all moves together.
    // This allows rear units to move into hexes vacated by selected front units.
    for (const e of picks) {
      const toKey = forwardStepKey(e.key, side);
      if (!toKey || !board.activeSet.has(toKey)) {
        blocked.push({ fromKey: e.key, reason: 'off-board' });
        continue;
      }
      if (!canCommandRelocateUnit(e.key, toKey, { unit: e.unit, allowOccupied: true })) {
        blocked.push({ fromKey: e.key, reason: 'terrain' });
        continue;
      }
      const occ = unitsByHex.get(toKey);
      if (occ && !sourceSet.has(toKey)) {
        blocked.push({ fromKey: e.key, reason: 'occupied' });
        continue;
      }
      planned.push({ fromKey: e.key, toKey, unit: e.unit });
    }

    // If destination is another selected source hex, that source must also move;
    // otherwise we would collide into a stationary selected unit.
    const plannedFromSet = new Set(planned.map((m) => m.fromKey));
    const filtered = [];
    for (const m of planned) {
      if (sourceSet.has(m.toKey) && !plannedFromSet.has(m.toKey)) {
        blocked.push({ fromKey: m.fromKey, reason: 'occupied' });
        continue;
      }
      filtered.push(m);
    }

    for (const e of picks) {
      // Forced march units cannot attack this turn.
      setCommandEffectFlag('cannotAttack', e.unit.id, true);
    }

    if (!filtered.length) {
      return commandResult(false, 'Forced March failed: selected units are blocked and cannot advance.');
    }

    // Apply coordinated relocation.
    for (const m of filtered) unitsByHex.delete(m.fromKey);
    for (const m of filtered) unitsByHex.set(m.toKey, m.unit);

    const movedCount = filtered.length;
    const blockedCount = Math.max(0, picks.length - movedCount);

    return commandResult(
      true,
      `Forced March advanced ${movedCount}/${picks.length} selected unit(s)` +
      `${blockedCount ? ` (blocked ${blockedCount})` : ''} and locked them from attacking this turn.`,
      affectedIds,
      true
    );
  }

  function resolveDoctrineStrengthenCenter(side) {
    const gen = pickNearestGeneral(side);
    if (!gen) return commandResult(false, 'No general available for Strengthen the Center.');
    const picks = byFrontlinePriority(
      friendlyEntries(side, (u, hk) => u.type === 'inf' && axialDistance(gen.hex.q, gen.hex.r, board.byKey.get(hk).q, board.byKey.get(hk).r) <= 2),
      side
    ).slice(0, 4);
    if (!picks.length) return commandResult(false, 'No infantry within 2 hexes of a general for Strengthen the Center.');
    for (const e of picks) {
      addDoctrineLongEffect({ map: 'ignoreRetreatCount', unitId: e.unit.id, value: 1, side, expiresOnSide: side, expiresAfterSerial: state.turnSerial });
    }
    return commandResult(true, `Strengthen the Center reinforced ${picks.length} infantry.`, picks.map(e => e.unit.id), false);
  }

  function resolveDoctrineWingScreen(side) {
    const picks = chooseWingEntries(friendlyEntries(side, (u) => u.type === 'skr' || u.type === 'arc'), side, 4);
    if (!picks.length) return commandResult(false, 'No wing SKR/ARC available for Wing Screen.');
    for (const e of picks) {
      setCommandEffectFlag('wingScreenUnitIds', e.unit.id, true);
      addCommandEffectValue('bonusMove', e.unit.id, 1);
    }
    return commandResult(true, `Wing Screen primed ${picks.length} unit(s) for attack-and-step tempo (+1 move).`, picks.map(e => e.unit.id), false);
  }

  function resolveDoctrineCountercharge(side) {
    const picks = byFrontlinePriority(
      friendlyEntries(side, (u, hk) => u.type === 'cav' && !isSurrounded(hk, side)),
      side
    ).slice(0, 3);
    if (!picks.length) return commandResult(false, 'No cavalry available for Countercharge.');
    for (const e of picks) {
      setCommandEffectFlag('counterchargeUnitIds', e.unit.id, true);
      addCommandEffectValue('bonusAttackDice', e.unit.id, 1);
    }
    return commandResult(true, `Countercharge readied ${picks.length} cavalry reaction unit(s) (+1 attack die).`, picks.map(e => e.unit.id), false);
  }

  function resolveDoctrineJawsInward(side) {
    const picks = byFrontlinePriority(
      friendlyEntries(side, (u) => u.type === 'inf' && (u.quality === 'veteran' || u.quality === 'regular')),
      side
    ).slice(0, 5);
    if (picks.length < 2) return commandResult(false, 'Jaws Inward requires at least 2 regular/veteran infantry.');
    const affectedIds = picks.map((e) => e.unit.id);
    let movedCount = 0;
    for (const e of picks) {
      const inwardDir = inwardLateralDirectionForKey(e.key);
      const toKey = inwardDir ? stepKeyInDirection(e.key, inwardDir) : null;
      if (toKey && commandRelocateUnit(e.key, toKey)) movedCount += 1;
    }
    if (movedCount <= 0) return commandResult(false, 'Jaws Inward failed: no selected infantry could move inward.');
    return commandResult(true, `Jaws Inward shifted ${movedCount}/${picks.length} experienced infantry inward.`, affectedIds, true);
  }

  function resolveDoctrineLocalReserve(side) {
    const geom = buildAxisGeometry(state.forwardAxis);
    const picks = byFrontlinePriority(
      friendlyEntries(side, (u, hk) => geom.frontDepthForSide(side, hk) >= 0.58),
      side
    ).slice(0, 3);
    if (!picks.length) return commandResult(false, 'No reserve/rear units available for Local Reserve.');
    for (const e of picks) {
      setCommandEffectFlag('reserveReleaseUnitIds', e.unit.id, true);
      setCommandEffectFlag('commandOverrideUnitIds', e.unit.id, true);
    }
    return commandResult(true, `Local Reserve activated ${picks.length} reserve unit(s) with temporary command override.`, picks.map(e => e.unit.id), false);
  }

  function resolveDoctrineDriveThemBack(side) {
    const picks = byFrontlinePriority(friendlyEntries(side, (u) => u.type === 'inf'), side).slice(0, 4);
    if (!picks.length) return commandResult(false, 'No infantry available for Drive Them Back.');
    for (const e of picks) {
      setCommandEffectFlag('driveThemBackUnitIds', e.unit.id, true);
      addCommandEffectValue('bonusAttackDice', e.unit.id, 1);
    }
    return commandResult(true, `Drive Them Back primed ${picks.length} infantry melee attack(s) (+1 die, disarray pressure).`, picks.map(e => e.unit.id), false);
  }

  function resolveDoctrineFullLineAdvance(side) {
    const picks = chooseRowEntries(friendlyEntries(side), 8);
    if (picks.length < 3) return commandResult(false, 'No large row available for Full Line Advance.');
    const movedIds = [];
    for (const e of picks) {
      const toKey = forwardStepKey(e.key, side);
      if (toKey && commandRelocateUnit(e.key, toKey)) movedIds.push(e.unit.id);
      else movedIds.push(e.unit.id);
    }
    return commandResult(true, `Full Line Advance pushed ${picks.length} unit(s) forward.`, movedIds, true);
  }

  function resolveDoctrineGrandShieldWall(side) {
    const inf = friendlyEntries(side, (u) => u.type === 'inf');
    if (inf.length < 5) return commandResult(false, 'Grand Shield Wall requires at least 5 infantry.');
    const picks = findLargestContiguousGroup(inf, 8).slice(0, Math.min(8, inf.length));
    if (picks.length < 5) return commandResult(false, 'No major contiguous infantry block for Grand Shield Wall.');
    for (const e of picks) {
      if (e.unit.disarray) e.unit.disarray = false;
      addDoctrineBuffThroughNextOwnTurn('meleeDefenseBonus', e.unit.id, 3, side);
      addDoctrineBuffThroughNextOwnTurn('ignoreRetreatCount', e.unit.id, 3, side);
      addDoctrineBuffThroughNextOwnTurn('cannotMove', e.unit.id, 1, side);
    }
    return commandResult(
      true,
      `Grand Shield Wall locked ${picks.length} infantry in a hardened wall (defense +3, ignore 3 retreats, holds through your next turn).`,
      picks.map(e => e.unit.id),
      true
    );
  }

  function resolveDoctrineAllOutCavalrySweep(side) {
    const picks = chooseWingEntries(friendlyEntries(side, (u) => u.type === 'cav'), side, 4);
    const usedFallback = !picks.length;
    const selected = usedFallback
      ? chooseWingEntries(
          friendlyEntries(side, (u) => u.type === 'inf' || u.type === 'skr' || u.type === 'arc'),
          side,
          3
        )
      : picks;
    if (!selected.length) return commandResult(false, 'No eligible wing units available for All-Out Cavalry Sweep.');

    let repositioned = 0;
    for (const e of selected) {
      const toKey = forwardStepKey(e.key, side);
      if (toKey && commandRelocateUnit(e.key, toKey)) repositioned += 1;
    }

    const atkBonus = usedFallback ? 2 : 3;
    const moveBonus = 2;
    for (const e of selected) {
      addDoctrineBuffThroughNextOwnTurn('bonusMove', e.unit.id, moveBonus, side);
      addDoctrineBuffThroughNextOwnTurn('bonusAttackDice', e.unit.id, atkBonus, side);
      addDoctrineBuffThroughNextOwnTurn('driveThemBackUnitIds', e.unit.id, 1, side);
    }

    if (usedFallback) {
      return commandResult(
        true,
        `All-Out Cavalry Sweep converted to Wing Assault: ${selected.length} flank units primed (+2 move, +2 attack dice, disarray pressure) through your next turn; repositioned ${repositioned}.`,
        selected.map(e => e.unit.id),
        false
      );
    }

    return commandResult(
      true,
      `All-Out Cavalry Sweep primed ${selected.length} cavalry (+2 move, +3 attack dice, disarray pressure) through your next turn; repositioned ${repositioned}.`,
      selected.map(e => e.unit.id),
      false
    );
  }

  function resolveDoctrineCommitReserves(side) {
    const picks = selectReserveEntries(side, 4);
    if (!picks.length) return commandResult(false, 'No rear reserve units available to commit.');

    let moved = 0;
    for (const e of picks) {
      const toKey = forwardStepKey(e.key, side);
      if (toKey && commandRelocateUnit(e.key, toKey)) moved += 1;
    }

    for (const e of picks) {
      addDoctrineBuffThroughNextOwnTurn('bonusMove', e.unit.id, 1, side);
      addDoctrineBuffThroughNextOwnTurn('commandOverrideUnitIds', e.unit.id, 1, side);
      addDoctrineBuffThroughNextOwnTurn('bonusAttackDice', e.unit.id, 1, side);
    }

    return commandResult(
      true,
      `Commit Reserves activated ${picks.length} rear-line units (furthest from enemy), stepped ${moved} forward, and granted command/mobility/attack support through your next turn.`,
      picks.map(e => e.unit.id),
      false
    );
  }

  function resolveDoctrineGeneralAssault(side) {
    const gen = pickNearestGeneral(side);
    if (!gen) return commandResult(false, 'No general available for General Assault.');
    const picks = byFrontlinePriority(
      friendlyEntries(side, (u, hk) => {
        if (u.id === gen.unit.id) return false;
        const h = board.byKey.get(hk);
        return axialDistance(gen.hex.q, gen.hex.r, h.q, h.r) <= (commandRadiusForUnit(gen.unit) + 1);
      }),
      side
    ).slice(0, 4);
    if (!picks.length) return commandResult(false, 'No sector units available for General Assault.');
    for (const e of picks) setCommandEffectFlag('reserveReleaseUnitIds', e.unit.id, true);
    return commandResult(true, `General Assault synchronized ${picks.length} sector units.`, picks.map(e => e.unit.id), false);
  }

  function resolveDoctrineCollapseCenter(side) {
    const geom = buildAxisGeometry(state.forwardAxis);
    const allInf = friendlyEntries(side, (u) => u.type === 'inf');
    const selectedSet = activeResolverSelectionIds(side);
    let centerInf = [];
    let wingPicks = [];
    if (selectedSet && selectedSet.size > 0) {
      const selectedInf = byFrontlinePriority(
        allInf.filter((e) => selectedSet.has(e.unit.id)),
        side
      );
      if (selectedInf.length < 3) {
        return commandResult(false, 'Collapse the Center needs at least 3 selected infantry.');
      }
      centerInf = selectedInf
        .filter((e) => Math.abs(geom.lateralForSide(side, e.key)) <= 0.22)
        .slice(0, 5);
      if (centerInf.length < 1) {
        centerInf = selectedInf.slice(0, Math.min(5, selectedInf.length));
      }
      const centerKeysManual = new Set(centerInf.map((e) => e.key));
      wingPicks = selectedInf.filter((e) => !centerKeysManual.has(e.key)).slice(0, 4);
    } else {
      centerInf = collapseCenterCandidates(side, 5);
      if (centerInf.length < 3) return commandResult(false, 'Collapse the Center needs 3 infantry.');
      const centerKeys = new Set(centerInf.map((e) => e.key));
      const leftWing = [];
      const rightWing = [];
      for (const e of allInf) {
        if (centerKeys.has(e.key)) continue;
        const lateral = geom.lateralForSide(side, e.key);
        if (lateral < -0.18) leftWing.push({ e, score: Math.abs(lateral) });
        else if (lateral > 0.18) rightWing.push({ e, score: Math.abs(lateral) });
      }
      leftWing.sort((a, b) => b.score - a.score);
      rightWing.sort((a, b) => b.score - a.score);
      wingPicks = [...leftWing.slice(0, 2).map((x) => x.e), ...rightWing.slice(0, 2).map((x) => x.e)];
    }

    const selectedIds = new Set(centerInf.map((e) => e.unit.id));
    for (const w of wingPicks) selectedIds.add(w.unit.id);

    let centerMoved = 0;
    let wingMoved = 0;
    const backDir = oppositeDirection(sideForwardDirection(side, state.forwardAxis));
    for (const e of centerInf) {
      const toKey = backDir ? stepKeyInDirection(e.key, backDir) : null;
      if (toKey && commandRelocateUnit(e.key, toKey)) centerMoved += 1;
    }
    for (const e of wingPicks) {
      const inwardDir = inwardLateralDirectionForKey(e.key);
      const toKey = inwardDir ? stepKeyInDirection(e.key, inwardDir) : null;
      if (toKey && commandRelocateUnit(e.key, toKey)) wingMoved += 1;
    }
    if ((centerMoved + wingMoved) <= 0) {
      return commandResult(false, 'Collapse the Center failed: no selected infantry could reposition.');
    }
    return commandResult(
      true,
      `Collapse the Center: center fallback ${centerMoved}/${centerInf.length}, wing compression ${wingMoved}/${wingPicks.length}.`,
      [...selectedIds],
      true
    );
  }

  function resolveDoctrineLastPush(side) {
    const picks = byFrontlinePriority(friendlyEntries(side, (u) => u.type === 'inf' || u.type === 'cav'), side).slice(0, 4);
    if (!picks.length) return commandResult(false, 'No INF/CAV available for Last Push.');
    for (const e of picks) addCommandEffectValue('bonusAttackDice', e.unit.id, 2);
    return commandResult(true, `Last Push primed ${picks.length} unit(s) for high-commitment attacks (+2 dice).`, picks.map(e => e.unit.id), false);
  }

  function resolveDoctrineReforgeLine(side) {
    const inf = friendlyEntries(side, (u) => u.type === 'inf');
    if (inf.length < 3) return commandResult(false, 'Reforge the Line requires connected infantry.');
    const picks = findLargestContiguousGroup(inf, 6);
    if (!picks.length) return commandResult(false, 'No connected infantry group to reforge.');
    const movedIds = [];
    for (const e of picks) {
      const opts = [sideForwardDirection(side, state.forwardAxis), ...axisLateralDirections(state.forwardAxis), oppositeDirection(sideForwardDirection(side, state.forwardAxis))];
      const toKey = opts.map(dir => stepKeyInDirection(e.key, dir)).find(k => k && !isOccupied(k));
      if (toKey && commandRelocateUnit(e.key, toKey)) movedIds.push(e.unit.id);
      else movedIds.push(e.unit.id);
    }
    return commandResult(true, `Reforge the Line repositioned ${picks.length} infantry by up to 1 hex.`, movedIds, true);
  }

  function resolveDoctrineCommandSurge(side) {
    const gen = pickNearestGeneral(side);
    if (!gen) return commandResult(false, 'No general available for Command Surge.');
    addCommandEffectValue('commandRadiusBonusByGeneralId', gen.unit.id, 1);
    const picks = byFrontlinePriority(
      friendlyEntries(side, (u, hk) => !inCommandAt(hk, side)),
      side
    ).slice(0, 3);
    for (const e of picks) setCommandEffectFlag('commandOverrideUnitIds', e.unit.id, true);
    return commandResult(true, `Command Surge expanded ${side.toUpperCase()} command radius around GEN at ${gen.key}.`, picks.map(e => e.unit.id), false);
  }

  function resolveDoctrineStandOrDie(side) {
    const gen = pickNearestGeneral(side);
    if (!gen) return commandResult(false, 'No general available for Stand or Die.');
    const picks = byFrontlinePriority(
      friendlyEntries(side, (u, hk) => {
        if (u.type !== 'inf') return false;
        const h = board.byKey.get(hk);
        return axialDistance(gen.hex.q, gen.hex.r, h.q, h.r) <= 2;
      }),
      side
    ).slice(0, 5);
    if (picks.length < 3) return commandResult(false, 'Stand or Die needs 3 infantry around a general.');
    for (const e of picks) {
      addDoctrineLongEffect({ map: 'ignoreAllRetreat', unitId: e.unit.id, value: 1, side, expiresOnSide: side, expiresAfterSerial: state.turnSerial });
      addDoctrineLongEffect({ map: 'cannotMove', unitId: e.unit.id, value: 1, side, expiresOnSide: side, expiresAfterSerial: state.turnSerial });
      addDoctrineLongEffect({ map: 'meleeDefenseBonus', unitId: e.unit.id, value: 1, side, expiresOnSide: side, expiresAfterSerial: state.turnSerial });
    }
    return commandResult(true, `Stand or Die anchored ${picks.length} infantry around the command node (+1 melee defense, no retreat).`, picks.map(e => e.unit.id), false);
  }

  const COMMAND_RESOLVERS = {
    quick_dress: resolveDoctrineQuickDress,
    runner_burst: resolveDoctrineRunnerBurst,
    javelin_volley: resolveDoctrineJavelinVolley,
    quick_withdraw: resolveDoctrineQuickWithdraw,
    close_ranks: resolveDoctrineCloseRanks,
    spur_horses: resolveDoctrineSpurHorses,
    signal_call: resolveDoctrineSignalCall,
    loose_screen: resolveDoctrineLooseScreen,
    covering_fire: resolveDoctrineCoveringFire,
    hold_fast: resolveDoctrineHoldFast,
    shield_wall: resolveDoctrineShieldWall,
    cavalry_exploit: resolveDoctrineCavalryExploit,
    refuse_flank: resolveDoctrineRefuseFlank,
    forced_march: resolveDoctrineForcedMarch,
    strengthen_center: resolveDoctrineStrengthenCenter,
    wing_screen: resolveDoctrineWingScreen,
    countercharge: resolveDoctrineCountercharge,
    jaws_inward: resolveDoctrineJawsInward,
    local_reserve: resolveDoctrineLocalReserve,
    drive_them_back: resolveDoctrineDriveThemBack,
    full_line_advance: resolveDoctrineFullLineAdvance,
    grand_shield_wall: resolveDoctrineGrandShieldWall,
    all_out_cavalry_sweep: resolveDoctrineAllOutCavalrySweep,
    commit_reserves: resolveDoctrineCommitReserves,
    general_assault: resolveDoctrineGeneralAssault,
    collapse_center: resolveDoctrineCollapseCenter,
    last_push: resolveDoctrineLastPush,
    reforge_line: resolveDoctrineReforgeLine,
    command_surge: resolveDoctrineCommandSurge,
    stand_or_die: resolveDoctrineStandOrDie,
  };

  function resolveDoctrineCommand(side, commandId, options = {}) {
    const cmd = COMMAND_BY_ID.get(commandId);
    if (!cmd) return commandResult(false, 'Unknown command.');
    const resolver = COMMAND_RESOLVERS[cmd.resolver];
    if (typeof resolver !== 'function') return commandResult(false, `${cmd.name} has no resolver yet.`);
    return resolver(side, options);
  }

  function commandLabel(commandId) {
    const cmd = COMMAND_BY_ID.get(commandId);
    if (!cmd) return commandId;
    return `${cmd.name} [${cmd.cost}]`;
  }

  function issueDoctrineCommand(commandId, options = {}) {
    const side = state.side;
    if (state.mode !== 'play' || state.gameOver) {
      log('Commands can only be issued during live play.');
      return false;
    }
    if (state.doctrine.commandIssuedThisTurn) {
      log('Only one command can be issued each turn.');
      return false;
    }
    if (state.actsUsed >= ACT_LIMIT) {
      log('No actions left this turn.');
      return false;
    }
    if (!isCommandAvailableForUse(side, commandId)) {
      log('That command is not currently available.');
      return false;
    }

    const cmd = COMMAND_BY_ID.get(commandId);
    const selectedUnitIds = Array.isArray(options.selectedUnitIds)
      ? [...new Set(
        options.selectedUnitIds
          .map((id) => Number(id))
          .filter((id) => Number.isFinite(id))
      )]
      : [];
    const targetLimits = doctrineTargetLimits(commandId);
    if (selectedUnitIds.length > 0) {
      const legalTargetIds = new Set(
        legalDoctrineTargets(side, commandId)
          .map((t) => Number(t?.unitId))
          .filter((id) => Number.isFinite(id))
      );
      const illegal = selectedUnitIds.find((id) => !legalTargetIds.has(id));
      if (illegal) {
        log('One or more selected units are not legal targets for this directive.');
        return false;
      }
      if (selectedUnitIds.length < targetLimits.min) {
        log(`Select at least ${targetLimits.min} unit(s) for this directive, or deselect all for auto-targeting.`);
        return false;
      }
      if (Number.isFinite(targetLimits.max) && selectedUnitIds.length > targetLimits.max) {
        log(`This directive allows at most ${targetLimits.max} selected unit(s).`);
        return false;
      }
    }
    if (selectedUnitIds.length) {
      state.doctrine.resolveCtx = {
        side,
        commandId,
        selectedIds: new Set(selectedUnitIds),
      };
    } else {
      state.doctrine.resolveCtx = null;
    }
    const result = resolveDoctrineCommand(side, commandId, { selectedUnitIds });
    state.doctrine.resolveCtx = null;
    if (!result || !result.ok) {
      log(result?.message || `${cmd?.name || 'Command'} could not be executed.`);
      return false;
    }

    // Single-use orders get a built-in tempo edge:
    // cost 2/3 spent orders effectively rebate 1 action after successful execution.
    const singleUseRebate = (cmd.persistence === 'spent' && cmd.cost >= 2) ? 1 : 0;
    const actionSpend = commandActionSpend(cmd);
    state.actsUsed = Math.min(ACT_LIMIT, state.actsUsed + actionSpend);
    state.doctrine.commandIssuedThisTurn = true;
    state.doctrine.activeCommandThisTurn = commandId;
    markCommandUsed(side, commandId);

    const affectedUnitIds = Array.isArray(result.affectedUnitIds) ? result.affectedUnitIds : [];
    if (result.spendTargets) {
      for (const id of affectedUnitIds) state.actedUnitIds.add(id);
    }

    if (singleUseRebate > 0) {
      log(`${side.toUpperCase()} used ${cmd.name} (${commandUsageLabel(cmd.persistence)}, ${cmd.cost} actions, rebate ${singleUseRebate}).`);
    } else {
      log(`${side.toUpperCase()} used ${cmd.name} (${commandUsageLabel(cmd.persistence)}, ${cmd.cost} actions).`);
    }
    if (result.message) log(result.message);
    notifyEnemyDirectiveUsed(side, cmd, actionSpend);
    pushEventTrace('command.resolve', {
      commandId: cmd.id,
      side,
      cost: cmd.cost,
      actionSpend,
      persistence: cmd.persistence,
      affectedUnitIds,
      spendTargets: !!result.spendTargets,
      note: result.message || '',
    });
    closeCommandPhase();
    clearDoctrineTargeting();
    clearSelection();
    updateHud();
    maybeAutoEndTurnAtActionLimit();
    return true;
  }

  function veteranCavPostAttackWithdrawTargets(fromKey, u, actCtx) {
    const out = new Set();
    if (!u || u.type !== 'cav' || u.quality !== 'veteran') return out;
    if (!isEngaged(fromKey, u.side)) return out;

    const moveDef = UNIT_BY_ID.get(u.type);
    const maxMp = moveDef ? moveDef.move : 0;
    const remainingMp = Math.max(0, maxMp - (actCtx?.moveSpent || 0));
    if (remainingMp <= 0) return out;

    const h = board.byKey.get(fromKey);
    if (!h) return out;

    for (const nk of h.neigh) {
      if (isOccupied(nk)) continue;
      const nh = board.byKey.get(nk);
      if (!nh) continue;

      const cost = terrainMoveCost(u.type, nh.terrain);
      if (!Number.isFinite(cost) || cost > remainingMp) continue;
      if (isEngaged(nk, u.side)) continue;

      out.add(nk);
    }
    return out;
  }

  function postAttackSixShiftTargets(fromKey, u) {
    const out = new Set();
    if (!fromKey || !u) return out;
    const h = board.byKey.get(fromKey);
    if (!h) return out;
    for (const nk of h.neigh) {
      if (!canCommandRelocateUnit(fromKey, nk, { unit: u })) continue;
      out.add(nk);
    }
    return out;
  }

  function tryTriggerCounterchargeAgainst(movedKey, movedUnit) {
    if (!movedKey || !movedUnit) return;
    const movedHex = board.byKey.get(movedKey);
    if (!movedHex) return;

    for (const nk of movedHex.neigh) {
      const enemy = unitsByHex.get(nk);
      if (!enemy) continue;
      if (enemy.side === movedUnit.side) continue;
      if (enemy.type !== 'cav') continue;
      if (!doctrineFlagForUnit('counterchargeUnitIds', enemy.id, enemy.side)) continue;

      const prof = attackDiceFor(nk, movedKey, enemy);
      if (!prof || prof.kind !== 'melee' || prof.dist !== 1) continue;

      state.doctrine.effects.counterchargeUnitIds[enemy.id] = false;
      state.actedUnitIds.add(enemy.id);
      log(`${enemy.side.toUpperCase()} countercharge triggered by nearby movement.`);
      resolveAttack(nk, movedKey);
      break;
    }
  }

  function attackApproachPosition(attackerKey, defenderKey, defenderSide) {
    const fwdDir = sideForwardDirection(defenderSide, state.forwardAxis);
    const rearDir = oppositeDirection(fwdDir);
    const frontKey = stepKeyInDirection(defenderKey, fwdDir);
    const rearKey = rearDir ? stepKeyInDirection(defenderKey, rearDir) : null;

    if (attackerKey === frontKey) return 'front';
    if (attackerKey === rearKey) return 'rear';
    return 'flank';
  }

  function directionFromToNeighbor(fromKey, toNeighborKey) {
    if (!fromKey || !toNeighborKey) return null;
    for (const dir of BRACE_DIR_RING) {
      if (stepKeyInDirection(fromKey, dir) === toNeighborKey) return dir;
    }
    return null;
  }

  function collectInfantryBracePairs(defenderKey, side) {
    const pairs = [];
    if (!defenderKey || (side !== 'blue' && side !== 'red')) return pairs;

    for (let i = 0; i < BRACE_DIR_RING.length; i++) {
      const dirA = BRACE_DIR_RING[i];
      const dirB = BRACE_DIR_RING[(i + 1) % BRACE_DIR_RING.length];
      const keyA = stepKeyInDirection(defenderKey, dirA);
      const keyB = stepKeyInDirection(defenderKey, dirB);
      if (!keyA || !keyB) continue;

      const unitA = unitsByHex.get(keyA);
      const unitB = unitsByHex.get(keyB);
      if (!unitA || !unitB) continue;
      if (unitA.side !== side || unitB.side !== side) continue;
      if (unitA.type !== 'inf' || unitB.type !== 'inf') continue;

      pairs.push({
        supportDirs: [dirA, dirB],
        supportKeys: [keyA, keyB],
        coverDirs: [
          BRACE_DIR_RING[(i + 3) % BRACE_DIR_RING.length],
          BRACE_DIR_RING[(i + 4) % BRACE_DIR_RING.length],
        ],
      });
    }

    return pairs;
  }

  function infantryBraceInfoForAttack(attackerKey, defenderKey, attackerUnit = null, defenderUnit = null) {
    const out = {
      active: false,
      attackDir: null,
      supportKeys: [],
      supportDirs: [],
      coverDirs: [],
      pairCount: 0,
    };

    const atk = attackerUnit || unitsByHex.get(attackerKey);
    const def = defenderUnit || unitsByHex.get(defenderKey);
    if (!atk || !def) return out;
    if (def.type !== 'inf') return out;
    if (atk.side === def.side) return out;

    const attackDir = directionFromToNeighbor(defenderKey, attackerKey);
    if (!attackDir) return out;
    out.attackDir = attackDir;

    const pairs = collectInfantryBracePairs(defenderKey, def.side);
    out.pairCount = pairs.length;
    if (pairs.length === 0) return out;

    const matched = pairs.find((pair) => pair.coverDirs.includes(attackDir)) || null;
    if (!matched) return out;

    out.active = true;
    out.supportKeys = matched.supportKeys.slice();
    out.supportDirs = matched.supportDirs.slice();
    out.coverDirs = matched.coverDirs.slice();
    return out;
  }

  function infantryBraceInfoForHover(defenderKey) {
    const out = {
      active: false,
      supportKeys: [],
      pairCount: 0,
    };
    const defender = unitsByHex.get(defenderKey);
    if (!defender || defender.type !== 'inf') return out;

    const pairs = collectInfantryBracePairs(defenderKey, defender.side);
    out.pairCount = pairs.length;
    if (pairs.length === 0) return out;

    // Prefer a pair currently facing an adjacent enemy; fall back to the first valid pair.
    let chosen = null;
    const defHex = board.byKey.get(defenderKey);
    if (defHex) {
      for (const nk of defHex.neigh) {
        const enemy = unitsByHex.get(nk);
        if (!enemy || enemy.side === defender.side) continue;
        const info = infantryBraceInfoForAttack(nk, defenderKey, enemy, defender);
        if (info.active) {
          chosen = info;
          break;
        }
      }
    }
    if (!chosen) {
      chosen = {
        active: true,
        supportKeys: pairs[0].supportKeys.slice(),
      };
    }

    out.active = true;
    out.supportKeys = chosen.supportKeys.slice();
    return out;
  }

  function computeInfantryBraceOverlay() {
    const overlay = new Map();
    const mark = (hexKey, role, strength) => {
      if (!hexKey) return;
      const s = Math.max(0, Math.min(1, Number(strength) || 0));
      if (s <= 0) return;
      const cur = overlay.get(hexKey) || { defender: 0, supporter: 0 };
      if (role === 'supporter') cur.supporter = Math.max(cur.supporter, s);
      else cur.defender = Math.max(cur.defender, s);
      overlay.set(hexKey, cur);
    };

    // Active brace overlays: defender is adjacent-threatened from a covered direction.
    for (const [defKey, defender] of unitsByHex) {
      if (!defender || defender.type !== 'inf') continue;
      const defHex = board.byKey.get(defKey);
      if (!defHex) continue;

      for (const nk of defHex.neigh) {
        const enemy = unitsByHex.get(nk);
        if (!enemy || enemy.side === defender.side) continue;
        const info = infantryBraceInfoForAttack(nk, defKey, enemy, defender);
        if (!info.active) continue;
        mark(defKey, 'defender', 0.72);
        for (const sk of info.supportKeys) mark(sk, 'supporter', 0.68);
      }
    }

    // Hover/selected infantry: always show one valid brace pair if it exists.
    const focusKeys = [];
    if (state._hoverKey) focusKeys.push(state._hoverKey);
    if (state.selectedKey && state.selectedKey !== state._hoverKey) focusKeys.push(state.selectedKey);
    for (const fk of focusKeys) {
      const info = infantryBraceInfoForHover(fk);
      if (!info.active) continue;
      mark(fk, 'defender', 0.98);
      for (const sk of info.supportKeys) mark(sk, 'supporter', 0.90);
    }

    // Attack preview: selected attacker against highlighted attack targets.
    if (state.mode === 'play' && state.selectedKey && state._attackTargets && state._attackTargets.size > 0) {
      const attacker = unitsByHex.get(state.selectedKey);
      if (attacker) {
        for (const targetKey of state._attackTargets) {
          const target = unitsByHex.get(targetKey);
          if (!target) continue;
          const info = infantryBraceInfoForAttack(state.selectedKey, targetKey, attacker, target);
          if (!info.active) continue;
          mark(targetKey, 'defender', 1.0);
          for (const sk of info.supportKeys) mark(sk, 'supporter', 0.95);
        }
      }
    }

    return overlay;
  }

  function cavalryAngleBonuses(attackerUnit, defenderUnit, kind, position, opts = {}) {
    if (kind !== 'melee') return { flankBonus: 0, rearBonus: 0, totalBonus: 0 };
    if (!attackerUnit || !defenderUnit) return { flankBonus: 0, rearBonus: 0, totalBonus: 0 };
    if (attackerUnit.type !== 'cav' || defenderUnit.type !== 'inf') {
      return { flankBonus: 0, rearBonus: 0, totalBonus: 0 };
    }
    if (opts && opts.reinforced) return { flankBonus: 0, rearBonus: 0, totalBonus: 0 };
    if (position === 'rear') {
      return { flankBonus: 0, rearBonus: CAV_REAR_BONUS, totalBonus: CAV_REAR_BONUS };
    }
    if (position === 'flank') {
      return { flankBonus: CAV_FLANK_BONUS, rearBonus: 0, totalBonus: CAV_FLANK_BONUS };
    }
    return { flankBonus: 0, rearBonus: 0, totalBonus: 0 };
  }

  // --- Attacks (melee + ranged)
  function attackDiceFor(attackerKey, defenderKey, attackerUnit) {
    if (attackerUnit && doctrineFlagForUnit('cannotAttack', attackerUnit.id, attackerUnit.side)) return null;
    if (attackerUnit && unitIsDisarrayed(attackerUnit)) return null;
    const atkHex = board.byKey.get(attackerKey);
    const defHex = board.byKey.get(defenderKey);
    if (!atkHex || !defHex) return null;

    const dist = axialDistance(atkHex.q, atkHex.r, defHex.q, defHex.r);
    if (dist < 1) return null;

    const engaged = isEngaged(attackerKey, attackerUnit.side);
    const atkDef = UNIT_BY_ID.get(attackerUnit.type);

    // Melee at range 1 is always possible.
    if (dist === 1) {
      const baseDice = atkDef.meleeDice;
      if (!Number.isFinite(baseDice) || baseDice <= 0) return null;
      return {
        kind: 'melee',
        dist,
        baseDice,
        dice: baseDice,
        flankBonus: 0,
        rearBonus: 0,
        impactPosition: 'none',
      };
    }

    // Beyond range 1 requires ranged capability and NOT being engaged.
    if (engaged) return null;
    if (!atkDef.ranged) return null;

    const dice = atkDef.ranged[dist];
    if (!dice) return null;

    return { kind: 'ranged', dist, baseDice: dice, dice, flankBonus: 0, rearBonus: 0, impactPosition: 'none' };
  }

  function computeAttackTargets(attackerKey, u) {
    const targets = new Set();
    if (unitIsDisarrayed(u)) return targets;

    for (const [hk, enemy] of unitsByHex) {
      if (enemy.side === u.side) continue;
      const prof = attackDiceFor(attackerKey, hk, u);
      if (prof) targets.add(hk);
    }

    return targets;
  }

  function computeHealTargets(sourceKey, u) {
    const targets = new Set();
    if (!u || u.type !== 'iat') return targets;
    if (unitIsDisarrayed(u)) return targets;

    const sourceHex = board.byKey.get(sourceKey);
    if (!sourceHex) return targets;

    for (const nk of sourceHex.neigh) {
      const ally = unitsByHex.get(nk);
      if (!ally) continue;
      if (ally.side !== u.side) continue;
      if (unitIsDisarrayed(ally)) continue;
      const maxHp = unitMaxHp(ally.type, ally.quality);
      if (ally.hp >= maxHp) continue;
      targets.add(nk);
    }

    return targets;
  }

  // --- Combat resolution
  function rollD6() {
    return 1 + Math.floor(Math.random() * 6);
  }

  function retreatPick(attackerKey, defenderKey) {
    // Retreat prefers moving toward the nearest friendly general when possible,
    // then falls back to the side/backline depth heuristic.
    // If no legal retreat hex increases distance from attacker, retreat converts to a hit.
    const aHex = board.byKey.get(attackerKey);
    const dHex = board.byKey.get(defenderKey);
    if (!aHex || !dHex) return null;
    const defenderUnit = unitsByHex.get(defenderKey);
    const defenderSide = defenderUnit?.side || 'blue';
    const generalCenters = linkedGeneralKeys(defenderSide)
      .map((gk) => board.byKey.get(gk))
      .filter(Boolean);

    const curDist = axialDistance(aHex.q, aHex.r, dHex.q, dHex.r);
    const deltas = (dHex.r & 1) ? NEIGH_ODD : NEIGH_EVEN;
    const axisGeom = buildAxisGeometry(state.forwardAxis);
    const candidates = [];

    for (const [dq, dr] of deltas) {
      const nq = dHex.q + dq;
      const nr = dHex.r + dr;
      const nk = key(nq, nr);
      const nd = axialDistance(aHex.q, aHex.r, nq, nr);
      if (nd <= curDist) continue;
      if (!board.activeSet.has(nk)) continue;
      const nh = board.byKey.get(nk);
      if (!nh) continue;
      if (nh.terrain === 'water' || nh.terrain === 'mountains') continue;
      if (isOccupied(nk)) continue;

      const nextScalars = axisScalarsForHex(nh, state.forwardAxis);
      const retreatDepth = sideDepthNorm(nextScalars, defenderSide);
      let nearestGeneral = Infinity;
      if (generalCenters.length > 0) {
        for (const gh of generalCenters) {
          const gd = axialDistance(nh.q, nh.r, gh.q, gh.r);
          if (gd < nearestGeneral) nearestGeneral = gd;
        }
      }
      candidates.push({ k: nk, dist: nd, retreatDepth, nearestGeneral });
    }

    if (!candidates.length) return null;

    candidates.sort((a, b) =>
      ((a.nearestGeneral - b.nearestGeneral) || 0) ||
      (a.retreatDepth - b.retreatDepth) ||
      (b.dist - a.dist) ||
      a.k.localeCompare(b.k)
    );
    return candidates[0].k;
  }

  function consumeActivation(unitId) {
    state.actsUsed = Math.min(ACT_LIMIT, state.actsUsed + 1);
    state.actedUnitIds.add(unitId);
  }

  function maybeAutoEndTurnAtActionLimit() {
    if (state.mode !== 'play' || state.gameOver) return;
    if (state.actsUsed < ACT_LIMIT) return;
    // Do not auto-end while an activation is still in progress.
    if (state.selectedKey || state.act) return;
    endTurn();
  }

  function destroyUnit(defenderKey, defenderUnit, attackerSide) {
    const defDef = UNIT_BY_ID.get(defenderUnit.type);
    const destroyedUp = unitUpValue(defenderUnit.type, defenderUnit.quality);

    unitsByHex.delete(defenderKey);

    state.capturedUP[attackerSide] += destroyedUp;
    playUnitDestroyedSfx();

    log(`☠️ ${defenderUnit.side.toUpperCase()} ${defDef.abbrev} destroyed (+${destroyedUp}u).`);
  }

  function resolveAttack(attackerKey, defenderKey) {
    const atk = unitsByHex.get(attackerKey);
    const defU = unitsByHex.get(defenderKey);
    if (!atk || !defU) return { ok: false, pursuitTarget: null, rolledSix: false };
    if (state.gameOver) return { ok: false, pursuitTarget: null, rolledSix: false };
    const initialDefenderKey = defenderKey;

    const prof = attackDiceFor(attackerKey, defenderKey, atk);
    if (!prof) {
      log('Illegal attack.');
      return { ok: false, pursuitTarget: null, rolledSix: false };
    }

    let impactPosition = 'none';
    if (prof.kind === 'melee') {
      impactPosition = attackApproachPosition(attackerKey, defenderKey, defU.side);
    }

    // Terrain modifiers:
    // - Defender in woods => attacker -1 die (min 1)
    // - Attacker standing in rough => attacker -1 die (min 1)
    const atkHex = board.byKey.get(attackerKey);
    const defHex = board.byKey.get(defenderKey);
    const attackerTerrain = atkHex?.terrain || 'clear';
    const defenderTerrain = defHex?.terrain || 'clear';
    let terrainDiceMod = (defenderTerrain === 'woods') ? -1 : 0;
    if (attackerTerrain === 'rough') terrainDiceMod -= 1;
    const terrainRuleBits = [];
    if (defenderTerrain === 'woods') terrainRuleBits.push('Defender in Woods: attacker rolls -1 die.');
    if (attackerTerrain === 'rough') terrainRuleBits.push('Attack launched from Rough: attacker rolls -1 die.');
    const terrainRuleText = terrainRuleBits.length
      ? `${terrainRuleBits.join(' ')} (minimum 1 die).`
      : `No direct terrain dice modifier in ${terrainLabel(defenderTerrain)}.`;
    const braceInfo = (prof.kind === 'melee')
      ? infantryBraceInfoForAttack(attackerKey, defenderKey, atk, defU)
      : { active: false, supportKeys: [] };
    const impact = cavalryAngleBonuses(atk, defU, prof.kind, impactPosition, {
      reinforced: !!braceInfo.active,
    });
    const braceDiceMod = braceInfo.active ? -1 : 0;
    const braceRuleText = braceInfo.active
      ? 'Defender is braced by linked INF: attacker rolls -1 die (minimum 1).'
      : 'Defender is not braced.';
    const baseDice = prof.baseDice ?? prof.dice;
    const commandAttackBonus = doctrineValueForUnit('bonusAttackDice', atk.id, atk.side);
    const commandRangedBonus = (prof.kind === 'ranged')
      ? doctrineValueForUnit('rangedBonusDice', atk.id, atk.side)
      : 0;
    const commandDefenseBonus = (prof.kind === 'melee')
      ? doctrineValueForUnit('meleeDefenseBonus', defU.id, defU.side)
      : 0;
    let coveringFireIgnored = false;
    if (prof.kind === 'ranged' && terrainDiceMod < 0 && doctrineFlagForSide('coverFireIgnoreTerrain', atk.side)) {
      terrainDiceMod = 0;
      coveringFireIgnored = true;
      const curCover = Number(state.doctrine.effects.coverFireIgnoreTerrain[atk.side] || 0);
      state.doctrine.effects.coverFireIgnoreTerrain[atk.side] = Math.max(0, curCover - 1);
      log(`${atk.side.toUpperCase()} used Covering Fire: ignored terrain ranged penalty.`);
    }
    const flankBonus = impact.flankBonus;
    const rearBonus = impact.rearBonus;
    const preTerrainDice =
      baseDice +
      impact.totalBonus +
      braceDiceMod +
      commandAttackBonus +
      commandRangedBonus -
      commandDefenseBonus;
    const dice = Math.max(1, preTerrainDice + terrainDiceMod);

    const rolls = [];
    for (let i = 0; i < dice; i++) rolls.push(rollD6());
    const rolledSix = rolls.some((v) => v === 6);

    const atkDef = UNIT_BY_ID.get(atk.type);
    const defDef = UNIT_BY_ID.get(defU.type);

    let hits = 0;
    let retreats = 0;
    let disarrays = 0;
    let misses = 0;
    for (const v of rolls) {
      if (v === 6) {
        hits += 1;
        disarrays += 1;
      } else if (v === 5) {
        hits += 1;
      } else if (v === DIE_RETREAT) {
        retreats += 1;
      } else if (v === DIE_DISARRAY) {
        disarrays += 1;
      } else {
        misses += 1;
      }
    }
    if (prof.kind === 'melee' && doctrineFlagForUnit('driveThemBackUnitIds', atk.id, atk.side)) {
      const driveIdx = rolls.findIndex(v => v === 2);
      if (driveIdx >= 0) {
        disarrays += 1;
        misses = Math.max(0, misses - 1);
        log(`${atk.side.toUpperCase()} command effect: Drive Them Back converted one 2 to disarray.`);
      }
    }

    const tag = `${atk.side.toUpperCase()} ${atkDef.abbrev}`;
    const vs = `${defU.side.toUpperCase()} ${defDef.abbrev}`;
    if (braceInfo.active) {
      log(`${vs} is braced by linked INF support (${braceInfo.supportKeys.join(', ')}): attacker -1 die.`);
    }
    if (
      prof.kind === 'melee' &&
      atk.type === 'cav' &&
      defU.type === 'inf' &&
      impactPosition !== 'front' &&
      braceInfo.active &&
      impact.totalBonus <= 0
    ) {
      log('Angle shock canceled: reinforced infantry absorbed flank/rear pressure.');
    }
    const rollTokens = rolls.map((v) => {
      if (v === 6) return `${v}HD`;
      if (v === 5) return `${v}H`;
      if (v === DIE_RETREAT) return `${v}R`;
      if (v === DIE_DISARRAY) return `${v}D`;
      return `${v}M`;
    });
    const modParts = [`base ${baseDice}`];
    if (flankBonus) modParts.push(`flank +${flankBonus}`);
    if (rearBonus) modParts.push(`rear +${rearBonus}`);
    if (braceDiceMod) modParts.push(`braced ${braceDiceMod}`);
    if (commandAttackBonus) modParts.push(`command +${commandAttackBonus}`);
    if (commandRangedBonus) modParts.push(`volley +${commandRangedBonus}`);
    if (commandDefenseBonus) modParts.push(`shield -${commandDefenseBonus}`);
    if (defenderTerrain === 'woods') modParts.push('woods -1');
    if (attackerTerrain === 'rough') modParts.push('launch rough -1');
    if (coveringFireIgnored) modParts.push('covering-fire terrain ignore');
    const modText = ` (${modParts.join(', ')})`;
    const combatInfo = {
      attacker: tag,
      defender: vs,
      kind: prof.kind,
      dist: prof.dist,
      dice,
      baseDice,
      flankBonus,
      rearBonus,
      impactPosition,
      woodsPenalty: terrainDiceMod < 0 ? Math.abs(terrainDiceMod) : 0,
      braced: !!braceInfo.active,
      braceDiceMod,
      braceSupportKeys: Array.isArray(braceInfo.supportKeys) ? braceInfo.supportKeys.slice() : [],
      terrainDiceMod,
      defenderTerrain,
      terrainRuleText,
      braceRuleText,
      hits,
      retreats,
      disarrays,
      misses,
      retreatMoved: 0,
      retreatBlocked: 0,
      destroyed: false,
      defenderHpAfter: defU.hp,
    };
    renderDiceDisplay(rolls, {
      ...combatInfo,
    });
    renderCombatBreakdown(rolls, combatInfo);
    log(`${tag} ${prof.kind.toUpperCase()}→${vs} r${prof.dist} · dice=${dice}${modText}`);
    log(`Rolls: [${rollTokens.join(' ')}] => hits=${hits}, retreats=${retreats}, disarray=${disarrays}, misses=${misses}.`);

    // Pass 1: apply hits
    if (hits > 0) {
      defU.hp -= hits;
      log(`Hits: ${hits} → ${vs} HP=${Math.max(0, defU.hp)}.`);
    }

    if (defU.hp <= 0) {
      combatInfo.destroyed = true;
      combatInfo.defenderHpAfter = 0;
      renderCombatBreakdown(rolls, combatInfo);
      destroyUnit(defenderKey, defU, atk.side);
      pushEventTrace('combat.resolve', {
        attacker: { key: attackerKey, id: atk.id, side: atk.side, type: atk.type, quality: atk.quality },
        defender: { key: defenderKey, id: defU.id, side: defU.side, type: defU.type, quality: defU.quality },
        distance: prof.dist,
        kind: prof.kind,
        rolls,
        hits,
        retreats,
        disarrays,
        misses,
        retreatMoved: 0,
        retreatBlocked: 0,
        defenderDestroyed: true,
        defenderHpAfter: 0,
      });
      checkVictory();
      updateHud();
      return { ok: true, pursuitTarget: null, rolledSix };
    }

    if (disarrays > 0) {
      applyDisarrayToUnit(defU, defenderKey);
    }

    // Pass 2: resolve retreats one at a time
    let retreatMoved = 0;
    let retreatBlocked = 0;
    for (let i = 0; i < retreats; i++) {
      const curDef = unitsByHex.get(defenderKey);
      if (!curDef) break;

      if (doctrineFlagForUnit('ignoreAllRetreat', curDef.id, curDef.side)) {
        log(`Retreat ignored (${curDef.side.toUpperCase()} command effect: stand fast).`);
        continue;
      }
      const ignoreCount = doctrineValueForUnit('ignoreRetreatCount', curDef.id, curDef.side);
      if (ignoreCount > 0) {
        const curTurnVal = Number(state.doctrine.effects.ignoreRetreatCount[curDef.id] || 0);
        if (curTurnVal > 0) {
          state.doctrine.effects.ignoreRetreatCount[curDef.id] = Math.max(0, curTurnVal - 1);
        } else {
          // Consume one long-duration stack.
          const idx = state.doctrine.longEffects.findIndex((eff) =>
            eff && eff.map === 'ignoreRetreatCount' && eff.unitId === curDef.id && Number(eff.value || 0) > 0
          );
          if (idx >= 0) {
            const eff = state.doctrine.longEffects[idx];
            eff.value = Math.max(0, Number(eff.value || 0) - 1);
            if (eff.value <= 0) state.doctrine.longEffects.splice(idx, 1);
          }
        }
        log(`Retreat ignored (${curDef.side.toUpperCase()} command effect).`);
        continue;
      }

      const step = retreatPick(attackerKey, defenderKey);
      if (!step) {
        retreatBlocked += 1;
        const blockedDamage = unitIsDisarrayed(curDef) ? 2 : 1;
        curDef.hp -= blockedDamage;
        log(`Retreat blocked → ${blockedDamage} hit${blockedDamage > 1 ? 's' : ''}. ${vs} HP=${Math.max(0, curDef.hp)}.`);
        if (curDef.hp <= 0) {
          combatInfo.destroyed = true;
          destroyUnit(defenderKey, curDef, atk.side);
          break;
        }
      } else {
        retreatMoved += 1;
        unitsByHex.delete(defenderKey);
        unitsByHex.set(step, curDef);
        defenderKey = step;
        log(`Retreat → ${step}`);
      }
    }

    const finalDef = unitsByHex.get(defenderKey);
    combatInfo.retreatMoved = retreatMoved;
    combatInfo.retreatBlocked = retreatBlocked;
    combatInfo.destroyed = !finalDef;
    combatInfo.defenderHpAfter = finalDef ? finalDef.hp : 0;
    renderCombatBreakdown(rolls, combatInfo);
    pushEventTrace('combat.resolve', {
      attacker: { key: attackerKey, id: atk.id, side: atk.side, type: atk.type, quality: atk.quality },
      defender: {
        key: defenderKey,
        id: finalDef ? finalDef.id : defU.id,
        side: finalDef ? finalDef.side : defU.side,
        type: finalDef ? finalDef.type : defU.type,
        quality: finalDef ? finalDef.quality : defU.quality,
      },
      distance: prof.dist,
      kind: prof.kind,
      rolls,
      hits,
      retreats,
      disarrays,
      misses,
      retreatMoved,
      retreatBlocked,
      defenderDestroyed: !finalDef,
      defenderHpAfter: finalDef ? finalDef.hp : 0,
    });

    let pursuitTarget = null;
    if (
      prof.kind === 'melee' &&
      prof.dist === 1 &&
      retreatMoved > 0 &&
      !unitsByHex.has(initialDefenderKey) &&
      !state.gameOver
    ) {
      const vacatedHex = board.byKey.get(initialDefenderKey);
      const atkNow = unitsByHex.get(attackerKey);
      if (vacatedHex && atkNow && Number.isFinite(terrainMoveCost(atkNow.type, vacatedHex.terrain))) {
        pursuitTarget = initialDefenderKey;
        if (isAiTurnActive()) {
          const moved = commandRelocateUnit(attackerKey, pursuitTarget);
          if (moved) {
            log(`${atkNow.side.toUpperCase()} pursued into ${pursuitTarget}.`);
            pushEventTrace('combat.pursuit', {
              side: atkNow.side,
              attackerId: atkNow.id,
              fromKey: attackerKey,
              toKey: pursuitTarget,
              auto: true,
            });
            pursuitTarget = null;
          }
        }
      }
    }

    checkVictory();
    updateHud();
    return { ok: true, pursuitTarget, rolledSix };
  }

  // --- Victory
  function checkVictory(reason = 'combat') {
    if (state.mode !== 'play' || state.gameOver) return;

    const b = totals('blue');
    const r = totals('red');
    const obj = evaluateObjectiveControl();
    const objectiveLeadBlue = obj.blueValue > obj.redValue;
    const objectiveLeadRed = obj.redValue > obj.blueValue;
    const pointTargetDefault = Math.ceil(Math.max(state.initialUP.blue, state.initialUP.red) * POINT_VICTORY_CAPTURE_RATIO);
    const pointTarget = Math.max(1, Number(state.loadedScenarioMeta?.pointTarget || pointTargetDefault));

    let blueWins = false;
    let redWins = false;

    if (state.victoryMode === 'annihilation') {
      blueWins = r.units === 0;
      redWins = b.units === 0;
    } else if (state.victoryMode === 'decapitation') {
      blueWins = r.gens === 0;
      redWins = b.gens === 0;
    } else if (state.victoryMode === 'points') {
      blueWins = state.capturedUP.blue >= pointTarget;
      redWins = state.capturedUP.red >= pointTarget;
    } else if (state.victoryMode === 'keyground') {
      // Key ground resolves at checkpoint or end-turn moments.
      if (b.units === 0 || b.gens === 0) redWins = true;
      if (r.units === 0 || r.gens === 0) blueWins = true;
      if (!blueWins && !redWins && reason === 'end-turn' && state.turn >= state.objectiveCheckpointTurn) {
        if (objectiveLeadBlue) blueWins = true;
        if (objectiveLeadRed) redWins = true;
      }
    } else if (state.victoryMode === 'strategic') {
      if (b.units === 0 || b.gens === 0) redWins = true;
      if (r.units === 0 || r.gens === 0) blueWins = true;
      if (!blueWins && !redWins && reason === 'end-turn') {
        const captureNeedBlue = Math.ceil(state.initialUP.red * STRATEGIC_CAPTURE_RATIO);
        const captureNeedRed = Math.ceil(state.initialUP.blue * STRATEGIC_CAPTURE_RATIO);
        const blueScore =
          (state.capturedUP.blue >= captureNeedBlue ? 1 : 0) +
          (objectiveLeadBlue ? 1 : 0) +
          (b.gens > r.gens ? 1 : 0);
        const redScore =
          (state.capturedUP.red >= captureNeedRed ? 1 : 0) +
          (objectiveLeadRed ? 1 : 0) +
          (r.gens > b.gens ? 1 : 0);
        if (blueScore >= 2 && blueScore > redScore) blueWins = true;
        if (redScore >= 2 && redScore > blueScore) redWins = true;
      }
    } else {
      // Proportional victory: capture at least half of your own starting UP, rounded up.
      const needBlue = Math.ceil(state.initialUP.blue / 2);
      const needRed = Math.ceil(state.initialUP.red / 2);

      blueWins = state.capturedUP.blue >= needBlue;
      redWins = state.capturedUP.red >= needRed;
    }

    if (blueWins && redWins) {
      // If multiple victory conditions ever trigger simultaneously, the acting player wins.
      state.gameOver = true;
      state.winner = state.side;
      log(`Game over: ${state.side.toUpperCase()} wins (simultaneous victory).`);
    } else if (blueWins) {
      state.gameOver = true;
      state.winner = 'blue';
      log('Game over: BLUE wins.');
    } else if (redWins) {
      state.gameOver = true;
      state.winner = 'red';
      log('Game over: RED wins.');
    }

    if (state.gameOver && (state.victoryMode === 'points' || state.victoryMode === 'strategic' || state.victoryMode === 'keyground')) {
      log(`Final objectives: Blue ${obj.blueValue} · Red ${obj.redValue}.`);
    }
    if (state.gameOver) {
      pushEventTrace('battle.end', {
        winner: state.winner,
        reason,
        victoryMode: state.victoryMode,
        blue: b,
        red: r,
        capturedUP: { blue: state.capturedUP.blue, red: state.capturedUP.red },
        objectives: {
          blueValue: obj.blueValue,
          redValue: obj.redValue,
          contested: obj.contested,
          neutral: obj.neutral,
        },
      });
    }
  }

  function setIntroTutorialOpen(open) {
    const show = !!open;
    state.introTutorialOpen = show;
    if (elIntroTutorialPanel) elIntroTutorialPanel.hidden = !show;
    if (elIntroActions) elIntroActions.style.display = show ? 'none' : 'grid';
  }

  function clearTutorialTimers() {
    const timers = Array.isArray(state.tutorial?.timers) ? state.tutorial.timers : [];
    for (const id of timers) {
      try { clearTimeout(id); } catch (_) {}
    }
    state.tutorial.timers = [];
  }

  function queueTutorialTimer(fn, delayMs) {
    const id = setTimeout(() => {
      state.tutorial.timers = (state.tutorial.timers || []).filter((x) => x !== id);
      fn();
    }, Math.max(0, Number(delayMs) || 0));
    state.tutorial.timers = state.tutorial.timers || [];
    state.tutorial.timers.push(id);
    return id;
  }

  function applyTutorialLayoutState() {
    const tutorialOpen = !!state.tutorial.active;
    document.body.classList.toggle('tutorial-active', tutorialOpen);
    document.body.classList.toggle('tutorial-show-side', tutorialOpen && !!state.tutorial.showSidePanel);
  }

  function setTutorialGuideMinimized(minimized) {
    state.tutorial.minimized = !!minimized;
    if (elTutorialGuideOverlay) {
      elTutorialGuideOverlay.classList.toggle('is-minimized', !!state.tutorial.minimized);
    }
    if (elTutorialMinBtn) {
      elTutorialMinBtn.textContent = state.tutorial.minimized ? 'Restore' : 'Minimize';
    }
  }

  function setTutorialGuideOpen(open) {
    const show = !!open;
    state.tutorial.active = show;
    if (!show) {
      state.tutorial.autoplay = false;
      state.tutorial.showSidePanel = false;
      clearTutorialTimers();
      state.tutorial.visual = { focusKeys: [], destinationKeys: [], paths: [] };
      state.tutorial.task = {
        active: false,
        type: '',
        text: '',
        targetKeys: [],
        sourceKeys: [],
        destinationKeys: [],
        enemyKeys: [],
        progress: {},
        done: false,
      };
      state.tutorial.unitIdByName = {};
      if (state._hoverKey && !state.selectedKey) state._hoverKey = null;
    }
    if (elTutorialGuideOverlay) {
      elTutorialGuideOverlay.hidden = !show;
      elTutorialGuideOverlay.setAttribute('aria-hidden', show ? 'false' : 'true');
    }
    if (show && state.tutorial.minimized) setTutorialGuideMinimized(false);
    if (!show) setTutorialGuideMinimized(false);
    applyTutorialLayoutState();
  }

  function tutorialForwardDestination(fromKey, side = 'blue') {
    const dst = forwardStepKey(fromKey, side);
    if (!dst || !board.activeSet.has(dst)) return null;
    return dst;
  }

  function currentTutorialStep() {
    if (!state.tutorial.active) return null;
    const steps = tutorialStepList();
    if (!steps.length) return null;
    const idx = Math.max(0, Math.min(steps.length - 1, Number(state.tutorial.stepIndex) || 0));
    return steps[idx] || null;
  }

  function setTutorialTaskFromStep(step) {
    const task = step?.task || null;
    if (!task) {
      state.tutorial.task = {
        active: false,
        type: '',
        text: '',
        targetKeys: [],
        sourceKeys: [],
        destinationKeys: [],
        enemyKeys: [],
        progress: {},
        done: false,
      };
      return;
    }
    const sourceKeys = Array.isArray(task.sourceKeys)
      ? task.sourceKeys.filter((k) => board.activeSet.has(k))
      : [];
    const destinationKeys = Array.isArray(task.destinationKeys)
      ? task.destinationKeys.filter((k) => board.activeSet.has(k))
      : [];
    const enemyKeys = Array.isArray(task.enemyKeys)
      ? task.enemyKeys.filter((k) => board.activeSet.has(k))
      : [];
    const explicitTargets = Array.isArray(task.targetKeys)
      ? task.targetKeys.filter((k) => board.activeSet.has(k))
      : [];
    const targetKeys = [...new Set([...explicitTargets, ...sourceKeys, ...destinationKeys, ...enemyKeys])];
    state.tutorial.task = {
      active: true,
      type: String(task.type || 'select'),
      text: String(task.text || 'Complete the highlighted practice step.'),
      targetKeys,
      sourceKeys,
      destinationKeys,
      enemyKeys,
      progress: {},
      done: false,
    };
  }

  function tutorialPositionsByUnitId() {
    const out = new Map();
    for (const [hk, u] of unitsByHex) {
      if (!u || !Number.isFinite(u.id)) continue;
      out.set(u.id, hk);
    }
    return out;
  }

  function tutorialTaskMoveMatched(task, beforePositions, afterPositions) {
    const sourceSet = new Set((task?.sourceKeys?.length ? task.sourceKeys : task?.targetKeys) || []);
    const destinationSet = new Set(task?.destinationKeys || []);
    if (sourceSet.size === 0 || destinationSet.size === 0) return false;
    for (const [unitId, beforeKey] of beforePositions) {
      const afterKey = afterPositions.get(unitId);
      if (!afterKey || beforeKey === afterKey) continue;
      if (sourceSet.has(beforeKey) && destinationSet.has(afterKey)) return true;
    }
    return false;
  }

  function tutorialTaskAttackMatched(task, {
    preSelected,
    clickedKey,
    preAttackTarget,
    preActsUsed,
    postActsUsed,
    preEnemyId = null,
    preEnemyHp = null,
    postEnemyExists = null,
    postEnemyHp = null,
    postSelected = null,
    requireActionSpend = true,
  } = {}) {
    const sourceSet = new Set((task?.sourceKeys?.length ? task.sourceKeys : task?.targetKeys) || []);
    const enemySet = new Set((task?.enemyKeys?.length ? task.enemyKeys : task?.targetKeys) || []);
    if (sourceSet.size === 0 || enemySet.size === 0) return false;
    if (!preAttackTarget) return false;
    if (!preSelected || !sourceSet.has(preSelected)) return false;
    if (!clickedKey || !enemySet.has(clickedKey)) return false;
    if (requireActionSpend && postActsUsed > preActsUsed) return true;
    if (!requireActionSpend && postActsUsed > preActsUsed) return true;
    if (preEnemyId != null) {
      if (postEnemyExists === false) return true;
      if (Number.isFinite(preEnemyHp) && Number.isFinite(postEnemyHp) && postEnemyHp !== preEnemyHp) return true;
    }
    if (!postSelected) return true;
    return false;
  }

  function cacheTutorialUnitIds() {
    const map = {};
    for (const [name, hk] of Object.entries(TUTORIAL_KEYS)) {
      const u = unitsByHex.get(hk);
      if (u && Number.isFinite(u.id)) map[name] = u.id;
    }
    state.tutorial.unitIdByName = map;
  }

  function tutorialUnitKeyByName(name) {
    const id = state.tutorial?.unitIdByName?.[name];
    if (!Number.isFinite(id)) return null;
    for (const [hk, u] of unitsByHex) {
      if (u && u.id === id) return hk;
    }
    return null;
  }

  function tutorialResetUnitVitals(name) {
    const hk = tutorialUnitKeyByName(name);
    if (!hk) return false;
    const u = unitsByHex.get(hk);
    if (!u) return false;
    u.hp = unitMaxHp(u.type, u.quality);
    u.disarray = false;
    u.disarrayAppliedSerial = null;
    return true;
  }

  function tutorialTeleportUnit(name, toKey) {
    if (!toKey || !board.activeSet.has(toKey)) return false;
    const fromKey = tutorialUnitKeyByName(name);
    if (!fromKey) return false;
    if (fromKey === toKey) return true;

    const movingUnit = unitsByHex.get(fromKey);
    if (!movingUnit) return false;

    const occupied = unitsByHex.get(toKey);
    if (occupied && occupied.id !== movingUnit.id) {
      const occupiedSet = new Set(unitsByHex.keys());
      occupiedSet.delete(fromKey);
      occupiedSet.delete(toKey);
      const relocation = findScenarioRelocationKey(toKey, occupied.type, occupiedSet);
      if (!relocation) return false;
      unitsByHex.delete(toKey);
      unitsByHex.set(relocation, occupied);
    }

    unitsByHex.delete(fromKey);
    unitsByHex.set(toKey, movingUnit);
    return true;
  }

  function tutorialTaskNeedsInput() {
    return !!(state.tutorial.active && state.tutorial.task?.active && !state.tutorial.task?.done);
  }

  function tutorialMarkTaskDone(statusText = 'Task complete.') {
    if (!state.tutorial.task?.active) return;
    state.tutorial.task.done = true;
    if (elTutorialGuideTaskStatus) {
      elTutorialGuideTaskStatus.textContent = statusText;
      elTutorialGuideTaskStatus.classList.add('done');
    }
    log(`Tutorial task complete: ${statusText}`);
    renderTutorialGuide();
    updateHud();
    if (state.tutorial.autoplay) {
      const steps = tutorialStepList();
      const idx = Math.max(0, Math.min(steps.length - 1, state.tutorial.stepIndex || 0));
      if (idx < (steps.length - 1)) {
        queueTutorialTimer(() => {
          if (!state.tutorial.active) return;
          applyTutorialStep(idx + 1);
        }, TUTORIAL_AUTOPLAY_AFTER_TASK_MS);
      }
    }
  }

  function maybeCompleteTutorialTaskOnDoctrineOpen() {
    if (!state.tutorial.active || !state.tutorial.task?.active || state.tutorial.task?.done) return;
    if (state.tutorial.task.type !== 'open_builder') return;
    tutorialMarkTaskDone('War Council opened.');
  }

  function handleTutorialCanvasClick(hexKey) {
    if (!state.tutorial.active) return false;
    if (!hexKey) return true;

    const clickedUnit = unitsByHex.get(hexKey) || null;
    const task = state.tutorial.task || { active: false, done: false };

    const isSelectTask = task.active && !task.done && task.type === 'select';
    const isInspectTask = task.active && !task.done && task.type === 'inspect';

    // Selection/inspection tasks intentionally remain deterministic.
    if (isSelectTask || isInspectTask) {
      if (clickedUnit) {
        state.selectedKey = hexKey;
        state._hoverKey = hexKey;
      } else {
        state._hoverKey = hexKey;
      }
    } else {
      // All action-focused tutorial steps run through live play logic.
      const preSelected = state.selectedKey;
      const preActsUsed = state.actsUsed;
      const preMoveTarget = !!(state._moveTargets && state._moveTargets.has(hexKey));
      const preAttackTarget = !!(state._attackTargets && state._attackTargets.has(hexKey));
      const preEnemyUnit = preAttackTarget ? (unitsByHex.get(hexKey) || null) : null;
      const preEnemyId = preEnemyUnit ? preEnemyUnit.id : null;
      const preEnemyHp = preEnemyUnit ? Number(preEnemyUnit.hp) : null;
      const beforePositions = tutorialPositionsByUnitId();

      clickPlay(hexKey);
      state._hoverKey = hexKey;

      const afterPositions = tutorialPositionsByUnitId();
      let postEnemyExists = null;
      let postEnemyHp = null;
      if (preEnemyId != null) {
        for (const [, u] of unitsByHex) {
          if (u && u.id === preEnemyId) {
            postEnemyExists = true;
            postEnemyHp = Number(u.hp);
            break;
          }
        }
        if (postEnemyExists == null) postEnemyExists = false;
      }

      if (!task.active || task.done) {
        updateHud();
        return true;
      }

      if (task.type === 'move') {
        if (tutorialTaskMoveMatched(task, beforePositions, afterPositions) && preMoveTarget) {
          tutorialMarkTaskDone('Move complete.');
          return true;
        }
        if ((task.sourceKeys || []).includes(hexKey)) {
          log('Selected. Now click a highlighted destination hex.');
        } else if ((task.destinationKeys || []).includes(hexKey) && !preMoveTarget) {
          log('Select a highlighted source unit first, then click destination.');
        } else {
          log('Follow the move prompt: source unit first, then destination hex.');
        }
        renderTutorialGuide();
        updateHud();
        return true;
      }

      if (task.type === 'attack') {
        if (tutorialTaskAttackMatched(task, {
          preSelected,
          clickedKey: hexKey,
          preAttackTarget,
          preActsUsed,
          postActsUsed: state.actsUsed,
          preEnemyId,
          preEnemyHp,
          postEnemyExists,
          postEnemyHp,
          postSelected: state.selectedKey,
          requireActionSpend: true,
        })) {
          tutorialMarkTaskDone('Attack executed.');
          return true;
        }
        if ((task.sourceKeys || []).includes(hexKey)) {
          log('Attacker selected. Now click a highlighted enemy to attack.');
        } else if ((task.enemyKeys || task.targetKeys || []).includes(hexKey)) {
          log('Select a highlighted attacker first, then click enemy target.');
        } else {
          log('Follow the attack prompt: attacker first, then enemy target.');
        }
        renderTutorialGuide();
        updateHud();
        return true;
      }

      if (task.type === 'move_attack') {
        task.progress = task.progress || {};
        const movedNow = preMoveTarget && tutorialTaskMoveMatched(task, beforePositions, afterPositions);
        if (movedNow) {
          task.progress.moved = true;
          log('Movement complete. Now click a highlighted enemy to attack.');
          renderTutorialGuide();
          updateHud();
          return true;
        }
        if (task.progress.moved && tutorialTaskAttackMatched(task, {
          preSelected,
          clickedKey: hexKey,
          preAttackTarget,
          preActsUsed,
          postActsUsed: state.actsUsed,
          preEnemyId,
          preEnemyHp,
          postEnemyExists,
          postEnemyHp,
          postSelected: state.selectedKey,
          requireActionSpend: false,
        })) {
          tutorialMarkTaskDone('Move + attack complete.');
          return true;
        }
        if (!task.progress.moved) {
          if ((task.sourceKeys || []).includes(hexKey)) {
            log('Selected. Move this unit to a highlighted destination hex.');
          } else {
            log('Step 1: move the highlighted unit to a highlighted destination hex.');
          }
        } else {
          log('Step 2: attack a highlighted enemy with your moved unit.');
        }
        renderTutorialGuide();
        updateHud();
        return true;
      }

      renderTutorialGuide();
      updateHud();
      return true;
    }

    if (!task.active || task.done) {
      log('Tutorial focus updated. Use Next/Previous to continue the lesson.');
      updateHud();
      return true;
    }

    if (task.type === 'select') {
      if (task.targetKeys.includes(hexKey)) {
        tutorialMarkTaskDone('Correct unit selected.');
      } else {
        log('Select a highlighted tutorial unit to complete this step.');
        renderTutorialGuide();
        updateHud();
      }
      return true;
    }

    if (task.type === 'inspect') {
      if (task.targetKeys.includes(hexKey)) {
        tutorialMarkTaskDone('Hex inspected.');
      } else {
        log('Inspect one of the highlighted tutorial hexes.');
        renderTutorialGuide();
        updateHud();
      }
      return true;
    }

    log('Follow the current tutorial task prompt to continue.');
    renderTutorialGuide();
    updateHud();
    return true;
  }

  function summarizeTutorialRolls(rolls = []) {
    let hits = 0;
    let retreats = 0;
    let disarrays = 0;
    let misses = 0;
    for (const v of rolls) {
      if (v === 6) {
        hits += 1;
        disarrays += 1;
      } else if (v === 5) {
        hits += 1;
      } else if (v === DIE_RETREAT) {
        retreats += 1;
      } else if (v === DIE_DISARRAY) {
        disarrays += 1;
      } else {
        misses += 1;
      }
    }
    return { hits, retreats, disarrays, misses };
  }

  function playTutorialCombatSample({
    attackerKey,
    defenderKey,
    kind = 'melee',
    dist = 1,
    baseDice = 1,
    rolls = [5],
    terrainOverride = null,
    impactPosition = 'front',
  } = {}) {
    const atk = unitsByHex.get(attackerKey);
    const def = unitsByHex.get(defenderKey);
    if (!atk || !def || !Array.isArray(rolls) || rolls.length === 0) return;

    const atkDef = UNIT_BY_ID.get(atk.type);
    const defDef = UNIT_BY_ID.get(def.type);
    const counts = summarizeTutorialRolls(rolls);
    const defenderTerrain = terrainOverride || board.byKey.get(defenderKey)?.terrain || 'clear';
    const terrainDiceMod = defenderTerrain === 'woods' ? -1 : 0;
    const hpNow = Number(def.hp || unitMaxHp(def.type, def.quality));

    const info = {
      attacker: `${atk.side.toUpperCase()} ${atkDef?.abbrev || atk.type.toUpperCase()}`,
      defender: `${def.side.toUpperCase()} ${defDef?.abbrev || def.type.toUpperCase()}`,
      kind,
      dist,
      dice: rolls.length,
      baseDice,
      flankBonus: 0,
      rearBonus: 0,
      impactPosition,
      woodsPenalty: terrainDiceMod < 0 ? Math.abs(terrainDiceMod) : 0,
      braced: false,
      braceDiceMod: 0,
      braceSupportKeys: [],
      terrainDiceMod,
      defenderTerrain,
      terrainRuleText: terrainHoverCombatText(defenderTerrain),
      braceRuleText: 'Defender is not braced.',
      hits: counts.hits,
      retreats: counts.retreats,
      disarrays: counts.disarrays,
      misses: counts.misses,
      retreatMoved: counts.retreats > 0 ? 1 : 0,
      retreatBlocked: 0,
      destroyed: counts.hits >= hpNow,
      defenderHpAfter: Math.max(0, hpNow - counts.hits),
    };

    setAttackFlash(defenderKey, ATTACK_FLASH_MS + 220, {
      fromKey: attackerKey,
      strikeType: kind,
      attackerType: atk.type,
    });
    renderDiceDisplay(rolls, info);
    renderCombatBreakdown(rolls, info);
  }

  function tutorialStepList() {
    const k = TUTORIAL_KEYS;
    const cavDrillAtkKey = '10,6';
    const cavDrillDefKey = '10,7';
    const arcR2DrillDest = '9,4';
    const genDrillAtkKey = '6,5';
    const genDrillDefKey = '7,5';
    const blueInfFront = [k.blueInfFrontL, k.blueInfFrontR];
    const blueInfBack = [k.blueInfBackL, k.blueInfBackC, k.blueInfBackR];
    const redInfFront = [k.redInfFrontL, k.redInfFrontR];
    const redInfBack = [k.redInfBackL, k.redInfBackC, k.redInfBackR];
    const blueInfBlock = [...blueInfFront, ...blueInfBack];
    const redInfBlock = [...redInfFront, ...redInfBack];
    const qualityKeys = [k.blueInfBackL, k.blueInfBackC, k.blueInfBackR, k.redInfBackL, k.redInfBackC, k.redInfBackR];

    const bInfTo = tutorialForwardDestination(k.blueInf, 'blue');
    const rInfTo = tutorialForwardDestination(k.redInf, 'red');
    const bCavTo = tutorialForwardDestination(k.blueCav, 'blue');
    const rCavTo = tutorialForwardDestination(k.redCav, 'red');
    const bSkrTo = tutorialForwardDestination(k.blueSkr, 'blue');
    const rSkrTo = tutorialForwardDestination(k.redSkr, 'red');
    const bLineToL = tutorialForwardDestination(k.blueInfFrontL, 'blue');
    const bLineToR = tutorialForwardDestination(k.blueInfFrontR, 'blue');
    const rLineToL = tutorialForwardDestination(k.redInfFrontL, 'red');
    const rLineToR = tutorialForwardDestination(k.redInfFrontR, 'red');
    const bArcR2Key = stepKeyInDirection(stepKeyInDirection(k.blueArc, 'downLeft') || '', 'downLeft');
    const bArcR3Key = stepKeyInDirection(bArcR2Key || '', 'downLeft');
    const rArcR2Key = stepKeyInDirection(stepKeyInDirection(k.redArc, 'upRight') || '', 'upRight');
    const rArcR3Key = stepKeyInDirection(rArcR2Key || '', 'upRight');
    const redRetreatKey = retreatPick(k.blueInfFrontL, k.redInfFrontR);
    const blueRetreatKey = retreatPick(k.redInfFrontR, k.blueInfFrontL);

    return [
      {
        id: 'field',
        title: 'Read The Field',
        text:
          'This mirrored tutorial battle keeps both armies symmetrical so each mechanic is easy to compare. ' +
          'Blue starts at the top, Red starts at the bottom.',
        focusKeys: [k.blueGen, k.redGen],
        noAutoHover: true,
        learn: [
          'Blue controls the northern deployment, Red controls the southern deployment.',
          'The center is left open so line geometry is easy to read.',
          'Use the step controls to pause, autoplay, or jump manually.',
        ],
        task: {
          type: 'select',
          text: 'Click either highlighted General to begin.',
          targetKeys: [k.blueGen, k.redGen],
        },
      },
      {
        id: 'quality_colors',
        title: 'Quality Colors (Green / Regular / Veteran)',
        text:
          'Ring color marks experience quality. Green units are less reliable, Regular are balanced, and Veteran units are steadier.',
        focusKeys: qualityKeys,
        learn: [
          'Green ring: inexperienced (more command-sensitive, lower staying power).',
          'Silver ring: regular line quality.',
          'Gold ring: veteran quality (better staying power and flexibility).',
        ],
        task: {
          type: 'select',
          text: 'Click one Green, one Regular, then one Veteran unit.',
          targetKeys: qualityKeys,
        },
      },
      {
        id: 'turn_flow',
        title: 'Turn Rhythm & Actions',
        text:
          'Each turn gives 3 actions. Most units activate once per turn. Movement, attacks, line advance, and directives all spend from the same action pool.',
        focusKeys: [k.blueInfFrontL, k.blueSkr, k.blueArc],
        learn: [
          'Action economy is your tempo system: every action should improve position or pressure.',
          'The best turn order is often move first, then attack or issue a directive.',
        ],
      },
      {
        id: 'inf_move',
        title: 'Infantry Movement & Formation',
        text:
          'Infantry move one hex and work best in connected ranks. In this drill, move the FRONT-LEFT Blue infantry (top line) to the marked destination.',
        focusKeys: [...blueInfBlock],
        destinationKeys: [bInfTo].filter(Boolean),
        paths: [
          { fromKey: k.blueInfFrontL, toKey: bInfTo, kind: 'move' },
        ].filter((p) => p.toKey),
        unitProfile: {
          move: 'Move: 1 hex per activation. Entering woods, hills, or rough can slow momentum.',
          role: 'Role: main battle line. Hold space, absorb contact, and push as a formation.',
          notes: [
            'Infantry should rarely fight as isolated single units.',
            'Rear supports matter because they help brace the front line.',
          ],
        },
        task: {
          type: 'move',
          text: 'Click the FRONT-LEFT highlighted Blue infantry, then click the highlighted destination hex.',
          sourceKeys: [k.blueInfFrontL],
          destinationKeys: [bInfTo].filter(Boolean),
        },
      },
      {
        id: 'inf_reinforce',
        title: 'Reinforced Infantry (Brace)',
        text:
          'Now inspect reinforcement on the SAME FRONT-LEFT Blue infantry from the prior step. No movement in this step: this is a brace/position check.',
        focusKeys: [...blueInfBlock],
        selectedKey: k.blueInfFrontL,
        learn: [
          'During this step, cyan marks the front infantry and linked support infantry behind it.',
          'Brace is infantry-only and depends on adjacent geometry.',
        ],
        unitProfile: {
          move: 'Brace is positional, not a separate move action.',
          role: 'Role: reduce incoming melee pressure through linked support.',
          notes: [
            'Hover or select infantry to read reinforcement details in Modifiers.',
            'If linked support breaks, brace coverage disappears.',
          ],
        },
        task: {
          type: 'select',
          text: 'Click the same FRONT-LEFT Blue infantry again (highlighted in cyan).',
          targetKeys: [k.blueInfFrontL],
        },
      },
      {
        id: 'line_advance',
        title: 'Trial Line Advance',
        text:
          'Line Advance moves a selected infantry row together. The highlighted trial shows both front infantry stepping in formation while support remains aligned behind.',
        focusKeys: [...blueInfFront, ...redInfFront, ...blueInfBack, ...redInfBack],
        destinationKeys: [bLineToL, bLineToR, rLineToL, rLineToR].filter(Boolean),
        paths: [
          { fromKey: k.blueInfFrontL, toKey: bLineToL, kind: 'move' },
          { fromKey: k.blueInfFrontR, toKey: bLineToR, kind: 'move' },
          { fromKey: k.redInfFrontL, toKey: rLineToL, kind: 'move' },
          { fromKey: k.redInfFrontR, toKey: rLineToR, kind: 'move' },
        ].filter((p) => p.toKey),
        learn: [
          'Line Advance uses diagonal vectors tied to your current row orientation.',
          'If one unit is blocked, the rest can still advance (partial line move).',
        ],
        task: {
          type: 'select',
          text: 'Select either highlighted Blue front infantry to prepare a line advance.',
          targetKeys: blueInfFront,
        },
      },
      {
        id: 'inf_combat',
        title: 'Infantry Combat Demo',
        text:
          'Infantry melee uses close-range dice pressure. In this drill, move first, then click an adjacent enemy to attack.',
        focusKeys: [k.blueInfFrontL, k.redInfFrontR],
        paths: [{ fromKey: k.blueInfFrontL, toKey: k.redInfFrontR, kind: 'melee' }],
        learn: [
          'Infantry melee base dice: 2.',
          '6 = hit + disarray, 5 = hit, 4 = retreat, 3 = disarray, 1-2 = miss.',
        ],
        task: {
          type: 'move_attack',
          text: 'Click Blue infantry -> click highlighted destination -> click highlighted Red infantry to attack.',
          sourceKeys: [k.blueInfFrontL],
          destinationKeys: [bInfTo].filter(Boolean),
          enemyKeys: [k.redInfFrontR],
        },
      },
      {
        id: 'cav_move',
        title: 'Cavalry Movement',
        text:
          'Cavalry are your mobile flank arm. They move farther in open lanes and are strongest when attacking exposed formations.',
        focusKeys: [k.blueCav, k.redCav],
        destinationKeys: [bCavTo, rCavTo].filter(Boolean),
        paths: [
          { fromKey: k.blueCav, toKey: bCavTo, kind: 'move' },
          { fromKey: k.redCav, toKey: rCavTo, kind: 'move' },
        ].filter((p) => p.toKey),
        unitProfile: {
          move: 'Move: 2 in open terrain; difficult terrain can reduce effective tempo.',
          role: 'Role: flank shock and exploitation.',
          notes: [
            'Use cavalry to attack angles and force line fractures.',
            'Avoid long frontal grinds into braced infantry.',
          ],
        },
        task: {
          type: 'move',
          text: 'Click the highlighted Blue cavalry, then click a highlighted destination hex.',
          sourceKeys: [k.blueCav],
          destinationKeys: [bCavTo].filter(Boolean),
        },
      },
      {
        id: 'cav_combat',
        title: 'Cavalry Combat Demo',
        text:
          'Cavalry melee can deliver larger impact than infantry when lanes are open and timing is right. Select cavalry, then strike the highlighted enemy.',
        focusKeys: [cavDrillAtkKey, cavDrillDefKey],
        paths: [{ fromKey: cavDrillAtkKey, toKey: cavDrillDefKey, kind: 'melee' }],
        learn: [
          'Cavalry melee base dice: 3.',
          'Cavalry shine when they can hit before the enemy line stabilizes.',
        ],
        onEnter: () => {
          tutorialTeleportUnit('blueCav', cavDrillAtkKey);
          tutorialTeleportUnit('redCav', cavDrillDefKey);
          tutorialResetUnitVitals('blueCav');
          tutorialResetUnitVitals('redCav');
        },
        task: {
          type: 'attack',
          text: 'Click the highlighted Blue cavalry, then click the highlighted Red cavalry to attack.',
          sourceKeys: [cavDrillAtkKey],
          enemyKeys: [cavDrillDefKey],
        },
      },
      {
        id: 'skr_move',
        title: 'Skirmisher Movement',
        text:
          'Skirmishers are flexible disruptors. They screen, probe, and reposition faster than heavy line units in many lanes.',
        focusKeys: [k.blueSkr, k.redSkr],
        destinationKeys: [bSkrTo, rSkrTo].filter(Boolean),
        paths: [
          { fromKey: k.blueSkr, toKey: bSkrTo, kind: 'move' },
          { fromKey: k.redSkr, toKey: rSkrTo, kind: 'move' },
        ].filter((p) => p.toKey),
        unitProfile: {
          move: 'Move: 2. Ranged: 1 die at range 2. Melee: 1 die.',
          role: 'Role: screen and disrupt before main-line contact.',
          notes: [
            'Skirmishers are best at tempo disruption, not static brawls.',
            'Use hill lines and lane control to force bad enemy paths.',
          ],
        },
        task: {
          type: 'move',
          text: 'Click the highlighted Blue skirmisher, then click a highlighted destination hex.',
          sourceKeys: [k.blueSkr],
          destinationKeys: [bSkrTo].filter(Boolean),
        },
      },
      {
        id: 'skr_combat',
        title: 'Skirmisher Combat Demo',
        text:
          'Skirmishers can sting at range 2 and can still fight in melee, but at lower raw dice than line infantry. Select then fire.',
        focusKeys: [k.blueSkr, k.redInfFrontL],
        paths: [{ fromKey: k.blueSkr, toKey: k.redInfFrontL, kind: 'ranged' }],
        learn: [
          'Skirmisher ranged profile: 1 die at range 2.',
          'Skirmisher melee profile: 1 die.',
        ],
        task: {
          type: 'attack',
          text: 'Click the highlighted Blue skirmisher, then click the highlighted Red infantry to attack.',
          sourceKeys: [k.blueSkr],
          enemyKeys: [k.redInfFrontL],
        },
      },
      {
        id: 'arc_range2',
        title: 'Archer Range 2 Demo',
        text:
          'Archers fire stronger at range 2. Move the archer one hex, then attack from range 2.',
        focusKeys: [k.blueArc, k.redSkr, arcR2DrillDest].filter(Boolean),
        paths: [
          { fromKey: k.blueArc, toKey: arcR2DrillDest, kind: 'move' },
          { fromKey: arcR2DrillDest, toKey: k.redSkr, kind: 'ranged' },
        ].filter((p) => p.toKey),
        unitProfile: {
          move: 'Move: 1. Ranged: 2 dice at range 2, 1 die at range 3. Melee: 1 die.',
          role: 'Role: ranged pressure and pre-contact disruption.',
          notes: [
            'Use range-2 volleys to force retreat/disarray before committing infantry.',
          ],
        },
        onEnter: () => {
          tutorialTeleportUnit('blueArc', k.blueArc);
          tutorialTeleportUnit('redSkr', k.redSkr);
          tutorialResetUnitVitals('blueArc');
          tutorialResetUnitVitals('redSkr');
        },
        task: {
          type: 'move_attack',
          text: 'Click Blue archer -> move to highlighted hex -> attack highlighted Red skirmisher.',
          sourceKeys: [k.blueArc],
          destinationKeys: [arcR2DrillDest],
          enemyKeys: [k.redSkr],
        },
      },
      {
        id: 'arc_range3',
        title: 'Archer Range 3 Demo',
        text:
          'At range 3, archers fire one die. Select the archer and attack from long range.',
        focusKeys: [k.blueArc, k.redSkr, bArcR3Key, rArcR3Key].filter(Boolean),
        paths: [
          { fromKey: k.blueArc, toKey: k.redSkr, kind: 'ranged' },
        ].filter((p) => p.toKey),
        learn: [
          'Range 3 is lower volume fire, useful for finishing pressure or forcing difficult choices.',
        ],
        onEnter: () => {
          tutorialTeleportUnit('blueArc', k.blueArc);
          tutorialTeleportUnit('redSkr', k.redSkr);
          tutorialResetUnitVitals('blueArc');
          tutorialResetUnitVitals('redSkr');
        },
        task: {
          type: 'attack',
          text: 'Click Blue archer, then click highlighted Red skirmisher (range 3).',
          sourceKeys: [k.blueArc],
          enemyKeys: [k.redSkr],
        },
      },
      {
        id: 'gen_command',
        title: 'General Command Radius',
        text:
          'Generals project command radius. Units inside command are responsive; broken links create friction and lost tempo.',
        focusKeys: [k.blueGen, k.redGen],
        selectedKey: k.blueGen,
        learn: [
          'General quality sets radius: Green 3, Regular 4, Veteran 5.',
          'Command coverage is often worth more than a risky attack.',
        ],
        unitProfile: {
          move: 'Move: 2. Command radius depends on quality.',
          role: 'Role: command anchor for line coherence.',
          notes: [
            'Keep generals alive and centrally relevant to your formation.',
          ],
        },
        task: {
          type: 'select',
          text: 'Select the highlighted Blue General to view command perimeter.',
          targetKeys: [k.blueGen],
        },
      },
      {
        id: 'gen_combat',
        title: 'General Combat Demo',
        text:
          'Generals can fight in melee, but they are not frontline brawlers. Use this drill to execute a single general attack.',
        focusKeys: [genDrillAtkKey, genDrillDefKey],
        paths: [{ fromKey: genDrillAtkKey, toKey: genDrillDefKey, kind: 'melee' }],
        learn: [
          'General melee profile: 1 die.',
          'Losing a general can collapse command and end games in Decapitation mode.',
        ],
        onEnter: () => {
          tutorialTeleportUnit('blueGen', genDrillAtkKey);
          tutorialTeleportUnit('redArc', genDrillDefKey);
          tutorialResetUnitVitals('blueGen');
          tutorialResetUnitVitals('redArc');
        },
        task: {
          type: 'attack',
          text: 'Click the highlighted Blue general, then click the highlighted Red unit to attack.',
          sourceKeys: [genDrillAtkKey],
          enemyKeys: [genDrillDefKey],
        },
      },
      {
        id: 'run',
        title: 'Runner (RUN)',
        text:
          'Runners relay command locally. They do not attack, but they keep distant troops linked when lines stretch.',
        focusKeys: [k.blueRun, k.redRun, k.blueInfFrontL, k.redInfFrontR],
        paths: [
          { fromKey: k.blueRun, toKey: k.blueInfFrontL, kind: 'command' },
          { fromKey: k.redRun, toKey: k.redInfFrontR, kind: 'command' },
        ],
        unitProfile: {
          move: 'Move: quality-based sprint. No direct attack.',
          role: 'Role: command relay support.',
          notes: [
            'Use runners to reconnect units drifting beyond direct general influence.',
          ],
        },
        task: {
          type: 'select',
          text: 'Select the highlighted Blue Runner.',
          targetKeys: [k.blueRun],
        },
      },
      {
        id: 'med',
        title: 'Medic (MED)',
        text:
          'Medics restore nearby wounded allies. Keep them protected just behind likely contact points.',
        focusKeys: [k.blueMed, k.redMed, k.blueInfFrontL, k.redInfFrontR],
        paths: [
          { fromKey: k.blueMed, toKey: k.blueInfFrontL, kind: 'support' },
          { fromKey: k.redMed, toKey: k.redInfFrontR, kind: 'support' },
        ],
        unitProfile: {
          move: 'Move: 1. Action: heal +1 HP to one adjacent ally.',
          role: 'Role: sustain and recovery support.',
          notes: [
            'Medics cannot fight and should stay screened by combat units.',
          ],
        },
        task: {
          type: 'select',
          text: 'Select the highlighted Blue Medic.',
          targetKeys: [k.blueMed],
        },
      },
      {
        id: 'terrain',
        title: 'Terrain Friction & Positioning',
        text:
          'Terrain is geometry, not decoration. Woods, hills, and rough change movement tempo and tactical lanes.',
        focusKeys: ['4,4', '10,6', '5,5', '9,5', '6,6', '8,4'],
        learn: [
          'Woods impose defensive pressure; rough and hills shape movement and lane choice.',
          'Hover any terrain hex to see live movement/combat notes in Modifiers.',
        ],
        task: {
          type: 'inspect',
          text: 'Click any highlighted terrain hex to inspect modifiers.',
          targetKeys: ['4,4', '10,6', '5,5', '9,5', '6,6', '8,4'],
        },
      },
      {
        id: 'directives',
        title: 'War Council Directives',
        text:
          'A directive is a tactical order you can issue during your turn. Reusable directives can return; single-use directives are one-turn spikes.',
        focusKeys: [k.blueGen, k.blueInfFrontL, k.blueCav, k.blueArc],
        learn: [
          'Directives spend actions from the same 3-action turn budget.',
          'Use “Show UI” if you want to inspect the full right-side command panel while learning.',
        ],
      },
      {
        id: 'combat_results',
        title: 'Combat Results: Hit, Retreat, Disarray',
        text:
          'Core dice language: 6 = hit + disarray, 5 = hit, 4 = retreat, 3 = disarray, 1-2 = miss.',
        focusKeys: [k.blueInfFrontL, k.redInfFrontR],
        paths: [{ fromKey: k.blueInfFrontL, toKey: k.redInfFrontR, kind: 'melee' }],
        learn: [
          'Retreat and disarray can break lines even before units are destroyed.',
        ],
      },
      {
        id: 'retreat',
        title: 'Retreat Resolution',
        text:
          'A retreat result pushes the defender away from the attacker by one hex. If no legal retreat exists, retreat converts into damage.',
        focusKeys: [k.blueInfFrontL, k.redInfFrontR, redRetreatKey, blueRetreatKey].filter(Boolean),
        destinationKeys: [redRetreatKey, blueRetreatKey].filter(Boolean),
        paths: [
          { fromKey: k.redInfFrontR, toKey: redRetreatKey, kind: 'retreat' },
          { fromKey: k.blueInfFrontL, toKey: blueRetreatKey, kind: 'retreat' },
        ].filter((p) => p.toKey),
        learn: [
          'Retreat is positional pressure, not free escape.',
          'Pinning retreat lanes is often stronger than chasing raw hits.',
        ],
        task: {
          type: 'inspect',
          text: 'Click one highlighted retreat destination hex.',
          targetKeys: [redRetreatKey, blueRetreatKey].filter(Boolean),
        },
      },
      {
        id: 'disarray',
        title: 'Disarray & Recovery',
        text:
          'Disarray means a formation is rattled. A disarrayed unit cannot move or attack on its next activation, then recovers.',
        focusKeys: [k.blueInfFrontL, k.redInfFrontR],
        learn: [
          'Disarray creates tactical windows for follow-up directives or line shoves.',
          'Medics cannot heal disarrayed units.',
        ],
        task: {
          type: 'select',
          text: 'Select either highlighted infantry unit to review disarray flow.',
          targetKeys: [k.blueInfFrontL, k.redInfFrontR],
        },
      },
      {
        id: 'victory',
        title: 'Victory Conditions',
        text:
          'Default mode is Decapitation: eliminate enemy generals. Other modes include annihilation and UP-based victory tracks.',
        focusKeys: [k.blueGen, k.redGen],
        learn: [
          'Score panel tracks each side’s UP and HP totals in real time.',
          'Decapitation ends immediately when all enemy generals are eliminated.',
        ],
        onEnter: () => {
          tutorialTeleportUnit('blueGen', k.blueGen);
          tutorialTeleportUnit('redGen', k.redGen);
          tutorialTeleportUnit('redArc', k.redArc);
          tutorialResetUnitVitals('blueGen');
          tutorialResetUnitVitals('redGen');
        },
      },
      {
        id: 'ready',
        title: 'Tutorial Complete',
        text:
          'You now have movement, combat, and command basics for each unit type. Exit tutorial to play this position, or return to intro for Play Now or full setup.',
        focusKeys: [k.blueGen, k.redGen, k.blueInfFrontL, k.redInfFrontR],
        learn: [
          'Replay tutorial anytime from the intro screen.',
          'Next step: play a full battle and test doctrine timing under pressure.',
        ],
      },
    ];
  }

  function renderTutorialGuide() {
    if (!elTutorialGuideOverlay) return;
    if (!state.tutorial.active) return;
    const steps = tutorialStepList();
    const idx = Math.max(0, Math.min(steps.length - 1, state.tutorial.stepIndex || 0));
    const step = steps[idx];
    if (elTutorialGuideStepMeta) elTutorialGuideStepMeta.textContent = `Step ${idx + 1}/${steps.length}`;
    if (elTutorialGuideStepTitle) elTutorialGuideStepTitle.textContent = step.title;
    if (elTutorialGuideStepText) elTutorialGuideStepText.textContent = step.text;
    if (elTutorialGuideLearn) {
      const learn = Array.isArray(step.learn) ? step.learn.filter(Boolean) : [];
      elTutorialGuideLearn.hidden = learn.length === 0;
      if (learn.length > 0) {
        elTutorialGuideLearn.innerHTML = learn.map((line) => `<li>${line}</li>`).join('');
      } else {
        elTutorialGuideLearn.innerHTML = '';
      }
    }
    const unitProfile = step.unitProfile || null;
    if (elTutorialGuideUnitWrap) {
      elTutorialGuideUnitWrap.hidden = !unitProfile;
    }
    if (unitProfile) {
      if (elTutorialGuideUnitMove) elTutorialGuideUnitMove.textContent = unitProfile.move || '';
      if (elTutorialGuideUnitRole) elTutorialGuideUnitRole.textContent = unitProfile.role || '';
      if (elTutorialGuideUnitNotes) {
        const notes = Array.isArray(unitProfile.notes) ? unitProfile.notes.filter(Boolean) : [];
        elTutorialGuideUnitNotes.hidden = notes.length === 0;
        elTutorialGuideUnitNotes.innerHTML = notes.map((line) => `<li>${line}</li>`).join('');
      }
    } else {
      if (elTutorialGuideUnitMove) elTutorialGuideUnitMove.textContent = '';
      if (elTutorialGuideUnitRole) elTutorialGuideUnitRole.textContent = '';
      if (elTutorialGuideUnitNotes) {
        elTutorialGuideUnitNotes.hidden = true;
        elTutorialGuideUnitNotes.innerHTML = '';
      }
    }
    const task = state.tutorial.task || { active: false, done: false };
    if (elTutorialGuideTaskWrap) {
      elTutorialGuideTaskWrap.hidden = !task.active;
    }
    if (elTutorialGuideTaskText && task.active) {
      elTutorialGuideTaskText.textContent = task.text || 'Complete the highlighted task.';
    }
    if (elTutorialGuideTaskStatus && task.active) {
      let status = '';
      if (task.done) {
        status = 'Complete. You can continue.';
      } else if (task.type === 'move') {
        status = 'Pending: click a highlighted source unit, then a highlighted destination hex.';
      } else if (task.type === 'attack') {
        status = 'Pending: click a highlighted attacker, then a highlighted enemy target.';
      } else if (task.type === 'move_attack') {
        status = task.progress?.moved
          ? 'Pending: movement done. Now attack a highlighted enemy target.'
          : 'Pending: move the highlighted unit first, then attack the highlighted enemy.';
      } else if (task.type === 'select') {
        const count = Number(task.targetKeys?.length || 0);
        status = count <= 1
          ? 'Pending: click the highlighted unit.'
          : `Pending: click a highlighted target (${count} available).`;
      } else {
        status = `Pending: ${task.targetKeys?.length ? `${task.targetKeys.length} target${task.targetKeys.length === 1 ? '' : 's'} highlighted.` : 'follow prompt.'}`;
      }
      elTutorialGuideTaskStatus.textContent = status;
      elTutorialGuideTaskStatus.classList.toggle('done', !!task.done);
    }
    if (elTutorialPrevBtn) elTutorialPrevBtn.disabled = idx <= 0;
    if (elTutorialNextBtn) elTutorialNextBtn.disabled = idx >= (steps.length - 1) || tutorialTaskNeedsInput();
    if (elTutorialSkipTaskBtn) {
      elTutorialSkipTaskBtn.hidden = !task.active;
      elTutorialSkipTaskBtn.disabled = !task.active || !!task.done;
    }
    if (elTutorialAutoBtn) {
      elTutorialAutoBtn.textContent = state.tutorial.autoplay ? 'Pause Auto' : 'Autoplay';
      elTutorialAutoBtn.classList.toggle('active', !!state.tutorial.autoplay);
      elTutorialAutoBtn.disabled = tutorialTaskNeedsInput();
    }
    if (elTutorialToggleUiBtn) {
      elTutorialToggleUiBtn.textContent = state.tutorial.showSidePanel ? 'Hide UI' : 'Show UI';
    }
    if (elTutorialMinBtn) {
      elTutorialMinBtn.textContent = state.tutorial.minimized ? 'Restore' : 'Minimize';
    }
  }

  function applyTutorialStep(idx, options = {}) {
    const steps = tutorialStepList();
    const clamped = Math.max(0, Math.min(steps.length - 1, Number(idx) || 0));
    const step = steps[clamped];
    state.tutorial.stepIndex = clamped;
    clearTutorialTimers();
    clearSelection();
    clearDoctrineTargeting();
    closeCommandPhase();

    state.tutorial.visual = {
      focusKeys: Array.isArray(step.focusKeys) ? step.focusKeys.filter((k) => board.activeSet.has(k)) : [],
      destinationKeys: Array.isArray(step.destinationKeys) ? step.destinationKeys.filter((k) => board.activeSet.has(k)) : [],
      paths: Array.isArray(step.paths)
        ? step.paths.filter((p) => p && p.fromKey && p.toKey && board.activeSet.has(p.fromKey) && board.activeSet.has(p.toKey))
        : [],
    };
    setTutorialTaskFromStep(step);

    if (step.selectedKey && board.activeSet.has(step.selectedKey) && unitsByHex.has(step.selectedKey)) {
      state.selectedKey = step.selectedKey;
    }

    if (typeof step.hoverKey === 'string' && board.activeSet.has(step.hoverKey)) {
      state._hoverKey = step.hoverKey;
    } else if (step.noAutoHover) {
      state._hoverKey = null;
    } else {
      state._hoverKey = state.tutorial.visual.focusKeys[0] || null;
    }
    if (typeof step.onEnter === 'function') {
      step.onEnter();
    }

    if (state.tutorial.autoplay && clamped < (steps.length - 1) && !tutorialTaskNeedsInput()) {
      queueTutorialTimer(() => {
        if (!state.tutorial.active) return;
        applyTutorialStep(clamped + 1);
      }, TUTORIAL_AUTOPLAY_STEP_MS);
    }

    if (options.log !== false) {
      log(`Tutorial: ${step.title}`);
    }
    renderTutorialGuide();
    updateHud();
  }

  function setTutorialAutoplay(on) {
    state.tutorial.autoplay = !!on;
    if (!state.tutorial.autoplay) {
      clearTutorialTimers();
      renderTutorialGuide();
      return;
    }
    if (tutorialTaskNeedsInput()) {
      state.tutorial.autoplay = false;
      log('Autoplay paused: complete the current tutorial task first.');
      renderTutorialGuide();
      return;
    }
    applyTutorialStep(state.tutorial.stepIndex, { log: false });
  }

  function stopGuidedTutorial() {
    setTutorialAutoplay(false);
    clearTutorialTimers();
    setTutorialGuideOpen(false);
    clearSelection();
    state._hoverKey = null;
    log('Tutorial closed.');
    updateHud();
  }

  function startGuidedTutorialFromIntro() {
    state.gameMode = 'hvai';
    state.humanSide = 'blue';
    state.forwardAxis = 'vertical';
    loadScenario(GUIDED_TUTORIAL_SCENARIO_NAME);
    cacheTutorialUnitIds();
    prepareQuickStartDoctrine();
    setIntroOverlayOpen(false);
    enterPlay();
    setTutorialGuideOpen(true);
    state.tutorial.stepIndex = 0;
    state.tutorial.autoplay = false;
    applyTutorialStep(0, { log: true });
    log('Guided tutorial started. Use Next/Previous or Autoplay in the tutorial card.');
    updateHud();
  }

  function setIntroOverlayOpen(open) {
    const show = !!open;
    state.introOpen = show;
    if (elIntroOverlay) {
      elIntroOverlay.classList.toggle('open', show);
      elIntroOverlay.setAttribute('aria-hidden', show ? 'false' : 'true');
    }
    if (!show) setIntroTutorialOpen(false);
    if (show && state.tutorial.active) stopGuidedTutorial();
    document.body.classList.toggle('intro-open', show);
  }

  function prepareQuickStartDoctrine() {
    const blueRandom = makeRandomDoctrineLoadout();
    const redRandom = makeRandomDoctrineLoadout();
    setDoctrineLoadoutForSide('blue', blueRandom, 'random');
    setDoctrineLoadoutForSide('red', redRandom, 'random');
    state.doctrine.builder.confirmed = { blue: true, red: true };
    state.doctrine.builder.preBattleReady = true;
  }

  function startPlayNowFromIntro() {
    if (state.tutorial.active) stopGuidedTutorial();
    const randomScenario = installRandomStartupScenario();
    populateScenarioSelect();
    if (elScenarioSel && [...elScenarioSel.options].some((o) => o.value === RANDOM_START_SCENARIO_NAME)) {
      elScenarioSel.value = RANDOM_START_SCENARIO_NAME;
    }
    loadScenario(RANDOM_START_SCENARIO_NAME);
    prepareQuickStartDoctrine();
    setIntroOverlayOpen(false);
    enterPlay();
    log(
      `Play Now launched: randomized battlefield loaded ` +
      `(B:${randomScenario.blueArchetype || 'line'} / R:${randomScenario.redArchetype || 'line'}).`
    );
    updateHud();
  }

  function startSetupFromIntro() {
    if (state.tutorial.active) stopGuidedTutorial();
    state.doctrine.builder.preBattleReady = false;
    state.doctrine.builder.confirmed = { blue: false, red: false };
    setIntroOverlayOpen(false);
    enterEdit();
    log('Game Setup opened: edit the field and confirm War Council when ready.');
    updateHud();
  }

  // --- Mode transitions
  function clearSelection() {
    state.selectedKey = null;
    state.act = null;
    state._moveTargets = null;
    state._attackTargets = null;
    state._healTargets = null;
  }

  function enterEdit() {
    stopAiLoop();
    state.mode = 'edit';
    state.tool = 'units';
    state.doctrine.builder.preBattleReady = false;
    state.doctrine.builder.confirmed = { blue: false, red: false };
    const sideEl = document.getElementById('side');
    if (sideEl) sideEl.scrollTop = 0;

    state.gameOver = false;
    state.winner = null;

    clearSelection();

    log('Edit: place units / paint terrain.');
    updateHud();
  }

  function enterPlay() {
    if (state.draft.active) {
      log('Finish custom army setup first (Done For Side for each player).');
      updateHud();
      return;
    }
    if (!state.doctrine.builder.preBattleReady) {
      log('Review the battlefield first, then open War Council and confirm Blue + Red orders (3 per cost tier).');
      updateHud();
      return;
    }
    ensureDoctrineStateInitialized(false);
    const blueLoadout = doctrineStateForSide('blue')?.loadout || [];
    const redLoadout = doctrineStateForSide('red')?.loadout || [];
    if (!validateDoctrineLoadout(blueLoadout) || !validateDoctrineLoadout(redLoadout)) {
      state.doctrine.builder.preBattleReady = false;
      log('Doctrine incomplete: each side must pick exactly 3 Cost-1, 3 Cost-2, and 3 Cost-3 orders.');
      updateHud();
      return;
    }

    if (state.gameMode === 'online') {
      if (!net.connected) {
        log('Online: both players must connect before starting battle.');
        updateHud();
        return;
      }
      if (!net.isHost) {
        log('Online: host starts battle after initiative roll.');
        updateHud();
        return;
      }
    }

    stopAiLoop();
    state.mode = 'play';
    const sideEl = document.getElementById('side');
    if (sideEl) sideEl.scrollTop = 0;
    state.turn = 1;
    state.turnSerial = 1;
    state.actsUsed = 0;
    state.actedUnitIds = new Set();

    state.gameOver = false;
    state.winner = null;

    // Lock initial UP for Clear Victory.
    state.initialUP.blue = totals('blue').up;
    state.initialUP.red = totals('red').up;

    // Reset capture tally.
    state.capturedUP.blue = 0;
    state.capturedUP.red = 0;

    clearSelection();
    clearDiceDisplay();

    let openingSide = 'blue';
    if (state.gameMode === 'online') {
      applyGuestSidePreference(state.online.guestPreferredSide);
      const guestParity = normalizeParityPick(state.online.guestParityPick);
      const roll = rollD6();
      const isOdd = (roll % 2) === 1;
      const guestWins = (guestParity === 'odds') ? isOdd : !isOdd;
      openingSide = guestWins ? state.online.seats.guest : state.online.seats.host;
      state.online.lastInitiativeRoll = roll;
      state.online.lastInitiativeGuestWon = guestWins;
      state.online.lastInitiativeFirstSide = openingSide;
      renderInitiativeRoll(roll, {
        guestParity,
        guestWon: guestWins,
        firstSide: openingSide,
      });
      const parityWord = isOdd ? 'odd' : 'even';
      log(
        `Initiative roll d6=${roll} (${parityWord}). Guest called ${guestParity.toUpperCase()} ` +
        `and ${guestWins ? 'wins' : 'loses'} initiative. ${openingSide.toUpperCase()} goes first.`
      );
      onlineSendPacket({
        kind: 'initiative_result',
        roll,
        guestParityPick: guestParity,
        guestWon,
        firstSide: openingSide,
        hostSide: state.online.seats.host,
        guestSide: state.online.seats.guest,
      });
    } else {
      state.online.lastInitiativeRoll = null;
      state.online.lastInitiativeGuestWon = null;
      state.online.lastInitiativeFirstSide = null;
    }

    state.side = openingSide;
    openCommandPhaseForCurrentTurn();

    if (state.gameMode !== 'online') {
      log('Play: click a friendly unit. Blue goes first.');
    }
    updateHud();
    maybeStartAiTurn();
  }

  // --- Editing actions
  function normalizeQuality(type, quality) {
    // Keep legacy signature; quality now applies to all unit types, including GEN.
    if (type === 'iat') return 'regular';
    if (!QUALITY_ORDER.includes(quality)) return 'green';
    return quality;
  }

  function placeOrReplaceUnit(hexKey) {
    const h = board.byKey.get(hexKey);
    if (!h) return;

    if (state.draft.active) {
      handleDraftPlacement(hexKey);
      return;
    }

    if (state.editErase) {
      if (unitsByHex.delete(hexKey)) log(`Erased unit at ${hexKey}`);
      updateHud();
      return;
    }

    const type = state.editType;
    const def = UNIT_BY_ID.get(type);
    if (!def) return;

    const quality = normalizeQuality(type, state.editQuality);

    const existing = unitsByHex.get(hexKey);
    if (existing) {
      existing.side = state.editSide;
      existing.type = type;
      existing.quality = quality;
      existing.hp = unitMaxHp(type, quality);
      existing.disarray = false;
      log(`Replaced at ${hexKey} → ${state.editSide} ${def.abbrev}`);
    } else {
      unitsByHex.set(hexKey, {
        id: nextUnitId++,
        side: state.editSide,
        type,
        quality,
        hp: unitMaxHp(type, quality),
        disarray: false,
      });
      log(`Placed ${state.editSide} ${def.abbrev} at ${hexKey}`);
    }

    updateHud();
  }

  function paintTerrain(hexKey) {
    const h = board.byKey.get(hexKey);
    if (!h) return;
    if (state.draft.active) {
      log('Custom draft locks terrain. Place units only.');
      updateHud();
      return;
    }
    h.terrain = state.editTerrain;
    log(`Terrain ${state.editTerrain} at ${hexKey}`);
    updateHud();
  }

  function clearUnits() {
    unitsByHex.clear();
    nextUnitId = 1;
    state.doctrine.builder.preBattleReady = false;
    state.doctrine.builder.confirmed = { blue: false, red: false };
    if (state.draft.active) {
      state.draft.remaining.blue = state.draft.budget;
      state.draft.remaining.red = state.draft.budget;
      state.draft.done.blue = false;
      state.draft.done.red = false;
      state.draft.side = 'blue';
      state.editSide = 'blue';
    }
    log('Cleared all units.');
    updateHud();
  }

  function resetTerrain() {
    for (const h of board.active) h.terrain = 'clear';
  }

  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function shuffledCopy(arr) {
    const out = arr.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = out[i];
      out[i] = out[j];
      out[j] = tmp;
    }
    return out;
  }

  function pullRandomFromPool(pool) {
    if (!Array.isArray(pool) || pool.length === 0) return null;
    const idx = randInt(0, pool.length - 1);
    return pool.splice(idx, 1)[0] || null;
  }

  function pickPreferredHex(pool, predicates) {
    if (!Array.isArray(pool) || pool.length === 0) return null;
    for (const pred of predicates || []) {
      if (typeof pred !== 'function') continue;
      const hits = [];
      for (let i = 0; i < pool.length; i++) {
        if (pred(pool[i])) hits.push(i);
      }
      if (hits.length > 0) {
        const chosenIdx = hits[randInt(0, hits.length - 1)];
        return pool.splice(chosenIdx, 1)[0] || null;
      }
    }
    return pullRandomFromPool(pool);
  }

  function randomQualityForType(type) {
    if (type === 'iat') return 'regular';
    const roll = Math.random();
    if (type === 'run') {
      if (roll < 0.20) return 'veteran';
      if (roll < 0.60) return 'regular';
      return 'green';
    }
    if (type === 'gen') {
      if (roll < 0.20) return 'veteran';
      if (roll < 0.70) return 'regular';
      return 'green';
    }
    if (type === 'cav') {
      if (roll < 0.25) return 'veteran';
      if (roll < 0.65) return 'regular';
      return 'green';
    }
    if (type === 'inf') {
      if (roll < 0.15) return 'veteran';
      if (roll < 0.60) return 'regular';
      return 'green';
    }
    if (roll < 0.20) return 'veteran';
    if (roll < 0.55) return 'regular';
    return 'green';
  }

  function qualityTargetCounts(type, count) {
    if (count <= 0) return { veteran: 0, regular: 0, green: 0 };
    if (type === 'iat') return { veteran: 0, regular: count, green: 0 };

    let veteranRatio = 0.20;
    let regularRatio = 0.55;

    if (type === 'cav') {
      veteranRatio = 0.46;
      regularRatio = 0.40;
    } else if (type === 'inf') {
      veteranRatio = 0.18;
      regularRatio = 0.68;
    } else if (type === 'arc') {
      veteranRatio = 0.30;
      regularRatio = 0.60;
    } else if (type === 'skr') {
      veteranRatio = 0.24;
      regularRatio = 0.56;
    } else if (type === 'gen' || type === 'run') {
      veteranRatio = 0.30;
      regularRatio = 0.60;
    }

    let veteran = Math.max(0, Math.round(count * veteranRatio));
    let regular = Math.max(0, Math.round(count * regularRatio));
    if (veteran + regular > count) regular = Math.max(0, count - veteran);
    let green = Math.max(0, count - veteran - regular);

    // Keep at least one green in larger groups so the line is not uniformly elite.
    if (count >= 6 && green === 0) {
      green = 1;
      if (regular > veteran && regular > 0) regular -= 1;
      else if (veteran > 0) veteran -= 1;
    }

    return { veteran, regular, green };
  }

  function pickQualityAnchor(entries, scoreFn) {
    if (!entries.length) return null;
    let best = entries[0];
    let bestScore = -Infinity;
    for (const e of entries) {
      const score = scoreFn(e);
      if (score > bestScore) {
        bestScore = score;
        best = e;
      }
    }
    return best;
  }

  function groupedQualityScores(type, depthN, flankN, centerN) {
    if (type === 'cav') {
      return {
        veteran: (depthN * 1.0) + (flankN * 1.35),
        regular: (depthN * 0.75) + (flankN * 0.6),
      };
    }
    if (type === 'inf') {
      return {
        veteran: (depthN * 0.95) + (centerN * 1.0),
        regular: (depthN * 0.70) + (centerN * 1.2),
      };
    }
    if (type === 'arc') {
      return {
        veteran: ((1 - depthN) * 1.1) + (centerN * 0.7),
        regular: ((1 - depthN) * 1.0) + (centerN * 1.0),
      };
    }
    if (type === 'skr') {
      return {
        veteran: (depthN * 0.8) + (flankN * 0.8),
        regular: (depthN * 0.65) + (centerN * 0.6),
      };
    }
    if (type === 'gen' || type === 'run') {
      return {
        veteran: ((1 - depthN) * 0.7) + (centerN * 1.05),
        regular: ((1 - depthN) * 1.0) + (centerN * 1.1),
      };
    }
    return {
      veteran: (depthN * 0.8) + (centerN * 0.8),
      regular: (depthN * 0.7) + (centerN * 0.9),
    };
  }

  function assignGroupedQualitiesForType(entries, side, type, geometry) {
    if (!entries || entries.length === 0) return;
    if (type === 'iat') {
      for (const e of entries) e.quality = 'regular';
      return;
    }

    const targets = qualityTargetCounts(type, entries.length);
    const withMeta = entries.map((e, idx) => {
      const meta = geometry.byKey.get(key(e.q, e.r)) || null;
      const depthN = sideDepthNorm(meta, side);
      const flankN = meta ? Math.abs(meta.lateralN - 0.5) * 2 : 0;
      const centerN = 1 - Math.min(1, flankN);
      const scores = groupedQualityScores(type, depthN, flankN, centerN);
      return {
        idx,
        e,
        depthN,
        flankN,
        centerN,
        veteranScore: scores.veteran,
        regularScore: scores.regular,
      };
    });

    const veteranAnchor = pickQualityAnchor(withMeta, (x) => x.veteranScore);
    const regularAnchor = pickQualityAnchor(withMeta, (x) => {
      const distFromVeteran = veteranAnchor
        ? axialDistance(x.e.q, x.e.r, veteranAnchor.e.q, veteranAnchor.e.r)
        : 0;
      return x.regularScore + (distFromVeteran * 0.08);
    });

    const pool = withMeta.slice();
    function takeNearest(anchor, count, tieKey) {
      if (!anchor || count <= 0 || pool.length === 0) return [];
      pool.sort((a, b) => {
        const da = axialDistance(a.e.q, a.e.r, anchor.e.q, anchor.e.r);
        const db = axialDistance(b.e.q, b.e.r, anchor.e.q, anchor.e.r);
        if (da !== db) return da - db;
        const ak = (typeof a[tieKey] === 'number') ? a[tieKey] : a.regularScore;
        const bk = (typeof b[tieKey] === 'number') ? b[tieKey] : b.regularScore;
        return bk - ak;
      });
      return pool.splice(0, Math.min(count, pool.length));
    }

    const veterans = takeNearest(veteranAnchor, targets.veteran, 'veteranScore');
    const regulars = takeNearest(regularAnchor, targets.regular, 'regularScore');
    const greens = pool;

    for (const p of veterans) p.e.quality = 'veteran';
    for (const p of regulars) p.e.quality = 'regular';
    for (const p of greens) p.e.quality = 'green';
  }

  function assignGroupedForceQualities(force, side, geometry) {
    const byType = new Map();
    for (const e of force) {
      if (!byType.has(e.type)) byType.set(e.type, []);
      byType.get(e.type).push(e);
    }
    for (const [type, entries] of byType) {
      assignGroupedQualitiesForType(entries, side, type, geometry);
    }
  }

  function chooseRandomForwardAxis() {
    const roll = Math.random();
    // Requested bias: 60% top-vs-bottom deployments.
    if (roll < 0.60) return 'vertical';
    if (roll < 0.80) return 'horizontal';
    if (roll < 0.90) return 'diag_tl_br';
    return 'diag_tr_bl';
  }

  function chooseRandomUnitsPerSide() {
    // Keep generated openings varied while capping at 30 per side.
    const roll = Math.random();
    if (roll < 0.30) return randInt(RANDOM_START_UNITS_PER_SIDE_MIN, 24);
    if (roll < 0.78) return randInt(25, 28);
    return randInt(29, RANDOM_START_UNITS_PER_SIDE_MAX);
  }

  function axisScalarsForHex(h, axis) {
    const a = normalizeForwardAxis(axis);
    if (a === 'horizontal') return { approachRaw: h.q, lateralRaw: h.r };
    if (a === 'diag_tl_br') return { approachRaw: h.q + h.r, lateralRaw: h.r - h.q };
    if (a === 'diag_tr_bl') return { approachRaw: h.r - h.q, lateralRaw: h.q + h.r };
    return { approachRaw: h.r, lateralRaw: h.q };
  }

  function buildAxisGeometry(axis) {
    let minApproach = Infinity;
    let maxApproach = -Infinity;
    let minLateral = Infinity;
    let maxLateral = -Infinity;

    for (const h of board.active) {
      const s = axisScalarsForHex(h, axis);
      if (s.approachRaw < minApproach) minApproach = s.approachRaw;
      if (s.approachRaw > maxApproach) maxApproach = s.approachRaw;
      if (s.lateralRaw < minLateral) minLateral = s.lateralRaw;
      if (s.lateralRaw > maxLateral) maxLateral = s.lateralRaw;
    }

    const approachSpan = Math.max(1, maxApproach - minApproach);
    const lateralSpan = Math.max(1, maxLateral - minLateral);
    const byKey = new Map();
    const entries = [];

    for (const h of board.active) {
      const s = axisScalarsForHex(h, axis);
      const meta = {
        approachRaw: s.approachRaw,
        lateralRaw: s.lateralRaw,
        approachN: (s.approachRaw - minApproach) / approachSpan,
        lateralN: (s.lateralRaw - minLateral) / lateralSpan,
      };
      byKey.set(h.k, meta);
      entries.push({ h, ...meta });
    }

    function metaFor(keyOrMeta) {
      if (!keyOrMeta) return null;
      if (typeof keyOrMeta === 'string') return byKey.get(keyOrMeta) || null;
      if (typeof keyOrMeta === 'object' && Number.isFinite(keyOrMeta.approachN) && Number.isFinite(keyOrMeta.lateralN)) {
        return keyOrMeta;
      }
      return null;
    }

    function frontDepthForSide(side, keyOrMeta) {
      const meta = metaFor(keyOrMeta);
      if (!meta) return 0.5;
      return (side === 'blue') ? meta.approachN : (1 - meta.approachN);
    }

    function lateralForSide(_side, keyOrMeta) {
      const meta = metaFor(keyOrMeta);
      if (!meta) return 0;
      // Signed offset from board centerline: negative = left, positive = right.
      return meta.lateralN - 0.5;
    }

    return {
      axis: normalizeForwardAxis(axis),
      byKey,
      entries,
      frontDepthForSide,
      lateralForSide,
    };
  }

  function sideDepthNorm(meta, side) {
    if (!meta) return 0.5;
    return (side === 'blue') ? meta.approachN : (1 - meta.approachN);
  }

  function createRandomTerrainLayout(axis, geometry) {
    const terrainByHex = new Map();
    const centerLaneHalf = 0.17 + (Math.random() * 0.05);
    const clashBandHalf = 0.20 + (Math.random() * 0.06);
    const deploymentBand = 0.18;
    const advantageRoll = Math.random();
    const advantageSide = (advantageRoll < 0.35) ? 'blue' : ((advantageRoll < 0.70) ? 'red' : 'none');

    function metaAtHex(hex) {
      return geometry.byKey.get(hex.k) || null;
    }

    function isCenterLane(meta) {
      return Math.abs(meta.lateralN - 0.5) <= centerLaneHalf;
    }

    function isClashBand(meta) {
      return Math.abs(meta.approachN - 0.5) <= clashBandHalf;
    }

    function isDeployment(meta) {
      return meta.approachN <= deploymentBand || meta.approachN >= (1 - deploymentBand);
    }

    function isFlank(meta) {
      return Math.abs(meta.lateralN - 0.5) >= 0.28;
    }

    function isEdge(meta) {
      return meta.approachN <= 0.10 || meta.approachN >= 0.90 || meta.lateralN <= 0.10 || meta.lateralN >= 0.90;
    }

    function canPaint(meta) {
      if (!meta) return false;
      if (isCenterLane(meta) && isClashBand(meta)) return false;
      if (isDeployment(meta) && isCenterLane(meta)) return false;
      return true;
    }

    function setTerrainAt(hex, terrainId) {
      if (!hex || terrainByHex.has(hex.k)) return false;
      terrainByHex.set(hex.k, terrainId);
      return true;
    }

    function filteredCandidates(predicate) {
      const out = [];
      for (const e of geometry.entries) {
        if (terrainByHex.has(e.h.k)) continue;
        if (!canPaint(e)) continue;
        if (typeof predicate === 'function' && !predicate(e)) continue;
        out.push(e.h);
      }
      return out;
    }

    function pickSeed(candidates) {
      if (!Array.isArray(candidates) || candidates.length === 0) return null;
      return candidates[randInt(0, candidates.length - 1)] || null;
    }

    function paintCluster(terrainId, seedHex, targetSize, acceptFn) {
      if (!seedHex || targetSize <= 0) return 0;

      const frontier = [seedHex.k];
      const seen = new Set(frontier);
      let placed = 0;

      while (frontier.length > 0 && placed < targetSize) {
        const idx = randInt(0, frontier.length - 1);
        const hk = frontier.splice(idx, 1)[0];
        const h = board.byKey.get(hk);
        if (!h || terrainByHex.has(hk)) continue;

        const meta = metaAtHex(h);
        if (!meta || !canPaint(meta)) continue;
        if (typeof acceptFn === 'function' && !acceptFn(meta, h)) continue;

        if (!setTerrainAt(h, terrainId)) continue;
        placed += 1;

        for (const nk of shuffledCopy(h.neigh)) {
          if (!seen.has(nk)) {
            seen.add(nk);
            frontier.push(nk);
          }
        }
      }

      return placed;
    }

    const midFlank = () => filteredCandidates(e => {
      return isFlank(e) && e.approachN >= 0.20 && e.approachN <= 0.80;
    });
    const edgeFlank = () => filteredCandidates(e => {
      return isFlank(e) && isEdge(e) && !isDeployment(e);
    });
    const roughBand = () => filteredCandidates(e => {
      return !isDeployment(e) && (!isCenterLane(e) || !isClashBand(e));
    });
    const sideHighGround = () => filteredCandidates(e => {
      const onSideBand = (
        (e.approachN >= 0.14 && e.approachN <= 0.34) ||
        (e.approachN >= 0.66 && e.approachN <= 0.86)
      );
      return onSideBand && Math.abs(e.lateralN - 0.5) >= 0.20 && !isDeployment(e);
    });
    const centerHillScramble = () => filteredCandidates(e => {
      return (
        e.approachN >= 0.36 &&
        e.approachN <= 0.64 &&
        Math.abs(e.lateralN - 0.5) <= 0.30 &&
        !isDeployment(e)
      );
    });

    const biasMatch = (meta) => {
      if (advantageSide === 'none') return false;
      return sideDepthNorm(meta, advantageSide) <= 0.45;
    };

    // Terrain style:
    // - 75% open-middle battlefields (historical plain preference)
    // - 13% side high-ground starts
    // - 12% central hill scramble maps
    const styleRoll = Math.random();
    const layoutStyle = (styleRoll < 0.75)
      ? 'open_middle'
      : (styleRoll < 0.88 ? 'side_high_ground' : 'center_hill_scramble');

    // Water is intentionally sparse and pushed to flank/edge pockets.
    const waterClusters = (Math.random() < (layoutStyle === 'open_middle' ? 0.25 : 0.38)) ? 1 : 0;
    for (let i = 0; i < waterClusters; i++) {
      const seed = pickSeed(edgeFlank());
      paintCluster('water', seed, randInt(2, 4), (meta) => {
        return isEdge(meta) && isFlank(meta) && !isDeployment(meta) && Math.abs(meta.approachN - 0.5) > 0.18;
      });
    }

    // Woods: mostly flank cover, keeping central clashes readable.
    const woodsClusters = (layoutStyle === 'open_middle')
      ? randInt(1, 2)
      : randInt(1, 3);
    for (let i = 0; i < woodsClusters; i++) {
      let seeds = midFlank();
      if (advantageSide !== 'none' && Math.random() < 0.55) {
        const biased = seeds.filter(h => biasMatch(metaAtHex(h)));
        if (biased.length) seeds = biased;
      }
      const seed = pickSeed(seeds);
      paintCluster('woods', seed, randInt(2, 5), (meta) => isFlank(meta) && !isDeployment(meta));
    }

    // Hills: either flank-held high ground or central scramble objectives.
    if (layoutStyle === 'side_high_ground') {
      const hillsClusters = randInt(3, 4);
      for (let i = 0; i < hillsClusters; i++) {
        let seeds = sideHighGround();
        if (advantageSide !== 'none' && Math.random() < 0.45) {
          const biased = seeds.filter(h => biasMatch(metaAtHex(h)));
          if (biased.length) seeds = biased;
        }
        const seed = pickSeed(seeds);
        paintCluster('hills', seed, randInt(3, 5), (meta) => {
          const onSideBand = (
            (meta.approachN >= 0.12 && meta.approachN <= 0.36) ||
            (meta.approachN >= 0.64 && meta.approachN <= 0.88)
          );
          return onSideBand && Math.abs(meta.lateralN - 0.5) >= 0.16 && !isDeployment(meta);
        });
      }
    } else if (layoutStyle === 'center_hill_scramble') {
      const hillsClusters = randInt(2, 3);
      for (let i = 0; i < hillsClusters; i++) {
        const seed = pickSeed(centerHillScramble());
        paintCluster('hills', seed, randInt(3, 5), (meta) => {
          return (
            meta.approachN >= 0.34 &&
            meta.approachN <= 0.66 &&
            Math.abs(meta.lateralN - 0.5) <= 0.32 &&
            !isDeployment(meta)
          );
        });
      }
    } else {
      const hillsClusters = randInt(1, 2);
      for (let i = 0; i < hillsClusters; i++) {
        const seed = pickSeed(midFlank());
        paintCluster('hills', seed, randInt(2, 4), (meta) => isFlank(meta) && meta.approachN >= 0.14 && meta.approachN <= 0.86);
      }
    }

    // Rough: limited friction lanes, mostly away from the central clash zone.
    const roughClusters = (layoutStyle === 'open_middle')
      ? randInt(1, 2)
      : randInt(1, 3);
    for (let i = 0; i < roughClusters; i++) {
      const seed = pickSeed(roughBand());
      paintCluster('rough', seed, randInt(2, 4), (meta) => !isDeployment(meta) && (!isCenterLane(meta) || !isClashBand(meta)));
    }

    // Final sweep: keep the center clash lane open (except when we explicitly
    // generate a central hill scramble map).
    for (const [hk] of terrainByHex) {
      const meta = geometry.byKey.get(hk);
      if (!meta) continue;
      if (layoutStyle === 'center_hill_scramble') {
        const t = terrainByHex.get(hk);
        if (t !== 'hills' && isCenterLane(meta) && isClashBand(meta)) {
          terrainByHex.delete(hk);
        }
      } else if (isCenterLane(meta) && isClashBand(meta)) {
        terrainByHex.delete(hk);
      }
    }

    if (layoutStyle === 'open_middle') {
      // Keep plains open in most random starts: clear a broad middle box.
      for (const [hk] of terrainByHex) {
        const meta = geometry.byKey.get(hk);
        if (!meta) continue;
        if (Math.abs(meta.approachN - 0.5) <= 0.24 && Math.abs(meta.lateralN - 0.5) <= 0.34) {
          terrainByHex.delete(hk);
        }
      }
    }

    // Cap density so movement stays fluid.
    const maxTerrain = (layoutStyle === 'open_middle')
      ? randInt(18, 26)
      : randInt(22, 32);
    if (terrainByHex.size > maxTerrain) {
      const keys = shuffledCopy([...terrainByHex.keys()]);
      for (const hk of keys) {
        if (terrainByHex.size <= maxTerrain) break;
        const t = terrainByHex.get(hk);
        if (t === 'water' && Math.random() < 0.80) continue;
        terrainByHex.delete(hk);
      }
    }

    const terrain = [];
    for (const [hk, terrainId] of terrainByHex) {
      const h = board.byKey.get(hk);
      if (!h) continue;
      terrain.push({ q: h.q, r: h.r, terrain: terrainId });
    }

    return { terrain, terrainByHex, advantageSide };
  }

  function deploymentPool(side, depthNorm, terrainByHex, occupiedSet, geometry) {
    const out = [];
    for (const e of geometry.entries) {
      if (terrainByHex.get(e.h.k) === 'water') continue;
      if (occupiedSet.has(e.h.k)) continue;
      if (sideDepthNorm(e, side) <= depthNorm) out.push(e.h);
    }
    return out;
  }

  function clamp01(v) {
    if (!Number.isFinite(v)) return 0;
    if (v <= 0) return 0;
    if (v >= 1) return 1;
    return v;
  }

  function terrainAtHex(terrainByHex, hexKey) {
    return terrainByHex.get(hexKey) || 'clear';
  }

  function hexTouchesClear(hex, terrainByHex) {
    for (const nk of hex.neigh) {
      if (!board.activeSet.has(nk)) continue;
      if (terrainAtHex(terrainByHex, nk) === 'clear') return true;
    }
    return false;
  }

  function terrainPlacementPenalty(type, hex, terrainByHex) {
    const terrain = terrainAtHex(terrainByHex, hex.k);
    if (terrain === 'clear') return 0;
    if (terrain === 'water') return 99;

    if (type === 'cav') {
      if (terrain === 'woods') return 2.8;
      if (terrain === 'rough') return 2.5;
      if (terrain === 'hills') return 2.2;
      return 1.8;
    }
    if (type === 'inf') {
      if (terrain === 'woods') return 2.3;
      if (terrain === 'hills') return 1.2;
      if (terrain === 'rough') return 1.0;
      return 1.1;
    }
    if (type === 'arc') {
      if (terrain === 'woods') return hexTouchesClear(hex, terrainByHex) ? 0.6 : 2.2;
      if (terrain === 'hills') return 0.6;
      if (terrain === 'rough') return 1.1;
      return 1.0;
    }
    if (type === 'skr') {
      if (terrain === 'woods') return 0.8;
      if (terrain === 'hills') return 1.1;
      if (terrain === 'rough') return 0.9;
      return 0.9;
    }
    if (type === 'gen' || type === 'run' || type === 'iat') {
      if (terrain === 'woods') return 1.2;
      if (terrain === 'hills') return 1.2;
      if (terrain === 'rough') return 1.1;
      return 1.0;
    }
    return 1.0;
  }

  function orderedLateralSlots(count, center = 0.5, span = 0.42) {
    if (count <= 0) return [];
    const c = clamp01(center);
    if (count === 1) return [c];

    const half = Math.max(0.04, Math.min(0.46, span / 2));
    const start = Math.max(0.03, c - half);
    const end = Math.min(0.97, c + half);
    const linear = [];
    for (let i = 0; i < count; i++) {
      const t = (count === 1) ? 0 : (i / (count - 1));
      linear.push(start + (t * (end - start)));
    }
    linear.sort((a, b) => {
      const da = Math.abs(a - c);
      const db = Math.abs(b - c);
      if (da !== db) return da - db;
      return a - b;
    });
    return linear;
  }

  function pickFormationHex(side, type, geometry, terrainByHex, occupiedSet, depthNorm, opts = {}, clusterKeys = []) {
    const targetDepth = clamp01(opts.targetDepth ?? 0.2);
    const targetLateral = clamp01(opts.targetLateral ?? 0.5);
    const depthWeight = Number.isFinite(opts.depthWeight) ? opts.depthWeight : 6.8;
    const lateralWeight = Number.isFinite(opts.lateralWeight) ? opts.lateralWeight : 8.6;
    const depthWindow = Number.isFinite(opts.depthWindow) ? opts.depthWindow : null;
    const lateralWindow = Number.isFinite(opts.lateralWindow) ? opts.lateralWindow : null;
    const minDepth = Number.isFinite(opts.minDepth) ? opts.minDepth : 0;
    const maxDepth = Number.isFinite(opts.maxDepth) ? opts.maxDepth : (depthNorm + 0.02);
    const preferFlank = !!opts.preferFlank;
    const preferCenter = !!opts.preferCenter;
    const clusterSet = new Set(clusterKeys || []);

    const scored = [];
    for (const e of geometry.entries) {
      const h = e.h;
      if (!h) continue;
      if (occupiedSet.has(h.k)) continue;
      if (terrainAtHex(terrainByHex, h.k) === 'water') continue;

      const depth = sideDepthNorm(e, side);
      if (depth < minDepth || depth > maxDepth) continue;
      const lateral = e.lateralN;

      const dd = Math.abs(depth - targetDepth);
      const ld = Math.abs(lateral - targetLateral);
      let score = (dd * depthWeight) + (ld * lateralWeight);

      if (depthWindow !== null && dd > depthWindow) score += (dd - depthWindow) * 7.2;
      if (lateralWindow !== null && ld > lateralWindow) score += (ld - lateralWindow) * 7.2;

      const flankN = Math.abs(lateral - 0.5) * 2;
      if (preferFlank) score += (1 - flankN) * 2.1;
      if (preferCenter) score += flankN * 2.1;

      score += terrainPlacementPenalty(type, h, terrainByHex) * 2.4;

      if (clusterSet.size > 0) {
        let nearest = Infinity;
        let adjacent = 0;
        for (const hk of clusterSet) {
          const ch = board.byKey.get(hk);
          if (!ch) continue;
          const d = axialDistance(h.q, h.r, ch.q, ch.r);
          if (d < nearest) nearest = d;
          if (d === 1) adjacent += 1;
        }
        if (Number.isFinite(nearest)) score += nearest * 0.42;
        if (adjacent > 0) score -= Math.min(1.0, adjacent * 0.34);
      }

      score += Math.random() * 0.02;
      scored.push({ h, score });
    }

    if (scored.length === 0) return null;
    scored.sort((a, b) => a.score - b.score);
    return scored[0].h;
  }

  function placeFormationUnits(force, side, type, count, geometry, terrainByHex, occupiedSet, depthNorm, opts = {}) {
    if (count <= 0) return 0;
    const slots = orderedLateralSlots(count, opts.center ?? 0.5, opts.span ?? 0.4);
    const clusterKeys = [];
    let placed = 0;

    for (let i = 0; i < slots.length; i++) {
      const targetDepth = clamp01((opts.depth ?? 0.2) + ((Math.random() - 0.5) * (opts.depthJitter ?? 0)));
      const targetLateral = slots[i];
      let h = pickFormationHex(
        side, type, geometry, terrainByHex, occupiedSet, depthNorm,
        {
          targetDepth,
          targetLateral,
          depthWindow: opts.depthWindow,
          lateralWindow: opts.lateralWindow,
          minDepth: opts.minDepth,
          maxDepth: opts.maxDepth,
          preferFlank: opts.preferFlank,
          preferCenter: opts.preferCenter,
          depthWeight: opts.depthWeight,
          lateralWeight: opts.lateralWeight,
        },
        clusterKeys
      );
      if (!h) {
        h = pickFormationHex(
          side, type, geometry, terrainByHex, occupiedSet, depthNorm,
          {
            targetDepth,
            targetLateral,
            minDepth: opts.minDepth,
            maxDepth: opts.maxDepth,
            preferFlank: opts.preferFlank,
            preferCenter: opts.preferCenter,
            depthWeight: opts.depthWeight,
            lateralWeight: opts.lateralWeight,
          },
          clusterKeys
        );
      }
      if (!h) continue;

      occupiedSet.add(h.k);
      clusterKeys.push(h.k);
      force.push({
        q: h.q,
        r: h.r,
        side,
        type,
        quality: 'green',
      });
      placed += 1;
    }

    return placed;
  }

  function splitByRatios(total, ratios) {
    const out = ratios.map((r) => Math.max(0, Math.round(total * r)));
    let sum = out.reduce((a, b) => a + b, 0);
    while (sum > total) {
      let bestIdx = 0;
      for (let i = 1; i < out.length; i++) {
        if (out[i] > out[bestIdx]) bestIdx = i;
      }
      if (out[bestIdx] <= 0) break;
      out[bestIdx] -= 1;
      sum -= 1;
    }
    while (sum < total) {
      let bestIdx = 0;
      for (let i = 1; i < out.length; i++) {
        if (ratios[i] > ratios[bestIdx]) bestIdx = i;
      }
      out[bestIdx] += 1;
      sum += 1;
    }
    return out;
  }

  const REQUESTED_CLASSICAL_FORMATIONS = [
    { id: 'phalanx', label: 'Phalanx' },
    { id: 'triplex_acies', label: 'Roman Triple Acies' },
    { id: 'wedge', label: 'Wedge' },
    { id: 'hollow_square', label: 'Hollow Square' },
    { id: 'crescent', label: 'Crescent' },
    { id: 'convex_refused', label: 'Convex Line (Refused Center)' },
    { id: 'oblique_order', label: 'Oblique Order' },
    { id: 'checkerboard', label: 'Checkerboard' },
    { id: 'testudo', label: 'Testudo' },
    { id: 'encirclement_ring', label: 'Encirclement Ring' },
    // Requested "11th formation":
    { id: 'classical_arms', label: 'Classical Arms Line' },
  ];
  const NON_CLASSICAL_FORMATIONS = [
    { id: 'open_plain_line', label: 'Open Plain Line' },
    { id: 'staggered_wings', label: 'Staggered Wings' },
    { id: 'deep_center', label: 'Deep Center' },
    { id: 'forward_screen', label: 'Forward Screen' },
  ];

  function formationArchetypeForSide(side, totalNeeded, advantageSide) {
    void side;
    void totalNeeded;
    void advantageSide;
    const push = Math.random() < 0.5 ? 'left' : 'right';
    // 90% of random starts use the 11 requested classical formations,
    // split evenly by selecting uniformly from the list.
    const classicalShare = 0.90;
    const pool = (Math.random() < classicalShare)
      ? REQUESTED_CLASSICAL_FORMATIONS
      : NON_CLASSICAL_FORMATIONS;
    const pick = pool[randInt(0, pool.length - 1)] || REQUESTED_CLASSICAL_FORMATIONS[REQUESTED_CLASSICAL_FORMATIONS.length - 1];
    return { id: pick.id, label: pick.label, push };
  }

  function forceTypeMix(totalNeeded, archetype) {
    const mix = {
      gen: totalNeeded >= 28 ? 3 : 2,
      run: 1,
      iat: 1,
      cav: totalNeeded >= 29 ? 6 : (totalNeeded >= 25 ? 5 : 4),
      arc: totalNeeded >= 28 ? 4 : 3,
      skr: totalNeeded >= 27 ? 4 : 3,
    };

    if ((archetype.id === 'encirclement_ring' || archetype.id === 'wedge') && totalNeeded >= 27) mix.cav += 1;
    if ((archetype.id === 'hollow_square' || archetype.id === 'checkerboard') && totalNeeded >= 26) mix.skr += 1;
    if (archetype.id === 'testudo' && totalNeeded >= 24) {
      mix.cav = Math.max(4, mix.cav - 1);
      mix.inf += 1;
    }

    let support = mix.gen + mix.run + mix.iat + mix.cav + mix.arc + mix.skr;
    mix.inf = totalNeeded - support;

    while (mix.inf < 9 && mix.skr > 2) {
      mix.skr -= 1;
      mix.inf += 1;
    }
    while (mix.inf < 9 && mix.arc > 2) {
      mix.arc -= 1;
      mix.inf += 1;
    }
    while (mix.inf < 9 && mix.cav > 4) {
      mix.cav -= 1;
      mix.inf += 1;
    }
    while (mix.inf < 8 && mix.gen > 2) {
      mix.gen -= 1;
      mix.inf += 1;
    }

    return mix;
  }

  function fallbackProfileForType(type, depthNorm, dFront, dSecond, dReserve, dRear, archetype) {
    if (type === 'inf') return { depth: dSecond, center: 0.5, span: 0.56, preferCenter: true };
    if (type === 'cav') {
      const cavCenter = (archetype.push === 'left') ? 0.28 : 0.72;
      return { depth: dFront, center: cavCenter, span: 0.44, preferFlank: true };
    }
    if (type === 'skr') return { depth: Math.min(depthNorm - 0.004, dFront + 0.03), center: 0.5, span: 0.72 };
    if (type === 'arc') return { depth: Math.max(0.03, dReserve - 0.08), center: 0.5, span: 0.48, preferCenter: true };
    if (type === 'gen') return { depth: dRear, center: 0.5, span: 0.24, preferCenter: true };
    if (type === 'run') return { depth: Math.max(dRear, dReserve - 0.03), center: 0.5, span: 0.20, preferCenter: true };
    if (type === 'iat') return { depth: Math.max(dRear, dReserve - 0.02), center: 0.5, span: 0.20, preferCenter: true };
    return { depth: dSecond, center: 0.5, span: 0.52 };
  }

  function buildRandomForce(side, terrainByHex, occupiedSet, geometry, totalNeeded, options = {}) {
    const archetype = formationArchetypeForSide(side, totalNeeded, options.advantageSide || 'none');
    const mix = forceTypeMix(totalNeeded, archetype);
    const force = [];
    const placedByType = new Map();

    let depthNorm = 0.24;
    let pool = [];
    while (depthNorm <= 0.82) {
      pool = deploymentPool(side, depthNorm, terrainByHex, occupiedSet, geometry);
      if (pool.length >= Math.ceil(totalNeeded * 1.35)) break;
      depthNorm += 0.03;
    }
    if (pool.length < totalNeeded) {
      depthNorm = 1.0;
    }

    const dRear = clamp01(depthNorm * 0.20);
    const dReserve = clamp01(depthNorm * 0.44);
    const dSecond = clamp01(depthNorm * 0.66);
    const dFront = clamp01(Math.min(depthNorm - 0.01, depthNorm * 0.86));
    const dScreen = clamp01(Math.min(depthNorm - 0.004, dFront + 0.03));

    function placeType(type, count, cfg) {
      const placed = placeFormationUnits(
        force, side, type, count, geometry, terrainByHex, occupiedSet, depthNorm, cfg
      );
      if (placed > 0) {
        placedByType.set(type, (placedByType.get(type) || 0) + placed);
      }
      return placed;
    }

    if (archetype.id === 'phalanx') {
      const [frontRank, secondRank, reserve] = splitByRatios(mix.inf, [0.62, 0.26, 0.12]);
      placeType('inf', frontRank, { depth: dFront + 0.008, center: 0.5, span: 0.58, depthWindow: 0.07, lateralWindow: 0.34, preferCenter: true });
      placeType('inf', secondRank, { depth: dSecond + 0.004, center: 0.5, span: 0.50, depthWindow: 0.08, lateralWindow: 0.30, preferCenter: true });
      placeType('inf', reserve, { depth: dReserve, center: 0.5, span: 0.34, depthWindow: 0.08, lateralWindow: 0.22, preferCenter: true });
    } else if (archetype.id === 'triplex_acies') {
      const [frontRank, secondRank, reserve] = splitByRatios(mix.inf, [0.49, 0.33, 0.18]);
      placeType('inf', frontRank, { depth: dFront, center: 0.5, span: 0.60, depthWindow: 0.08, lateralWindow: 0.34, preferCenter: true });
      placeType('inf', secondRank, { depth: dSecond, center: 0.5, span: 0.52, depthWindow: 0.08, lateralWindow: 0.30, preferCenter: true });
      placeType('inf', reserve, { depth: dReserve, center: 0.5, span: 0.38, depthWindow: 0.08, lateralWindow: 0.24, preferCenter: true });
    } else if (archetype.id === 'wedge') {
      const wedgeCenter = (archetype.push === 'left') ? 0.44 : 0.56;
      const [tip, leftBody, rightBody, secondRank, reserve] = splitByRatios(mix.inf, [0.10, 0.24, 0.24, 0.24, 0.18]);
      placeType('inf', tip, { depth: dFront + 0.018, center: wedgeCenter, span: 0.08, depthWindow: 0.06, lateralWindow: 0.08, preferCenter: true });
      placeType('inf', leftBody, { depth: dFront + 0.008, center: wedgeCenter - 0.14, span: 0.22, depthWindow: 0.08, lateralWindow: 0.22 });
      placeType('inf', rightBody, { depth: dFront + 0.008, center: wedgeCenter + 0.14, span: 0.22, depthWindow: 0.08, lateralWindow: 0.22 });
      placeType('inf', secondRank, { depth: dSecond, center: wedgeCenter, span: 0.40, depthWindow: 0.08, lateralWindow: 0.26, preferCenter: true });
      placeType('inf', reserve, { depth: dReserve, center: 0.5, span: 0.32, depthWindow: 0.08, lateralWindow: 0.22, preferCenter: true });
    } else if (archetype.id === 'hollow_square') {
      const [leftWall, rightWall, rearWall, frontThin, reserve] = splitByRatios(mix.inf, [0.22, 0.22, 0.22, 0.12, 0.22]);
      placeType('inf', leftWall, { depth: dSecond, center: 0.35, span: 0.14, depthWindow: 0.10, lateralWindow: 0.14 });
      placeType('inf', rightWall, { depth: dSecond, center: 0.65, span: 0.14, depthWindow: 0.10, lateralWindow: 0.14 });
      placeType('inf', rearWall, { depth: dReserve, center: 0.5, span: 0.48, depthWindow: 0.08, lateralWindow: 0.28, preferCenter: true });
      placeType('inf', frontThin, { depth: dFront - 0.01, center: 0.5, span: 0.18, depthWindow: 0.06, lateralWindow: 0.12, preferCenter: true });
      placeType('inf', reserve, { depth: dSecond - 0.01, center: 0.5, span: 0.22, depthWindow: 0.08, lateralWindow: 0.14, preferCenter: true });
    } else if (archetype.id === 'crescent') {
      const [wingLeft, wingRight, centerHold, reserve] = splitByRatios(mix.inf, [0.30, 0.30, 0.22, 0.18]);
      placeType('inf', wingLeft, { depth: dFront + 0.014, center: 0.30, span: 0.24, depthWindow: 0.08, lateralWindow: 0.22 });
      placeType('inf', wingRight, { depth: dFront + 0.014, center: 0.70, span: 0.24, depthWindow: 0.08, lateralWindow: 0.22 });
      placeType('inf', centerHold, { depth: dSecond + 0.01, center: 0.5, span: 0.22, depthWindow: 0.08, lateralWindow: 0.18, preferCenter: true });
      placeType('inf', reserve, { depth: dReserve, center: 0.5, span: 0.34, depthWindow: 0.08, lateralWindow: 0.24, preferCenter: true });
    } else if (archetype.id === 'convex_refused') {
      const [centerSpear, leftSupport, rightSupport, reserve] = splitByRatios(mix.inf, [0.40, 0.20, 0.20, 0.20]);
      placeType('inf', centerSpear, { depth: dFront + 0.014, center: 0.5, span: 0.32, depthWindow: 0.08, lateralWindow: 0.24, preferCenter: true });
      placeType('inf', leftSupport, { depth: dSecond + 0.006, center: 0.34, span: 0.20, depthWindow: 0.08, lateralWindow: 0.18 });
      placeType('inf', rightSupport, { depth: dSecond + 0.006, center: 0.66, span: 0.20, depthWindow: 0.08, lateralWindow: 0.18 });
      placeType('inf', reserve, { depth: dReserve, center: 0.5, span: 0.30, depthWindow: 0.08, lateralWindow: 0.22, preferCenter: true });
    } else if (archetype.id === 'oblique_order') {
      const pushCenter = (archetype.push === 'left') ? 0.40 : 0.60;
      const refusedCenter = (archetype.push === 'left') ? 0.68 : 0.32;
      const [frontRank, secondRank, reserve] = splitByRatios(mix.inf, [0.54, 0.30, 0.16]);
      placeType('inf', frontRank, { depth: dFront + 0.014, center: pushCenter, span: 0.56, depthWindow: 0.08, lateralWindow: 0.32, preferCenter: true });
      placeType('inf', secondRank, { depth: dSecond, center: 0.5, span: 0.46, depthWindow: 0.08, lateralWindow: 0.30, preferCenter: true });
      placeType('inf', reserve, { depth: dReserve, center: refusedCenter, span: 0.28, depthWindow: 0.08, lateralWindow: 0.22 });
    } else if (archetype.id === 'checkerboard') {
      const frontCenter = (archetype.push === 'left') ? 0.46 : 0.54;
      const secondCenter = (archetype.push === 'left') ? 0.54 : 0.46;
      const [frontBlocks, secondBlocks, reserve] = splitByRatios(mix.inf, [0.42, 0.38, 0.20]);
      placeType('inf', frontBlocks, { depth: dFront, center: frontCenter, span: 0.48, depthWindow: 0.10, lateralWindow: 0.30, preferCenter: true });
      placeType('inf', secondBlocks, { depth: dSecond + 0.004, center: secondCenter, span: 0.54, depthWindow: 0.10, lateralWindow: 0.32, preferCenter: true });
      placeType('inf', reserve, { depth: dReserve, center: 0.5, span: 0.34, depthWindow: 0.08, lateralWindow: 0.22, preferCenter: true });
    } else if (archetype.id === 'testudo') {
      const [frontCore, midCore, rearCore] = splitByRatios(mix.inf, [0.46, 0.34, 0.20]);
      placeType('inf', frontCore, { depth: dFront - 0.006, center: 0.5, span: 0.34, depthWindow: 0.06, lateralWindow: 0.22, preferCenter: true });
      placeType('inf', midCore, { depth: dSecond, center: 0.5, span: 0.28, depthWindow: 0.06, lateralWindow: 0.18, preferCenter: true });
      placeType('inf', rearCore, { depth: dReserve, center: 0.5, span: 0.24, depthWindow: 0.06, lateralWindow: 0.16, preferCenter: true });
    } else if (archetype.id === 'encirclement_ring') {
      const [wingLeft, wingRight, centerFix, reserve] = splitByRatios(mix.inf, [0.30, 0.30, 0.16, 0.24]);
      placeType('inf', wingLeft, { depth: dFront + 0.016, center: 0.30, span: 0.26, depthWindow: 0.08, lateralWindow: 0.24 });
      placeType('inf', wingRight, { depth: dFront + 0.016, center: 0.70, span: 0.26, depthWindow: 0.08, lateralWindow: 0.24 });
      placeType('inf', centerFix, { depth: dSecond + 0.014, center: 0.5, span: 0.20, depthWindow: 0.08, lateralWindow: 0.16, preferCenter: true });
      placeType('inf', reserve, { depth: dReserve, center: 0.5, span: 0.34, depthWindow: 0.08, lateralWindow: 0.24, preferCenter: true });
    } else {
      // 11th requested formation: classical arms line.
      const [frontRank, secondRank, reserve] = splitByRatios(mix.inf, [0.52, 0.32, 0.16]);
      placeType('inf', frontRank, { depth: dFront, center: 0.5, span: 0.60, depthWindow: 0.08, lateralWindow: 0.34, preferCenter: true });
      placeType('inf', secondRank, { depth: dSecond, center: 0.5, span: 0.50, depthWindow: 0.08, lateralWindow: 0.30, preferCenter: true });
      placeType('inf', reserve, { depth: dReserve, center: 0.5, span: 0.36, depthWindow: 0.08, lateralWindow: 0.24, preferCenter: true });
    }

    let cavLeft = Math.floor(mix.cav / 2);
    let cavRight = mix.cav - cavLeft;
    if ((archetype.id === 'oblique_order' || archetype.id === 'encirclement_ring' || archetype.id === 'wedge') && mix.cav >= 5) {
      if (archetype.push === 'left') {
        cavLeft += 1;
        cavRight = Math.max(0, cavRight - 1);
      } else {
        cavRight += 1;
        cavLeft = Math.max(0, cavLeft - 1);
      }
    }
    placeType('cav', cavLeft, { depth: dFront + 0.01, center: 0.17, span: 0.16, depthWindow: 0.09, lateralWindow: 0.16, preferFlank: true });
    placeType('cav', cavRight, { depth: dFront + 0.01, center: 0.83, span: 0.16, depthWindow: 0.09, lateralWindow: 0.16, preferFlank: true });

    const skirmDepth = (archetype.id === 'testudo') ? dFront : dScreen;
    let archerDepth = Math.max(dRear + 0.01, dReserve - 0.01);
    if (archetype.id === 'crescent' || archetype.id === 'encirclement_ring') {
      archerDepth = Math.max(dRear + 0.01, dReserve - 0.02);
    }
    placeType('skr', mix.skr, { depth: skirmDepth, center: 0.5, span: 0.72, depthWindow: 0.08, lateralWindow: 0.42 });
    placeType('arc', mix.arc, { depth: archerDepth, center: 0.5, span: 0.46, depthWindow: 0.08, lateralWindow: 0.28, preferCenter: true });

    const generalCenters = (mix.gen >= 3) ? [0.32, 0.50, 0.68] : [0.44, 0.56];
    for (let i = 0; i < mix.gen; i++) {
      const gc = generalCenters[Math.min(i, generalCenters.length - 1)];
      placeType('gen', 1, { depth: dRear, center: gc, span: 0.04, depthWindow: 0.06, lateralWindow: 0.10, preferCenter: true });
    }
    const supportCenter = (archetype.push === 'left') ? 0.46 : 0.54;
    placeType('run', mix.run, { depth: Math.max(dRear, dReserve - 0.03), center: supportCenter, span: 0.08, depthWindow: 0.06, lateralWindow: 0.12, preferCenter: true });
    placeType('iat', mix.iat, { depth: Math.max(dRear, dReserve - 0.02), center: 0.5, span: 0.08, depthWindow: 0.06, lateralWindow: 0.12, preferCenter: true });

    const fillOrder = ['inf', 'cav', 'skr', 'arc', 'gen', 'run', 'iat'];
    for (const type of fillOrder) {
      const placed = placedByType.get(type) || 0;
      const missing = Math.max(0, (mix[type] || 0) - placed);
      if (missing <= 0) continue;

      const profile = fallbackProfileForType(type, depthNorm, dFront, dSecond, dReserve, dRear, archetype);
      const added = placeType(type, missing, {
        depth: profile.depth,
        center: profile.center,
        span: profile.span,
        depthWindow: 0.18,
        lateralWindow: 0.48,
        preferFlank: profile.preferFlank,
        preferCenter: profile.preferCenter,
      });
      if (added < missing) {
        placeType(type, missing - added, {
          depth: profile.depth,
          center: profile.center,
          span: 0.94,
          depthWindow: null,
          lateralWindow: null,
          preferFlank: profile.preferFlank,
          preferCenter: profile.preferCenter,
        });
      }
    }

    const refillTypes = ['inf', 'inf', 'inf', 'skr', 'arc', 'cav', 'inf', 'skr'];
    while (force.length < totalNeeded) {
      const type = refillTypes[randInt(0, refillTypes.length - 1)];
      const profile = fallbackProfileForType(type, depthNorm, dFront, dSecond, dReserve, dRear, archetype);
      const added = placeType(type, 1, {
        depth: profile.depth,
        center: profile.center,
        span: profile.span,
        depthWindow: 0.24,
        lateralWindow: 0.60,
        preferFlank: profile.preferFlank,
        preferCenter: profile.preferCenter,
      });
      if (added <= 0) break;
    }

    assignGroupedForceQualities(force, side, geometry);
    return { units: force, archetype: archetype.label };
  }

  function buildRandomStartupScenario(axis) {
    const geometry = buildAxisGeometry(axis);
    const terrainData = createRandomTerrainLayout(axis, geometry);
    const occupiedSet = new Set();
    const unitsPerSide = chooseRandomUnitsPerSide();
    const blueForce = buildRandomForce(
      'blue',
      terrainData.terrainByHex,
      occupiedSet,
      geometry,
      unitsPerSide,
      { advantageSide: terrainData.advantageSide }
    );
    const redForce = buildRandomForce(
      'red',
      terrainData.terrainByHex,
      occupiedSet,
      geometry,
      unitsPerSide,
      { advantageSide: terrainData.advantageSide }
    );

    return {
      axis: normalizeForwardAxis(axis),
      terrain: terrainData.terrain,
      units: [...blueForce.units, ...redForce.units],
      unitsPerSide,
      advantageSide: terrainData.advantageSide,
      blueArchetype: blueForce.archetype,
      redArchetype: redForce.archetype,
    };
  }

  function installRandomStartupScenario() {
    const axis = chooseRandomForwardAxis();
    state.forwardAxis = normalizeForwardAxis(axis);
    const generated = buildRandomStartupScenario(state.forwardAxis);
    const centerObj = [
      { q: 7, r: 5 },
      { q: 8, r: 5 },
      { q: 7, r: 6 },
      { q: 8, r: 6 },
    ];
    SCENARIOS[RANDOM_START_SCENARIO_NAME] = {
      terrain: generated.terrain,
      units: generated.units,
      meta: {
        group: 'terrain',
        description: 'Procedural deployment based on classical formation archetypes.',
        historical: '',
        checkpointTurn: 8,
        objectives: [
          { id: 'center-field', name: 'Center Field', value: 2, contestAdjacent: true, hexes: centerObj },
        ],
      },
    };
    return generated;
  }

  function scenarioUnitPassableAt(type, hexKey) {
    const h = board.byKey.get(hexKey);
    if (!h) return false;
    return Number.isFinite(terrainMoveCost(type, h.terrain));
  }

  function findScenarioRelocationKey(fromKey, type, occupiedHexes) {
    const from = board.byKey.get(fromKey);
    if (!from) return null;
    let best = null;
    let bestScore = Infinity;
    for (const h of board.active) {
      if (occupiedHexes.has(h.k)) continue;
      if (!scenarioUnitPassableAt(type, h.k)) continue;
      const d = axialDistance(from.q, from.r, h.q, h.r);
      // Slight center bias keeps relocated units from being pushed to map corners.
      const centerBias = Math.abs(h.q - 7) + Math.abs(h.r - 5);
      const score = (d * 100) + centerBias;
      if (score < bestScore) {
        best = h.k;
        bestScore = score;
      }
    }
    return best;
  }

  function loadScenario(name) {
    const sc = SCENARIOS[name];
    if (!sc) return;

    const stats = {
      terrainPlaced: 0,
      terrainSkippedOffBoard: 0,
      terrainSkippedInvalidType: 0,
      terrainDuplicates: 0,
      unitsPlaced: 0,
      unitsSkippedOffBoard: 0,
      unitsSkippedBadType: 0,
      unitsSkippedBadSide: 0,
      unitsSkippedCap: 0,
      unitsSkippedImpassable: 0,
      unitsDuplicates: 0,
      unitsRelocatedFromImpassable: 0,
    };

    resetDraftState({ keepBudget: true });
    enterEdit();
    clearUnits();
    resetTerrain();
    clearDiceDisplay();
    state.eventTrace = [];
    state.events = [];

    // Terrain paint
    const seenTerrainHexes = new Set();
    for (const t of (sc.terrain || [])) {
      const k = key(t.q, t.r);
      if (!board.activeSet.has(k)) {
        stats.terrainSkippedOffBoard += 1;
        continue;
      }
      if (!TERRAIN_IDS.has(t.terrain)) {
        stats.terrainSkippedInvalidType += 1;
        continue;
      }
      if (seenTerrainHexes.has(k)) stats.terrainDuplicates += 1;
      seenTerrainHexes.add(k);

      const h = board.byKey.get(k);
      if (!h) {
        stats.terrainSkippedOffBoard += 1;
        continue;
      }
      h.terrain = t.terrain;
      stats.terrainPlaced += 1;
    }

    // Units
    const seenUnitHexes = new Set();
    const sideCounts = { blue: 0, red: 0 };
    for (const u of (sc.units || [])) {
      const srcKey = key(u.q, u.r);
      if (!board.activeSet.has(srcKey)) {
        stats.unitsSkippedOffBoard += 1;
        continue;
      }

      const def = UNIT_BY_ID.get(u.type);
      if (!def) {
        stats.unitsSkippedBadType += 1;
        continue;
      }
      if (u.side !== 'blue' && u.side !== 'red') {
        stats.unitsSkippedBadSide += 1;
        continue;
      }
      if (sideCounts[u.side] >= SCENARIO_UNIT_CAP_PER_SIDE) {
        stats.unitsSkippedCap += 1;
        continue;
      }

      let k = srcKey;
      if (!scenarioUnitPassableAt(u.type, k) || seenUnitHexes.has(k)) {
        if (!scenarioUnitPassableAt(u.type, k)) {
          const relocated = findScenarioRelocationKey(srcKey, u.type, seenUnitHexes);
          if (relocated) {
            k = relocated;
            stats.unitsRelocatedFromImpassable += 1;
          } else {
            stats.unitsSkippedImpassable += 1;
            continue;
          }
        } else if (seenUnitHexes.has(k)) {
          const relocated = findScenarioRelocationKey(srcKey, u.type, seenUnitHexes);
          if (relocated) {
            k = relocated;
            stats.unitsDuplicates += 1;
          } else {
            stats.unitsDuplicates += 1;
            stats.unitsSkippedOffBoard += 1;
            continue;
          }
        }
      }

      if (seenUnitHexes.has(k)) {
        stats.unitsDuplicates += 1;
        continue;
      }
      seenUnitHexes.add(k);

      const quality = normalizeQuality(u.type, u.quality || 'green');
      unitsByHex.set(k, {
        id: nextUnitId++,
        side: u.side,
        type: u.type,
        quality,
        hp: unitMaxHp(u.type, quality),
        disarray: false,
      });
      sideCounts[u.side] += 1;
      stats.unitsPlaced += 1;
    }

    const capNote = stats.unitsSkippedCap > 0
      ? `, capped at ${SCENARIO_UNIT_CAP_PER_SIDE}/side`
      : '';
    log(`Loaded scenario: ${name} (units=${stats.unitsPlaced}, terrain=${stats.terrainPlaced}${capNote}).`);
    pushEventTrace('scenario.load', {
      name,
      unitsPlaced: stats.unitsPlaced,
      terrainPlaced: stats.terrainPlaced,
      warnings: {
        terrainSkippedOffBoard: stats.terrainSkippedOffBoard,
        terrainSkippedInvalidType: stats.terrainSkippedInvalidType,
        unitsSkippedOffBoard: stats.unitsSkippedOffBoard,
        unitsSkippedBadType: stats.unitsSkippedBadType,
        unitsSkippedBadSide: stats.unitsSkippedBadSide,
        unitsSkippedCap: stats.unitsSkippedCap,
        unitsSkippedImpassable: stats.unitsSkippedImpassable,
        unitsRelocatedFromImpassable: stats.unitsRelocatedFromImpassable,
      },
    });
    state.loadedScenarioName = name;
    state.loadedScenarioSides = scenarioSideLabels(name);
    loadScenarioObjectives(name);
    updateScenarioSidesLegend(name);

    if (state.loadedScenarioMeta?.description) {
      const era = state.loadedScenarioMeta.historical ? ` (${state.loadedScenarioMeta.historical})` : '';
      log(`Scenario brief${era}: ${state.loadedScenarioMeta.description}`);
    }
    if ((state.scenarioObjectives || []).length > 0) {
      log(`Objective checkpoint: turn ${state.objectiveCheckpointTurn}.`);
      logObjectiveStateIfChanged(true);
    }

    const skippedTotal =
      stats.terrainSkippedOffBoard +
      stats.terrainSkippedInvalidType +
      stats.unitsSkippedOffBoard +
      stats.unitsSkippedBadType +
      stats.unitsSkippedBadSide +
      stats.unitsSkippedCap +
      stats.unitsSkippedImpassable;
    const duplicateTotal = stats.terrainDuplicates + stats.unitsDuplicates;

    if (skippedTotal > 0 || duplicateTotal > 0) {
      log(
        `Scenario warnings: skipped=${skippedTotal} ` +
        `(terrain offboard ${stats.terrainSkippedOffBoard}, terrain invalid ${stats.terrainSkippedInvalidType}, ` +
        `units offboard ${stats.unitsSkippedOffBoard}, units bad type ${stats.unitsSkippedBadType}, ` +
        `units bad side ${stats.unitsSkippedBadSide}, units capped ${stats.unitsSkippedCap}, units impassable ${stats.unitsSkippedImpassable}) · duplicates=${duplicateTotal} ` +
        `(terrain ${stats.terrainDuplicates}, units ${stats.unitsDuplicates}).`
      );
    }
    if (stats.unitsRelocatedFromImpassable > 0) {
      log(`Scenario cleanup: relocated ${stats.unitsRelocatedFromImpassable} unit(s) off impassable hexes.`);
    }

    updateHud();
  }

  function clampInt(v, min, max, fallback) {
    const n = Number(v);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, Math.trunc(n)));
  }

  function nonNegNumber(v, fallback = 0) {
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0) return fallback;
    return n;
  }

  function buildStateSnapshot() {
    const terrain = [];
    for (const h of board.active) {
      if (h.terrain && h.terrain !== 'clear') {
        terrain.push({ q: h.q, r: h.r, terrain: h.terrain });
      }
    }

    const units = [];
    for (const [hk, u] of unitsByHex) {
      const h = board.byKey.get(hk);
      if (!h) continue;
      units.push({
        id: u.id,
        q: h.q,
        r: h.r,
        side: u.side,
        type: u.type,
        quality: u.quality,
        hp: u.hp,
        disarray: !!u.disarray,
        disarrayAppliedSerial: Number.isFinite(u.disarrayAppliedSerial) ? Number(u.disarrayAppliedSerial) : null,
      });
    }
    units.sort((a, b) => (a.r - b.r) || (a.q - b.q) || (a.id - b.id));

    return {
      format: 'bannerfall-state-v1',
      game: GAME_NAME,
      build: BUILD_ID,
      exportedAt: new Date().toISOString(),
      state: {
        mode: state.mode,
        gameMode: state.gameMode,
        online: {
          seats: {
            host: normalizeBattleSide(state.online?.seats?.host, 'blue'),
            guest: normalizeBattleSide(state.online?.seats?.guest, 'red'),
          },
          guestPreferredSide: normalizeBattleSide(state.online?.guestPreferredSide, 'red'),
          guestParityPick: normalizeParityPick(state.online?.guestParityPick),
          lastInitiativeRoll: Number.isFinite(Number(state.online?.lastInitiativeRoll))
            ? Math.max(1, Math.min(6, Math.trunc(Number(state.online.lastInitiativeRoll))))
            : null,
          lastInitiativeFirstSide: state.online?.lastInitiativeFirstSide
            ? normalizeBattleSide(state.online.lastInitiativeFirstSide, 'blue')
            : null,
          lastInitiativeGuestWon: (typeof state.online?.lastInitiativeGuestWon === 'boolean')
            ? state.online.lastInitiativeGuestWon
            : null,
        },
        aiDifficulty: state.aiDifficulty,
        humanSide: state.humanSide,
        turnSerial: state.turnSerial,
        forwardAxis: state.forwardAxis,
        lineAdvanceDirection: normalizeLineAdvanceDirection(state.lineAdvanceDirection),
        tool: state.tool,
        turn: state.turn,
        side: state.side,
        actsUsed: state.actsUsed,
        actedUnitIds: [...state.actedUnitIds],
        victoryMode: state.victoryMode,
        initialUP: { ...state.initialUP },
        capturedUP: { ...state.capturedUP },
        gameOver: state.gameOver,
        winner: state.winner,
        showCommand: state.showCommand,
        terrainTheme: state.terrainTheme,
        events: cloneJson(state.events, []),
        eventTrace: cloneJson(state.eventTrace, []),
        loadedScenarioName: state.loadedScenarioName,
        loadedScenarioSides: cloneJson(state.loadedScenarioSides, { blue: 'Blue Army', red: 'Red Army', named: false }),
        loadedScenarioMeta: cloneJson(state.loadedScenarioMeta, { description: '', historical: '', notes: '', pointTarget: null }),
        scenarioObjectives: cloneJson(state.scenarioObjectives, []),
        objectiveCheckpointTurn: state.objectiveCheckpointTurn,
        objectiveLastSummary: state.objectiveLastSummary,
        doctrine: {
          commandPhaseOpen: !!state.doctrine.commandPhaseOpen,
          commandIssuedThisTurn: !!state.doctrine.commandIssuedThisTurn,
          selectedCommandId: state.doctrine.selectedCommandId || '',
          activeCommandThisTurn: state.doctrine.activeCommandThisTurn || null,
          bySide: cloneJson(state.doctrine.bySide, { blue: null, red: null }),
          history: cloneJson(state.doctrine.history, []),
          longEffects: cloneJson(state.doctrine.longEffects, []),
          effects: cloneJson(state.doctrine.effects, {}),
        },
        terrain,
        units,
      },
    };
  }

  function exportStateToFile() {
    try {
      const snap = buildStateSnapshot();
      const text = JSON.stringify(snap, null, 2);
      const stamp = new Date().toISOString().replace(/[:]/g, '-').replace(/\..+$/, '');
      const fileName = `bannerfall-state-${stamp}.json`;

      const blob = new Blob([text], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      log(`Exported state: ${fileName} (units=${snap.state.units.length}, terrain=${snap.state.terrain.length}).`);
      updateHud();
    } catch (err) {
      log(`Export failed: ${err && err.message ? err.message : String(err)}`);
      updateHud();
    }
  }

  function resolveImportPayload(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return { ok: false, error: 'Import failed: expected a JSON object.' };
    }

    if (Object.prototype.hasOwnProperty.call(raw, 'format')) {
      if (raw.format !== 'bannerfall-state-v1') {
        return { ok: false, error: `Import failed: unsupported format "${String(raw.format)}".` };
      }
      if (!raw.state || typeof raw.state !== 'object' || Array.isArray(raw.state)) {
        return { ok: false, error: 'Import failed: bannerfall-state-v1 requires a "state" object.' };
      }
      return { ok: true, payload: raw.state };
    }

    if (Object.prototype.hasOwnProperty.call(raw, 'state')) {
      if (!raw.state || typeof raw.state !== 'object' || Array.isArray(raw.state)) {
        return { ok: false, error: 'Import failed: "state" must be a JSON object.' };
      }
      return { ok: true, payload: raw.state };
    }

    const looksLikeState =
      Array.isArray(raw.units) ||
      Array.isArray(raw.terrain) ||
      Object.prototype.hasOwnProperty.call(raw, 'turn') ||
      Object.prototype.hasOwnProperty.call(raw, 'side') ||
      Object.prototype.hasOwnProperty.call(raw, 'mode') ||
      Object.prototype.hasOwnProperty.call(raw, 'victoryMode');

    if (!looksLikeState) {
      return { ok: false, error: 'Import failed: this JSON does not look like a Bannerfall state file.' };
    }

    return { ok: true, payload: raw };
  }

  function applyImportedState(raw, sourceLabel = 'import', options = {}) {
    const silent = !!options.silent;
    const skipAiKick = !!options.skipAiKick;
    stopAiLoop();
    resetDraftState({ keepBudget: true });

    const resolved = resolveImportPayload(raw);
    if (!resolved.ok) {
      log(resolved.error);
      updateHud();
      return;
    }
    const payload = resolved.payload;

    const report = {
      terrainApplied: 0,
      terrainSkippedOffBoard: 0,
      terrainSkippedInvalidType: 0,
      terrainDuplicates: 0,
      unitsPlaced: 0,
      unitsSkippedOffBoard: 0,
      unitsSkippedBadType: 0,
      unitsSkippedBadSide: 0,
      unitsDuplicates: 0,
      unitsHpAdjusted: 0,
      unitsIdRemapped: 0,
    };

    // Reset board without "load scenario" side effects.
    unitsByHex.clear();
    nextUnitId = 1;
    resetTerrain();
    clearSelection();

    // Terrain
    const seenTerrainHexes = new Set();
    const terrainArr = Array.isArray(payload.terrain) ? payload.terrain : [];
    for (const t of terrainArr) {
      if (!t || typeof t !== 'object') continue;
      const q = Math.trunc(Number(t.q));
      const r = Math.trunc(Number(t.r));
      const k = key(q, r);

      if (!board.activeSet.has(k)) {
        report.terrainSkippedOffBoard += 1;
        continue;
      }
      if (!TERRAIN_IDS.has(t.terrain)) {
        report.terrainSkippedInvalidType += 1;
        continue;
      }
      if (seenTerrainHexes.has(k)) report.terrainDuplicates += 1;
      seenTerrainHexes.add(k);

      const h = board.byKey.get(k);
      if (!h) {
        report.terrainSkippedOffBoard += 1;
        continue;
      }
      h.terrain = t.terrain;
      report.terrainApplied += 1;
    }

    // Units
    const seenUnitHexes = new Set();
    const usedIds = new Set();
    let maxAssignedId = 0;
    let nextAutoId = 1;

    function claimUnitId(rawId) {
      const n = Number(rawId);
      if (Number.isInteger(n) && n > 0 && !usedIds.has(n)) {
        usedIds.add(n);
        maxAssignedId = Math.max(maxAssignedId, n);
        return n;
      }
      report.unitsIdRemapped += 1;
      while (usedIds.has(nextAutoId)) nextAutoId += 1;
      const id = nextAutoId++;
      usedIds.add(id);
      maxAssignedId = Math.max(maxAssignedId, id);
      return id;
    }

    const unitArr = Array.isArray(payload.units) ? payload.units : [];
    for (const u of unitArr) {
      if (!u || typeof u !== 'object') continue;
      const q = Math.trunc(Number(u.q));
      const r = Math.trunc(Number(u.r));
      const k = key(q, r);

      if (!board.activeSet.has(k)) {
        report.unitsSkippedOffBoard += 1;
        continue;
      }
      if (seenUnitHexes.has(k)) report.unitsDuplicates += 1;
      seenUnitHexes.add(k);

      const def = UNIT_BY_ID.get(u.type);
      if (!def) {
        report.unitsSkippedBadType += 1;
        continue;
      }
      if (u.side !== 'blue' && u.side !== 'red') {
        report.unitsSkippedBadSide += 1;
        continue;
      }

      const quality = normalizeQuality(u.type, u.quality || 'green');
      const maxHp = unitMaxHp(u.type, quality);
      const rawHp = Number(u.hp);
      let hp = maxHp;
      if (Number.isFinite(rawHp)) {
        hp = Math.max(1, Math.min(maxHp, Math.trunc(rawHp)));
        if (hp !== rawHp) report.unitsHpAdjusted += 1;
      } else {
        report.unitsHpAdjusted += 1;
      }

      unitsByHex.set(k, {
        id: claimUnitId(u.id),
        side: u.side,
        type: u.type,
        quality,
        hp,
        disarray: !!u.disarray,
        disarrayAppliedSerial: Number.isFinite(Number(u.disarrayAppliedSerial)) ? Number(u.disarrayAppliedSerial) : null,
      });
      report.unitsPlaced += 1;
    }
    nextUnitId = Math.max(1, maxAssignedId + 1);

    // Restore state fields
    const restoreMode = (payload.mode === 'play') ? 'play' : 'edit';
    const restoredGameMode =
      (payload.gameMode === 'online')
        ? 'online'
        : 'hvai';
    state.gameMode = restoredGameMode;
    const importedOnline = (payload.online && typeof payload.online === 'object') ? payload.online : {};
    const importedSeats = (importedOnline.seats && typeof importedOnline.seats === 'object') ? importedOnline.seats : {};
    state.online.seats.host = normalizeBattleSide(importedSeats.host, 'blue');
    state.online.seats.guest = normalizeBattleSide(importedSeats.guest, 'red');
    if (state.online.seats.host === state.online.seats.guest) {
      state.online.seats.guest = oppositeBattleSide(state.online.seats.host);
    }
    state.online.guestPreferredSide = normalizeBattleSide(
      importedOnline.guestPreferredSide,
      state.online.seats.guest
    );
    state.online.guestParityPick = normalizeParityPick(importedOnline.guestParityPick || state.online.guestParityPick);
    state.online.lastInitiativeRoll = Number.isFinite(Number(importedOnline.lastInitiativeRoll))
      ? Math.max(1, Math.min(6, Math.trunc(Number(importedOnline.lastInitiativeRoll))))
      : null;
    state.online.lastInitiativeFirstSide = importedOnline.lastInitiativeFirstSide
      ? normalizeBattleSide(importedOnline.lastInitiativeFirstSide, 'blue')
      : null;
    state.online.lastInitiativeGuestWon = (typeof importedOnline.lastInitiativeGuestWon === 'boolean')
      ? importedOnline.lastInitiativeGuestWon
      : null;
    state.aiDifficulty = normalizeAiDifficulty(payload.aiDifficulty);
    state.humanSide = (payload.humanSide === 'red') ? 'red' : 'blue';
    state.forwardAxis = normalizeForwardAxis(payload.forwardAxis);
    state.lineAdvanceDirection = normalizeLineAdvanceDirection(payload.lineAdvanceDirection);
    state.mode = restoreMode;
    state.tool = (payload.tool === 'terrain') ? 'terrain' : 'units';

    state.turn = Math.max(1, clampInt(payload.turn, 1, 999999, 1));
    state.turnSerial = Math.max(state.turn, clampInt(payload.turnSerial, 1, 9999999, state.turn));
    state.side = (payload.side === 'red') ? 'red' : 'blue';
    state.actsUsed = clampInt(payload.actsUsed, 0, ACT_LIMIT, 0);

    state.actedUnitIds = new Set();
    const actedIds = Array.isArray(payload.actedUnitIds) ? payload.actedUnitIds : [];
    for (const id of actedIds) {
      const n = Number(id);
      if (Number.isInteger(n) && usedIds.has(n)) state.actedUnitIds.add(n);
    }

    state.victoryMode = VICTORY_MODE_IDS.has(payload.victoryMode) ? payload.victoryMode : 'decapitation';
    elVictorySel.value = state.victoryMode;

    const nowBlue = totals('blue').up;
    const nowRed = totals('red').up;
    state.initialUP = {
      blue: nonNegNumber(payload?.initialUP?.blue, nowBlue),
      red: nonNegNumber(payload?.initialUP?.red, nowRed),
    };
    state.capturedUP = {
      blue: nonNegNumber(payload?.capturedUP?.blue, 0),
      red: nonNegNumber(payload?.capturedUP?.red, 0),
    };

    state.gameOver = !!payload.gameOver;
    state.winner = (payload.winner === 'blue' || payload.winner === 'red') ? payload.winner : null;
    if (!state.gameOver) state.winner = null;

    state.showCommand = (typeof payload.showCommand === 'boolean') ? payload.showCommand : true;
    if (typeof payload.terrainTheme === 'string' && TERRAIN_THEMES[payload.terrainTheme]) {
      state.terrainTheme = payload.terrainTheme;
    }
    state.events = Array.isArray(payload.events) ? cloneJson(payload.events, []) : [];
    if (state.events.length > 200) state.events = state.events.slice(-200);
    state.eventTrace = Array.isArray(payload.eventTrace) ? cloneJson(payload.eventTrace, []) : [];
    if (state.eventTrace.length > EVENT_TRACE_MAX) {
      state.eventTrace = state.eventTrace.slice(-EVENT_TRACE_MAX);
    }

    state.loadedScenarioName = (typeof payload.loadedScenarioName === 'string' && payload.loadedScenarioName.trim())
      ? payload.loadedScenarioName.trim()
      : state.loadedScenarioName;
    const importedSides = payload.loadedScenarioSides;
    if (importedSides && typeof importedSides === 'object' && importedSides.blue && importedSides.red) {
      state.loadedScenarioSides = {
        blue: String(importedSides.blue),
        red: String(importedSides.red),
        named: !!importedSides.named,
      };
    } else {
      state.loadedScenarioSides = scenarioSideLabels(state.loadedScenarioName);
    }
    const importedMeta = payload.loadedScenarioMeta;
    if (importedMeta && typeof importedMeta === 'object') {
      state.loadedScenarioMeta = {
        description: String(importedMeta.description || ''),
        historical: String(importedMeta.historical || ''),
        notes: String(importedMeta.notes || ''),
        pointTarget: Number.isFinite(Number(importedMeta.pointTarget)) ? Math.max(1, Math.trunc(Number(importedMeta.pointTarget))) : null,
      };
    }
    state.scenarioObjectives = normalizeScenarioObjectives(payload.scenarioObjectives);
    if (state.scenarioObjectives.length === 0 && state.loadedScenarioName) {
      loadScenarioObjectives(state.loadedScenarioName);
    }
    state.objectiveCheckpointTurn = clampInt(payload.objectiveCheckpointTurn, 1, 99, state.objectiveCheckpointTurn || 8);
    state.objectiveLastSummary = (typeof payload.objectiveLastSummary === 'string')
      ? payload.objectiveLastSummary
      : null;

    const importedDoctrine = payload.doctrine;
    ensureDoctrineStateInitialized(false);
    if (importedDoctrine && typeof importedDoctrine === 'object') {
      const bySide = importedDoctrine.bySide;
      if (bySide && typeof bySide === 'object') {
        const blueLoadout = Array.isArray(bySide.blue?.loadout) ? bySide.blue.loadout : null;
        const redLoadout = Array.isArray(bySide.red?.loadout) ? bySide.red.loadout : null;
        if (blueLoadout && validateDoctrineLoadout(blueLoadout)) {
          state.doctrine.bySide.blue = buildDoctrineByIds(blueLoadout, bySide.blue?.source || 'import');
          if (bySide.blue?.byId && typeof bySide.blue.byId === 'object') {
            for (const [id, status] of Object.entries(bySide.blue.byId)) {
              if (!state.doctrine.bySide.blue.byId[id]) continue;
              state.doctrine.bySide.blue.byId[id].revealed = !!status?.revealed;
              state.doctrine.bySide.blue.byId[id].spent = !!status?.spent;
              state.doctrine.bySide.blue.byId[id].usedCount = Math.max(0, Math.trunc(Number(status?.usedCount || 0)));
            }
          } else {
            // Backward compatibility with legacy import format.
            const revealed = new Set(Array.isArray(bySide.blue?.revealed) ? bySide.blue.revealed : []);
            const spent = new Set(Array.isArray(bySide.blue?.spent) ? bySide.blue.spent : []);
            for (const id of state.doctrine.bySide.blue.loadout) {
              const st = state.doctrine.bySide.blue.byId[id];
              if (!st) continue;
              st.revealed = revealed.has(id);
              st.spent = spent.has(id);
              st.usedCount = st.spent ? 1 : (st.revealed ? 1 : 0);
            }
          }
        }
        if (redLoadout && validateDoctrineLoadout(redLoadout)) {
          state.doctrine.bySide.red = buildDoctrineByIds(redLoadout, bySide.red?.source || 'import');
          if (bySide.red?.byId && typeof bySide.red.byId === 'object') {
            for (const [id, status] of Object.entries(bySide.red.byId)) {
              if (!state.doctrine.bySide.red.byId[id]) continue;
              state.doctrine.bySide.red.byId[id].revealed = !!status?.revealed;
              state.doctrine.bySide.red.byId[id].spent = !!status?.spent;
              state.doctrine.bySide.red.byId[id].usedCount = Math.max(0, Math.trunc(Number(status?.usedCount || 0)));
            }
          } else {
            const revealed = new Set(Array.isArray(bySide.red?.revealed) ? bySide.red.revealed : []);
            const spent = new Set(Array.isArray(bySide.red?.spent) ? bySide.red.spent : []);
            for (const id of state.doctrine.bySide.red.loadout) {
              const st = state.doctrine.bySide.red.byId[id];
              if (!st) continue;
              st.revealed = revealed.has(id);
              st.spent = spent.has(id);
              st.usedCount = st.spent ? 1 : (st.revealed ? 1 : 0);
            }
          }
        }
      }
      state.doctrine.history = Array.isArray(importedDoctrine.history) ? cloneJson(importedDoctrine.history, []) : [];
      state.doctrine.longEffects = Array.isArray(importedDoctrine.longEffects) ? cloneJson(importedDoctrine.longEffects, []) : [];
      state.doctrine.effects = (importedDoctrine.effects && typeof importedDoctrine.effects === 'object')
        ? cloneJson(importedDoctrine.effects, {})
        : state.doctrine.effects;
      state.doctrine.commandPhaseOpen = !!importedDoctrine.commandPhaseOpen;
      state.doctrine.commandIssuedThisTurn = !!importedDoctrine.commandIssuedThisTurn;
      state.doctrine.selectedCommandId = String(importedDoctrine.selectedCommandId || '');
      state.doctrine.activeCommandThisTurn = importedDoctrine.activeCommandThisTurn || null;
    } else {
      ensureDoctrineStateInitialized(true);
      clearDoctrineTurnEffects();
      state.doctrine.commandPhaseOpen = false;
      state.doctrine.commandIssuedThisTurn = false;
      state.doctrine.selectedCommandId = '';
      state.doctrine.activeCommandThisTurn = null;
    }
    ensureDoctrineEffectMaps();

    if (state.mode === 'edit') {
      // Keep Edit mode deterministic and uncluttered after import.
      state.actsUsed = 0;
      state.actedUnitIds = new Set();
      state.gameOver = false;
      state.winner = null;
      clearSelection();
    }

    if (!silent) {
      state.lastImport = {
        source: String(sourceLabel || 'import'),
        at: Date.now(),
      };

      log(
        `Imported state: ${sourceLabel} ` +
        `(units=${report.unitsPlaced}, terrain=${report.terrainApplied}, mode=${state.mode.toUpperCase()}, ` +
        `turn=${state.turn}, side=${state.side.toUpperCase()}).`
      );
    }

    const skippedTotal =
      report.terrainSkippedOffBoard +
      report.terrainSkippedInvalidType +
      report.unitsSkippedOffBoard +
      report.unitsSkippedBadType +
      report.unitsSkippedBadSide;
    const duplicateTotal = report.terrainDuplicates + report.unitsDuplicates;
    const adjustedTotal = report.unitsHpAdjusted + report.unitsIdRemapped;

    if (!silent && (skippedTotal > 0 || duplicateTotal > 0 || adjustedTotal > 0)) {
      log(
        `Import warnings: skipped=${skippedTotal} ` +
        `(terrain offboard ${report.terrainSkippedOffBoard}, terrain invalid ${report.terrainSkippedInvalidType}, ` +
        `units offboard ${report.unitsSkippedOffBoard}, units bad type ${report.unitsSkippedBadType}, ` +
        `units bad side ${report.unitsSkippedBadSide}) · duplicates=${duplicateTotal} ` +
        `(terrain ${report.terrainDuplicates}, units ${report.unitsDuplicates}) · adjusted=${adjustedTotal} ` +
        `(hp ${report.unitsHpAdjusted}, ids ${report.unitsIdRemapped}).`
      );
    }

    updateHud();
    if (!skipAiKick) maybeStartAiTurn();
  }

  function importStateFromText(text, sourceLabel = 'import') {
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (err) {
      log(`Import failed: invalid JSON (${err && err.message ? err.message : String(err)}).`);
      updateHud();
      return;
    }
    applyImportedState(parsed, sourceLabel);
  }

  function importStateFromFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
      importStateFromText(String(reader.result || ''), file.name || 'import');
    };
    reader.onerror = () => {
      log('Import failed: could not read file.');
      updateHud();
    };
    reader.readAsText(file);
  }

  // --- Turn handling
  function endTurn() {
    if (state.mode !== 'play') return;
    if (state.gameOver) return;

    stopAiLoop();

    // End-of-turn objective checkpoint and strategic victory checks.
    logObjectiveStateIfChanged(false);
    checkVictory('end-turn');
    if (state.gameOver) {
      updateHud();
      return;
    }

    const endedSide = state.side;
    state.side = (state.side === 'blue') ? 'red' : 'blue';
    if (state.side === 'blue') state.turn += 1;
    state.turnSerial += 1;
    clearExpiredDisarrayForEndedSide(endedSide);

    state.actsUsed = 0;
    state.actedUnitIds = new Set();

    clearSelection();
    openCommandPhaseForCurrentTurn();

    pushEventTrace('turn.end', {
      nextSide: state.side,
      turn: state.turn,
      serial: state.turnSerial,
    });
    log(`Turn ${state.turn}: ${state.side.toUpperCase()}.`);
    updateHud();
    maybeStartAiTurn();
  }

  // --- Play interaction
  function selectUnit(hexKey) {
    const u = unitsByHex.get(hexKey);
    if (!u) return;

    if (!unitCanActivate(u, hexKey)) return;

    const inCmd = unitIgnoresCommand(u) ? true : inCommandAt(hexKey, u.side);

    state.selectedKey = hexKey;
    state.act = {
      unitId: u.id,
      committed: false,
      moved: false,
      attacked: false,
      healed: false,
      inCommandStart: inCmd,
      moveSpent: 0,
      postAttackWithdrawOnly: false,
      postAttackPursuitOnly: false,
      postAttackSixShiftOnly: false,
    };

    // Precompute targets
    state._moveTargets = computeMoveTargets(hexKey, u, state.act);
    state._attackTargets = computeAttackTargets(hexKey, u);
    state._healTargets = computeHealTargets(hexKey, u);

    const def = UNIT_BY_ID.get(u.type);
    const engaged = isEngaged(hexKey, u.side);
    const notes = [];
    const disarray = unitIsDisarrayed(u);

    if (disarray) {
      notes.push('Disarrayed: this activation can only recover/pass (disarray auto-clears after one full turn).');
    }

    if (!disarray && engaged) {
      if (u.type === 'skr') notes.push('Engaged: SKR may disengage 1 hex.');
      else if (u.type === 'run') notes.push('Engaged: RUN may disengage 1 hex.');
      else if (u.quality === 'veteran') notes.push('Engaged: Veteran may withdraw 1 hex.');
      else notes.push('Engaged: cannot move.');
    } else if (!disarray && !unitIgnoresCommand(u) && u.quality === 'regular' && !inCmd) {
      notes.push('Out of command: cannot move (can attack).');
    }
    if (u.type === 'iat') {
      const healCount = state._healTargets ? state._healTargets.size : 0;
      if (healCount > 0) notes.push(`Medic can heal ${healCount} adjacent unit(s).`);
      else notes.push('Medic has no adjacent wounded ally to heal.');
    }

    log(`Selected ${u.side.toUpperCase()} ${def.abbrev}.${notes.length ? ' ' + notes.join(' ') : ''}`);
    updateHud();
  }

  function moveSelectedTo(destKey) {
    const fromKey = state.selectedKey;
    if (!fromKey || !state.act) return;

    const u = unitsByHex.get(fromKey);
    if (!u) return;

    const isPostAttackWithdraw = !!state.act.postAttackWithdrawOnly;
    const isPostAttackPursuit = !!state.act.postAttackPursuitOnly;
    const isPostAttackSixShift = !!state.act.postAttackSixShiftOnly;
    const isPostAttackFollowup = isPostAttackWithdraw || isPostAttackPursuit || isPostAttackSixShift;

    if (!isPostAttackFollowup && (state.act.moved || state.act.attacked)) {
      log('Illegal move (already acted).');
      return;
    }

    if (!state._moveTargets || !state._moveTargets.has(destKey)) {
      log('Illegal move.');
      return;
    }

    // Commit activation on the FIRST real action.
    if (!state.act.committed) {
      consumeActivation(u.id);
      state.act.committed = true;
    }

    const stepCost = movementPathCost(fromKey, destKey, u);
    if (Number.isFinite(stepCost) && stepCost > 0) {
      state.act.moveSpent = (state.act.moveSpent || 0) + stepCost;
    }

    unitsByHex.delete(fromKey);
    unitsByHex.set(destKey, u);
    state.selectedKey = destKey;
    state.act.moved = true;
    applyPostMoveTerrainEffects(u, destKey);
    startMoveAnimation(fromKey, destKey, u);
    pushEventTrace('unit.move', {
      side: u.side,
      unitId: u.id,
      unitType: u.type,
      fromKey,
      toKey: destKey,
      followup: isPostAttackFollowup,
    });
    tryTriggerCounterchargeAgainst(destKey, u);

    if (isPostAttackFollowup) {
      if (isPostAttackPursuit) {
        log(`Pursuit: advanced into ${destKey}.`);
        pushEventTrace('combat.pursuit', {
          side: u.side,
          attackerId: u.id,
          toKey: destKey,
          auto: false,
        });
      } else if (isPostAttackSixShift) {
        log(`Follow-through: shifted to ${destKey} after rolling a 6.`);
        pushEventTrace('combat.follow_through', {
          side: u.side,
          attackerId: u.id,
          toKey: destKey,
          trigger: 'roll_6',
        });
      } else {
        log(`Veteran CAV disengaged to ${destKey}.`);
      }
      state.act.postAttackSixShiftOnly = false;
      state.act.postAttackWithdrawOnly = false;
      state.act.postAttackPursuitOnly = false;
      clearSelection();
      updateHud();
      maybeAutoEndTurnAtActionLimit();
      return;
    }

    if (u.type === 'iat') {
      log(`Medic moved to ${destKey}.`);
      clearSelection();
      updateHud();
      maybeAutoEndTurnAtActionLimit();
      return;
    }

    log(`Moved to ${destKey}.`);

    // After moving, you may make at most ONE attack (same activation).
    state._moveTargets = null;
    state._attackTargets = computeAttackTargets(destKey, u);
    state._healTargets = computeHealTargets(destKey, u);

    const hasFollowUpAttack = !!(state._attackTargets && state._attackTargets.size > 0);
    const hasFollowUpHeal = !!(state._healTargets && state._healTargets.size > 0);
    if (!hasFollowUpAttack && !hasFollowUpHeal) {
      clearSelection();
      updateHud();
      maybeAutoEndTurnAtActionLimit();
      return;
    }

    updateHud();
  }

  function healFromSelection(targetKey) {
    const sourceKey = state.selectedKey;
    if (!sourceKey || !state.act) return;

    const src = unitsByHex.get(sourceKey);
    if (!src || src.type !== 'iat') return;
    if (state.act.committed || state.act.moved || state.act.attacked || state.act.healed) {
      log('Healing not available (already acted).');
      return;
    }
    if (!state._healTargets || !state._healTargets.has(targetKey)) {
      log('No valid heal target there.');
      return;
    }

    const target = unitsByHex.get(targetKey);
    if (!target || target.side !== src.side) {
      log('Invalid heal target.');
      return;
    }

    const maxHp = unitMaxHp(target.type, target.quality);
    if (target.hp >= maxHp) {
      log('Target is already at full HP.');
      return;
    }

    consumeActivation(src.id);
    state.act.committed = true;
    state.act.healed = true;
    target.hp = Math.min(maxHp, target.hp + 1);
    const tdef = UNIT_BY_ID.get(target.type);

    log(`Medic restored 1 HP to ${target.side.toUpperCase()} ${tdef ? tdef.abbrev : target.type} (${target.hp}/${maxHp}).`);
    pushEventTrace('unit.heal', {
      side: src.side,
      medicId: src.id,
      targetId: target.id,
      targetType: target.type,
      targetKey,
      hpAfter: target.hp,
      hpMax: maxHp,
    });
    clearSelection();
    updateHud();
    maybeAutoEndTurnAtActionLimit();
  }

  function attackFromSelection(targetKey) {
    const attackerKey = state.selectedKey;
    if (!attackerKey || !state.act) return;

    const atk = unitsByHex.get(attackerKey);
    if (!atk) return;

    if (state.act.attacked) {
      log('Illegal attack (already attacked).');
      return;
    }

    // Validate target exists and is enemy.
    const enemy = unitsByHex.get(targetKey);
    if (!enemy || enemy.side === atk.side) {
      log('Illegal attack target.');
      return;
    }

    if (!state._attackTargets || !state._attackTargets.has(targetKey)) {
      log('Illegal attack.');
      return;
    }

    // Commit activation on the FIRST real action.
    if (!state.act.committed) {
      consumeActivation(atk.id);
      state.act.committed = true;
    }

    pushEventTrace('combat.attack', {
      side: atk.side,
      attackerId: atk.id,
      attackerType: atk.type,
      attackerKey,
      defenderId: enemy.id,
      defenderType: enemy.type,
      defenderKey: targetKey,
    });
    const prof = attackDiceFor(attackerKey, targetKey, atk);
    setAttackFlash(targetKey, ATTACK_FLASH_MS, {
      fromKey: attackerKey,
      strikeType: prof?.kind || 'melee',
      attackerType: atk.type,
    });
    const attackResult = resolveAttack(attackerKey, targetKey) || { ok: false, pursuitTarget: null, rolledSix: false };

    state.act.attacked = true;

    const afterAtk = unitsByHex.get(attackerKey);
    if (
      attackResult.ok &&
      attackResult.rolledSix &&
      afterAtk &&
      !state.gameOver &&
      !isAiTurnActive()
    ) {
      const sixShiftTargets = postAttackSixShiftTargets(attackerKey, afterAtk);
      if (sixShiftTargets.size > 0) {
        state.act.postAttackSixShiftOnly = true;
        state.act.postAttackWithdrawOnly = false;
        state.act.postAttackPursuitOnly = false;
        state._moveTargets = sixShiftTargets;
        state._attackTargets = new Set();
        state._healTargets = new Set();
        log('Roll of 6: optional follow-through move to any open adjacent hex. Choose a hex or click the unit to hold.');
        updateHud();
        return;
      }
    }

    if (attackResult.ok && attackResult.pursuitTarget) {
      state.act.postAttackSixShiftOnly = false;
      state.act.postAttackWithdrawOnly = false;
      state.act.postAttackPursuitOnly = true;
      state._moveTargets = new Set([attackResult.pursuitTarget]);
      state._attackTargets = new Set();
      state._healTargets = new Set();
      log(`Pursuit available: move into ${attackResult.pursuitTarget} or click selected unit to hold position.`);
      updateHud();
      return;
    }

    if (afterAtk) {
      const withdrawTargets = veteranCavPostAttackWithdrawTargets(attackerKey, afterAtk, state.act);
      if (withdrawTargets.size > 0) {
        state.act.postAttackSixShiftOnly = false;
        state.act.postAttackWithdrawOnly = true;
        state.act.postAttackPursuitOnly = false;
        state._moveTargets = withdrawTargets;
        state._attackTargets = new Set();
        state._healTargets = new Set();
        log('Veteran CAV may disengage: choose a withdrawal hex or click selected unit to end activation.');
        updateHud();
        return;
      }
    }

    // End activation after attack.
    clearSelection();
    updateHud();
    maybeAutoEndTurnAtActionLimit();
  }

  function passSelected() {
    if (state.mode !== 'play') return;
    if (!state.selectedKey || !state.act) return;

    const u = unitsByHex.get(state.selectedKey);
    if (!u) return;

    if (state.act.committed) {
      log('Pass not available (already committed).');
      return;
    }

    consumeActivation(u.id);
    state.act.committed = true;
    if (unitIsDisarrayed(u)) {
      clearDisarrayOnUnit(u, 'recovered on activation');
      log(`Recover: ${u.side.toUpperCase()} ${UNIT_BY_ID.get(u.type).abbrev} steadied the formation.`);
      pushEventTrace('unit.recover', {
        side: u.side,
        unitId: u.id,
        unitType: u.type,
        key: state.selectedKey,
      });
    } else {
      log(`Pass: ${u.side.toUpperCase()} ${UNIT_BY_ID.get(u.type).abbrev}.`);
      pushEventTrace('unit.pass', {
        side: u.side,
        unitId: u.id,
        unitType: u.type,
        key: state.selectedKey,
      });
    }

    clearSelection();
    updateHud();
    maybeAutoEndTurnAtActionLimit();
  }

  function clickPlay(hexKey) {
    if (state.doctrine.targeting.active) {
      const toggled = toggleDoctrineTargetUnitAt(hexKey);
      if (!toggled) {
        const u = unitsByHex.get(hexKey);
        if (u && u.side === state.side) {
          log(doctrineTargetIneligibleReason(hexKey));
          updateHud();
        }
      }
      return;
    }

    const clickedUnit = unitsByHex.get(hexKey);

    // If nothing selected: try to select.
    if (!state.selectedKey) {
      if (clickedUnit) {
        const reason = activationBlockReason(clickedUnit, hexKey);
        if (reason) {
          log(reason);
          updateHud();
          maybeAutoEndTurnAtActionLimit();
          return;
        }
        if (unitCanActivate(clickedUnit, hexKey)) selectUnit(hexKey);
      }
      return;
    }

    const selKey = state.selectedKey;
    const selUnit = unitsByHex.get(selKey);
    if (!selUnit) {
      clearSelection();
      updateHud();
      maybeAutoEndTurnAtActionLimit();
      return;
    }

    // Clicking the selected hex toggles deselect.
    if (hexKey === selKey) {
      if (state.act && (state.act.postAttackPursuitOnly || state.act.postAttackWithdrawOnly || state.act.postAttackSixShiftOnly)) {
        clearSelection();
        log('Held position after attack.');
        updateHud();
        maybeAutoEndTurnAtActionLimit();
        return;
      }
      clearSelection();
      log('Deselected.');
      updateHud();
      maybeAutoEndTurnAtActionLimit();
      return;
    }

    // Attack
    if (clickedUnit && clickedUnit.side !== selUnit.side && state._attackTargets?.has(hexKey)) {
      attackFromSelection(hexKey);
      return;
    }

    // Move
    if (!clickedUnit && state._moveTargets?.has(hexKey)) {
      moveSelectedTo(hexKey);
      return;
    }

    // Heal (Medic support unit)
    if (clickedUnit && clickedUnit.side === selUnit.side && state._healTargets?.has(hexKey)) {
      healFromSelection(hexKey);
      return;
    }

    // Switch selection to another friendly (forfeits any optional post-move attack)
    if (clickedUnit && clickedUnit.side === state.side) {
      clearSelection();
      const reason = activationBlockReason(clickedUnit, hexKey);
      if (reason) {
        log(reason);
        updateHud();
        maybeAutoEndTurnAtActionLimit();
        return;
      }
      if (unitCanActivate(clickedUnit, hexKey)) selectUnit(hexKey);
      maybeAutoEndTurnAtActionLimit();
      return;
    }
  }

  // --- Events
  const TOUCH_CLICK_SUPPRESS_MS = 700;
  let suppressCanvasClickUntil = 0;

  function canvasHexFromClient(clientX, clientY) {
    const rect = elCanvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    return pickHex(x, y);
  }

  function handleCanvasHexAction(hexKey) {
    if (!hexKey) return;
    if (state.tutorial.active) {
      handleTutorialCanvasClick(hexKey);
      return;
    }
    if (state.mode === 'edit') {
      if (onlineModeActive() && net.connected && !net.isHost) {
        log('Online: host controls setup and mode.');
        updateHud();
        return;
      }
      if (state.tool === 'terrain') paintTerrain(hexKey);
      else placeOrReplaceUnit(hexKey);
    } else {
      if (onlineModeActive()) {
        if (forwardOnlineAction({ type: 'click', hexKey })) return;
      }
      if (isAiTurnActive()) return;
      clickPlay(hexKey);
    }
  }

  function handleCanvasPointerAction(clientX, clientY) {
    const h = canvasHexFromClient(clientX, clientY);
    if (!h) return;
    handleCanvasHexAction(h.k);
  }

  elCanvas.addEventListener('mousemove', (e) => {
    const h = canvasHexFromClient(e.clientX, e.clientY);
    state._hoverKey = h ? h.k : null;
    renderLiveModifierPreview();
    draw();
  });

  elCanvas.addEventListener('mouseleave', () => {
    state._hoverKey = null;
    renderLiveModifierPreview();
    draw();
  });

  elCanvas.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse') return;
    if (typeof e.button === 'number' && e.button > 0) return;
    e.preventDefault();
    suppressCanvasClickUntil = Date.now() + TOUCH_CLICK_SUPPRESS_MS;
    handleCanvasPointerAction(e.clientX, e.clientY);
  });

  elCanvas.addEventListener('click', (e) => {
    if (Date.now() < suppressCanvasClickUntil) return;
    handleCanvasPointerAction(e.clientX, e.clientY);
  });

  if (elIntroPlayNowBtn) {
    elIntroPlayNowBtn.addEventListener('click', () => {
      startPlayNowFromIntro();
    });
  }
  if (elIntroSetupBtn) {
    elIntroSetupBtn.addEventListener('click', () => {
      startSetupFromIntro();
    });
  }
  if (elIntroTutorialBtn) {
    elIntroTutorialBtn.addEventListener('click', () => {
      setIntroTutorialOpen(true);
    });
  }
  if (elIntroTutorialStartBtn) {
    elIntroTutorialStartBtn.addEventListener('click', () => {
      startGuidedTutorialFromIntro();
    });
  }
  if (elIntroTutorialBackBtn) {
    elIntroTutorialBackBtn.addEventListener('click', () => {
      setIntroTutorialOpen(false);
    });
  }
  if (elTutorialPrevBtn) {
    elTutorialPrevBtn.addEventListener('click', () => {
      if (!state.tutorial.active) return;
      setTutorialAutoplay(false);
      applyTutorialStep(state.tutorial.stepIndex - 1);
    });
  }
  if (elTutorialNextBtn) {
    elTutorialNextBtn.addEventListener('click', () => {
      if (!state.tutorial.active) return;
      setTutorialAutoplay(false);
      applyTutorialStep(state.tutorial.stepIndex + 1);
    });
  }
  if (elTutorialAutoBtn) {
    elTutorialAutoBtn.addEventListener('click', () => {
      if (!state.tutorial.active) return;
      setTutorialAutoplay(!state.tutorial.autoplay);
    });
  }
  if (elTutorialSkipTaskBtn) {
    elTutorialSkipTaskBtn.addEventListener('click', () => {
      if (!state.tutorial.active || !state.tutorial.task?.active || state.tutorial.task?.done) return;
      tutorialMarkTaskDone('Skipped by player.');
    });
  }
  if (elTutorialExitBtn) {
    elTutorialExitBtn.addEventListener('click', () => {
      stopGuidedTutorial();
    });
  }
  if (elTutorialToggleUiBtn) {
    elTutorialToggleUiBtn.addEventListener('click', () => {
      if (!state.tutorial.active) return;
      state.tutorial.showSidePanel = !state.tutorial.showSidePanel;
      applyTutorialLayoutState();
      renderTutorialGuide();
      draw();
    });
  }
  if (elTutorialMinBtn) {
    elTutorialMinBtn.addEventListener('click', () => {
      if (!state.tutorial.active) return;
      setTutorialGuideMinimized(!state.tutorial.minimized);
      renderTutorialGuide();
    });
  }

  // Keyboard: P = pass, L = line advance (with selected INF)
  window.addEventListener('keydown', (e) => {
    if (state.introOpen) {
      if (e.key === 'Escape' && state.introTutorialOpen) {
        e.preventDefault();
        setIntroTutorialOpen(false);
      }
      return;
    }
    if (state.tutorial.active) {
      if (e.key === 'Escape') {
        e.preventDefault();
        stopGuidedTutorial();
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        setTutorialAutoplay(false);
        applyTutorialStep(state.tutorial.stepIndex + 1);
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setTutorialAutoplay(false);
        applyTutorialStep(state.tutorial.stepIndex - 1);
        return;
      }
    }
    if (e.key === 'Escape' && state.doctrine.builder.open) {
      e.preventDefault();
      closeDoctrineBuilder();
      return;
    }
    if (e.key === 'Escape' && rulesOverlayOpen()) {
      e.preventDefault();
      closeRulesOverlay();
      return;
    }

    if (e.key === 'p' || e.key === 'P') {
      if (state.mode === 'play' && state.selectedKey && !isAiTurnActive()) {
        e.preventDefault();
        if (onlineModeActive() && forwardOnlineAction({ type: 'pass' })) return;
        passSelected();
      }
    }

    if (e.key === 'l' || e.key === 'L') {
      if (state.mode === 'play' && !isAiTurnActive()) {
        e.preventDefault();
        if (onlineModeActive() && forwardOnlineAction({ type: 'line_advance', direction: state.lineAdvanceDirection })) return;
        lineAdvanceFromSelection();
      }
    }

    // Toggle command radius overlay
    if (e.key === 'c' || e.key === 'C') {
      if (state.mode === 'play') {
        state.showCommand = !state.showCommand;
        log(`Command radius: ${state.showCommand ? 'ON' : 'OFF'}.`);
        updateHud();
      }
    }
    // Toggle terrain palette (visual only)
    if (e.key === 't' || e.key === 'T') {
      const cur = state.terrainTheme || 'vivid';
      const i = TERRAIN_THEME_ORDER.indexOf(cur);
      state.terrainTheme = TERRAIN_THEME_ORDER[(i + 1) % TERRAIN_THEME_ORDER.length];
      log(`Terrain palette: ${state.terrainTheme.toUpperCase()}.`);
      updateHud();
    }
  });

  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', resize);
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', resize);
  }

  if (elOpenQuickRulesBtn) {
    elOpenQuickRulesBtn.addEventListener('click', () => {
      openRulesOverlay('quick');
    });
  }
  if (elOpenFullRulesBtn) {
    elOpenFullRulesBtn.addEventListener('click', () => {
      openRulesOverlay('full');
    });
  }
  if (elDoctrineOpenHeroBtn) {
    elDoctrineOpenHeroBtn.addEventListener('click', () => {
      if (state.mode === 'play') {
        log('War Council setup is available in Battle Setup mode.');
        updateHud();
        return;
      }
      if (state.gameMode === 'online' && !(net.connected && net.peer)) {
        log('War Council unlocks after both online players are connected.');
        updateHud();
        return;
      }
      openDoctrineBuilder('blue');
    });
  }
  if (elOpenCommandRulesBtn) {
    elOpenCommandRulesBtn.addEventListener('click', () => {
      openRulesOverlay('commands', { mode: 'all', side: (state.side === 'red') ? 'red' : 'blue' });
    });
  }
  if (elOpenOrdersKeyBtn) {
    elOpenOrdersKeyBtn.addEventListener('click', () => {
      const side = (state.side === 'red') ? 'red' : 'blue';
      openRulesOverlay('commands', { mode: 'selected', side });
    });
  }
  if (elOrdersViewBlueBtn) {
    elOrdersViewBlueBtn.addEventListener('click', () => {
      state.ordersPreviewSide = 'blue';
      updateHud();
    });
  }
  if (elOrdersViewRedBtn) {
    elOrdersViewRedBtn.addEventListener('click', () => {
      state.ordersPreviewSide = 'red';
      updateHud();
    });
  }
  if (elRulesTabQuickBtn) {
    elRulesTabQuickBtn.addEventListener('click', () => {
      setRulesTab('quick');
    });
  }
  if (elRulesTabFullBtn) {
    elRulesTabFullBtn.addEventListener('click', () => {
      setRulesTab('full');
    });
  }
  if (elRulesTabCommandsBtn) {
    elRulesTabCommandsBtn.addEventListener('click', () => {
      renderRulesCommandsGuide(rulesCommandsViewMode, rulesCommandsViewSide);
      setRulesTab('commands');
    });
  }
  if (elRulesCommandsSelectedBtn) {
    elRulesCommandsSelectedBtn.addEventListener('click', () => {
      renderRulesCommandsGuide('selected', rulesCommandsViewSide);
      setRulesTab('commands');
    });
  }
  if (elRulesCommandsAllBtn) {
    elRulesCommandsAllBtn.addEventListener('click', () => {
      renderRulesCommandsGuide('all', rulesCommandsViewSide);
      setRulesTab('commands');
    });
  }
  if (elCloseRulesSideBtn) {
    elCloseRulesSideBtn.addEventListener('click', () => {
      closeRulesOverlay();
    });
  }
  if (elRulesSideOverlay) {
    elRulesSideOverlay.addEventListener('click', (e) => {
      if (e.target === elRulesSideOverlay) closeRulesOverlay();
    });
  }

  elModeBtn.addEventListener('click', () => {
    if (onlineModeActive() && net.connected && !net.isHost) {
      log('Online: host controls setup and mode.');
      updateHud();
      return;
    }
    if (state.mode === 'edit') enterPlay();
    else enterEdit();
  });

  if (elOnlineHostBtn) {
    elOnlineHostBtn.addEventListener('click', startOnlineHost);
  }
  if (elOnlineJoinBtn) {
    elOnlineJoinBtn.addEventListener('click', startOnlineJoin);
  }
  if (elOnlineLeaveBtn) {
    elOnlineLeaveBtn.addEventListener('click', () => {
      onlineLeaveSession('Online: left session.');
    });
  }
  if (elOnlineJoinCode) {
    elOnlineJoinCode.addEventListener('input', () => {
      const normalized = normalizeOnlineCode(elOnlineJoinCode.value);
      if (elOnlineJoinCode.value !== normalized) {
        elOnlineJoinCode.value = normalized;
      }
      updateHud();
    });
    elOnlineJoinCode.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        startOnlineJoin();
      }
    });
  }
  if (elOnlineGuestSideSel) {
    elOnlineGuestSideSel.addEventListener('change', () => {
      const chosen = normalizeBattleSide(elOnlineGuestSideSel.value, 'red');
      if (net.isHost && net.connected) {
        // Host cannot override guest seat selection once connected.
        elOnlineGuestSideSel.value = state.online.guestPreferredSide;
        updateHud();
        return;
      }
      applyGuestSidePreference(chosen);
      if (state.gameMode === 'online' && net.connected && !net.isHost) {
        sendGuestPregamePrefs();
      }
      updateHud();
    });
  }
  if (elOnlineInitiativeSel) {
    elOnlineInitiativeSel.addEventListener('change', () => {
      const pick = normalizeParityPick(elOnlineInitiativeSel.value);
      state.online.guestParityPick = pick;
      if (state.gameMode === 'online' && net.connected && !net.isHost) {
        sendGuestPregamePrefs();
      }
      updateHud();
    });
  }
  if (elGameModeSel) {
    elGameModeSel.addEventListener('change', () => {
      const rawMode = elGameModeSel.value;
      const nextMode = (rawMode === 'online') ? 'online' : 'hvai';
      if (nextMode === state.gameMode) return;

      if (state.gameMode === 'online' && nextMode !== 'online') {
        onlineLeaveSession('Online: idle.');
      }

      state.gameMode = nextMode;
      if (nextMode === 'hvai') {
        const aiSide = aiControlledSide();
        log(
          `Game mode: Human vs AI (` +
          `Human ${state.humanSide.toUpperCase()} vs ${aiSide ? aiSide.toUpperCase() : '-'} AI, ` +
          `${aiDifficultyLabel(state.aiDifficulty)}).`
        );
      } else if (nextMode === 'online') {
        stopAiLoop();
        log('Game mode: Online. Guest chooses side and calls odds/evens for initiative.');
      }
      updateHud();
      maybeStartAiTurn();
    });
  }

  if (elAiDifficultySel) {
    elAiDifficultySel.addEventListener('change', () => {
      const nextDifficulty = normalizeAiDifficulty(elAiDifficultySel.value);
      if (nextDifficulty === state.aiDifficulty) return;
      state.aiDifficulty = nextDifficulty;
      log(`AI difficulty: ${aiDifficultyLabel(nextDifficulty)}.`);
      updateHud();
    });
  }

  if (elHumanSideSel) {
    elHumanSideSel.addEventListener('change', () => {
      const nextSide = (elHumanSideSel.value === 'red') ? 'red' : 'blue';
      if (nextSide === state.humanSide) return;
      stopAiLoop();
      state.humanSide = nextSide;
      const aiSide = aiControlledSide();
      clearSelection();
      log(`Human side set to ${state.humanSide.toUpperCase()} (${aiSide ? aiSide.toUpperCase() : '-'} AI).`);
      updateHud();
      maybeStartAiTurn();
    });
  }

  if (elForwardAxisSel) {
    elForwardAxisSel.addEventListener('change', () => {
      const nextAxis = normalizeForwardAxis(elForwardAxisSel.value);
      if (nextAxis === state.forwardAxis) return;
      state.forwardAxis = nextAxis;
      clearSelection();
      log(`Advance axis: ${forwardAxisLabel(nextAxis)}.`);
      updateHud();
    });
  }

  elToolUnits.addEventListener('click', () => { state.tool = 'units'; updateHud(); });
  elToolTerrain.addEventListener('click', () => {
    if (state.draft.active) {
      log('Custom draft locks terrain editing.');
      updateHud();
      return;
    }
    state.tool = 'terrain';
    updateHud();
  });

  elSideBlue.addEventListener('click', () => {
    if (state.draft.active) {
      log(`Custom draft locks side to ${state.draft.side.toUpperCase()} this turn.`);
      updateHud();
      return;
    }
    state.editSide = 'blue';
    updateHud();
  });
  elSideRed.addEventListener('click', () => {
    if (state.draft.active) {
      log(`Custom draft locks side to ${state.draft.side.toUpperCase()} this turn.`);
      updateHud();
      return;
    }
    state.editSide = 'red';
    updateHud();
  });

  elTypeBtns.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-type]');
    if (!btn) return;
    state.editType = btn.dataset.type;
    if (state.editType === 'iat') state.editQuality = 'regular';
    state.editErase = false;
    updateHud();
  });

  elEraseBtn.addEventListener('click', () => { state.editErase = !state.editErase; updateHud(); });

  function setEditQualitySafe(nextQuality) {
    if (state.editType === 'iat') {
      state.editQuality = 'regular';
      updateHud();
      return;
    }
    state.editQuality = nextQuality;
    updateHud();
  }
  elQualityGreen.addEventListener('click', () => { setEditQualitySafe('green'); });
  elQualityRegular.addEventListener('click', () => { setEditQualitySafe('regular'); });
  elQualityVeteran.addEventListener('click', () => { setEditQualitySafe('veteran'); });

  elTerrainBtns.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-terrain]');
    if (!btn) return;
    state.editTerrain = btn.dataset.terrain;
    updateHud();
  });

  elVictorySel.addEventListener('change', () => {
    state.victoryMode = elVictorySel.value;
    updateHud();
  });

  if (elCommandSel) {
    elCommandSel.addEventListener('change', () => {
      state.doctrine.selectedCommandId = elCommandSel.value || '';
      if (state.doctrine.targeting.active && state.doctrine.targeting.commandId !== state.doctrine.selectedCommandId) {
        clearDoctrineTargeting();
      }
      updateHud();
    });
  }
  if (elCommandUseBtn) {
    elCommandUseBtn.addEventListener('click', () => {
      try {
        const commandId = elCommandSel?.value || '';
        if (!commandId) {
          log('Select a directive first.');
          updateHud();
          return;
        }
        if (
          state.doctrine.targeting.active &&
          state.doctrine.targeting.commandId === commandId
        ) {
          let selectedIds = Array.isArray(state.doctrine.targeting.selectedUnitIds)
            ? state.doctrine.targeting.selectedUnitIds.slice()
            : [];
          const limits = doctrineTargetLimits(commandId);
          if (limits.min > 0 && selectedIds.length === 0) {
            log(`Select at least ${limits.min} unit(s), then press Confirm Directive.`);
            updateHud();
            return;
          }
          if (selectedIds.length > 0 && selectedIds.length < limits.min) {
            log(
              `Select at least ${limits.min} unit(s) for this directive ` +
              `(${selectedIds.length} selected), then press Confirm Directive.`
            );
            updateHud();
            return;
          }
          if (onlineModeActive() && forwardOnlineAction({ type: 'command_use', commandId, selectedUnitIds: selectedIds })) return;
          confirmDoctrineTargetingOrExecute(commandId, { selectedUnitIds: selectedIds });
          return;
        }
        const limits = doctrineTargetLimits(commandId);
        const noManualTargeting = limits.min === 0 && limits.max === 0;
        if (noManualTargeting) {
          if (onlineModeActive() && forwardOnlineAction({ type: 'command_use', commandId, selectedUnitIds: [] })) return;
          const ok = issueDoctrineCommand(commandId, { selectedUnitIds: [] });
          if (!ok) {
            const cmd = COMMAND_BY_ID.get(commandId);
            log(`Directive not committed: ${cmd?.name || 'selected directive'}.`);
            updateHud();
          }
          return;
        }
        if (onlineModeActive()) {
          // Target selection is local-only until confirmation.
          beginDoctrineTargeting(commandId);
          return;
        }
        beginDoctrineTargeting(commandId);
      } catch (err) {
        log(`Directive UI error: ${err && err.message ? err.message : String(err)}`);
        updateHud();
      }
    });
  }
  if (elCommandSkipBtn) {
    elCommandSkipBtn.addEventListener('click', () => {
      if (onlineModeActive() && forwardOnlineAction({ type: 'command_skip' })) return;
      skipDoctrineCommandPhase();
    });
  }

  elEndTurnBtn.addEventListener('click', () => {
    if (onlineModeActive() && forwardOnlineAction({ type: 'end_turn' })) return;
    endTurn();
  });
  if (elLineAdvanceBtn) {
    elLineAdvanceBtn.addEventListener('click', () => {
      if (onlineModeActive() && forwardOnlineAction({ type: 'line_advance', direction: state.lineAdvanceDirection })) return;
      lineAdvanceFromSelection();
    });
  }
  if (elLineAdvanceDirSel) {
    elLineAdvanceDirSel.addEventListener('change', () => {
      state.lineAdvanceDirection = normalizeLineAdvanceDirection(elLineAdvanceDirSel.value);
      updateHud();
    });
  }

  if (elDoctrineOpenBtn) {
    elDoctrineOpenBtn.addEventListener('click', () => {
      if (state.mode === 'play') {
        log('Doctrine builder is available in Setup mode.');
        updateHud();
        return;
      }
      if (state.gameMode === 'online' && !(net.connected && net.peer)) {
        log('War Council unlocks after both online players are connected.');
        updateHud();
        return;
      }
      openDoctrineBuilder('blue');
    });
  }
  if (elDoctrineOpenTurnBtn) {
    elDoctrineOpenTurnBtn.addEventListener('click', () => {
      const side = (state.side === 'red') ? 'red' : 'blue';
      openDoctrineBuilder(side);
    });
  }
  if (elDoctrineRecommendedBtn) {
    elDoctrineRecommendedBtn.addEventListener('click', () => {
      setDoctrineLoadoutForSide('blue', makeRecommendedDoctrineLoadout(), 'recommended');
      setDoctrineLoadoutForSide('red', makeRecommendedDoctrineLoadout(), 'recommended');
      state.doctrine.builder.preBattleReady = false;
      state.doctrine.builder.confirmed = { blue: false, red: false };
      log('Applied recommended doctrine package to both sides.');
      updateHud();
    });
  }
  if (elDoctrineRandomBtn) {
    elDoctrineRandomBtn.addEventListener('click', () => {
      setDoctrineLoadoutForSide('blue', makeRandomDoctrineLoadout(), 'random');
      setDoctrineLoadoutForSide('red', makeRandomDoctrineLoadout(), 'random');
      state.doctrine.builder.preBattleReady = false;
      state.doctrine.builder.confirmed = { blue: false, red: false };
      log('Applied random doctrine packages to both sides.');
      updateHud();
    });
  }
  if (elDoctrineBlankBtn) {
    elDoctrineBlankBtn.addEventListener('click', () => {
      clearDoctrineLoadoutForSide('blue', 'blank');
      clearDoctrineLoadoutForSide('red', 'blank');
      state.doctrine.builder.preBattleReady = false;
      state.doctrine.builder.confirmed = { blue: false, red: false };
      log('Cleared doctrine selections for both sides. Pick 3 commands in each cost tier.');
      updateHud();
    });
  }
  if (elDoctrineScenarioBtn) {
    elDoctrineScenarioBtn.addEventListener('click', () => {
      const scenarioName = elScenarioSel?.value || state.loadedScenarioName || '';
      setDoctrineLoadoutForSide('blue', scenarioDoctrinePreset(scenarioName, 'blue'), 'scenario');
      setDoctrineLoadoutForSide('red', scenarioDoctrinePreset(scenarioName, 'red'), 'scenario');
      state.doctrine.builder.preBattleReady = false;
      state.doctrine.builder.confirmed = { blue: false, red: false };
      log(`Applied scenario doctrine preset for "${scenarioName}".`);
      updateHud();
    });
  }
  if (elCloseDoctrineBtn) {
    elCloseDoctrineBtn.addEventListener('click', closeDoctrineBuilder);
  }
  if (elDoctrineSideSel) {
    elDoctrineSideSel.addEventListener('change', () => {
      state.doctrine.builder.side = (elDoctrineSideSel.value === 'red') ? 'red' : 'blue';
      renderDoctrineBuilder();
    });
  }
  if (elDoctrineRandomizeBtn) {
    elDoctrineRandomizeBtn.addEventListener('click', () => {
      const side = state.doctrine.builder.side === 'red' ? 'red' : 'blue';
      setDoctrineBuilderDraft(side, makeRandomDoctrineLoadout());
      renderDoctrineBuilder();
    });
  }
    if (elDoctrineRecommendBtn) {
    elDoctrineRecommendBtn.addEventListener('click', () => {
      const side = state.doctrine.builder.side === 'red' ? 'red' : 'blue';
      setDoctrineBuilderDraft(side, buildCompleteDoctrineLoadout(makeRecommendedDoctrineLoadout()));
      renderDoctrineBuilder();
    });
  }
  if (elDoctrineBlankizeBtn) {
    elDoctrineBlankizeBtn.addEventListener('click', () => {
      const side = state.doctrine.builder.side === 'red' ? 'red' : 'blue';
      setDoctrineBuilderDraft(side, []);
      renderDoctrineBuilder();
    });
  }
  if (elDoctrineScenarioApplyBtn) {
    elDoctrineScenarioApplyBtn.addEventListener('click', () => {
      const side = state.doctrine.builder.side === 'red' ? 'red' : 'blue';
      const scenarioName = elScenarioSel?.value || state.loadedScenarioName || '';
      setDoctrineBuilderDraft(side, buildCompleteDoctrineLoadout(scenarioDoctrinePreset(scenarioName, side)));
      renderDoctrineBuilder();
    });
  }
  for (const el of [elDoctrineCost1List, elDoctrineCost2List, elDoctrineCost3List]) {
    if (!el) continue;
    el.addEventListener('click', (evt) => {
      if (evt.target instanceof HTMLInputElement) return;
      const node = evt.target instanceof Element ? evt.target.closest('[data-doctrine-item][data-doctrine-id]') : null;
      if (!node) return;
      const cid = node.getAttribute('data-doctrine-id') || '';
      if (!cid || !COMMAND_BY_ID.get(cid)) return;
      state.doctrine.builder.focusCommandId = cid;
      // Do not re-render the full lists here; that can swallow pending label->checkbox toggles.
      renderDoctrineBuilderFocusOnly();
    });
    el.addEventListener('change', (evt) => {
      const input = evt.target;
      if (!(input instanceof HTMLInputElement)) return;
      const commandId = input.dataset.doctrineId;
      if (!commandId) return;
      const side = state.doctrine.builder.side === 'red' ? 'red' : 'blue';
      doctrineBuilderToggle(side, commandId, !!input.checked);
    });
  }
  if (elDoctrineConfirmBtn) {
    elDoctrineConfirmBtn.addEventListener('click', () => {
      const side = state.doctrine.builder.side === 'red' ? 'red' : 'blue';
      if (!applyDoctrineFromBuilder(side)) return;
      if (!doctrineBothSidesConfirmed()) {
        const next = state.doctrine.builder.confirmed.blue ? 'red' : 'blue';
        state.doctrine.builder.side = next;
        if (elDoctrineSideSel) elDoctrineSideSel.value = next;
        log(`War Council: ${side.toUpperCase()} confirmed. Confirm ${next.toUpperCase()} to finalize orders.`);
        renderDoctrineBuilder();
        return;
      }
      state.doctrine.builder.preBattleReady = true;
      log('War Council finalized for both sides.');
      closeDoctrineBuilder();
      if (state.mode === 'edit') enterPlay();
    });
  }

  if (elClearUnitsBtn) {
    elClearUnitsBtn.addEventListener('click', () => { enterEdit(); clearUnits(); });
  }

  if (elScenarioSel) {
    elScenarioSel.addEventListener('change', () => {
      const next = elScenarioSel.value;
      updateScenarioSidesLegend(next);
      if (state.mode === 'edit' && next) {
        loadScenario(next);
      }
    });
  }

  if (elLoadScenarioBtn) {
    elLoadScenarioBtn.addEventListener('click', () => { loadScenario(elScenarioSel.value); });
  }

  if (elDraftModeSel) {
    elDraftModeSel.addEventListener('change', () => {
      elDraftModeSel.value = normalizeDraftMode(elDraftModeSel.value);
      updateHud();
    });
  }

  if (elDraftBudgetInput) {
    elDraftBudgetInput.addEventListener('change', () => {
      elDraftBudgetInput.value = String(parseDraftBudget(elDraftBudgetInput.value));
      updateHud();
    });
  }

  if (elStartDraftBtn) {
    elStartDraftBtn.addEventListener('click', startCustomDraftSetup);
  }

  if (elDraftDoneBtn) {
    elDraftDoneBtn.addEventListener('click', () => {
      if (!state.draft.active) return;
      finishDraftForCurrentSide(true);
    });
  }

  if (elExportStateBtn) {
    elExportStateBtn.addEventListener('click', exportStateToFile);
  }

  if (elImportStateBtn && elStateFileInput) {
    elImportStateBtn.addEventListener('click', () => {
      elStateFileInput.value = '';
      elStateFileInput.click();
    });

    elStateFileInput.addEventListener('change', (e) => {
      const file = e.target?.files?.[0];
      if (!file) return;
      importStateFromFile(file);
      e.target.value = '';
    });
  }

  for (const filterEl of [elScenarioGroupSel, elScenarioLessonSel, elScenarioSizeSel, elScenarioTerrainSel]) {
    if (!filterEl) continue;
    filterEl.addEventListener('change', () => {
      populateScenarioSelect();
      updateHud();
    });
  }

  // --- Populate scenario & victory dropdowns
  function populateFilterSelect(el, options) {
    if (!el) return;
    const prev = el.value;
    el.innerHTML = '';
    for (const o of options) {
      const opt = document.createElement('option');
      opt.value = o.id;
      opt.textContent = o.label;
      el.appendChild(opt);
    }
    if (prev && [...el.options].some(o => o.value === prev)) el.value = prev;
    else el.value = 'all';
  }

  function populateScenarioFilters() {
    populateFilterSelect(elScenarioGroupSel, SCENARIO_FILTER_OPTIONS.group);
    populateFilterSelect(elScenarioLessonSel, SCENARIO_FILTER_OPTIONS.lesson);
    populateFilterSelect(elScenarioSizeSel, SCENARIO_FILTER_OPTIONS.size);
    populateFilterSelect(elScenarioTerrainSel, SCENARIO_FILTER_OPTIONS.terrain);
  }

  function readFilterValue(el, key) {
    const v = el?.value || 'all';
    return SCENARIO_FILTER_IDS[key].has(v) ? v : 'all';
  }

  function readScenarioFilters() {
    return {
      group: readFilterValue(elScenarioGroupSel, 'group'),
      lesson: readFilterValue(elScenarioLessonSel, 'lesson'),
      size: readFilterValue(elScenarioSizeSel, 'size'),
      terrain: readFilterValue(elScenarioTerrainSel, 'terrain'),
    };
  }

  function scenarioGroupTag(name) {
    const meta = scenarioMetadata(name);
    if (meta.group && SCENARIO_FILTER_IDS.group.has(meta.group)) return meta.group;
    if (name.startsWith('Demo ')) return 'demo';
    if (name.startsWith('Grand ')) return 'grand';
    if (name.startsWith('Terrain ')) return 'terrain';
    if (name.startsWith('Berserker ')) return 'berserker';
    return 'other';
  }

  function scenarioSizeTag(totalUnits) {
    if (totalUnits <= 20) return 'small';
    if (totalUnits <= 50) return 'medium';
    return 'large';
  }

  function scenarioTerrainTag(sc) {
    const tags = new Set();
    for (const t of (sc.terrain || [])) {
      if (TERRAIN_IDS.has(t.terrain) && t.terrain !== 'clear') tags.add(t.terrain);
    }
    if (tags.size === 0) return 'open';
    if (tags.size === 1) return [...tags][0];
    return 'mixed';
  }

  function scenarioLessonTag(name, group, terrainTag) {
    const n = name.toLowerCase();
    if (group === 'tutorial' || group === 'demo') return 'general';
    if (group === 'terrain' || terrainTag === 'mixed' || (terrainTag !== 'open' && /terrain|marsh|woods|ridge|broken ground/.test(n))) {
      return 'terrain';
    }
    if (/river|ford/.test(n)) return 'river';
    if (/corridor|pass/.test(n)) return 'corridor';
    if (/screen|skirmisher/.test(n)) return 'screen';
    if (/envelopment|encircle|crescent|flank|wedge|wide wings|columns/.test(n)) return 'envelopment';
    if (/center|push/.test(n)) return 'center';
    if (/line|checkerboard/.test(n)) return 'lines';
    return 'general';
  }

  function scenarioMeta(name) {
    const sc = scenarioRecord(name) || { terrain: [], units: [] };
    const meta = scenarioMetadata(name);
    const totalUnits = Array.isArray(sc.units) ? sc.units.length : 0;
    const group = scenarioGroupTag(name);
    const terrain = scenarioTerrainTag(sc);
    const size = scenarioSizeTag(totalUnits);
    const lesson = scenarioLessonTag(name, group, terrain);
    return {
      group,
      lesson,
      size,
      terrain,
      totalUnits,
      description: meta.description || '',
      historical: meta.historical || '',
      notes: meta.notes || '',
      objectives: Array.isArray(meta.objectives) ? meta.objectives.length : 0,
    };
  }

  function scenarioMatchesFilters(meta, filters) {
    if (filters.group !== 'all' && meta.group !== filters.group) return false;
    if (filters.lesson !== 'all' && meta.lesson !== filters.lesson) return false;
    if (filters.size !== 'all' && meta.size !== filters.size) return false;
    if (filters.terrain !== 'all' && meta.terrain !== filters.terrain) return false;
    return true;
  }

  function scenarioHistoricalSortValue(historicalText) {
    const txt = String(historicalText || '').trim().toUpperCase();
    if (!txt) return Number.POSITIVE_INFINITY;
    const m = txt.match(/(\d{1,4})\s*(BCE|BC|CE|AD)?/);
    if (!m) return Number.POSITIVE_INFINITY;
    const year = Number(m[1]);
    const era = m[2] || 'CE';
    if (!Number.isFinite(year)) return Number.POSITIVE_INFINITY;
    if (era === 'BCE' || era === 'BC') return -year;
    return year;
  }

  function scenarioSortRank(name, meta) {
    const groupRank = {
      tutorial: 0,
      demo: 1,
      grand: 2,
      terrain: 3,
      berserker: 4,
      other: 5,
      history: 6,
    };
    return {
      group: groupRank[meta.group] ?? 9,
      historyYear: scenarioHistoricalSortValue(meta.historical),
      name: String(name || ''),
    };
  }

  function populateScenarioSelect() {
    const prev = elScenarioSel.value;
    const filters = readScenarioFilters();
    elScenarioSel.innerHTML = '';

    let shown = 0;
    const names = Object.keys(SCENARIOS).sort((a, b) => {
      const ma = scenarioMeta(a);
      const mb = scenarioMeta(b);
      const ra = scenarioSortRank(a, ma);
      const rb = scenarioSortRank(b, mb);
      if (ra.group !== rb.group) return ra.group - rb.group;
      if (ma.group === 'history' && ra.historyYear !== rb.historyYear) return ra.historyYear - rb.historyYear;
      return ra.name.localeCompare(rb.name);
    });
    for (const name of names) {
      const meta = scenarioMeta(name);
      if (!scenarioMatchesFilters(meta, filters)) continue;

      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      const historyTag = meta.historical ? ` · Era=${meta.historical}` : '';
      const objectiveTag = (meta.objectives > 0) ? ` · Objectives=${meta.objectives}` : '';
      opt.title = `Group=${meta.group} · Lesson=${meta.lesson} · Size=${meta.size} · Map=${meta.terrain}${historyTag}${objectiveTag}`;
      elScenarioSel.appendChild(opt);
      shown += 1;
    }

    if (shown === 0) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = 'No scenarios match filters';
      opt.disabled = true;
      opt.selected = true;
      elScenarioSel.appendChild(opt);
      elScenarioSel.disabled = true;
      if (elLoadScenarioBtn) elLoadScenarioBtn.disabled = true;
      return;
    }

    elScenarioSel.disabled = false;
    if (elLoadScenarioBtn) elLoadScenarioBtn.disabled = false;

    if (prev && [...elScenarioSel.options].some(o => o.value === prev)) {
      elScenarioSel.value = prev;
      return;
    }

    if ([...elScenarioSel.options].some(o => o.value === 'Empty (Island)')) {
      elScenarioSel.value = 'Empty (Island)';
    } else {
      elScenarioSel.value = elScenarioSel.options[0].value;
    }
  }

  function populateVictorySelect() {
    elVictorySel.innerHTML = '';
    const modes = [
      { id: 'clear', label: 'Proportional Victory (halve own UP target)' },
      { id: 'points', label: 'Point Victory (captured UP target)' },
      { id: 'decapitation', label: 'Decapitation (kill all generals)' },
      { id: 'annihilation', label: 'Annihilation (kill all units)' },
    ];
    for (const m of modes) {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = m.label;
      elVictorySel.appendChild(opt);
    }
    elVictorySel.value = 'decapitation';
    state.victoryMode = 'decapitation';
  }

  // Browsers gate WebAudio until a user gesture. Unlock once and keep it active.
  window.addEventListener('pointerdown', unlockBattleSfx, { capture: true, once: true });
  window.addEventListener('keydown', unlockBattleSfx, { capture: true, once: true });

  function boot() {
    initPanelCollapseControls();
    resetDraftState({ keepBudget: false });
    populateScenarioFilters();
    populateVictorySelect();
    renderRulesCommandsGuide();
    pruneLegacyUiSurface();
    const randomScenario = installRandomStartupScenario();
    populateScenarioSelect();
    if (elDraftModeSel) elDraftModeSel.value = 'off';
    if (elDraftBudgetInput) elDraftBudgetInput.value = String(state.draft.budget);

    if ([...elScenarioSel.options].some(o => o.value === RANDOM_START_SCENARIO_NAME)) {
      elScenarioSel.value = RANDOM_START_SCENARIO_NAME;
    }

    loadScenario(RANDOM_START_SCENARIO_NAME);
    enterEdit();
    setIntroTutorialOpen(false);

    if (ORDER_ATLAS_MODE) {
      setIntroOverlayOpen(false);
      openDoctrineBuilder('blue');
    } else {
      setIntroOverlayOpen(true);
    }

    const biasLabel = (randomScenario.advantageSide === 'none')
      ? 'balanced'
      : `${randomScenario.advantageSide} flank bias`;
    const bootModeLabel = ORDER_ATLAS_MODE
      ? 'Orders Atlas mode ready: War Council opens directly for directive preview review.'
      : 'Intro menu ready: choose Play Now, Game Setup, or Tutorial.';

    log(
      `Booted ${GAME_NAME}. Randomized startup loaded ` +
      `(units=${randomScenario.units.length}, perSide=${randomScenario.unitsPerSide || Math.floor(randomScenario.units.length / 2)}, terrain=${randomScenario.terrain.length}, ` +
      `axis=${forwardAxisLabel(randomScenario.axis)}, ${biasLabel}, ` +
      `formations=B:${randomScenario.blueArchetype || 'line'} / R:${randomScenario.redArchetype || 'line'}). ` +
      bootModeLabel
    );
    updateHud();
    resize();
  }

  boot();
})();
