// Shared pure helpers, also exercised without a browser.
export function parseVtt(text) {
  return text.replace(/^\uFEFF/, '').split(/\r?\n\s*\r?\n/)
    .filter(block => block.includes('-->'))
    .map(block => block.split(/\r?\n/).slice(block.split(/\r?\n/).findIndex(line => line.includes('-->')) + 1)
      .join(' ').replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim())
    .filter(Boolean);
}

// Extractive summarisation adapted from Sudhin's generatePageSummary.
// Sentences are copied from the page, never invented or sent to an external service.
export function summarize(texts) {
  const unique = [...new Set(texts.map(text => text.replace(/\s+/g, ' ').trim()).filter(text => text.length >= 45))];
  const sentences = [...new Set((unique.join('\n').match(/[^.!?\n]+[.!?]+(?:\s+|$)|[^.!?\n]{40,}/g) || [])
    .map(text => text.trim()).filter(text => text.length >= 40 && text.length <= 350))];
  const stop = new Set('the and that this with from have your you for are can into one'.split(' '));
  const words = text => (text.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) || []).filter(word => !stop.has(word));
  const frequencies = new Map();
  sentences.forEach(sentence => words(sentence).forEach(word => frequencies.set(word, (frequencies.get(word) || 0) + 1)));
  return sentences.map((sentence, index) => {
    const terms = words(sentence);
    return { sentence, index, score: terms.reduce((sum, word) => sum + frequencies.get(word), 0) / Math.sqrt(terms.length || 1) * (index === 0 ? 1.5 : 1) };
  }).sort((a, b) => b.score - a.score).slice(0, 5).sort((a, b) => a.index - b.index).map(item => item.sentence);
}

export function validateImport(value) {
  if (!value || value.version !== 2 || value.kind !== 'accessease-preferences' ||
      !value.settings || typeof value.settings !== 'object' || Array.isArray(value.settings)) {
    throw new Error('Choose a pluga11y preferences export (version 2).');
  }
  return value.settings;
}
