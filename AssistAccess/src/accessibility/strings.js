/**
 * All user-facing and announced copy for the implemented features.
 *
 * Keeping copy in one module means (a) it can be overridden through
 * `config.strings` without touching components, and (b) the honest limitation
 * statements cannot drift apart across panels.
 *
 * IMPORTANT: the `limits` entries are required copy, not decoration. They exist
 * so the toolbar never implies that it can guarantee protection against
 * photosensitive seizures or fix a website's contrast.
 */

export const defaultStrings = {
  panel: {
    title: 'Accessibility options',
    close: 'Close accessibility panel',
    launcher: 'Accessibility options',
    intro: 'These options change how this page is displayed and how motion behaves. They are stored on this device only.',
  },
  sections: {
    flashing: 'Flashing content protection',
    visuals: 'Brightness and colour',
  },
  motion: {
    heading: 'Motion',
    reduceMotionLabel: 'Reduce motion',
    reduceMotionOn: 'Following your system setting: reduce motion is on',
    reduceMotionOff: 'Following your system setting: reduce motion is off',
    reduceMotionHint:
      'Turn off animations and smooth scrolling. When you change this, the toolbar stops following your operating system setting.',
    useSystem: 'Use my system setting',
    strategyLabel: 'How animations are handled',
    strategyInstant: 'Finish them immediately (recommended)',
    strategyPause: 'Pause them at the current frame',
    strategyHint:
      'Finish immediately holds animations at their starting frame. Pause at current frame keeps their current position and size.',
    pauseAnimationsLabel: 'Pause all animations and transitions now',
    pauseAnimationsHint:
      'Holds CSS animations, transitions and script-driven animations at their current frame. Some content that reveals itself on scroll may stay hidden until you turn this off.',
    pauseMediaLabel: 'Pause autoplaying video and audio',
    pauseMediaHint:
      'Stops media that starts playing on its own. The toolbar cannot see what a video contains, so this is a stop control, not a check for flashing.',
    strategyUsedWhenReduced: 'Used when motion is reduced.',
  },
  flashing: {
    heading: 'Flashing content protection',
    guardLabel: 'Watch for flashing content',
    guardHint:
      'Looks for animations and media that change brightness more than three times per second and pauses, hides or reports them.',
    actionLabel: 'When flashing is suspected',
    actionPause: 'Pause it',
    actionHide: 'Hide it',
    actionWarn: 'Warn me only',
    actionHint: 'Hiding removes the element from view and from screen readers. You can restore anything from this list.',
    rescan: 'Check this page again',
    statusScanning: 'Checking the page…',
    statusChecked: 'Last check {time}. {checked} candidate(s) inspected.',
    statusNone: 'No flashing content detected in what this toolbar can inspect.',
    statusFlaggedOne: '1 element may flash more than three times per second.',
    statusFlaggedMany: '{count} elements may flash more than three times per second.',
    statusApplied: '{count} paused or hidden.',
    allow: 'Allow',
    restore: 'Restore',
    restoreAll: 'Restore everything this toolbar changed',
    allowedTitle: 'Allowed on this page',
    allowedEmpty: 'Nothing allowed yet.',
    unallow: 'Stop allowing',
    itemFlashes: '{value} flashes per second (estimated)',
    itemArea: 'About {value}% of the viewport',
    itemRedFlash: 'May involve saturated red flashes',
    itemKindAnimation: 'CSS or script animation',
    itemKindVideo: 'Autoplaying video',
    itemKindAudio: 'Autoplaying audio',
    itemKindGif: 'Animated image',
    itemKindMarquee: 'Scrolling or blinking text',
    itemUnknownTarget: 'Element without a readable name',
    bandHazard: 'Above the threshold',
    bandCaution: 'Possibly above the threshold',
    bandUnverified: 'Cannot be verified',
    detectedHeading: 'Detected on this page',
    detectedEmpty: 'Nothing to show yet. Use “Check this page again” to run a scan.',
    actionPauseItem: 'Pause',
    actionHideItem: 'Hide',
    actionResumeItem: 'Resume',
    actionShowItem: 'Show again',
    appliedPaused: 'Paused',
    appliedHidden: 'Hidden',
    confidenceHigh: 'Measured from colour or visibility changes.',
    confidenceLow: 'Estimated from opacity or filter changes, so it may be inaccurate.',
    uninspectableHeading: 'What this toolbar cannot inspect',
    uninspectableCanvas: 'Canvas animations — pixel content cannot be read or measured.',
    uninspectableEmbed: 'Third-party embeds and cross-origin iframes — content from another origin cannot be inspected or stopped.',
    uninspectableVideo: 'Video and animated images — playback can be paused, but the frames cannot be analysed.',
    uninspectableScript: 'Scripts that trigger short animations repeatedly may stay below the detection thresholds.',
  },
  visuals: {
    heading: 'Brightness mode',
    enableLabel: 'Brightness mode',
    enableHint: 'Adjusts brightness, contrast and saturation on your device.',
    presetsLegend: 'Presets',
    presetCustom: 'Custom values',
    presetHint: 'Presets are starting points. Every value can be adjusted with the sliders below and reset at any time.',
    brightnessLabel: 'Brightness',
    contrastLabel: 'Contrast',
    saturationLabel: 'Saturation',
    sliderHint: 'Use the arrow keys for small steps, Page Up and Page Down for large steps, or Home and End for the limits.',
    percentValue: '{value} percent',
    targetLabel: 'Apply to',
    targetDocument: 'Whole page (recommended)',
    targetContentRoot: 'Content area only',
    targetHintDocument:
      'Filters are applied to the page root. Fixed and sticky elements inside the app keep working.',
    targetHintContentRoot:
      'Filters are applied to the main content area only. This can break fixed or sticky elements inside that area on some sites.',
    targetLocked: 'Pinned by the application configuration.',
    reset: 'Reset visual adjustments',
    resetAnnouncement: 'Visual adjustments reset to normal.',
    forcedColorsNote:
      'Your system is using a high-contrast colour scheme. Filters may hide the colours that scheme relies on, so use them with care and turn them off if text becomes harder to read.',
    boundsHint:
      'Brightness and contrast are limited to 50–150% and saturation to 0–200% so the page stays readable and colours do not clip.',
  },
  limits: {
    flashingHeading: 'What flashing protection cannot do',
    flashing: [
      'This is a best-effort helper, not a medical device, and it does not guarantee protection against photosensitive seizures.',
      'Flashing cannot be detected reliably inside video, animated images, canvas, plugin content or third-party embeds, because their pixels cannot be read from the page.',
      'Detection is based on animation timing and colour values. Animations started from scripts, or images that flash in ways the toolbar cannot measure, can be missed.',
      'Nothing in this toolbar replaces content designed to stay below the three-flashes-per-second threshold. If you are photosensitive and the content is not yours, avoid it rather than relying on this switch.',
    ],
    visualsHeading: 'What visual adjustments cannot do',
    visuals: [
      'Filters change how colours are perceived on this device. They do not change the website, and they do not fix a site that fails colour contrast requirements.',
      'Raising contrast can hide subtle distinctions a site relies on, and can reduce readability for some users. Adjust slowly and reset if text becomes harder to read.',
      'Filters cannot repair information that is conveyed by colour alone, images of text, or low-resolution images.',
      'Grayscale also removes colour from the toolbar controls; text and focus indicators remain readable.',
    ],
    shortFlashing:
      'Best-effort protection only: flashing inside video, animated images and third-party embeds cannot be detected reliably, and no setting here guarantees protection against photosensitive seizures.',
    shortVisuals:
      'Visual filters are for comfort and readability. They do not make a website conform to WCAG contrast requirements.',
  },
  /** Copy for the page audit (features 1-4 of the reader phase). */
  audit: {
    heading: 'Page audit',
    intro:
      'A read-only check of the page markup. It reports what it can prove and keeps that separate from anything that needs a human decision. It never changes the page.',
    enableLabel: 'Check this page while the toolbar is open',
    enableHint:
      'Runs once when the toolbar loads and again after the page changes. Reads the DOM only; nothing is added to the page.',
    run: 'Check the page again',
    statusNever: 'Not checked yet.',
    statusChecked: 'Last checked at {time}. {findings} finding(s) from {checked} elements inspected.',
    statusDisabled: 'The audit is switched off.',
    statusClean: 'Nothing detected by these checks.',
    severityError: 'Detected problem',
    severityWarning: 'Warning',
    severityInfo: 'Note',
    certaintyDetectable: 'Detected',
    certaintyReview: 'Needs a decision',
    summaryLine:
      '{errors} detected, {warnings} warning(s), {notes} note(s), {review} needing a human decision',
    detectedHeading: 'Detected problems',
    detectedIntro: 'The markup itself proves these. They do not depend on judgement.',
    detectedEmpty: 'These checks found nothing they can prove.',
    reviewHeading: 'Needs a human decision',
    reviewIntro:
      'Signals, not verdicts. The markup suggests something worth looking at, but only a person who knows the content can decide.',
    reviewEmpty: 'Nothing to review.',
    countersHeading: 'What was counted',
    counterLabels: {
      images: 'images found',
      withAltText: 'images with an alt attribute — quality not checked',
      missingAlt: 'images with no alt attribute',
      emptyAlt: 'images marked decorative with alt=""',
      controlsWithoutName: 'controls left without a name by an image',
      controls: 'form controls and buttons found',
      named: 'controls with an accessible name',
      unnamed: 'controls with no accessible name',
      weakNames: 'controls named only by a title attribute',
      orphanLabels: 'labels pointing at an id that does not exist',
      groupsWithoutLabel: 'option groups with no group label',
      headings: 'headings found',
      h1: 'level 1 headings',
      empty: 'empty headings',
      hidden: 'headings hidden from assistive technology',
      levelSkips: 'heading level jumps',
      fakeHeadingCandidates: 'blocks that look like headings but are not',
      mains: 'main landmarks',
      visibleMains: 'visible main landmarks',
      navs: 'navigation landmarks',
      unnamedNavs: 'navigation landmarks with no name',
      hasSkipLink: 'skip link to the main content',
      invalidMarked: 'fields marked aria-invalid',
      invalidWithoutMessage: 'invalid fields with no associated message',
      errorCandidates: 'blocks that look like error messages',
      unassociatedErrors: 'error messages no field points at',
      invalidNotMarked: 'fields the browser considers invalid but not marked',
      authFields: 'authentication fields found',
      passwordFields: 'password fields',
      missingAutocomplete: 'credential fields with no autocomplete value',
      pasteBlocked: 'fields with an inline paste or copy blocker',
      cognitiveSignals: 'signals of a memory or puzzle test',
    },
    jump: 'Show me where',
    focus: 'Move focus there',
    jumped: 'Highlighted on the page: {label}. The highlight disappears after a few seconds.',
    jumpedFocus: 'Moved focus to: {label}.',
    jumpFailed: 'That element is no longer on the page.',
    howToFix: 'How to fix this in the markup',
    evidence: 'Evidence from the page',
    why: 'Why it matters',
    wcag: 'WCAG',
    copyReport: 'Copy report',
    copyReportDone: 'The report was copied to the clipboard.',
    copyReportFailed: 'Copying was blocked by the browser. The report is shown below so you can select and copy it.',
    reportLabel: 'Audit report as plain text',
    truncated: 'Some findings were left out to keep the report short. Fix these and check again.',
    cannotHeading: 'What this audit cannot detect',
    cannot: [
      'Whether alternative text is accurate, complete or useful. The audit sees that the attribute exists, not what it says.',
      'Whether an image should be decorative. That depends on why it is on the page.',
      'Colour contrast of text, borders, focus indicators and icons.',
      'Whether a custom widget really works with a keyboard or a screen reader: focus order, keyboard traps, live region behaviour.',
      'Content inside cross-origin frames, plugins, canvas, video, and text baked into images.',
      'Whether the reading order makes sense, whether instructions are clear, and whether an error message actually helps.',
      'Timing, moving content, and captions or transcripts for media.',
      'Anything that requires listening to the page with an actual screen reader.',
    ],
    ownUiHeading: 'About the toolbar itself',
    ownUi:
      'The toolbar\u2019s own controls are built from real buttons, switches, ranges and fieldsets, are reachable and operable by keyboard, show a visible focus indicator and announce their state. That statement is about the toolbar, not about this page.',
    scope:
      'Scanned the page body, skipping regions marked data-a11ytb-exclude and the toolbar\u2019s own interface.',
    report: {
      title: 'Accessibility audit report',
      page: 'Page: {url}',
      generated: 'Generated: {time}',
      framing: [
        'Produced by an automated, read-only inspection of the page markup.',
        'It lists what a DOM inspection can prove, and separately what only a person can decide.',
        'It is not a WCAG conformance statement, and the absence of findings is not evidence of conformance.',
      ],
      summary:
        'Summary: {errors} detected problem(s), {warnings} warning(s), {notes} note(s), {review} item(s) needing a human decision.',
      countersHeading: 'Counts',
      detectedHeading: 'Detected problems (proved by the markup)',
      reviewHeading: 'Needs a human decision',
      noneDetected: '- none',
      noneReview: '- none',
      truncated: 'Note: some findings were omitted to keep this report short.',
      caveats: [
        'The presence of alt text does not mean a description is accurate; this audit cannot judge meaning.',
        'Automated checks cover a small part of WCAG. Manual keyboard and screen reader testing is still needed.',
        'Nothing in the page was changed. Fixes belong in the application markup.',
      ],
    },
  },

  /** Copy for the image alt text feature. */
  altText: {
    heading: 'Image alternative text',
    intro:
      'Review missing or suspicious alt text on images in this page. Generate a draft where the site has configured an authorized AI service, then apply it only after review.',
    qualityCaveat:
      'A count of images with alt text is not a quality score. The audit cannot tell an accurate description from a file name, and neither can any automated tool.',
    neverWrites:
      'AI suggestions can be inaccurate. Check the image’s purpose before applying a description or marking it decorative.',
    examplesHeading: 'Meaningful and decorative images, side by side',
    exampleMeaningfulLabel: 'Meaningful image',
    exampleMeaningfulNote:
      'Carries information, so it needs alt text describing its purpose in this context: "Bar chart: revenue rose from 2.1 million in Q1 to 3.4 million in Q4".',
    exampleDecorativeLabel: 'Decorative image',
    exampleDecorativeNote:
      'Purely visual, so it gets alt="" and is skipped by assistive technology. No role="presentation" is needed.',
    exampleCodeHeading: 'The same two images in markup',
    componentHeading: 'Make the decision explicit in code',
    componentIntro:
      'AccessibleImage requires a decision: a description, or decorative. Leaving both out warns in development and leaves the alt attribute off, so an audit still reports it.',
    componentCode: `import { AccessibleImage, Figure } from './accessibility';

<AccessibleImage src="/q4-revenue.png"
                 alt="Bar chart: revenue rose from 2.1 million in Q1 to 3.4 million in Q4" />

<AccessibleImage src="/divider-swirl.png" decorative />

<Figure caption="Revenue by quarter">
  <AccessibleImage src="/chart.png" alt="Q4 is the highest quarter at 3.4 million" />
</Figure>`,
    fixHeading: 'Findings about images on this page',
  },

  /** Copy for the form label feature. */
  formLabels: {
    heading: 'Form labels',
    intro:
      'What the audit found about naming form controls, and the components that get it right in the markup.',
    placeholderNote:
      'A placeholder is not a label: it is not a reliable accessible name, and it disappears as soon as the user types.',
    titleNote:
      'A title attribute does provide a name, but it is announced inconsistently, is invisible on touch devices and does not help sighted users.',
    componentHeading: 'Label controls with these components',
    componentIntro:
      'They render a real label element, wire hints and errors with aria-describedby, and set aria-invalid when there is an error. Focus is never removed and outlines are never suppressed.',
    componentCode: `import { TextField, RadioGroupField, CheckboxField } from './accessibility';

<TextField label="Email address" type="email" hint="Only used for your receipt"
           error={errors.email} required value={email} onChange={setEmail} />

<RadioGroupField legend="Delivery speed" name="speed" value={speed} onChange={setSpeed}
                 options={[{ value: 'standard', label: 'Standard, 3-5 days' },
                           { value: 'express', label: 'Express, next day' }]} />

<CheckboxField label="Email me a copy" checked={copyMe} onChange={setCopyMe} />`,
    focusNote:
      'On submit, move focus to the first invalid field or to an error summary instead of relying on live regions. The field then reads out its label, its value and its error in one go.',
    fixHeading: 'Findings about controls on this page',
  },

  /** Copy for the headings and landmarks feature. */
  headingsLandmarks: {
    heading: 'Headings and landmarks',
    intro:
      'The heading outline of this page, what the audit found about structure, and the markup that fixes it.',
    countsLine: '{headings} heading(s), {mains} main landmark(s), {navs} navigation landmark(s).',
    outlineHeading: 'Heading outline',
    outlineEmpty: 'No headings were found, so there is no outline to show.',
    outlineLevel: 'Level {level}',
    outlineUnlevelled: 'No level',
    outlineHidden: 'hidden from assistive technology',
    outlineJump: 'Go to heading: {text}',
    structureHeading: 'What good structure looks like',
    structureIntro:
      'Semantic elements first: main, nav, header, footer and real headings. ARIA is only needed to name things that HTML cannot, such as a second navigation landmark.',
    componentHeading: 'Use the structure components',
    componentCode: `import { SkipLink, Main, Section } from './accessibility';

<SkipLink targetId="main" />

<header>
  <nav aria-label="Main">...</nav>
</header>

<Main id="main">
  <h1>Account settings</h1>
  <Section level={2} heading="Billing">
    <h3>Invoices</h3>
  </Section>
</Main>

<nav aria-label="Breadcrumb">...</nav>`,
    fixHeading: 'Findings about structure on this page',
  },

  /** Copy for the status announcements feature. */
  status: {
    heading: 'Status announcements',
    intro:
      'Controls how much the toolbar says out loud, and shows what it announced so duplicates are easy to spot.',
    verbosityLegend: 'How much should the toolbar announce?',
    verbosityMinimal: 'Only errors and protective actions',
    verbosityStandard: 'State changes I make (recommended)',
    verbosityVerbose: 'Everything, including scan progress',
    routeLabel: 'Announce navigation changes',
    routeHint:
      'Says the new page title when the address or title changes without a page load. If the application already announces navigation you will hear it twice \u2014 turn this off.',
    highlightLabel: 'Outline the element a finding points at',
    highlightHint:
      'Shows a temporary outline around the element when you ask to be shown where a finding is. The outline never changes the layout and is removed after a few seconds.',
    preview: 'Preview an announcement',
    previewMessage: 'This is what an announcement sounds like.',
    logHeading: 'Recent announcements',
    logEmpty: 'Nothing announced yet.',
    logPolitenessPolite: 'polite',
    logPolitenessAssertive: 'interrupts',
    logSuppressedVerbosity: 'dropped: verbosity',
    logSuppressedDuplicate: 'dropped: duplicate',
    logClear: 'Clear this list',
    guidanceHeading: 'One message, one channel',
    guidance: [
      'Use role="status" for confirmations and progress: it is polite and waits for a pause in speech.',
      'Use role="alert" only for errors that must interrupt. An alert on every keystroke makes a form unusable.',
      'Render the live region before the message: a region that appears with its text already inside is often missed. StatusMessage does this for you.',
      'Pick one channel per message \u2014 a visible StatusMessage or the toolbar announcement, never both.',
      'aria-atomic="true" makes the whole sentence read as one unit; without it some screen readers read only the part that changed.',
      'Never move focus just to announce something. Focus moves when the user\u2019s action requires it.',
    ],
    componentCode: `import { StatusMessage, LiveAnnouncement, useAnnounce } from './accessibility';

// Visible status: the region itself is the announcement
<StatusMessage>{saved ? 'Draft saved' : ''}</StatusMessage>

// An error that must interrupt
<StatusMessage role="alert">{submitError}</StatusMessage>

// Nothing on screen? Use the shared service (deduplicated, respects verbosity)
const announce = useAnnounce();
announce('Filters applied: 3 results');`,
  },

  /** Copy for the accessible error messages feature. */
  errors: {
    heading: 'Accessible error messages',
    intro:
      'Field errors that a screen reader can find, and a form-level summary that receives focus after a failed submission.',
    summaryHeading: 'Form-level summary',
    summaryTitle: 'There is a problem',
    announceSummary: 'There is a problem. {count} field(s) need attention.',
    summaryIntro:
      'The summary lists every problem as a link to the field that caused it. Focus moves to the summary after a failed submission, and that focus is what makes a screen reader read it \u2014 so the summary needs no live region of its own.',
    componentHeading: 'Components',
    componentIntro:
      'useFormErrors owns the error state and the focus move; FormErrorSummary renders the list; the field components wire each message to its input with aria-describedby and set aria-invalid.',
    summaryCode: `import { FormErrorSummary, TextField, useFormErrors } from './accessibility';

function SignUp() {
  const [values, setValues] = useState({ email: '', password: '' });
  const form = useFormErrors();

  const onSubmit = async (event) => {
    event.preventDefault();
    const problems = validate(values);            // { email: 'Enter an email address' }
    if (Object.keys(problems).length > 0) {
      form.handleFailure(problems);                // stores them and focuses the summary
      return;
    }
    await save(values);
  };

  return (
    <form onSubmit={onSubmit} noValidate>
      <FormErrorSummary form={form} />
      <TextField label="Email" value={values.email} error={form.errors.email}
                 onChange={(next) => { setValues({ ...values, email: next }); form.clear('email'); }} />
      <TextField label="Password" type="password" value={values.password}
                 error={form.errors.password}
                 onChange={(next) => setValues({ ...values, password: next })} />
      <button type="submit">Create account</button>
    </form>
  );
}`,
    fieldCode: `<!-- What the components render for one invalid field -->
<label for="email">Email address</label>
<input id="email" type="email" aria-invalid="true"
       aria-describedby="email-hint email-error">
<p id="email-hint">We only use this to send your receipt.</p>
<p id="email-error"><span>Error: </span>Enter an address in the form name@example.com.</p>`,
    auditHeading: 'Findings about error messages on this page',
    guidanceHeading: 'Rules these components follow',
    guidance: [
      'The message is real text associated with the field through aria-describedby, and the field carries aria-invalid="true". Nothing is signalled by colour alone.',
      'The message says what to do ("Enter an address in the form name@example.com"), not just what went wrong.',
      'On a failed submission, focus moves to the summary once. The summary is focusable, so it is read without a live region.',
      'The summary is not also role="alert": focusing it and announcing it would make a screen reader say everything twice.',
      'Live announcements are opt-in. Turn them on only if your form cannot move focus for some reason.',
    ],
    announceLabel: 'Also announce errors out loud',
    announceHint:
      'Off by default. Moving focus to the summary or to the field already reads the message; announcing as well makes a screen reader say it twice.',
  },

  /** Copy for the show/hide password feature. */
  password: {
    heading: 'Show and hide password',
    intro:
      'A password field with a keyboard-accessible control that switches the input between password and plain text, without moving or copying the value.',
    toggleLabel: 'Offer a show/hide control on password fields',
    toggleHint:
      'Adds a Show/Hide button to password fields built with PasswordField. The value stays inside the input: it is never copied, logged, announced or stored.',
    codeHeading: 'PasswordField',
    code: `import { PasswordField } from './accessibility';

<PasswordField
  label="Password"
  autoComplete="current-password"     // or "new-password" when creating one
  value={password}
  onChange={setPassword}
  error={form.errors.password}
  hint="At least 12 characters. Pasting from a password manager is fine."
/>`,
    guaranteesHeading: 'What the component guarantees',
    guarantees: [
      'The toggle is a real button, reachable in DOM order right after the field, with a visible focus indicator and a 24px minimum target.',
      'Its state is exposed with aria-pressed, its name says what it controls ("Show password for Password"), and aria-controls points at the field.',
      'The value is preserved because the same input element only changes its type attribute. Caret position is restored after the switch.',
      'The announcement reports the state ("Password shown"), never the value.',
      'The control is off until the user asks for it, and it never turns visibility on by itself.',
    ],
    boundaryHeading: 'What the toolbar will not do',
    boundary:
      'The toolbar does not inject toggles into password fields it did not create. Adding a button inside another team\u2019s form can break their layout, their validation and their tests, and deciding to reveal a credential belongs to the form that owns it. The audit reports what a form is missing; the form makes the change.',
    showLabel: 'Show',
    hideLabel: 'Hide',
    ariaShow: 'Show password for {label}',
    ariaHide: 'Hide password for {label}',
    showAnnouncement: 'Password shown. The text is visible on screen.',
    hideAnnouncement: 'Password hidden.',
    pasteNote: 'Pasting from a password manager is allowed.',
  },

  /** Copy for the accessible authentication feature. */
  auth: {
    heading: 'Accessible authentication',
    intro:
      'Markup and guidance for sign-in, registration, password reset and one-time codes: the right autocomplete values, no blocked pasting, and alternatives to memory tests.',
    boundaryHeading: 'What a toolbar cannot repair',
    boundary: [
      'Authentication is controlled by the site that owns the sign-in. A toolbar cannot make someone else\u2019s login flow meet WCAG 3.3.8, and nothing here should be read as a conformance claim about this page.',
      'The toolbar never signs in for the user, never fills a credential, never bypasses a check, and never removes a site\u2019s own event handlers. Silent changes to a security flow are exactly the kind of "fix" that breaks other teams.',
      'What it can do is report what the markup proves — missing autocomplete values, autocomplete="off" on credential fields, inline paste blockers, and signals of a memory test — and hand the fix to whoever owns the code.',
    ],
    autocompleteHeading: 'Autocomplete values to use',
    autocompleteIntro:
      'These values are what let browsers and password managers fill a field correctly, and they are how 1.3.5 Identify Input Purpose is met.',
    autocompleteRows: [
      { situation: 'Sign-in identifier (email or user name)', value: 'username', why: 'Lets the manager fill the account name it stored.' },
      { situation: 'Sign-in password', value: 'current-password', why: 'Offers the saved password instead of asking the user to recall it.' },
      { situation: 'New password (registration, reset, change)', value: 'new-password', why: 'Triggers a strong-password suggestion and avoids autofilling the old one.' },
      { situation: 'Repeat of a new password', value: 'new-password', why: 'Pasting is essential here, and this keeps managers filling both boxes.' },
      { situation: 'One-time code', value: 'one-time-code', why: 'On iOS and Android the code can be offered straight from the SMS or authenticator.' },
      { situation: 'Email address collected for its own sake', value: 'email', why: 'Correct purpose, correct keyboard, correct autofill.' },
    ],
    privacyHeading: 'What the toolbar stores',
    privacy: [
      'Accessibility preferences contain settings only: sizes, switches and profile choices. There is one storage key, assistaccess.a11y.settings.',
      'No password, one-time code, token, session identifier or field value is ever written to it. The value in a password field stays in that input, in the page.',
      'The exported settings file contains the same preferences and nothing else, so it is safe to share between devices.',
      'The audit reads attributes such as autocomplete and type. It never reads the value of a password field, and it cannot: nothing in the module touches input.value for credential fields.',
    ],
    recoveryHeading: 'Recovery and multifactor guidance',
    recovery: [
      'Offer a non-cognitive alternative on every step: an emailed sign-in link, a code sent to a device, or support contact details. A memory or puzzle test must never be the only way in (3.3.8).',
      'Allow pasting everywhere, including the "repeat password" field: blocking paste blocks password managers and forces weak, memorable passwords.',
      'For one-time codes, use one input with autocomplete="one-time-code" and inputMode="numeric" rather than six separate boxes: a single field works with autofill, screen readers and screen magnifiers.',
      'Do not auto-submit when a code is complete. Submit-on-complete removes the user\u2019s chance to check what they typed.',
      'State the code\u2019s lifetime in text and give a resend control that reports its result through a status message.',
      'Never place a code or password in the page title, an ARIA label, a data attribute or a log line.',
    ],
    examplesHeading: 'Ready-made example forms',
    examplesIntro:
      'Controlled components: they hold no state of their own and store nothing. Wire them to your own submit handler.',
    code: `import { SignInForm, RegistrationForm, PasswordResetForm, OneTimeCodeStep } from './accessibility';

<SignInForm
  values={credentials} onChange={setCredentials} onSubmit={signIn}
  errors={form.errors} pending={pending}
  onUseEmailLink={() => sendMagicLink(credentials.email)}
/>

<OneTimeCodeStep
  value={code} onChange={setCode} onSubmit={verifyCode} onResend={resendCode}
  errors={form.errors} pending={pending}
/>`,
    auditHeading: 'Findings about authentication fields on this page',
  },

  /** Copy for the confirmation feature. */
  confirm: {
    heading: 'Confirmation before important actions',
    intro:
      'One accessible confirmation dialog for the whole application, built on the native dialog element, with focus returned to the control that opened it.',
    whenHeading: 'When a confirmation is worth it',
    when: [
      'The action cannot be undone: deleting, replacing, revoking, closing an account.',
      'The action spends money, sends something to another person, or submits legal or financial data (3.3.4).',
      'The action discards unsaved work.',
    ],
    whenNot: [
      'Routine, reversible actions. A confirmation on every save or navigation trains people to dismiss dialogs without reading them, which removes the protection where it was needed.',
      'Actions that are already reversible with an undo. Offer the undo instead.',
      'Anything the user just confirmed in a previous step.',
    ],
    codeHeading: 'Using the confirmation service',
    code: `import { useConfirm, ConfirmButton, ReviewAndConfirm } from './accessibility';

function DangerZone() {
  const confirm = useConfirm();

  const deleteAccount = async () => {
    const ok = await confirm({
      title: 'Delete this account?',
      description: 'The account and all of its reports are removed immediately.',
      details: ['3 reports will be deleted', 'Team members will lose access'],
      confirmLabel: 'Delete account',
      destructive: true,
    });
    if (ok) await api.deleteAccount();
  };

  return <button type="button" onClick={deleteAccount}>Delete account</button>;
}

// Or wrap the button:
<ConfirmButton
  confirm={{ title: 'Remove this member?', destructive: true, confirmLabel: 'Remove' }}
  onConfirm={removeMember}
>
  Remove
</ConfirmButton>`,
    reviewCode: `<ReviewAndConfirm
  title="Review your transfer"
  items={[{ label: 'From', value: 'Current account' },
          { label: 'To', value: 'GB29 NWBK 6016 1331 9268 19' },
          { label: 'Amount', value: '1,250.00 GBP' }]}
  onEdit={() => setStep('details')}
  confirmLabel="Send 1,250.00 GBP"
  onConfirm={submitTransfer}
/>`,
    demoHeading: 'Try the dialog',
    demoIntro:
      'The demo deletes nothing. It exists so the keyboard and screen reader behaviour can be tested without touching real data.',
    demoItem: 'the demo report',
    demoButton: 'Delete the demo report',
    demoDone: 'The demo report was deleted. Nothing real was removed.',
    demoItemGone: 'The demo report has been deleted.',
    dialogTitle: 'Are you sure?',
    dialogConfirm: 'Confirm',
    dialogCancel: 'Cancel',
    guidanceHeading: 'What the dialog does',
    guidance: [
      'It is a native <dialog> opened with showModal(), so the browser provides the focus trap, the inert background and the top layer.',
      'Escape cancels. A backdrop press cancels.',
      'Focus moves into the dialog on open: to Cancel for a destructive action, to the primary action otherwise.',
      'Focus returns to the control that opened it when the dialog closes, whether the user confirmed or cancelled.',
      'The dialog is named by its title and described by its description, so a screen reader reads both when it opens. Nothing is announced separately, which is what keeps it to one utterance.',
      'The buttons are real buttons: Enter or Space activates the one that has focus, and there is no implicit submission that could fire a destructive action by accident.',
    ],
  },

  /** Copy for saved preferences, reset and profiles. */
  preferences: {
    heading: 'Saved preferences',
    intro:
      'Where these settings live, what they contain, and how to move them to another browser or device.',
    storageHeading: 'This browser',
    modeLocal: 'Saved in this browser with localStorage, on this device only.',
    modeSession: 'Saved for this tab only. Closing the tab forgets them.',
    modeMemory:
      'Not saved: this browser is blocking storage, so these settings last until the page is closed.',
    keyLabel: 'Storage key',
    savedAt: 'Last saved at {time}.',
    neverSaved: 'Nothing has been saved yet.',
    saveError: 'The last save failed. The settings still apply on this page, but they will be lost when it closes.',
    saveNow: 'Save now',
    caveatsHeading: 'About saved preferences',
    caveats: [
      'Preferences are stored per browser and per device. Another browser, another device or a different profile on this computer starts from the defaults.',
      'Clearing browsing data, private windows and some privacy tools remove them.',
      'Storage can be disabled entirely, by policy or by the browser. The toolbar then keeps your settings for the page only, and says so here instead of pretending they were saved.',
      'The settings are stored as a single JSON value under one key and are never sent anywhere.',
    ],
    contentHeading: 'What is stored',
    contentIntro:
      'Settings only: the same values the panels show. Expand to read the exact payload that is written to storage.',
    showPayload: 'Show the saved data',
    payloadLabel: 'Saved preferences as JSON',
    notStoredHeading: 'What is never stored',
    notStored: [
      'Passwords, one-time codes, security answers or any other value typed into a field.',
      'Authentication tokens, session identifiers or cookies.',
      'Page content, page addresses, or anything about the sites you visit.',
      'Per-page flashing allowances: they stay in this browser and are deliberately left out of exports.',
    ],
    transferHeading: 'Move or back up preferences',
    transferIntro:
      'Export writes a small JSON file. Import validates and clamps every value before applying anything, and adds profiles instead of replacing the ones you already have.',
    exportLabel: 'Export preferences',
    exportBlocked: 'The download was blocked by the browser, so the file is shown below instead.',
    importLabel: 'Import preferences',
    importHint: 'Choose a file exported from this toolbar. Nothing is applied until it has been validated.',
    importErrors: {
      empty: 'the file was empty',
      'too-large': 'the file is too large to be a preferences export',
      'invalid-json': 'it is not valid JSON',
      'not-an-object': 'the file does not contain an object',
      'no-settings': 'no settings were found in the file',
    },
    deleteLabel: 'Remove the saved preferences from this browser',
    deleteHint: 'Deletes the storage entry and returns every setting to its default.',
    apiHeading: 'For developers',
    apiIntro:
      'Other components read and write the same store through the exported hooks. Nothing needs to know how persistence works.',
    apiCode: `import { AccessibilityProvider, useA11ySettings, useA11ySetting } from './accessibility';

function ContrastBadge() {
  // Read one value; re-renders only when that value changes.
  const contrast = useA11ySetting((s) => s.visual.contrast, 100);
  if (contrast === 100) return null;
  return <p>Contrast: {contrast}%</p>;
}

function ResetButton() {
  const { settings, actions, meta } = useA11ySettings();
  return (
    <button type="button" onClick={() => actions.resetScope('visual')}>
      Reset visual ({settings.visual.contrast}%, saved: {meta.lastSavedAt ? 'yes' : 'not yet'})
    </button>
  );
}

// Outside React:
import { subscribeToA11yEvents, EVENTS } from './accessibility';
subscribeToA11yEvents(EVENTS.SETTINGS_CHANGED, ({ settings }) => applyTheme(settings));`,
  },
  reset: {
    heading: 'Reset settings',
    intro:
      'Returns settings to their defaults and applies the change immediately, without a page reload.',
    scopeLegend: 'What to reset',
    scopeLabels: {
      all: 'Everything',
      visual: 'Visual adjustments',
      motion: 'Motion and flashing protection',
      reader: 'Reading, audit and announcements',
      forms: 'Forms, passwords and confirmation',
    },
    scopeDescriptions: {
      all: 'Every group returns to its default value.',
      visual: 'Brightness, contrast, saturation, presets and the filter target.',
      motion: 'Reduced motion, animation handling, autoplaying media and the flashing-protection policy.',
      reader: 'The page audit, announcement verbosity, navigation announcements and finding highlights.',
      forms: 'The password toggle, error announcements and the confirmation dialog settings.',
    },
    button: 'Reset settings',
    keepsHeading: 'What a reset keeps',
    keeps: [
      'Your saved profiles, which are content you created rather than a preference. Delete them one by one in the profiles panel if you want them gone.',
      'The per-page flashing allowances, which record decisions about specific pages.',
      'Your choice about where the toolbar sits on screen (a layout preference of the host application).',
    ],
    undo: 'Undo the reset',
    undoHint: 'Available for {seconds} seconds after a reset.',
    undoExpired: 'The undo window has passed.',
    restoreDone: 'Previous settings restored.',
    confirmTitle: 'Reset {scope} to the defaults?',
    confirmDescription:
      'Every value in this group returns to its default immediately. You can undo it for {seconds} seconds afterwards.',
    confirmButton: 'Reset settings',
    deleteHeading: 'Delete stored preferences',
    defaultsHeading: 'The default configuration',
    defaultsIntro: 'A reset restores exactly these values.',
    profilesNote: 'Saved profiles are kept. See the profiles panel to delete them individually.',
  },
  profiles: {
    heading: 'Accessibility profiles',
    intro:
      'A profile is a named combination of existing settings. Applying one changes only the settings it lists and leaves everything else as you had it.',
    legend: 'Profile',
    customLabel: 'Custom',
    customActive:
      'Custom values: no profile matches the current settings. Changing a single value of a profile switches this label to Custom; nothing else is lost, and the profile stays available.',
    activeLine: 'Active: {name}.',
    honestNote:
      'Profiles are convenient starting points, not diagnoses or medical advice. Every value stays adjustable, and the sliders are the same ones you would use on their own.',
    applyHint: 'Choosing a profile applies its settings immediately and announces how many values changed.',
    saveHeading: 'Save the current settings as a profile',
    saveLabel: 'Profile name',
    saveHint:
      'Captures the visual, motion, reading, form and announcement settings as they are now, so you can return to this combination later.',
    saveButton: 'Save this profile',
    saveEmpty: 'Enter a name first.',
    saveDuplicate: 'A profile with this name already exists.',
    userHeading: 'Your profiles',
    savedByYou: 'saved by you',
    userEmpty: 'You have not saved any profiles yet.',
    deleteLabel: 'Delete profile: {name}',
    deleteButton: 'Delete',
    deleteConfirmTitle: 'Delete the profile “{name}”?',
    deleteConfirmDescription: 'Your current settings stay exactly as they are. Only the saved profile is removed.',
    osNote:
      'Default follows your operating system setting for reduced motion. The motion profiles only ever ask for less motion than the system allows, never more.',
    scopeNote:
      'A profile cannot touch anything outside these settings: not the application, not other modules’ state, and not the per-page flashing allowances.',
    configNote: 'The application can add its own profiles, or replace a built-in one, through config.profiles.',
  },

  /** Copy for the widget shell: launcher, quick settings and the panel frame. */
  widget: {
    launcher: 'Open accessibility settings',
    subtitle: 'Display, motion and reading options for this page',
    quickHeading: 'Quick settings',
    profilesLabel: 'Profile',
    customProfile: 'Custom',
    motionLabel: 'Motion',
    visualLabel: 'Display',
    actionsLabel: 'Preferences',
    saveNow: 'Save now',
    resetAll: 'Reset everything',
    savedAt: 'Saved at {time}.',
    notSavedYet: 'Not saved yet.',
    checkHeading: 'Page check',
    checkAgain: 'Check again',
    checkNote:
      'Automatic checks find structural problems only. They cannot judge whether a description, label or heading is accurate, and they never change the page.',
    featuresHeading: 'All accessibility settings',
    missingPanel:
      'This feature has no panel attached. It is a wiring problem in the toolbar, not something you can fix here.',
    limitations:
      'This toolbar changes how this page is displayed and announced. It cannot fix a website you do not control, and it is not a conformance statement.',
  },

  /** Copy for the app-owned SafeAnimatedContent pattern (patterns/). */  pattern: {
    controlsLabel: 'Animation controls',
    play: 'Play animation',
    pause: 'Pause animation',
    stop: 'Stop and reset animation',
    hide: 'Hide animation',
    show: 'Show animation',
    pausedNotice: 'This animation is paused. Start it with the play button.',
    reducedNotice:
      'This animation is paused because reduced motion is requested. You can start it deliberately.',
    hiddenNotice: 'This animation is hidden.',
    unsafeWarning:
      'This animation is configured above the safe flashing rate. Reduce it to three flashes per second or fewer.',
  },
  announcements: {    visualsOn: 'Visual adjustments on.',
    visualsOff: 'Visual adjustments off.',
    brightness: 'Brightness {value} percent.',
    contrast: 'Contrast {value} percent.',
    saturation: 'Saturation {value} percent.',
    preset: '{name} preset applied.',
    visualsReset: 'Visual adjustments reset.',
    targetDocument: 'Visual filters applied to the whole page.',
    targetContentRoot: 'Visual filters applied to the content area only.',
    reduceMotionOn: 'Reduce motion on.',
    reduceMotionOff: 'Reduce motion off.',
    reduceMotionSystemOn: 'Following your system setting. Reduce motion is on.',
    reduceMotionSystemOff: 'Following your system setting. Reduce motion is off.',
    strategyInstant: 'Animations will finish immediately.',
    strategyPause: 'Animations will pause at their current frame.',
    pauseAnimationsOn: 'Animations and transitions paused.',
    pauseAnimationsOff: 'Animations and transitions resumed.',
    pauseMediaOn: 'Autoplaying media paused.',
    pauseMediaOff: 'The toolbar will stop pausing autoplaying media. Use the player controls to resume playback.',
    guardOn: 'Flashing protection on.',
    guardOff: 'Flashing protection off.',
    guardAction: 'Flashing protection will {action}.',
    guardPausedOne: 'One animation was paused because it may flash more than three times per second.',
    guardPausedMany: '{count} items were paused or hidden because they may flash more than three times per second.',
    guardNone: 'Check finished. Nothing above the flashing threshold was found.',
    guardFailed: 'Flashing protection is not supported in this browser.',
    restored: 'Restored the element.',
    allowed: 'This element will be left alone on this page.',
    unallowed: 'This element will be checked again.',
    restoredAll: 'All changes made by flashing protection were reverted.',
    storageUnavailable: 'Your browser is blocking saved settings. Changes apply until you close this page.',
    settingsLoadFailed: 'Saved settings could not be read, so defaults were loaded.',
    verbosityMinimal: 'Announcements reduced to errors and protective actions.',
    verbosityStandard: 'Announcements set to state changes you make.',
    verbosityVerbose: 'Announcements include scan details and progress.',
    routeChangesOn: 'Navigation changes will be announced.',
    routeChangesOff: 'Navigation changes will not be announced.',
    auditOn: 'Page audit on. Checking the page now.',
    auditOff: 'Page audit off.',
    highlightOn: 'Findings will be outlined on the page when you ask to be shown where they are.',
    highlightOff: 'Findings will not be outlined on the page.',
    routeChange: 'Navigated to {title}.',
    routeChangeUntitled: 'Navigated to {path}.',
    auditSummary:
      'Audit finished: {errors} detected problem(s), {warnings} warning(s), {review} item(s) needing a human decision.',
    auditClean: 'Audit finished. Nothing detected by these checks.',
    auditDisabled: 'The page audit is off, so there is no report to read.',
    passwordToggleOn: 'Password fields will show a show/hide control.',
    passwordToggleOff: 'Password fields will not show a show/hide control.',
    errorAnnounceOn:
      'Field errors will also be announced. Focus already reads them, so you may hear each message twice.',
    errorAnnounceOff: 'Field errors will be read when focus moves to them, not announced separately.',
    profileApplied: 'Profile applied: {name}. {count} setting(s) changed.',
    profileSaved: 'Profile saved: {name}.',
    profileDeleted: 'Profile deleted: {name}.',
    resetDone: 'Reset done: {scope}. You can undo this for {seconds} seconds.',
    resetUndone: 'The reset was undone. Your previous settings are back.',
    savedNow: 'Preferences saved in this browser.',
    saveFailed: 'Saving failed. This browser is not accepting stored preferences.',
    exportDone: 'The preferences file was downloaded.',
    exportFailed: 'The download was blocked. The preferences are shown in the panel so you can copy them.',
    importDone: 'Preferences imported: {count} setting(s) applied.',
    importFailed: 'Nothing was imported: {reason}.',
    storageCleared: 'The stored preferences were removed from this browser. Defaults are now in use.',
  },
};

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function merge(base, override) {
  const output = { ...base };
  Object.keys(override || {}).forEach((key) => {
    const next = override[key];
    if (isPlainObject(next) && isPlainObject(base[key])) {
      output[key] = merge(base[key], next);
    } else if (next !== undefined) {
      output[key] = next;
    }
  });
  return output;
}

/**
 * Build the copy table for a configuration.
 * @param {object} [overrides] partial overrides
 */
export function createStrings(overrides) {
  if (!overrides) return defaultStrings;
  return merge(defaultStrings, overrides);
}

/**
 * Replace {placeholders} in a copy string.
 * Unknown placeholders are left untouched so a missing value is visible in
 * development rather than rendering "undefined".
 */
export function formatMessage(template, values = {}) {
  if (typeof template !== 'string') return '';
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    const value = values[key];
    return value === undefined || value === null ? match : String(value);
  });
}
