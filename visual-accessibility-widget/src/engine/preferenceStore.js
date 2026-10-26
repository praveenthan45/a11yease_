import { COLOR_MODES } from '../colorVision/colorModes.js';
export const MIN_FONT_SCALE = 0.5;
export const MAX_FONT_SCALE = 2;
export const maskSizeLimit = () => 540;

export const DEFAULT_SETTINGS = Object.freeze({
  fontScale: 1, theme: 'default', grayscale: false, colorVisionMode: 'default',
  spacingPreset: 'default', letterSpacing: 0, wordSpacing: 0, lineHeight: 1.5, paragraphSpacing: 0,
  customSpacingOverrides: Object.freeze([]),
  magnifier: false, zoomLevel: 1.5, highlightLinks: false, dyslexiaFont: false,
  readingGuide: false, guideHeight: 8, readingMask: false, maskHeight: 120,
});

export const SPACING_PRESETS = Object.freeze({
  default: { letterSpacing: 0, wordSpacing: 0, lineHeight: 1.5, paragraphSpacing: 0 },
  comfortable: { letterSpacing: 0.06, wordSpacing: 0.12, lineHeight: 1.7, paragraphSpacing: 1 },
  wide: { letterSpacing: 0.12, wordSpacing: 0.16, lineHeight: 2, paragraphSpacing: 2 },
});

const CUSTOM_SPACING_FIELDS = Object.freeze(['lineHeight', 'letterSpacing', 'paragraphSpacing']);
const ranges = { fontScale: [MIN_FONT_SCALE, MAX_FONT_SCALE], letterSpacing: [0, 0.2], wordSpacing: [0, 0.4], lineHeight: [1.2, 2.5], paragraphSpacing: [0, 3], guideHeight: [2, 24], maskHeight: [60, 540] };
const enums = { theme: ['default', 'light', 'dark', 'contrast'], colorVisionMode: COLOR_MODES.map(mode => mode.id), spacingPreset: ['default', 'comfortable', 'wide', 'custom'], zoomLevel: [1.5] };

export function normalizeSettings(input = {}) {
  const settings = { ...DEFAULT_SETTINGS };
  if (!input || typeof input !== 'object') return settings;
  for (const key of Object.keys(settings)) {
    const value = input[key];
    if (key === 'customSpacingOverrides' && Array.isArray(value)) {
      settings[key] = [...new Set(value.filter(field => CUSTOM_SPACING_FIELDS.includes(field)))];
    } else if (key in ranges && typeof value === 'number' && Number.isFinite(value)) {
      const [min, max] = ranges[key];
      // Font sizes use whole 10-percentage-point steps, including saved/API values.
      const precision = key === 'fontScale' ? 10 : 100;
      settings[key] = Math.round(Math.max(min, Math.min(max, value)) * precision) / precision;
    } else if (key in enums && enums[key].includes(value)) settings[key] = value;
    else if (typeof settings[key] === 'boolean' && typeof value === 'boolean') settings[key] = value;
  }
  if (settings.spacingPreset === 'custom' && !Array.isArray(input.customSpacingOverrides)) {
    settings.customSpacingOverrides = Object.keys(SPACING_PRESETS.default).filter(key => settings[key] !== DEFAULT_SETTINGS[key]);
  }
  if (input.maskFullScreen === true) settings.maskHeight = 540;
  return settings;
}

export function createPreferenceStore(key = 'uaw:preferences:v1', storage) {
  function getStorage() { return storage === undefined ? window.localStorage : storage; }
  return {
    load() {
      try {
        const saved = JSON.parse(getStorage().getItem(key));
        return normalizeSettings(saved?.version === 1 ? saved.settings : {});
      } catch { return { ...DEFAULT_SETTINGS }; }
    },
    save(settings) {
      try { getStorage().setItem(key, JSON.stringify({ version: 1, settings: normalizeSettings(settings) })); return true; }
      catch { return false; }
    },
  };
}
