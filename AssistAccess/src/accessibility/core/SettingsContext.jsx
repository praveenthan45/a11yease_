/**
 * Shared settings API — the store every accessibility feature reads from.
 *
 * Responsibilities
 *  1. Hold one settings object (pure reducer, schema-sanitised).
 *  2. Persist it (debounced) through the probed storage adapter and sync it
 *     across tabs.
 *  3. Run the appliers that touch the page (visual filters, motion overrides)
 *     and tear them down on unmount.
 *  4. Announce user-initiated changes through the single announcer.
 *
 * Everything a teammate needs is exported as a hook:
 *   useA11ySettings()          → { settings, actions, meta, config, strings }
 *   useA11ySettingsContext()   → the same object or null (no provider mounted)
 *   useA11ySetting(selector)   → one slice of settings
 *   useEffectiveReducedMotion()→ OS preference, overridden by the user's choice
 *
 * Later phases add groups to settingsSchema.js; this file needs no changes for
 * that because every write goes through the schema.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';

import { A11Y_API_VERSION, EVENTS, PROFILE_LIMITS, RESET_UNDO_WINDOW_MS, SETTINGS_SCHEMA_VERSION } from '../constants.js';
import { emit } from '../integration/events.js';
import { announce, destroyAnnouncer, initAnnouncer, setAnnouncerEnabled, setVerbosity } from './a11y/announcer.js';
import { prefersReducedMotion, subscribeReducedMotion, useReducedMotion } from './a11y/reducedMotion.js';
import { createMotionApplier } from './apply/applyMotion.js';
import { createVisualApplier } from './apply/applyVisual.js';
import { buildUserProfilePatch, countPatchChanges, createUserProfileId } from './profiles/profiles.js';
import {
  buildExportPayload,
  defaultExportFilename,
  downloadJson,
  parseImportPayload,
  serializeExport,
} from './preferencesIO.js';
import {
  createDefaultSettings,
  migrateSettings,
  resolveReducedMotion,
  snapshotSettingsPatch,
} from './settingsSchema.js';
import { SETTINGS_ACTIONS, settingsReducer } from './settingsReducer.js';
import {
  clearSettings,
  createStorage,
  readSettings,
  settingsKey,
  subscribeStorage,
  writeSettings,
} from './storage.js';
import { formatMessage } from '../strings.js';

const SettingsContext = createContext(null);

const PERSIST_DEBOUNCE_MS = 300;
const SLIDER_ANNOUNCE_DELAY_MS = 400;

export function SettingsProvider({ config, strings, children }) {
  const [state, dispatch] = useReducer(settingsReducer, null, () => createDefaultSettings());
  const [storageInfo, setStorageInfo] = useState({ mode: 'memory', degraded: false });
  const [saveState, setSaveState] = useState({ lastSavedAt: null, error: null });
  const [osReducedMotion, setOsReducedMotion] = useState(() => prefersReducedMotion());
  const [hydrated, setHydrated] = useState(false);

  const configRef = useRef(config);
  configRef.current = config;
  const stateRef = useRef(state);
  stateRef.current = state;
  const osReducedMotionRef = useRef(osReducedMotion);
  osReducedMotionRef.current = osReducedMotion;

  const storageRef = useRef(null);
  const persistedRef = useRef(null);
  const storageWarnedRef = useRef(false);
  /** Snapshot taken before a reset, so one step can be undone. */
  const resetSnapshotRef = useRef(null);
  const visualApplierRef = useRef(null);
  const motionApplierRef = useRef(null);

  const stringsRef = useRef(strings);
  stringsRef.current = strings;

  const getVisualApplier = useCallback(() => {
    if (!visualApplierRef.current) visualApplierRef.current = createVisualApplier();
    return visualApplierRef.current;
  }, []);

  const getMotionApplier = useCallback(() => {
    if (!motionApplierRef.current) motionApplierRef.current = createMotionApplier();
    return motionApplierRef.current;
  }, []);

  // ── Hydration ────────────────────────────────────────────────────────────
  useEffect(() => {
    const activeConfig = configRef.current;
    const copy = stringsRef.current;

    initAnnouncer();

    const { adapter, mode, degraded } = createStorage(activeConfig.storage);
    const key = settingsKey(activeConfig.storageKeyPrefix);
    storageRef.current = { adapter, key, mode };
    setStorageInfo({ mode, degraded });

    const { raw, ok } = readSettings(adapter, key);
    if (!ok) {
      announce(copy.announcements.settingsLoadFailed, { politeness: 'assertive' });
    }

    const { settings } = migrateSettings(raw);
    settings.meta.storageMode = mode;
    if (!settings.meta.createdAt) settings.meta.createdAt = new Date().toISOString();
    settings.schemaVersion = SETTINGS_SCHEMA_VERSION;

    dispatch({ type: SETTINGS_ACTIONS.HYDRATE, settings, storageMode: mode });
    setHydrated(true);
    if (degraded) announce(copy.announcements.storageUnavailable);

    emit(EVENTS.READY, { apiVersion: A11Y_API_VERSION, storageMode: mode });

    return () => {
      destroyAnnouncer();
    };
  }, []);

  // ── Operating system preference ──────────────────────────────────────────
  useEffect(() => subscribeReducedMotion(setOsReducedMotion), []);

  const effectiveReducedMotion = useMemo(
    () => resolveReducedMotion(state.motion.reduceMotion, osReducedMotion),
    [state.motion.reduceMotion, osReducedMotion],
  );

  // Announcements can be switched off by the host app or by the user.
  useEffect(() => {
    setAnnouncerEnabled(config.announce !== false && state.ui.announceOnChange !== false);
  }, [config.announce, state.ui.announceOnChange]);

  // Verbosity gates every announcement made through the shared service.
  useEffect(() => {
    setVerbosity(state.reader.announceVerbosity);
  }, [state.reader.announceVerbosity]);

  // ── Apply settings to the page ───────────────────────────────────────────
  useEffect(() => {
    if (!hydrated) return;
    const activeConfig = configRef.current;
    const options = {
      settings: stateRef.current,
      contentRootSelector: activeConfig.contentRoot,
      forcedTarget: activeConfig.visualTarget,
      affectToolbar: activeConfig.visualAffectsToolbar === true,
    };
    getVisualApplier().apply(options);
    getMotionApplier().apply({
      ...options,
      effectiveReducedMotion: resolveReducedMotion(
        stateRef.current.motion.reduceMotion,
        osReducedMotionRef.current,
      ),
    });
  }, [state, hydrated, osReducedMotion, getVisualApplier, getMotionApplier]);

  // Full teardown: every injected style, marker attribute and paused animation.
  useEffect(
    () => () => {
      if (visualApplierRef.current) visualApplierRef.current.cleanup();
      if (motionApplierRef.current) motionApplierRef.current.cleanup();
    },
    [],
  );

  /**
   * Write the settings through the probed adapter, recording the result so the panel
   * can report honestly: a browser that refuses to store anything must not look like
   * a browser that saved successfully.
   */
  const writeState = useCallback((nextState) => {
    if (!storageRef.current) return false;
    const { adapter, key, mode } = storageRef.current;
    const ok = writeSettings(adapter, key, nextState);
    persistedRef.current = JSON.stringify(nextState);
    if (ok) {
      const at = new Date().toISOString();
      setSaveState({ lastSavedAt: at, error: null });
      emit(EVENTS.SETTINGS_SAVED, { at, storageMode: mode });
      return true;
    }
    setSaveState((previous) => ({ ...previous, error: 'write-failed' }));
    setStorageInfo((previous) => (previous.degraded ? previous : { ...previous, degraded: true }));
    if (!storageWarnedRef.current) {
      storageWarnedRef.current = true;
      announce(stringsRef.current.announcements.storageUnavailable, {
        politeness: 'assertive',
        level: 'critical',
      });
    }
    return false;
  }, []);

  // ── Persistence ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!hydrated || !storageRef.current) return undefined;
    const payload = JSON.stringify(state);
    if (persistedRef.current === payload) return undefined;

    const timer = setTimeout(() => {
      writeState(stateRef.current);
    }, PERSIST_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [state, hydrated, writeState]);

  // ── Cross-tab synchronisation ────────────────────────────────────────────
  useEffect(() => {
    if (!hydrated || !storageRef.current) return undefined;
    return subscribeStorage(storageRef.current.key, (payload) => {
      if (!payload) return;
      const incoming = JSON.stringify(payload);
      if (incoming === persistedRef.current || incoming === JSON.stringify(stateRef.current)) return;
      const { settings } = migrateSettings(payload);
      dispatch({ type: SETTINGS_ACTIONS.HYDRATE, settings, storageMode: storageRef.current.mode });
    });
  }, [hydrated]);

  // ── Notify the host app ──────────────────────────────────────────────────
  useEffect(() => {
    if (!hydrated) return;
    emit(EVENTS.SETTINGS_CHANGED, { settings: state });
    const handler = configRef.current.onSettingsChange;
    if (typeof handler === 'function') handler(state, { storageMode: storageInfo.mode });
  }, [state, hydrated, storageInfo.mode]);

  // ── Actions (dispatch + announcement in one place) ───────────────────────
  const actions = useMemo(() => {
    const say = (message, options) => {
      if (!message) return;
      if (configRef.current.announce === false) return;
      if (stateRef.current.ui.announceOnChange === false) return;
      announce(message, options);
      emit(EVENTS.POST_ANNOUNCEMENT, { message, options });
    };

    const values = () => stateRef.current.visual;

    return {
      setVisualEnabled(enabled) {
        dispatch({ type: SETTINGS_ACTIONS.SET_VISUAL_ENABLED, enabled });
        say(enabled ? stringsRef.current.announcements.visualsOn : stringsRef.current.announcements.visualsOff);
      },

      /**
       * Update one or more visual values.
       * @param {object} next partial values, e.g. { brightness: 120 }
       * @param {{enable?: boolean}} [options] enable the feature (default true)
       */
      setVisualValues(next, options = {}) {
        const enable = options.enable !== false;
        dispatch({ type: SETTINGS_ACTIONS.SET_VISUAL_VALUES, values: next, enable });
        const keys = Object.keys(next);
        if (keys.length === 1) {
          const key = keys[0];
          const template = stringsRef.current.announcements[key];
          if (template) {
            say(formatMessage(template, { value: next[key] }), {
              dedupeKey: `visual.${key}`,
              delayMs: SLIDER_ANNOUNCE_DELAY_MS,
            });
          }
        } else {
          say(stringsRef.current.announcements.preset, {
            dedupeKey: 'visual.preset',
            delayMs: SLIDER_ANNOUNCE_DELAY_MS,
          });
        }
      },

      /** Apply a preset's values and announce its name. */
      applyVisualPreset(preset) {
        dispatch({ type: SETTINGS_ACTIONS.SET_VISUAL_VALUES, values: preset.values, enable: true });
        if (preset.id === 'default') {
          say(stringsRef.current.visuals.resetAnnouncement, { dedupeKey: 'visual.preset' });
        } else {
          say(formatMessage(stringsRef.current.announcements.preset, { name: preset.label }), {
            dedupeKey: 'visual.preset',
          });
        }
      },

      resetVisual() {
        dispatch({ type: SETTINGS_ACTIONS.RESET_VISUAL });
        say(stringsRef.current.visuals.resetAnnouncement, { dedupeKey: 'visual.reset' });
      },

      setVisualTarget(target) {
        dispatch({ type: SETTINGS_ACTIONS.SET_VISUAL_TARGET, target });
        say(
          target === 'contentRoot'
            ? stringsRef.current.announcements.targetContentRoot
            : stringsRef.current.announcements.targetDocument,
          { dedupeKey: 'visual.target' },
        );
      },

      setMotion(key, value) {
        dispatch({ type: SETTINGS_ACTIONS.SET_MOTION, key, value });
        const copy = stringsRef.current;
        if (key === 'reduceMotion') {
          if (value === 'system') {
            say(
              osReducedMotionRef.current
                ? copy.announcements.reduceMotionSystemOn
                : copy.announcements.reduceMotionSystemOff,
              { dedupeKey: 'motion.reduce' },
            );
          } else {
            say(value === 'on' ? copy.announcements.reduceMotionOn : copy.announcements.reduceMotionOff, {
              dedupeKey: 'motion.reduce',
            });
          }
        } else if (key === 'motionStrategy') {
          say(value === 'pause' ? copy.announcements.strategyPause : copy.announcements.strategyInstant, {
            dedupeKey: 'motion.strategy',
          });
        } else if (key === 'pauseAnimations') {
          say(value ? copy.announcements.pauseAnimationsOn : copy.announcements.pauseAnimationsOff, {
            dedupeKey: 'motion.pause',
          });
        } else if (key === 'pauseAutoMedia') {
          say(value ? copy.announcements.pauseMediaOn : copy.announcements.pauseMediaOff, {
            dedupeKey: 'motion.media',
          });
        }
      },

      setFlashGuard(key, value) {
        dispatch({ type: SETTINGS_ACTIONS.SET_FLASH_GUARD, key, value });
        const copy = stringsRef.current;
        if (key === 'enabled') {
          say(value ? copy.announcements.guardOn : copy.announcements.guardOff, { dedupeKey: 'guard.enabled' });
        } else if (key === 'action') {
          const label =
            value === 'hide'
              ? copy.flashing.actionHide
              : value === 'warn'
                ? copy.flashing.actionWarn
                : copy.flashing.actionPause;
          say(formatMessage(copy.announcements.guardAction, { action: label.toLowerCase() }), {
            dedupeKey: 'guard.action',
          });
        }
      },

      allowFlashElement(elementKey) {
        dispatch({ type: SETTINGS_ACTIONS.ALLOW_FLASH_KEY, key: elementKey });
        say(stringsRef.current.announcements.allowed, { dedupeKey: `guard.allow.${elementKey}` });
      },

      unallowFlashElement(elementKey) {
        dispatch({ type: SETTINGS_ACTIONS.REMOVE_FLASH_KEY, key: elementKey });
        say(stringsRef.current.announcements.unallowed, { dedupeKey: `guard.unallow.${elementKey}` });
      },

      setAnnounceOnChange(enabled) {
        dispatch({ type: SETTINGS_ACTIONS.SET_ANNOUNCE, enabled });
      },

      /**
       * Reader group (audit + announcement behaviour).
       * These confirmations are announced at 'critical' level on purpose: the
       * message about switching to "minimal" verbosity must still be heard.
       */
      setReader(key, value) {
        dispatch({ type: SETTINGS_ACTIONS.SET_READER, key, value });
        const copy = stringsRef.current;
        if (key === 'announceVerbosity') {
          const message =
            value === 'minimal'
              ? copy.announcements.verbosityMinimal
              : value === 'verbose'
                ? copy.announcements.verbosityVerbose
                : copy.announcements.verbosityStandard;
          say(message, { level: 'critical', dedupeKey: 'reader.verbosity' });
        } else if (key === 'announceRouteChanges') {
          say(value ? copy.announcements.routeChangesOn : copy.announcements.routeChangesOff, {
            level: 'critical',
            dedupeKey: 'reader.route',
          });
        } else if (key === 'auditEnabled') {
          say(value ? copy.announcements.auditOn : copy.announcements.auditOff, {
            level: 'critical',
            dedupeKey: 'reader.audit',
          });
        } else if (key === 'highlightOnJump') {
          say(value ? copy.announcements.highlightOn : copy.announcements.highlightOff, {
            level: 'critical',
            dedupeKey: 'reader.highlight',
          });
        }
      },

      /**
       * Forms group (password toggle, error announcements).
       * Confirmed at 'critical' level so the confirmation is heard even when the
       * change reduces what the toolbar says.
       */
      setForms(key, value) {
        dispatch({ type: SETTINGS_ACTIONS.SET_FORMS, key, value });
        const copy = stringsRef.current;
        if (key === 'passwordToggle') {
          say(value ? copy.announcements.passwordToggleOn : copy.announcements.passwordToggleOff, {
            level: 'critical',
            dedupeKey: 'forms.password',
          });
        } else if (key === 'announceErrors') {
          say(value ? copy.announcements.errorAnnounceOn : copy.announcements.errorAnnounceOff, {
            level: 'critical',
            dedupeKey: 'forms.errors',
          });
        }
      },

      /** Used by the announcer hook and by teammates. */
      announce(message, options) {
        say(message, options);
      },

      // ── Profiles ───────────────────────────────────────────────────────────
      /**
       * Apply a profile as one atomic patch. The announcement reports how many
       * settings actually changed, so "nothing happened" and "12 things changed" are
       * distinguishable without looking at the panel.
       */
      applyProfile(profile) {
        if (!profile || !profile.patch) return 0;
        const changed = countPatchChanges(stateRef.current, profile.patch);
        dispatch({
          type: SETTINGS_ACTIONS.APPLY_PATCH,
          patch: profile.patch,
          profileId: profile.id,
        });
        emit(EVENTS.PROFILE_CHANGED, {
          id: profile.id,
          label: profile.label,
          changed,
          appliedAt: new Date().toISOString(),
        });
        say(
          formatMessage(stringsRef.current.announcements.profileApplied, {
            name: profile.label,
            count: changed,
          }),
          { level: 'critical', dedupeKey: 'profile.apply' },
        );
        return changed;
      },

      /** Save the current settings as a user profile. Returns the new id. */
      addUserProfile(label) {
        const trimmed = String(label || '').trim();
        if (!trimmed) return null;
        const id = createUserProfileId(trimmed);
        dispatch({
          type: SETTINGS_ACTIONS.ADD_USER_PROFILE,
          id,
          label: trimmed,
          patch: buildUserProfilePatch(stateRef.current),
        });
        say(formatMessage(stringsRef.current.announcements.profileSaved, { name: trimmed }), {
          level: 'critical',
          dedupeKey: 'profile.add',
        });
        return id;
      },

      removeUserProfile(id, label) {
        dispatch({ type: SETTINGS_ACTIONS.REMOVE_USER_PROFILE, id });
        say(
          formatMessage(stringsRef.current.announcements.profileDeleted, { name: label || id }),
          { level: 'critical', dedupeKey: 'profile.remove' },
        );
      },

      // ── Reset and undo ─────────────────────────────────────────────────────
      /**
       * Reset one scope, or everything. A snapshot of the previous settings is kept
       * so the change can be undone once, for a limited time.
       */
      resetScope(scope) {
        resetSnapshotRef.current = {
          patch: snapshotSettingsPatch(stateRef.current),
          profileId: stateRef.current.profile.id,
          at: Date.now(),
        };
        dispatch({ type: SETTINGS_ACTIONS.RESET_SCOPE, scope });
        emit(EVENTS.SETTINGS_RESET, { scope });
        const labels = stringsRef.current.reset.scopeLabels || {};
        say(
          formatMessage(stringsRef.current.announcements.resetDone, {
            scope: labels[scope] || scope,
            seconds: Math.round(RESET_UNDO_WINDOW_MS / 1000),
          }),
          { level: 'critical', dedupeKey: 'reset.done' },
        );
      },

      canUndoReset() {
        const snapshot = resetSnapshotRef.current;
        return Boolean(snapshot) && Date.now() - snapshot.at <= RESET_UNDO_WINDOW_MS;
      },

      undoReset() {
        const snapshot = resetSnapshotRef.current;
        if (!snapshot || Date.now() - snapshot.at > RESET_UNDO_WINDOW_MS) {
          resetSnapshotRef.current = null;
          return false;
        }
        dispatch({
          type: SETTINGS_ACTIONS.APPLY_PATCH,
          patch: snapshot.patch,
          profileId: snapshot.profileId,
        });
        resetSnapshotRef.current = null;
        say(stringsRef.current.announcements.resetUndone, { level: 'critical', dedupeKey: 'reset.undo' });
        return true;
      },

      // ── Persistence controls ───────────────────────────────────────────────
      /** Write immediately instead of waiting for the debounce. */
      saveNow() {
        const ok = writeState(stateRef.current);
        say(ok ? stringsRef.current.announcements.savedNow : stringsRef.current.announcements.saveFailed, {
          level: 'critical',
          dedupeKey: 'storage.save',
        });
        return ok;
      },

      /** Export the preferences as a JSON string, and download it when possible. */
      exportPreferences() {
        const payload = buildExportPayload(stateRef.current, { apiVersion: A11Y_API_VERSION });
        const text = serializeExport(payload);
        const ok = downloadJson(defaultExportFilename(), text);
        say(ok ? stringsRef.current.announcements.exportDone : stringsRef.current.announcements.exportFailed, {
          level: 'critical',
          dedupeKey: 'prefs.export',
        });
        return { ok, text };
      },

      /**
       * Import previously exported preferences (or a bare settings object).
       * Everything is validated and clamped first; nothing outside the patchable
       * groups can be applied, and saved profiles are added alongside the existing
       * ones rather than replacing them.
       */
      importPreferences(text) {
        const parsed = parseImportPayload(text);
        if (!parsed.ok) {
          const reasonMap = (stringsRef.current.preferences && stringsRef.current.preferences.importErrors) || {};
          const reason = reasonMap[parsed.error] || parsed.error || 'unknown';
          say(formatMessage(stringsRef.current.announcements.importFailed, { reason }), {
            politeness: 'assertive',
            level: 'critical',
            dedupeKey: 'prefs.import',
          });
          return parsed;
        }

        const patch = snapshotSettingsPatch(parsed.settings);
        const changed = countPatchChanges(stateRef.current, patch);

        parsed.profiles.slice(0, PROFILE_LIMITS.MAX_USER_PROFILES).forEach((entry) => {
          if (!entry || typeof entry !== 'object') return;
          const label = typeof entry.label === 'string' && entry.label.trim() ? entry.label.trim() : 'Imported profile';
          const id = typeof entry.id === 'string' && entry.id ? entry.id : createUserProfileId(label);
          dispatch({ type: SETTINGS_ACTIONS.ADD_USER_PROFILE, id, label, patch: entry.patch });
        });

        dispatch({
          type: SETTINGS_ACTIONS.APPLY_PATCH,
          patch,
          profileId: parsed.activeProfileId || 'custom',
        });
        emit(EVENTS.SETTINGS_IMPORTED, { changed, warnings: parsed.warnings });
        say(formatMessage(stringsRef.current.announcements.importDone, { count: changed }), {
          level: 'critical',
          dedupeKey: 'prefs.import',
        });
        return parsed;
      },

      /** Remove the stored preferences from this browser entirely. */
      deleteStoredPreferences() {
        if (storageRef.current) {
          clearSettings(storageRef.current.adapter, storageRef.current.key);
        }
        persistedRef.current = null;
        resetSnapshotRef.current = null;
        setSaveState({ lastSavedAt: null, error: null });
        dispatch({ type: SETTINGS_ACTIONS.RESET_SCOPE, scope: 'all' });
        emit(EVENTS.SETTINGS_RESET, { scope: 'storage' });
        say(stringsRef.current.announcements.storageCleared, {
          level: 'critical',
          dedupeKey: 'storage.clear',
        });
      },

      resetAll() {
        dispatch({ type: SETTINGS_ACTIONS.RESET_ALL });
        say(stringsRef.current.visuals.resetAnnouncement, { dedupeKey: 'settings.reset' });
      },

      /** Exposed for tests and for the host app. */
      getValues: values,
    };
  }, []);

  const value = useMemo(
    () => ({
      settings: state,
      actions,
      strings,
      config,
      meta: {
        hydrated,
        storageMode: storageInfo.mode,
        storageDegraded: storageInfo.degraded,
        storageKey: storageRef.current ? storageRef.current.key : null,
        lastSavedAt: saveState.lastSavedAt,
        storageError: saveState.error,
        osReducedMotion,
        effectiveReducedMotion,
        verbosity: state.reader.announceVerbosity,
        schemaVersion: SETTINGS_SCHEMA_VERSION,
        apiVersion: A11Y_API_VERSION,
      },
    }),
    [
      state,
      actions,
      strings,
      config,
      hydrated,
      storageInfo,
      saveState,
      osReducedMotion,
      effectiveReducedMotion,
    ],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

/** Returns the full context object, or null when no provider is mounted. */
export function useA11ySettingsContext() {
  return useContext(SettingsContext);
}

/** Returns the full context object and throws a clear error without a provider. */
export function useA11ySettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error(
      'useA11ySettings() requires <AccessibilityModule> or <AccessibilityProvider> to be mounted.',
    );
  }
  return context;
}

/** Select one slice of settings. */
export function useA11ySetting(selector, fallback) {
  const context = useContext(SettingsContext);
  if (!context) return fallback;
  try {
    return selector(context.settings);
  } catch (error) {
    return fallback;
  }
}

/**
 * Effective reduced-motion state: the user's explicit choice wins, otherwise the
 * operating system setting. Works without a provider (falls back to the OS).
 */
export function useEffectiveReducedMotion() {
  const context = useContext(SettingsContext);
  const osValue = useReducedMotion();
  if (!context) return osValue;
  return context.meta.effectiveReducedMotion;
}

/** Announcement helper for teammates' modules (respects the user's setting). */
export function useAnnounce() {
  const context = useContext(SettingsContext);
  const osFallback = useCallback((message, options) => announce(message, options), []);
  if (!context) return osFallback;
  return context.actions.announce;
}
