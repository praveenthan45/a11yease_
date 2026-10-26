/**
 * Visual adjustment applier: brightness, contrast, saturation.
 *
 * How it stays out of the toolbar's own way
 * -----------------------------------------
 * The filter is written as an inline `filter` on the element the user chose
 * (the document root by default) and composed with whatever inline filter was
 * already there — so a teammate's inline filter is never lost.
 *
 * A CSS filter on the *document root element* does not create a containing block
 * for fixed/absolute descendants (Filter Effects spec), which is why the default
 * target is <html>: fixed headers, sticky sidebars and modals inside the app keep
 * working. Filtering a non-root element does create a containing block, which is
 * why the content-root mode is opt-in and warned about in the panel.
 *
 * Because the page root is an ancestor of the toolbar host, the toolbar is
 * counter-filtered with the exact inverse of the applied filters
 * (brightness/contrast/saturate compose multiplicatively, so the toolbar renders
 * at its true colours). The one honest exception: a fully desaturated page cannot
 * be re-saturated for the toolbar — the colour information is already gone.
 */

import { DATA_ATTRS } from '../../constants.js';
import { getFilterMultipliers, isVisualNeutral } from '../settingsSchema.js';
import { getToolbarHost } from '../dom/domPatches.js';
import { resolveTargetRoot } from '../dom/domScope.js';

function format(value) {
  return String(Math.round(value * 1000) / 1000);
}

/** CSS filter list for the page content. Empty string when nothing to apply. */
export function buildFilterString(multipliers) {
  const parts = [];
  if (multipliers.brightness !== 1) parts.push(`brightness(${format(multipliers.brightness)})`);
  if (multipliers.contrast !== 1) parts.push(`contrast(${format(multipliers.contrast)})`);
  if (multipliers.saturation !== 1) parts.push(`saturate(${format(multipliers.saturation)})`);
  return parts.join(' ');
}

/**
 * Inverse filter list for the toolbar host. Saturate(0) has no inverse, so a
 * grayscale page leaves the toolbar grayscale too (text contrast is unaffected).
 */
export function buildInverseFilterString(multipliers) {
  const parts = [];
  if (multipliers.brightness !== 1 && multipliers.brightness > 0) {
    parts.push(`brightness(${format(1 / multipliers.brightness)})`);
  }
  if (multipliers.contrast !== 1 && multipliers.contrast > 0) {
    parts.push(`contrast(${format(1 / multipliers.contrast)})`);
  }
  if (multipliers.saturation !== 1 && multipliers.saturation > 0) {
    parts.push(`saturate(${format(1 / multipliers.saturation)})`);
  }
  return parts.join(' ');
}

export function createVisualApplier() {
  /** @type {{root: Element|null, previousInlineFilter: string, signature: string|null}} */
  let state = { root: null, previousInlineFilter: '', signature: null };

  function clearHostCounterFilter() {
    const host = getToolbarHost();
    if (host && host.style.filter) host.style.filter = '';
  }

  /** Remove every effect this applier added and restore the previous inline filter. */
  function restore() {
    if (state.root) {
      state.root.style.filter = state.previousInlineFilter;
      if (state.root.getAttribute(DATA_ATTRS.VISUALS) !== null) {
        state.root.removeAttribute(DATA_ATTRS.VISUALS);
      }
    }
    clearHostCounterFilter();
    state = { root: null, previousInlineFilter: '', signature: null };
  }

  /**
   * @param {object} options
   * @param {object} options.settings full settings object
   * @param {string|null} [options.contentRootSelector]
   * @param {'auto'|'document'|'contentRoot'} [options.forcedTarget] from config
   */
  function apply({ settings, contentRootSelector = null, forcedTarget = 'auto', affectToolbar = false } = {}) {
    if (typeof document === 'undefined') return;
    const visual = settings.visual;

    if (!visual.enabled || isVisualNeutral(visual)) {
      restore();
      return;
    }

    const root = resolveTargetRoot({
      settingTarget: visual.target,
      forcedTarget,
      contentRootSelector,
    });
    if (!root) {
      restore();
      return;
    }

    const multipliers = getFilterMultipliers(visual);
    const filter = buildFilterString(multipliers);
    if (!filter) {
      restore();
      return;
    }

    if (state.root !== root) {
      restore();
      state.root = root;
      state.previousInlineFilter = root.style.filter || '';
    }

    const composed = [state.previousInlineFilter, filter].filter(Boolean).join(' ');
    const signature = `${composed}|${root === document.documentElement ? 'document' : 'root'}`;

    if (state.signature !== signature) {
      root.style.filter = composed;
      root.setAttribute(DATA_ATTRS.VISUALS, 'on');
      state.signature = signature;
    }

    // Integrated toolbars can follow the user's filters too. Copy the filter
    // only when outside the filtered subtree, so it is never applied twice.
    const host = getToolbarHost();
    if (host) {
      const hostIsInsideScope = root === host || (typeof root.contains === 'function' && root.contains(host));
      const inverse = affectToolbar ? (hostIsInsideScope ? '' : filter) : (hostIsInsideScope ? buildInverseFilterString(multipliers) : '');
      if ((host.style.filter || '') !== inverse) host.style.filter = inverse;
    }
  }

  return {
    apply,
    cleanup: restore,
    getState: () => ({ root: state.root, filter: state.signature }),
  };
}
