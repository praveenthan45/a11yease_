/**
 * Feature registry.
 *
 * The main team toolbar can render our features without importing our internals:
 * it reads the descriptors and renders `Panel` with whatever chrome it likes.
 * `capability` states honestly how much of the feature a toolbar can deliver.
 */

import { FEATURE_GROUPS, FEATURE_IDS } from '../constants.js';
import { FEATURE_META } from './categories.js';
import AltTextPanel from './altText/AltTextPanel.jsx';
import AuthPanel from './auth/AuthPanel.jsx';
import ConfirmPanel from './confirm/ConfirmPanel.jsx';
import ErrorMessagesPanel from './errorMessages/ErrorMessagesPanel.jsx';
import FlashingPanel from './flashing/FlashingPanel.jsx';
import FormLabelsPanel from './formLabels/FormLabelsPanel.jsx';
import PasswordPanel from './password/PasswordPanel.jsx';
import PreferencesPanel from './preferences/PreferencesPanel.jsx';
import ProfilesPanel from './profiles/ProfilesPanel.jsx';
import ResetPanel from './reset/ResetPanel.jsx';
import StructurePanel from './headings/StructurePanel.jsx';
import ScreenReaderPanel from './screenReader/ScreenReaderPanel.jsx';
import AnnouncementsPanel from './announcements/AnnouncementsPanel.jsx';
import VisualsPanel from './visuals/VisualsPanel.jsx';

/**
 * Feature descriptors, decorated with the widget presentation metadata (category and
 * icon) from features/categories.js. Keeping the decoration in one place means the
 * panel cannot show a feature without a heading and an icon, and the self-test can
 * check that all fourteen are present.
 */
const featureDescriptors = [
  {
    id: FEATURE_IDS.FLASHING,
    title: 'Flashing content protection',
    group: FEATURE_GROUPS.MOTION,
    /**
     * 'assisted': the toolbar can pause animations it can measure and offer stop
     * controls for media, but it cannot inspect video/GIF/canvas/embed content and
     * cannot guarantee protection against photosensitive seizures.
     */
    capability: 'assisted',
    wcag: [
      { id: '2.3.1', level: 'A', title: 'Three Flashes or Below Threshold' },
      { id: '2.2.2', level: 'A', title: 'Pause, Stop, Hide' },
      { id: '2.2.1', level: 'A', title: 'Timing Adjustable' },
    ],
    summary:
      'Pauses animations that appear to flash more than three times per second, stops autoplaying media on request, and lists what it cannot inspect.',
    Panel: FlashingPanel,
  },
  {
    id: FEATURE_IDS.VISUALS,
    title: 'Brightness mode',
    group: FEATURE_GROUPS.VISUAL,
    /** 'toolbar': fully deliverable as a user-side adjustment. */
    capability: 'toolbar',
    wcag: [
      { id: '1.4.3', level: 'AA', title: 'Contrast (Minimum)' },
      { id: '1.4.11', level: 'AA', title: 'Non-text Contrast' },
      { id: '1.4.4', level: 'AA', title: 'Resize Text' },
    ],
    summary:
      'Adjusts brightness, contrast and saturation of the page content within safe bounds, with presets and a single reset. Does not change the website or fix its contrast.',
    Panel: VisualsPanel,
  },
  {
    id: FEATURE_IDS.SCREEN_READER,
    title: 'Screen reader compatibility',
    group: FEATURE_GROUPS.READER,
    /**
     * 'assisted': the audit reports structural problems it can prove, and lists the
     * rest for a human. It never rewrites the page — that stays the app's job.
     */
    capability: 'assisted',
    wcag: [
      { id: '4.1.2', level: 'A', title: 'Name, Role, Value' },
      { id: '1.3.1', level: 'A', title: 'Info and Relationships' },
      { id: '3.3.2', level: 'A', title: 'Labels or Instructions' },
      { id: '2.4.6', level: 'AA', title: 'Headings and Labels' },
    ],
    summary:
      'Read-only audit of the page markup: what the DOM proves, and separately what only a person can judge. Copies a plain-text report for whoever owns the code.',
    Panel: ScreenReaderPanel,
  },
  {
    id: FEATURE_IDS.ALT_TEXT,
    title: 'Image alternative text',
    group: FEATURE_GROUPS.READER,
    /** Browser can apply reviewed DOM edits; AI and durable corrections need an authorized server. */
    capability: 'assisted',
    wcag: [
      { id: '1.1.1', level: 'A', title: 'Non-text Content' },
      { id: '4.1.2', level: 'A', title: 'Name, Role, Value' },
    ],
    summary:
      'Finds host-page images needing review; an authorized AI service can suggest editable alt text. Apply, mark decorative and undo affect the actual image. Durable corrections require configured site storage.',
    Panel: AltTextPanel,
  },
  {
    id: FEATURE_IDS.FORM_LABELS,
    title: 'Accessible form labels',
    group: FEATURE_GROUPS.FORMS,
    capability: 'assisted',
    wcag: [
      { id: '3.3.2', level: 'A', title: 'Labels or Instructions' },
      { id: '1.3.1', level: 'A', title: 'Info and Relationships' },
      { id: '2.5.3', level: 'A', title: 'Label in Name' },
    ],
    summary:
      'Finds controls with no accessible name, placeholders used as labels and labels pointing nowhere. Ships field components that wire labels, hints and errors correctly in the application markup.',
    Panel: FormLabelsPanel,
  },
  {
    id: FEATURE_IDS.HEADINGS,
    title: 'Accessible headings and landmarks',
    group: FEATURE_GROUPS.READER,
    capability: 'page-required',
    wcag: [
      { id: '1.3.1', level: 'A', title: 'Info and Relationships' },
      { id: '2.4.1', level: 'A', title: 'Bypass Blocks' },
      { id: '2.4.6', level: 'AA', title: 'Headings and Labels' },
    ],
    summary:
      'Shows the heading outline as a nested, navigable list, reports missing or hidden headings and missing main landmarks, and gives the skip-link/main/section markup that fixes them.',
    Panel: StructurePanel,
  },
  {
    id: FEATURE_IDS.ANNOUNCEMENTS,
    title: 'Screen reader status announcements',
    group: FEATURE_GROUPS.READER,
    /** 'toolbar': verbosity and the announcement service are fully toolbar-owned. */
    capability: 'toolbar',
    wcag: [
      { id: '4.1.3', level: 'AA', title: 'Status Messages' },
      { id: '2.2.1', level: 'A', title: 'Timing Adjustable' },
    ],
    summary:
      'Controls how much the toolbar announces, announces navigation changes, and logs what was said — including the messages dropped as duplicates, so the no-duplicate policy is verifiable.',
    Panel: AnnouncementsPanel,
  },
  {
    id: FEATURE_IDS.ERROR_MESSAGES,
    title: 'Accessible error messages',
    group: FEATURE_GROUPS.FORMS,
    /**
     * 'page-required': the messages belong to the form that validates the data. The
     * module supplies the components and reports what the page is missing.
     */
    capability: 'page-required',
    wcag: [
      { id: '3.3.1', level: 'A', title: 'Error Identification' },
      { id: '3.3.3', level: 'AA', title: 'Error Suggestion' },
      { id: '4.1.3', level: 'AA', title: 'Status Messages' },
    ],
    summary:
      'Field errors associated with aria-describedby, aria-invalid on the field, corrective text instead of colour alone, and a form-level summary that takes focus once after a failed submission.',
    Panel: ErrorMessagesPanel,
  },
  {
    id: FEATURE_IDS.PASSWORD,
    title: 'Show and hide password',
    group: FEATURE_GROUPS.FORMS,
    capability: 'page-required',
    wcag: [
      { id: '3.3.8', level: 'AA', title: 'Accessible Authentication (Minimum)' },
      { id: '1.3.5', level: 'AA', title: 'Identify Input Purpose' },
      { id: '2.5.8', level: 'AA', title: 'Target Size (Minimum)' },
    ],
    summary:
      'A keyboard-accessible Show/Hide control on password fields built with PasswordField: state exposed with aria-pressed, value preserved and never copied, logged or stored. The toolbar does not inject toggles into other forms.',
    Panel: PasswordPanel,
  },
  {
    id: FEATURE_IDS.AUTH,
    title: 'Accessible authentication',
    group: FEATURE_GROUPS.AUTH,
    capability: 'page-required',
    wcag: [
      { id: '1.3.5', level: 'AA', title: 'Identify Input Purpose' },
      { id: '3.3.8', level: 'AA', title: 'Accessible Authentication (Minimum)' },
      { id: '3.3.7', level: 'A', title: 'Redundant Entry' },
    ],
    summary:
      'Sign-in, registration, reset and one-time-code examples with the right autocomplete values and no blocked pasting, plus an audit of this page’s credential fields. Explains plainly that a toolbar cannot repair an authentication flow owned by another site, and stores no credential of any kind.',
    Panel: AuthPanel,
  },
  {
    id: FEATURE_IDS.CONFIRM,
    title: 'Confirmation before important actions',
    group: FEATURE_GROUPS.FORMS,
    /** 'toolbar': the dialog and the service are fully toolbar-owned. */
    capability: 'toolbar',
    wcag: [
      { id: '3.3.4', level: 'AA', title: 'Error Prevention (Legal, Financial, Data)' },
      { id: '2.1.2', level: 'A', title: 'No Keyboard Trap' },
      { id: '2.4.3', level: 'A', title: 'Focus Order' },
    ],
    summary:
      'One accessible confirmation dialog for the application: native <dialog> with showModal, Escape and backdrop to cancel, focus into the dialog and back to the invoking control, and a review step for legal or financial submissions.',
    Panel: ConfirmPanel,
  },
  {
    id: FEATURE_IDS.PREFERENCES,
    title: 'Saved preferences',
    group: FEATURE_GROUPS.PERSONALIZATION,
    /** 'toolbar': storage, validation and transfer are entirely toolbar-owned. */
    capability: 'toolbar',
    wcag: [
      { id: '3.3.7', level: 'A', title: 'Redundant Entry' },
      { id: '1.4.8', level: 'AAA', title: 'Visual Presentation' },
    ],
    summary:
      'Settings are stored in this browser under one key and re-validated on load. The panel reports the real storage mode, shows the exact payload, and exports or imports preferences — never passwords, tokens or form values.',
    Panel: PreferencesPanel,
  },
  {
    id: FEATURE_IDS.RESET,
    title: 'Reset settings',
    group: FEATURE_GROUPS.PERSONALIZATION,
    capability: 'toolbar',
    wcag: [{ id: '3.3.4', level: 'AA', title: 'Error Prevention (Legal, Financial, Data)' }],
    summary:
      'Restores one group or every setting to its documented defaults, applies the change immediately without a reload, and offers a one-step undo for a limited time.',
    Panel: ResetPanel,
  },
  {
    id: FEATURE_IDS.PROFILES,
    title: 'Accessibility profiles',
    group: FEATURE_GROUPS.PERSONALIZATION,
    capability: 'toolbar',
    wcag: [{ id: '1.4.8', level: 'AAA', title: 'Visual Presentation' }],
    summary:
      'Default, Reduced motion, Low stimulation and Enhanced contrast, plus profiles the application configures or the user saves. A profile is a patch of existing settings, and editing one value switches the panel to Custom.',
    Panel: ProfilesPanel,
  },
];

export const a11yFeatures = featureDescriptors.map((feature) => ({
  ...feature,
  ...(FEATURE_META[feature.id] || {}),
}));

export function getA11yFeature(id) {
  return a11yFeatures.find((feature) => feature.id === id) || null;
}

export default a11yFeatures;
