/**
 * Visual presets — starting points, not diagnoses.
 *
 * Each preset is a partial patch: values it does not mention keep their current
 * setting, so "Brighter" does not silently reset saturation. Every preset
 * stays inside the ranges from settingsSchema.js, so no preset can push the page
 * into unreadable territory.
 */

import { VISUAL_DEFAULTS } from '../../core/settingsSchema.js';

export const VISUAL_PRESETS = Object.freeze([
  {
    id: 'default',
    label: 'Default',
    description: 'No visual adjustment.',
    values: { ...VISUAL_DEFAULTS },
  },
  {
    id: 'brighter',
    label: 'Brighter',
    description: 'Brightness 125%.',
    values: { brightness: 125 },
  },
  {
    id: 'dimmer',
    label: 'Dimmer',
    description: 'Brightness 85%.',
    values: { brightness: 85 },
  },
  {
    id: 'muted',
    label: 'Muted colours',
    description: 'Saturation 60%.',
    values: { saturation: 60 },
  },
]);

/** Full value set a preset produces. */
export function resolvePresetValues(preset) {
  return { ...VISUAL_DEFAULTS, ...(preset.values || {}) };
}

/**
 * Which preset (if any) matches the current values.
 * @returns {string} preset id or 'custom'
 */
export function matchPresetId(values, preferredId) {
  const preferred=VISUAL_PRESETS.find(preset=>preset.id===preferredId);
  // Presets are partial patches. Selecting Muted after Brighter must keep the
  // selected indicator without silently resetting the visitor's brightness.
  if(preferred&&Object.entries(preferred.values).every(([key,value])=>values[key]===value))return preferred.id;
  const found = VISUAL_PRESETS.find((preset) => {
    const resolved = resolvePresetValues(preset);
    return (
      resolved.brightness === values.brightness &&
      resolved.contrast === values.contrast &&
      resolved.saturation === values.saturation
    );
  });
  return found ? found.id : 'custom';
}
