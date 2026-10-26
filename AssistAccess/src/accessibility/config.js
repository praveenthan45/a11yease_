/**
 * Configuration for the accessibility module.
 *
 * The host app (or a teammate's toolbar) passes a partial config; everything is
 * normalised and validated here so that no other file has to defend against
 * malformed input. Unknown keys are ignored with a development warning.
 */

import { STORAGE_NAMESPACE } from './constants.js';

/** Where CSS filters are applied. 'document' is the safe default (see applyVisual). */
export const VISUAL_TARGETS = Object.freeze(['document', 'contentRoot']);

/** Supported settings storage backends. */
export const STORAGE_MODES = Object.freeze(['auto', 'local', 'session', 'memory']);

/** Corner presets for the launcher/panel placement. */
export const CORNERS = Object.freeze([
  'right-middle',
  'bottom-right',
  'bottom-left',
  'top-right',
  'top-left',
]);

export const defaultConfig = Object.freeze({
  /** Selector for "the website content" when a content-scoped feature needs it. */
  contentRoot: null,
  /** Element the toolbar host is appended to. Defaults to document.body. */
  mountTarget: null,
  /** Prefix for persisted settings keys. */
  storageKeyPrefix: STORAGE_NAMESPACE,
  /** Storage backend: 'auto' probes local → session → memory. */
  storage: 'auto',
  /**
   * 'auto'      – the user chooses inside the panel (default: whole page).
   * 'document'  – pin filters to the document root (safe for fixed positioning).
   * 'contentRoot' – pin filters to the resolved content root (opt-in; see docs).
   */
  visualTarget: 'auto',
  /** Apply the same visual filters to an integrated toolbar when requested. */
  visualAffectsToolbar: false,
  /** Launcher/panel placement. */
  position: Object.freeze({
    /** 'right-middle' pins the circular launcher to the right edge, vertically centred. */
    corner: 'right-middle',
    offsetX: 8,
    offsetY: 16,
  }),
  /** Locale tag (currently informational; all copy lives in strings.js). */
  locale: 'en',
  /** Partial copy overrides merged over strings.js. */
  strings: null,
  /** Partial design-token overrides (CSS custom properties). */
  theme: null,
  /** Let the module announce its own state changes through the live regions. */
  announce: true,
  /** Called with (settings, meta) after every settings change. */
  onSettingsChange: null,
  /** Called with each flash-guard finding. */
  onFinding: null,
  /** Extra development logging. */
  debug: false,
  /** Feature switches: { enabled: [...] | null, disabled: [...] }. */
  features: Object.freeze({ enabled: null, disabled: [] }),
  /**
   * Extra accessibility profiles, or overrides of the built-in ones.
   * Shape: [{ id, label, description?, patch }] where `patch` names settings keys
   * from the patchable groups (visual, motion, reader, forms, ui). Reusing a built-in
   * id (default, reducedMotion, lowStimulation, enhancedContrast) replaces it.
   */
  profiles: Object.freeze([]),
  /** Opt-in server-backed image alt suggestions and corrections. See ALT-TEXT-INTEGRATION.md. */
  altText: Object.freeze({
    enabled: false,
    siteId: '',
    endpoint: '/api/assistaccess/alt-text',
    getToken: null,
    allowExternalProcessing: false,
    disclosure: '',
    persistence: Object.freeze({ enabled: false, autoApply: false, canWrite: false }),
  }),
});

function warn(message) {
  if (typeof console !== 'undefined' && console.warn) {
    console.warn(`[accessibility] ${message}`);
  }
}

/**
 * Merge and validate a partial config.
 * @param {object} [input]
 * @returns {typeof defaultConfig}
 */
export function normalizeConfig(input) {
  const source = input && typeof input === 'object' ? input : {};
  const config = { ...defaultConfig, ...source };

  config.position = { ...defaultConfig.position, ...(source.position || {}) };
  config.features = { ...defaultConfig.features, ...(source.features || {}) };
  config.altText = {
    ...defaultConfig.altText,
    ...(source.altText || {}),
    persistence: { ...defaultConfig.altText.persistence, ...(source.altText?.persistence || {}) },
  };

  if (!STORAGE_MODES.includes(config.storage)) {
    warn(`unknown storage mode "${config.storage}", falling back to "auto"`);
    config.storage = 'auto';
  }

  if (config.visualTarget !== 'auto' && !VISUAL_TARGETS.includes(config.visualTarget)) {
    warn(`unknown visualTarget "${config.visualTarget}", falling back to "auto"`);
    config.visualTarget = 'auto';
  }

  if (!CORNERS.includes(config.position.corner)) {
    warn(`unknown corner "${config.position.corner}", falling back to "right-middle"`);
    config.position.corner = 'right-middle';
  }

  if (source.profiles !== undefined && !Array.isArray(source.profiles)) {
    warn('config.profiles must be an array of { id, label, patch }; the value was ignored');
    config.profiles = [];
  }

  config.position.offsetX = Number.isFinite(Number(config.position.offsetX))
    ? Math.max(0, Number(config.position.offsetX))
    : defaultConfig.position.offsetX;
  config.position.offsetY = Number.isFinite(Number(config.position.offsetY))
    ? Math.max(0, Number(config.position.offsetY))
    : defaultConfig.position.offsetY;

  if (source.debug) {
    const known = new Set(Object.keys(defaultConfig));
    Object.keys(source).forEach((key) => {
      if (!known.has(key)) warn(`unknown config key "${key}" was ignored`);
    });
  }

  return config;
}

/**
 * Is a feature enabled by configuration?
 * @param {object} config normalised config
 * @param {string} featureId
 */
export function isFeatureEnabled(config, featureId) {
  const { enabled, disabled } = config.features || {};
  if (Array.isArray(disabled) && disabled.includes(featureId)) return false;
  if (Array.isArray(enabled)) return enabled.includes(featureId);
  return true;
}
