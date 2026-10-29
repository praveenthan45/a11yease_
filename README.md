## VPS / Node.js hosting

For the fixed production widget, HTTPS setup, persistent storage and migration
from Render, follow [the VPS deployment guide](deploy/vps/DEPLOY.md).

## cPanel testing deployment

The payment-free testing release can be packaged with `npm run package:cpanel`.
Upload `release/A11yease-cPanel.zip` using the instructions in
[deploy/cpanel/DEPLOY.md](deploy/cpanel/DEPLOY.md). The ZIP excludes credentials
and account data. Node 22/24, HTTPS, private persistent storage and a single app
worker are required. `npm run test:server` runs isolated HTTP integration checks;
it needs permission to connect to its temporary localhost server.

# A11yease — unified team widget

The Docker demo now combines all four developers' modules in **one launcher and one searchable panel with 61 controls**. Reset, preference import/export and saved profiles cover the combined settings. The original projects remain available for development; the demo does not load their separate launchers.

## Build and run

```sh
npm ci
npm run build
npm test
docker compose up -d --build
```

Open http://localhost:1434/. The landing page now requires admin sign-in. `start-server.bat` requires Node.js 24 or newer; `start-docker.bat` only requires Docker Desktop. After editing module source, rebuild with `npm run build` before rebuilding Docker.

## Admin sign-in

Before running a fresh checkout, run `powershell -NoProfile -File .\configure-admin.ps1` and enter your admin username and password. The configuration tool writes a salted scrypt password hash to `.local/admin-auth.json`. This directory is ignored by Git and excluded from the Docker image; Compose mounts the file as a read-only secret. Do not publish this file. Restart the server after changing credentials.

Only this single configured administrator can sign in. Public account registration and client logins are removed. Database deletion is opt-in: when explicitly started with `REMOVE_CLIENT_ACCOUNTS=true`, the server validates its administrator credential file, then permanently removes existing client account credentials from that instance's platform store. Existing websites, installation keys and payment records are retained and managed by the administrator. The default does not delete stored account records. Configure the private administrator credential file separately; credentials are never distributed in the frontend or Git repository. The local account cleanup does not modify a live deployment or its database.

Authentication is verified by `server/admin.mjs`, with rate limits, same-origin POST checks, a CSRF token for logout, random server-side sessions and an HttpOnly/SameSite=Strict session cookie. The protected HTML and media require authentication; the login page and reusable widget assets remain public. Credentials are never bundled into browser JavaScript. Log out invalidates the session immediately; refresh retains it. Server restart invalidates all sessions. Server sessions expire after 8 hours. Session cookies normally end when the browser exits, but a browser's session-restore feature may restore them; a website cannot reliably detect browser closure separately from refresh/crash.

The supplied Compose configuration binds only to localhost over HTTP. For public hosting, use an HTTPS reverse proxy and set `COOKIE_SECURE=true` before exposing the server. Do not use a plain static server for the protected admin pages: it bypasses authentication. The existing accessibility widget remains reusable independently of this admin login.

The default page is an accessibility playground with a guide for all 45 settings. Each guide item opens its matching control and explains what to try and compare. Samples include reading/color content, compact links, three captioned videos, shared-provider sign-in/password/error fields, a reversible report confirmation, status updates, gentle motion, muted looping media and opt-in incomplete image/label audit fixtures. The session callback extends only the in-memory demo countdown. Form samples do not send data or access accounts. Live microphone and screen-reader checks require browser/device support; the page contains no rapid flashes. The original learning page remains at `/learning-demo.html`.

## Team integration

- Rahul: the original 13 reading, keyboard, voice and caption controls in `dist/widget.js`.
- Praveen: 12 text size, theme, color vision, spacing, font and reading tool controls, reusing the engines in `visual-accessibility-widget/src/`.
- Sudhin: transcripts, extractive summaries, progress, distraction reduction, guided headings, visual notifications and a real host callback for session extension.
- Navin: 11 visual, motion, page audit, announcement and form integration panels from `AssistAccess/src/accessibility/`. Its reset, preferences and profiles are replaced by the shared controls.
- Shared: import/export and profiles in `integration/index.jsx`. Vite builds the React dependency and reused modules into `dist/team-features.js`.

Copy `widget.js`, `team-features.js`, `accessibility-badge.png` and `OpenDyslexic-OFL.txt` from `dist` into the same assets folder. Load only `widget.js`; it loads the team bundle relative to its own URL:

```html
<script src="/assets/widget.js" defer></script>
```

The panel opens at a fixed 420px width on desktop. On phones (540px and narrower),
it opens as a bottom sheet at about 60% of the viewport height. Compact rows and
a 500px minimum target show the first five settings on standard phone screens,
while leaving at least 72px of the website visible. Shorter viewports cap the
sheet height to preserve that website space. Settings scroll inside the sheet;
close, language, search and reset stay accessible. Dragging the desktop header moves the panel; resizing and
previously saved custom sizes are disabled.

The first section below search is **Accessibility modes**, with Dyslexia Mode,
Grayscale Mode, Color Blindness Mode, Cognitive Disability Mode and Cognitive
Reading Mode. Voice Command is under Navigation; Text to Speech is under Reading with its
speed control. These use the existing settings, saved preferences and reset action.
Text to Speech has a plus/minus button that opens its Adjustable Reading Speed
dropdown. Enabling Text to Speech also opens this control. Speed is no longer a
separate row under Reading; searching for reading speed opens it within the mode.
Other settings follow in their categories. Search sits to the left of a round
language flag button. Category headings show their names without icons or counts.
Each category has a plus/minus button to expand or collapse its settings.
Accessibility modes starts expanded; other categories start collapsed. Search
expands matching categories and restores the chosen layout when cleared. The
blue reset button and distinct setting icons use the shared widget theme.

The widget interface uses the five-color palette in `integration/widgetTheme.css`:
background `#F8FAFC`, cards `#FFFFFF`, text `#14253D`, accent `#155EEF` and buttons
`#0B3970`. It has readable labels, 44px control targets, clear keyboard focus and
distinct switch positions. Operating-system high contrast colors remain supported.

The widget also includes eleven additional controls (61 total):

| Location | Controls | Behaviour |
| --- | --- | --- |
| Accessibility modes | Cognitive Disability Mode | Adds accent-colored outlines to headings, hyperlinks and buttons; paragraphs and surrounding containers stay unboxed. |
| Accessibility modes | Cognitive Reading Mode | Emphasizes the beginning of each word and softens its remaining letters to help readers follow text across the page. Text size and page layout stay at their existing settings. |
| Vision | Highlight Titles; High Saturation; Low Saturation | Heading outlines and mutually exclusive 170%/50% color saturation. Saturation composes with grayscale and preserves floating page controls. |
| Vision | Adjust Text Color; Adjust Background Color; Adjust Title Color | Fifteen labelled color swatches, a selected-state indicator, preview, and an individual “Use website colors” reset. Text and heading colors remain independent. |
| Navigation | Big Dark Cursor; Big Light Cursor | Mutually exclusive outlined 48px cursors. |
| Navigation | Link Navigation | A live dropdown of visible, enabled links and buttons by accessible name. Duplicate names are numbered. Selecting an entry closes the panel, scrolls to the real control and focuses it; Enter or a click then activates it normally. |

Profiles apply a derived presentation without replacing individual preferences.
All additional preferences share save/reload, export/import, profiles, search and
Reset all. Old exports remain supported. The original five main modes remain first.
New setting titles are included in all 20 panel languages. Page link/button names
retain the host website’s wording.
Color overrides preserve readable button and input labels by choosing a contrasting
foreground when the requested text color has insufficient contrast against the detected background.

Behaviour references: [UserWay’s feature guide](https://help.userway.org/en/articles/9696274-getting-to-know-your-accessibility-widget-a-feature-by-feature-guide),
[accessWidget profiles](https://support.accessibe.com/hc/en-us/articles/29150094493714-What-are-accessibility-profiles-in-accessWidget),
and [W3C page structure guidance](https://www.w3.org/WAI/tutorials/page-structure/).
Run
`node --test tests/additional-settings.test.cjs` for these controls’ integration checks.

Optional plain-language replacements can be supplied before the script through `window.AccessEaseSimpleText`. Captions/transcripts require supplied tracks or transcripts; this widget does not generate missing audio transcriptions. Summaries extract existing sentences. Audits report markup problems; authentication, form validation and confirmation must be integrated into the host application's actions using the components described in `AssistAccess/INTEGRATION-FORMS.md`.

Session extension requires an application callback which actually extends its session on the server. The widget only reports success when the application confirms it:

```js
window.AccessEaseConfig = {
  extendSession: async ({ minutes }) => {
    const response = await fetch('/api/session/extend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ minutes })
    });
    return response.ok && (await response.json()).extended === true;
  }
};
```

Configure the endpoint and its authentication/CSRF protection in your application. Nothing extends a session when this callback is absent. Optional AssistAccess configuration can be passed as `window.AccessEaseConfig.assist`; AI alt-text services are not configured by default. Cross-origin frames and closed shadow roots remain outside the widget's reach.

Automated coverage: 17 simulated voice checks, 8 shortcut checks and 4 unified integration/helper checks. Microphone recognition still depends on the user's browser and permission.

## Original project guides

The repository retains the original projects alongside the unified build:

- **Visual Accessibility Widget (React + Vite):** the new project is in [`visual-accessibility-widget/`](visual-accessibility-widget/). It includes a live website demo, a standalone embeddable SDK, text sizing, appearance settings, color vision assistance and reading tools. See its [English setup and integration guide](visual-accessibility-widget/README.md).
- **Sudhin Standalone Widget:** the standalone script is `accessibility-widget.js`, with its demo in `demo.html`. See [Sudhin setup and feature guide](SUDHIN.md) and [standalone distribution](standalone-widget/README.md).
- **A11yease:** the existing static demo and Docker setup remain in the repository root. Its instructions are retained below.

To start the Visual Accessibility Widget:

```sh
cd visual-accessibility-widget
npm install
npm run dev
```

---

# A11yease

The separately developed React accessibility toolbar is in [AssistAccess/](AssistAccess/README.md), with its [project audit](AssistAccess/PROJECT-AUDIT.md). The instructions below describe the original static A11yease demo served by this repository's Docker setup.

A sample learning website with a reusable accessibility widget offering 13 settings. Open `dist/index.html` through a local static HTTP server. The floating button stays in the bottom right corner.

On Windows, double-click `start-server.bat` to run the authenticated Node server at `http://localhost:1434/`. Keep the terminal window open while using the website; Ctrl+C stops the server. Stop any previous server on port 1434 first.

## Run with Docker

Start Docker Desktop with the Linux container engine. Stop any other server using port 1434. Double-click `start-docker.bat` to build and start the container and open the website. The container keeps running after the batch window closes.

Alternatively, from this repository folder:

```powershell
docker compose up -d --build
```

Open `http://localhost:1434/`. The image serves `dist` through the authenticated Node server as a non-root user, and the published port is limited to this computer. Microphone/browser features still run in the user's browser. Re-run the command after editing website files to rebuild the image.

```powershell
docker compose logs -f web
docker compose down
```

The first command displays server logs; the second stops and removes this project's container. The Compose project is named `accessease`.

## Integrating the widget

For the unified build, copy the four assets listed above into the same website folder and add this before `</body>`:

```html
<script src="/assets/widget.js" defer></script>
```

The widget is framework independent and its interface uses Shadow DOM to avoid inheriting website styles. It modifies paragraphs and controls on the same page, including newly added content. It does not need account, backend or administrator access. Cross-origin iframes and other components' closed shadow roots are outside its reach. Include its script in each page or the shared app layout. Your site's content security policy must allow the script and injected styles.

The accessibility launcher opens one searchable grid containing 45 controls. Additional options expand within the grid. Active toggles have a checkmark, adjusted cards have an accent border, and the header displays the number of changed settings. The panel scrolls while keeping its header and shared Reset control available.

## Settings

1. Text-to-Speech reads only text highlighted with the cursor in the main region. Enable it, then drag to select a passage; you can also select text before enabling it. A plain click does not start reading. New selections interrupt the previous reading. It stays enabled after playback so another passage can be selected. Browser speech synthesis is required.
2. Adjustable Reading Speed controls the voice from 0.75× to 1.5×, with a gentle 1.1× option. Older saved or imported 2× preferences use 1.5×.
3. Text Alignment applies to all host page text, including headings, paragraphs, bold text, links, buttons, labels and inputs. It also adjusts text-bearing flex rows while preserving layout containers. The widget keeps its own control layout. Original removes the alignment overrides and restores the website's styling.
4. Simplified Text Mode works offline on English page text, including headings, paragraphs, inline text, navigation, buttons, labels, placeholders and image descriptions. Its built-in word and phrase rules work on other websites without a demo dictionary or an external API. Text in accessible open shadow roots and same-origin iframe documents is also covered, including new content and iframe reloads. Both demos additionally load `simple-text.js` before the widget for prepared sentence alternatives. The host can supply `window.AccessEaseSimpleText` as an original-text to simple-text dictionary or `<p data-simple="Plain text">Original content</p>` for a plain text block. Rules use word boundaries and preserve URLs, email addresses, file paths, inline code, numbers and identifiers. Inline elements, links and event handlers are preserved. Code, editable text, icon ligatures, selected values and form values are left alone; `data-simple-ignore` or `translate="no"` opts content out. Changes to language and opt-outs are respected while the mode is on. Turning it off restores original wording, including detached reusable components, without overwriting newer app updates. This is limited English wording simplification: already clear text, unmatched sentences, other languages, closed shadow roots, cross-origin frames and text inside images or canvas are not automatically rewritten. It does not perform AI sentence rewriting, generate summaries or guarantee that every sentence can be simplified.
5. Paragraph Highlighting highlights the hovered paragraph.
6. Keyboard Navigation covers all visible page text and controls, including headings, paragraphs, eyebrow text, labels, captions, lists and tables. Inline text within a paragraph or heading is grouped into one focus stop. Images, SVG artwork, image roles, hidden content and decorative symbols are skipped. Media controls remain keyboard accessible; use their native keys and Tab to move on. Use Tab or Shift+Tab to leave text fields and dropdowns. Turning the mode off restores the original tabindex values.
7. Visible Keyboard Focus adds a stronger outline to the current keyboard focus. When enabled on its own, it also makes all non-image page text reachable with Tab and Shift+Tab. Arrow navigation requires Keyboard Navigation. Text focus stops return to their original tabindex only when both features are off.
8. Skip to Main Content exposes a skip link when focused. Add a semantic `main` or `[role="main"]` to the host website.
9. Large Click Targets applies a minimum 45px target dimension to website links and controls, and to widget buttons and dropdowns. It preserves existing padding so controls that are already larger do not shrink. Turning it off restores the original sizes.
10. Voice Commands requests microphone permission when enabled. In Chrome, allow the site microphone prompt and wait for “Microphone ready” before speaking. Say “scroll down” or “scroll up” to move the open settings panel, or the page after closing settings. Say “click Save bookmark” or “click on the Save bookmark button” to activate a visible control by name; duplicate names need an ordinal such as “click second Explore this course.” The feature also supports next/previous, read selected text, stop reading, open/close settings, reset settings, and stop listening. The legacy “read page” phrase reads only selected text. A listening indicator stays visible after closing settings and shows command feedback. Only final recognition results execute commands; normal session endings reconnect automatically. Permission, microphone and speech service network errors disable voice input with an actionable message. Browser support varies; recognition may use the browser vendor's speech service and require internet access. Voice input starts from user interaction and stops on reload.
11. Switch Device Support supports switches mapped to Space (next) and Enter (activate). Input fields retain normal typing behavior. It provides manual stepping, not timed automatic scanning.
12. Sticky Keys Compatibility supports sequential Ctrl, Alt, A for the widget shortcut, including while a text field is focused. Alt's browser menu behaviour is suppressed during the Ctrl/Alt sequence. Unrelated typing and keyboard shortcuts remain native, and losing window focus cancels a partial sequence. The physical A key is also accepted for keyboard layout compatibility. Operating system Sticky Keys remain a device setting; JavaScript cannot enable them.
13. Closed Captions enables existing video caption/subtitle tracks. It does not generate missing captions. The sample's descriptive captions accompany the nature observation exercise.

Preferences are stored locally in this browser. Microphone input, speech playback and switch stepping are off on reload. Reset restores page text and styling preferences. This widget provides user adjustments; a website still needs accessible source content, semantics and media.

Voice clicks can name a visible control: “click Keyboard Navigation”, “click Start learning”, or “click Close accessibility settings”. Matching uses the button title, link text, or accessible label. Repeated names need an ordinal, such as “click second Explore this course”. A bare “click” activates only the focused interactive control. Missing or ambiguous names produce a message instead of clicking an arbitrary element.

Voice startup is monitored even when the browser never emits a start event. If selected microphone track input fails, the widget releases that input and retries using the browser's default microphone; check the browser default input if this fallback is reported. Temporary speech-service network errors retry up to four times, then stop with a connection error instead of reconnecting forever. Allow microphone access when prompted. Automated voice tests simulate browser events; actual audio recognition still needs a real browser and microphone check.

## Voice command checks

Run `node tests/voice-commands.test.cjs` for simulated recognition and command tests. Serve the project root and open `tests/voice-click-check.html` to exercise the actual widget with simulated recognized transcripts. This fixture never uses the microphone. Live speech recognition still requires microphone permission and a supported browser service.

The CC samples are local MP4 files in `dist/media`: a 16-second spoken video, a 10-second silent video with no audio stream, and an 18-second video combining spoken and quiet sections. Each has its own local WebVTT caption track. Nature footage comes from the CC0 flower clip at the MDN interactive examples media host; the spoken passages use synthetic English narration. Once served, these samples do not need an external video connection. `tests/create-caption-samples.ps1` regenerates the MP4 assets using Windows speech synthesis and FFmpeg.
