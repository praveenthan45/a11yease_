import React, { useId, useState } from 'react';

import { useForcedColors } from '../../core/a11y/mediaQueries.js';
import { VISUAL_RANGES } from '../../core/settingsSchema.js';
import { useA11ySettings } from '../../core/SettingsContext.jsx';
import { formatMessage } from '../../strings.js';
import { createStorage } from '../../core/storage.js';
import SliderControl from '../../ui/SliderControl.jsx';
import Switch from '../../ui/Switch.jsx';
import { matchPresetId, VISUAL_PRESETS } from './presets.js';

/**
 * Feature 2 — Brightness / colour intensity adjustment.
 *
 * Scope of the feature, stated in the UI as well as in the code:
 *  - It changes how the current device renders the page. It does not change the
 *    website and cannot make a site meet WCAG contrast requirements.
 *  - Values are bounded (brightness/contrast 50–150%, saturation 0–200%) so the
 *    page cannot be pushed into an unreadable state by accident, and there is
 *    always a single reset control.
 *  - The toolbar's own chrome is counter-filtered by the applier, so these
 *    controls do not make the toolbar itself unreadable.
 */
export default function VisualsPanel({compact=false}) {
  const { settings, actions, config, strings } = useA11ySettings();
  const copy = strings.visuals;
  const visual = settings.visual;
  const forcedColors = useForcedColors();

  const presetGroupName = useId();
  const presetHintId = useId();
  const targetId = useId();
  const targetHintId = useId();

  const [presetStorage]=useState(()=>createStorage(config.storage).adapter);
  const presetKey=`${config.storageKeyPrefix}.visual-preset`;
  const [preferredPreset,setPreferredPreset]=useState(()=>presetStorage.read(presetKey));
  const activePreset = matchPresetId(visual,preferredPreset);
  const rememberPreset=id=>{
    setPreferredPreset(id);
    if(id)presetStorage.write(presetKey,id);else presetStorage.remove(presetKey);
  };
  const adjust=values=>{rememberPreset(null);actions.setVisualValues(values);};
  const targetLocked = config.visualTarget !== 'auto';

  const percent = (value) => `${value}%`;
  const percentText = (value) => formatMessage(copy.percentValue, { value });

  return (
    <div className={`a11ytb-feature${compact ? ' controls-compact' : ''}`}>
      <Switch
        label={copy.enableLabel}
        description={compact ? undefined : copy.enableHint}
        checked={visual.enabled}
        onChange={(next) => actions.setVisualEnabled(next)}
      />

      <fieldset className="a11ytb-fieldset">
        <legend className="a11ytb-legend">{copy.presetsLegend}</legend>
        <p className="a11ytb-hint" id={presetHintId}>
          {copy.presetHint}
        </p>
        {VISUAL_PRESETS.map((preset) => (
          <label className="a11ytb-choice" key={preset.id} data-selected={activePreset===preset.id}>
            <input
              type="radio"
              name={presetGroupName}
              value={preset.id}
              checked={activePreset === preset.id}
              aria-describedby={presetHintId}
              onChange={() => {rememberPreset(preset.id);actions.applyVisualPreset(preset);}}
            />
            <span className="a11ytb-choice__text">
              <span className="a11ytb-choice__label">{preset.label}</span>
              <span className="a11ytb-hint">{preset.description}</span>
            </span>
            <span className="visual-preset-check" data-uaw-icon aria-hidden="true" hidden={activePreset!==preset.id}>✓</span>
          </label>
        ))}
      </fieldset>

      {activePreset === 'custom' ? (
        <p className="a11ytb-status" role="status">
          {copy.presetCustom}
        </p>
      ) : null}

      <SliderControl
        label={copy.brightnessLabel}
        hint={compact ? undefined : copy.sliderHint}
        value={visual.brightness}
        min={VISUAL_RANGES.brightness.min}
        max={VISUAL_RANGES.brightness.max}
        step={VISUAL_RANGES.brightness.step}
        onChange={(value) => adjust({ brightness: value })}
        formatValue={percent}
        formatValueText={percentText}
      />

      <SliderControl
        label={copy.contrastLabel}
        hint={compact ? undefined : copy.sliderHint}
        value={visual.contrast}
        min={VISUAL_RANGES.contrast.min}
        max={VISUAL_RANGES.contrast.max}
        step={VISUAL_RANGES.contrast.step}
        onChange={(value) => adjust({ contrast: value })}
        formatValue={percent}
        formatValueText={percentText}
      />

      <SliderControl
        label={copy.saturationLabel}
        hint={compact ? undefined : copy.sliderHint}
        value={visual.saturation}
        min={VISUAL_RANGES.saturation.min}
        max={VISUAL_RANGES.saturation.max}
        step={VISUAL_RANGES.saturation.step}
        onChange={(value) => adjust({ saturation: value })}
        formatValue={percent}
        formatValueText={percentText}
      />

      <p className="a11ytb-hint">{copy.boundsHint}</p>

      <div className="a11ytb-field">
        <label className="a11ytb-field__label" htmlFor={targetId}>
          {copy.targetLabel}
        </label>
        <select
          className="a11ytb-select"
          id={targetId}
          value={visual.target}
          disabled={targetLocked}
          aria-describedby={targetHintId}
          onChange={(event) => actions.setVisualTarget(event.target.value)}
        >
          <option value="document">{copy.targetDocument}</option>
          <option value="contentRoot">{copy.targetContentRoot}</option>
        </select>
        <p className="a11ytb-hint" id={targetHintId}>
          {visual.target === 'contentRoot' ? copy.targetHintContentRoot : copy.targetHintDocument}
          {targetLocked ? ` ${copy.targetLocked}` : ''}
        </p>
      </div>

      <div className="a11ytb-button-row">
        <button type="button" className="a11ytb-button" onClick={()=>{rememberPreset(null);actions.resetVisual();}}>
          {copy.reset}
        </button>
      </div>

      {forcedColors ? (
        <p className="a11ytb-note a11ytb-note--warning">{copy.forcedColorsNote}</p>
      ) : null}

      {!compact && <div className="a11ytb-note">
        <h4 className="a11ytb-note__heading">{strings.limits.visualsHeading}</h4>
        <ul>
          {strings.limits.visuals.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>}
    </div>
  );
}
