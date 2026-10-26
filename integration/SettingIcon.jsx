import React from 'react';
import Icon from '../AssistAccess/src/accessibility/ui/icons.jsx';
import { icon } from '../visual-accessibility-widget/sdk/icons.js';

const assistIcons = {
  'screen-reader':'screenReader', 'alt-text':'altText', 'form-labels':'formLabels',
  'error-messages':'errorMessages', password:'password', confirm:'confirm',
  profiles:'profiles', flashing:'flashing', 'reduce-motion':'motion',
};
const visualIcons = {
  contrast:'contrast', dark:'moon', light:'sun', grayscale:'grayscale',
  colorVisionMode:'eye', spacingPreset:'spacing', magnifier:'zoom', highlightLinks:'link',
  readingMask:'mask',
};
// Distinct feature symbols: book for dyslexia, size arrows for text sizing,
// sliders for visual adjustments, and a megaphone for announcements.
const paths = {
  highlightTitles:'M3 5h18v14H3V5ZM7 9h10M12 9v6m-3 0h6M1 2h4m14 20h4',
  highSaturation:'M12 3C9 7 5 11 5 15a7 7 0 0 0 14 0c0-4-4-8-7-12ZM9 15h6m-3-3v6',
  lowSaturation:'M12 3C9 7 5 11 5 15a7 7 0 0 0 14 0c0-4-4-8-7-12ZM9 15h6',
  textColor:'M3 17 8 4l5 13M5 12h6M16 4h5m-2.5 0v13M3 21h18',
  backgroundColor:'M3 3h18v18H3V3ZM4 17l13-13M9 21 21 9M4 10l6-6m5 17 6-6',
  titleColor:'M4 4h16v4H4V4ZM12 8v10m-5 0h10M3 22h18',
  darkCursor:'M4 2v19l5-5 4 7 4-2-4-7h8L4 2ZM6 6l10 7h-6l-4 4V6Z',
  lightCursor:'M3 2v19l6-6 4 8 4-2-4-8h9L3 2ZM7 4l14 9m-8 8-4-8',
  cognitiveReading:'M4 3h7a5 5 0 0 1 5 5v13a7 7 0 0 0-5-2H4V3ZM16 10h5m-5 4h4M7 7h4M7 11h4M7 15h4',
  cognitiveDisability:'M3 4h18v13H8l-5 4V4ZM7 8h10M7 12h8',
  linkNavigation:'M10 7H6a4 4 0 0 0 0 8h4m4-8h4a4 4 0 0 1 0 8h-4M7 11h10m-3-3 3 3-3 3M12 18v4m-3-3 3 3 3-3',
  dyslexiaFont:'M12 6C9 3 5 3 2 5v15c3-2 7-2 10 0 3-2 7-2 10 0V5c-3-2-7-2-10 1ZM12 6v14M5 14l2-6 2 6M6 12h2M15 9h4M15 12h3M15 15h4',
  fontScale:'M3 18 8 5l5 13M5 13h6M17 4v16m-3-13 3-3 3 3m-6 10 3 3 3-3',
  visuals:'M3 5h6m4 0h8M9 3h4v4H9ZM3 12h12m4 0h2M15 10h4v4h-4ZM3 19h3m4 0h11M6 17h4v4H6Z',
  announcements:'M3 10h5l10-6v16L8 14H3v-4ZM8 14l2 7h4l-2-5M21 9v6',
  audioTranscripts:'M5 3h10l4 4v14H5V3ZM15 3v5h4M8 10v4m3-6v8m3-5v2m-6 5h8',
  headings:'M4 3h6v4H4ZM14 10h6v4h-6ZM14 18h6v4h-6ZM7 7v13h7M7 12h7',
  auth:'M12 2 3 6v6c0 5 9 10 9 10s9-5 9-10V6l-9-4ZM14 11a3 3 0 1 0-6 0 3 3 0 0 0 6 0ZM11 14v4m0-2h3',
  preferences:'M4 3h13l3 3v15H4V3ZM8 3v6h8V3M8 21v-8h8v8M10 16h4',
  readingGuide:'M8 5h13M8 9h10M8 15h13M8 19h10M2 9l4 3-4 3V9ZM8 12h13',
  summary:'M4 4h16v16H4z M7 8h10M7 12h7M7 16h4',
  progress:'M12 3a9 9 0 1 0 9 9 M12 3v9h9',
  distraction:'M3 4h18v16H3V4ZM3 8h18M8 8v12M4.5 11l2 4m0-4-2 4M11 12h7M11 16h5',
  steps:'M4 6h1M4 12h1M4 18h1 M9 6h11M9 12h11M9 18h11',
  notifications:'M5 17h14l-2-3V9a5 5 0 0 0-10 0v5z M10 21h4',
  liveCaptions:'M3 4h18v13H9l-5 4v-4H3V4ZM10 8a2 2 0 1 0 0 4M17 8a2 2 0 1 0 0 4',
  simplifiedNav:'M4 5h16M4 12h10M4 19h6 M17 9l3 3-3 3',
  'pause-animations':'M8 4v16M16 4v16',
  'pause-auto-media':'M3 5h18v14H3z M9 9v6M15 9v6',
  timeLimits:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18 M12 7v5h4',
};

export default function SettingIcon({ id }) {
  if (assistIcons[id]) return <Icon name={assistIcons[id]} />;
  if (visualIcons[id]) return <span dangerouslySetInnerHTML={{__html:icon(visualIcons[id])}} />;
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d={paths[id]} /></svg>;
}
