export const additionalCards = [
  ['highlightTitles','Highlight Titles'],['highSaturation','High Saturation'],['lowSaturation','Low Saturation'],
  ['textColor','Adjust Text Color'],['backgroundColor','Adjust Background Color'],['titleColor','Adjust Title Color'],
  ['darkCursor','Big Dark Cursor'],['lightCursor','Big Light Cursor'],
  ['cognitiveDisability','Cognitive Disability Mode'],['cognitiveReading','Cognitive Reading Mode'],['linkNavigation','Link Navigation'],
];
export const COLOR_SWATCHES = [
  ['Dark red','#800000'],['Red','#FF0000'],['Orange','#FFA500'],['Yellow','#FFFF00'],
  ['Olive','#808000'],['Green','#008000'],['Purple','#800080'],['Magenta','#FF00FF'],
  ['Lime','#00FF00'],['Teal','#008080'],['Cyan','#00FFFF'],['Blue','#0000FF'],
  ['Navy','#000080'],['Black','#000000'],['White','#FFFFFF'],
];
export const DEFAULT_ADDITIONAL = Object.freeze({
  cognitiveDisability:false,cognitiveReading:false,highlightTitles:false,
  saturation:'normal',cursor:'default',textColor:'',backgroundColor:'',titleColor:'',
});
export function normalizeAdditional(input) {
  const result={...DEFAULT_ADDITIONAL};
  if(!input||typeof input!=='object'||Array.isArray(input))return result;
  for(const key of ['cognitiveDisability','cognitiveReading','highlightTitles'])if(typeof input[key]==='boolean')result[key]=input[key];
  if(['normal','high','low'].includes(input.saturation))result.saturation=input.saturation;
  if(['default','dark','light'].includes(input.cursor))result.cursor=input.cursor;
  for(const key of ['textColor','backgroundColor','titleColor'])if(typeof input[key]==='string'&&/^#[\da-f]{6}$/i.test(input[key]))result[key]=input[key].toUpperCase();
  return result;
}
export function additionalActive(settings,id) {
  if(id==='highSaturation'||id==='lowSaturation')return settings.saturation===(id==='highSaturation'?'high':'low');
  if(id==='darkCursor'||id==='lightCursor')return settings.cursor===(id==='darkCursor'?'dark':'light');
  return Boolean(settings[id]);
}
export function toggleAdditional(settings,id) {
  const on=!additionalActive(settings,id);
  if(id==='highSaturation'||id==='lowSaturation')return {saturation:on?(id==='highSaturation'?'high':'low'):'normal'};
  if(id==='darkCursor'||id==='lightCursor')return {cursor:on?(id==='darkCursor'?'dark':'light'):'default'};
  return {[id]:on};
}
// Profiles derive a presentation without overwriting the visitor's individual preferences.
export function effectiveVisualSettings(visual,additional) {
  const result={...visual,additional};
  return result;
}
