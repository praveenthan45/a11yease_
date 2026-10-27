const ICON = '[data-uaw-icon],[data-uaw-icon] *,[role="img"],[role="img"] *,svg,svg *';
const ICON_FONT = /unicons?|font\s*awesome|material\s*(icons|symbols)|icomoon|glyphicons|bootstrap-icons/i;
const FAMILY = '"UAW OpenDyslexic", sans-serif';
const HEADING = 'h1,h2,h3,h4,h5,h6,[role="heading"]';
const NAV_CONTROL = 'nav a,nav button,nav [role="button"],[role="navigation"] a,[role="navigation"] button,[role="navigation"] [role="button"]';

function visibleText(el) {
  if (el.closest('[hidden]') || !el.getClientRects().length) return false;
  for (let node = el; node; node = node.parentElement) {
    const style = getComputedStyle(node);
    if (style.display === 'none' || style.visibility === 'hidden' || style.contentVisibility === 'hidden') return false;
    if (node.parentElement?.matches('details:not([open])') && !node.matches('summary')) return false;
  }
  return true;
}

function largeTextContainer(el) {
  let target = el;
  while (getComputedStyle(target).display === 'inline' && target.parentElement &&
    !target.parentElement.matches('html,body') && parseFloat(getComputedStyle(target.parentElement).fontSize) > 24) {
    target = target.parentElement;
  }
  return target;
}

function textHeight(el) {
  const range = el.ownerDocument.createRange();
  // Range geometry includes overflowing text inside fixed-height title boxes.
  if (typeof range.getClientRects !== 'function') return 0;
  const walker = el.ownerDocument.createTreeWalker(el, 4);
  let node, top = Infinity, bottom = -Infinity;
  while ((node = walker.nextNode())) {
    if (!node.textContent.trim() || node.parentElement.closest(ICON)) continue;
    range.selectNodeContents(node);
    for (const rect of range.getClientRects()) if (rect.width && rect.height) {
      top = Math.min(top, rect.top); bottom = Math.max(bottom, rect.bottom);
    }
  }
  return Number.isFinite(top) ? bottom - top : 0;
}

export function applyDyslexiaText(elements, override) {
  // Snapshot before changing parents: inherited sizes and icon fonts must not drift.
  const records = elements.filter(el => !el.matches(ICON) && visibleText(el) &&
    !ICON_FONT.test(getComputedStyle(el).fontFamily) && (
      el.matches('input,textarea,select,option') ||
      [...el.childNodes].some(node => node.nodeType === 3 && /[^\s\uE000-\uF8FF]/u.test(node.textContent)) ||
      (el.matches(`${HEADING},p,blockquote,li,button,a,label,summary`) && /[^\s\uE000-\uF8FF]/u.test(el.textContent))
    )).map(el => {
      const style = getComputedStyle(el);
      // Font scaling has already written an authoritative pixel size. Reuse it
      // during this pass instead of a potentially cached shadow-tree style.
      const fontSize=el.style.getPropertyPriority('font-size')==='important'&&el.style.fontSize.endsWith('px')?el.style.fontSize:style.fontSize;
      return {el, size:fontSize.endsWith('px') ? parseFloat(fontSize) : NaN,
        line:style.lineHeight.endsWith('px') ? parseFloat(style.lineHeight) : NaN,
        family:style.fontFamily, weight:style.fontWeight, fontStyle:style.fontStyle,
        letter:style.letterSpacing, word:style.wordSpacing, heading:el.closest(HEADING)};
    });
  let ctx = null;
  const doc = records[0]?.el.ownerDocument;
  if (doc?.defaultView.CanvasRenderingContext2D) {
    try { ctx = doc.createElement('canvas').getContext('2d'); } catch { /* Font still applies without canvas. */ }
  }
  const groups = new Map();
  for (const record of records) {
    const navigation = record.el.closest(NAV_CONTROL);
    const target = record.heading || navigation || (record.size > 24 ? largeTextContainer(record.el) : null);
    if (!target) continue;
    if (!groups.has(target)) groups.set(target, {el:target, navigation:!!navigation, records:[], original:0, replacement:0});
    groups.get(target).records.push(record);
  }
  for (const [target, group] of groups) {
    const largest = Math.max(...group.records.map(record => record.size));
    if (!(largest > 24 || group.navigation)) { groups.delete(target); continue; }
    group.minimum = Math.min(1, (group.navigation ? 14 : 24) / largest);
    group.rect = target.getBoundingClientRect();
    group.scrollWidth = target.scrollWidth; group.scrollHeight = target.scrollHeight;
    group.textHeight = textHeight(target);
    const style = getComputedStyle(target);
    group.block = !['inline','contents'].includes(style.display);
    group.width = style.boxSizing === 'border-box' ? group.rect.width : group.rect.width -
      ['paddingLeft','paddingRight','borderLeftWidth','borderRightWidth'].reduce((sum,key) => sum + (parseFloat(style[key]) || 0), 0);
    for (const record of group.records) {
      record.group = group;
      if (!ctx || !(record.size > 0)) continue;
      // Measure each text run once, respecting nested sizes, spacing and casing.
      let text = [...record.el.childNodes].filter(node => node.nodeType === 3).map(node => node.textContent).join('').replace(/\s+/g,' ');
      const transform = getComputedStyle(record.el).textTransform;
      if (transform === 'uppercase') text = text.toUpperCase();
      if (transform === 'lowercase') text = text.toLowerCase();
      const spacing = Math.max(0, [...text].length - 1) * (parseFloat(record.letter) || 0) +
        (text.match(/\s/g)?.length || 0) * (parseFloat(record.word) || 0);
      const font = `${record.fontStyle || 'normal'} ${record.weight || '400'} ${record.size}px`;
      ctx.font = `${font} ${record.family}`;
      group.original += ctx.measureText(text).width + spacing;
      ctx.font = `${font} ${FAMILY}`;
      group.replacement += ctx.measureText(text).width + spacing;
    }
    group.scale = Math.max(group.minimum, Math.min(1, group.original / group.replacement || 1));
  }
  function sizeText(record, scale = 1) {
    const {el, size, line} = record;
    const floor = record.group?.navigation ? 14 : 24;
    const fitted = Math.max(Math.min(size, floor), size * scale);
    if (Number.isFinite(fitted) && fitted > 0) override(el, 'font-size', `${fitted}px`);
    // Keep the site's line boxes. Fitting the glyphs must not add title rows.
    if (Number.isFinite(line) && line > 0) override(el, 'line-height', `${line}px`);
  }
  for (const record of records) {
    const {el, letter, word, group} = record;
    override(el, 'font-family', FAMILY);
    sizeText(record, group?.scale);
    if (letter.endsWith('px')) override(el, 'letter-spacing', letter);
    if (word.endsWith('px')) override(el, 'word-spacing', word);
    // Wrap within the available width instead of freezing the original pixel box.
    if (el.matches(`${HEADING},p,blockquote,li,label,button,a,summary`)) override(el, 'overflow-wrap', group ? 'normal' : 'anywhere');
    if (group) override(el, 'word-break', 'normal');
  }
  const fitGroups = [...groups.values()];
  for (const group of fitGroups) {
    override(group.el, 'overflow-wrap', 'normal'); override(group.el, 'word-break', 'normal');
    if (group.block && group.width > 0) {
      override(group.el, 'max-width', `${group.width}px`);
      override(group.el, 'min-width', '0');
    }
  }
  function fits(group) {
    const rect = group.el.getBoundingClientRect();
    return (!group.rect.height || rect.height <= group.rect.height + 1) &&
      (!group.rect.width || rect.width <= group.rect.width + 1) &&
      group.el.scrollWidth <= group.scrollWidth + 1 && group.el.scrollHeight <= group.scrollHeight + 1 &&
      (!group.textHeight || textHeight(group.el) <= group.textHeight + 1);
  }
  // Canvas is an estimate; actual line wrapping, inline spans and font metrics
  // decide the final size. Batch each pass to avoid a layout per text element.
  // Decorative tracking can make a wider font wrap even when the text itself
  // fits. Relax it only for title and navigation boxes that actually overflow.
  const tracked = fitGroups.filter(group => !fits(group) && group.records.some(record =>
    (parseFloat(record.letter) || 0) > 0 || (parseFloat(record.word) || 0) > 0));
  for (const group of tracked) for (const record of group.records) {
    if ((parseFloat(record.letter) || 0) > 0) override(record.el, 'letter-spacing', 'normal');
    if ((parseFloat(record.word) || 0) > 0) override(record.el, 'word-spacing', 'normal');
  }
  const overflowing = fitGroups.filter(group => !fits(group));
  for (const group of overflowing) {
    group.high = group.scale; group.low = group.minimum;
    group.records.forEach(record => sizeText(record, group.low));
  }
  const fitting = overflowing.filter(group => fits(group));
  for (let pass = 0; pass < 7 && fitting.length; pass++) {
    for (const group of fitting) {
      group.scale = (group.low + group.high) / 2;
      group.records.forEach(record => sizeText(record, group.scale));
    }
    for (const group of fitting) if (fits(group)) group.low = group.scale; else group.high = group.scale;
  }
  for (const group of overflowing) {
    group.records.forEach(record => sizeText(record, group.low));
  }
  // If the replacement still cannot fit a title at a readable size, retain
  // the site's original title font in that box instead of covering adjacent
  // content. The rest of the page keeps the dyslexia font.
  for (const group of overflowing) if (!group.navigation && !fits(group)) {
    for (const record of group.records) {
      override(record.el, 'font-family', record.family);
      if (Number.isFinite(record.size)) override(record.el, 'font-size', `${record.size}px`);
      if (Number.isFinite(record.line)) override(record.el, 'line-height', `${record.line}px`);
      override(record.el, 'letter-spacing', record.letter);
      override(record.el, 'word-spacing', record.word);
    }
  }
  const overflowingNavigation = overflowing.filter(group => group.navigation && !fits(group))
    .map(group => group.el.closest('nav,[role="navigation"]')).filter(Boolean);
  // Fixed-height text boxes may need another line with a wider font. Expand only
  // overflowing normal-flow boxes, preserving intentionally clipped/scrolling UI.
  const boxes = new Set(records.flatMap(({el}) => [el, el.parentElement]).filter(Boolean));
  const fittedBoxes = new Set(fitGroups.flatMap(group => [group.el, group.el.parentElement]));
  const expand = [...boxes].filter(el => {
    const style = getComputedStyle(el);
    return !fittedBoxes.has(el) && !el.matches('html,body') && !['absolute','fixed'].includes(style.position) &&
      style.overflowY === 'visible' && el.clientHeight > 0 && el.scrollHeight > el.clientHeight + 2;
  });
  for (const el of expand) {
    override(el, 'height', 'auto');
    override(el, 'max-height', 'none');
  }
  return [...new Set(overflowingNavigation)];
}
