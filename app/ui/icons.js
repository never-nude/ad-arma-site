((root, factory) => {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.AdArmaIconHelper = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, (root) => {
  'use strict';

  const UNIT_ICON_TUNE = Object.freeze({
    arc: { scale: 1.12, y: -0.08 },
    inf: { scale: 0.95, y: 0, rot: -0.616 },
    skr: { scale: 0.95, y: 0 },
    cav: { scale: 0.95, y: 0 },
  });

  function normalizeAssetBase(base) {
    const raw = String(base || '/assets/');
    return raw.endsWith('/') ? raw : `${raw}/`;
  }

  function resolveBuildId(options = {}) {
    return (
      options.buildId ||
      root.AD_ARMA_BUILD_ID ||
      root.POLEMO_BUILD_ID ||
      root.POLEMO_BUILD ||
      'DEV'
    );
  }

  function createUnitIconHelper(options = {}) {
    const assetBase = normalizeAssetBase(options.assetBase || root.AD_ARMA_BUILD?.assetBase || '/assets/');
    const buildId = resolveBuildId(options);
    const unitIconSources = Object.freeze({
      arc: `${assetBase}icon_arc.png`,
      inf: `${assetBase}icon_inf.png`,
      skr: `${assetBase}icon_skr.png`,
      cav: `${assetBase}icon_cav.png`,
    });
    const icons = {};

    function loadUnitIcons(onReady) {
      const entries = Object.entries(unitIconSources);
      let remaining = entries.length;
      const finish = () => {
        remaining -= 1;
        if (remaining <= 0 && typeof onReady === 'function') onReady();
      };

      for (const [type, src] of entries) {
        const img = new Image();
        img.onload = finish;
        img.onerror = finish;
        img.src = `${src}?v=${encodeURIComponent(buildId)}`;
        icons[type] = img;
      }
    }

    function unitIconReady(type) {
      const img = icons[type];
      return !!(img && img.complete && img.naturalWidth > 0);
    }

    function drawFallbackText(ctx, symbol, cx, cy, radius, options = {}) {
      const textScale = Number.isFinite(options.textScale) ? options.textScale : 1;
      const fontPx = Math.max(10, Math.floor(radius * 0.58 * textScale));
      const fontFamily = options.fontFamily || 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
      ctx.font = `700 ${fontPx}px ${fontFamily}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = options.fillStyle || '#fff';
      ctx.fillText(symbol, cx, cy + (options.yOffset || 1));
    }

    function drawUnitGlyph(ctx, type, cx, cy, radius, options = {}) {
      if (!ctx || !type) return false;
      if (type === 'run' && typeof options.drawRunnerGlyph === 'function') {
        options.drawRunnerGlyph(cx, cy, options.runnerSize || (radius * 0.82));
        return true;
      }

      const canIcon = (type !== 'gen') && unitIconReady(type);
      if (canIcon) {
        const img = icons[type];
        const tune = UNIT_ICON_TUNE[type] || { scale: 0.95, y: 0 };
        const base = radius * (Number.isFinite(options.baseScale) ? options.baseScale : 0.95);
        const size = Math.floor(base * (tune.scale || 0.95));
        const yOffset = Math.floor(radius * (tune.y || 0));
        const rot = (typeof tune.rot === 'number') ? tune.rot : 0;
        ctx.imageSmoothingEnabled = true;
        if (rot) {
          ctx.save();
          ctx.translate(Math.floor(cx), Math.floor(cy + yOffset));
          ctx.rotate(rot);
          ctx.drawImage(img, Math.floor(-size / 2), Math.floor(-size / 2), size, size);
          ctx.restore();
        } else {
          ctx.drawImage(img, Math.floor(cx - size / 2), Math.floor(cy - size / 2 + yOffset), size, size);
        }
        return true;
      }

      if (typeof options.drawFallbackText === 'function') {
        options.drawFallbackText(ctx, cx, cy, radius);
        return false;
      }

      drawFallbackText(ctx, options.fallbackSymbol || '?', cx, cy, radius, {
        textScale: options.textScale,
        fontFamily: options.fontFamily,
        fillStyle: options.fillStyle,
        yOffset: options.textYOffset,
      });
      return false;
    }

    return {
      UNIT_ICON_TUNE,
      UNIT_ICONS: icons,
      unitIconSources,
      loadUnitIcons,
      unitIconReady,
      drawUnitGlyph,
    };
  }

  return {
    UNIT_ICON_TUNE,
    createUnitIconHelper,
  };
});
