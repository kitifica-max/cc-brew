/**
 * Strips technical content from a Claude response, keeping only natural-language text
 * suitable for TTS. Returns null if the result has fewer than 3 readable words.
 */
export function voiceFilter(text) {
  if (!text) return null;

  let out = text
    // fenced code blocks
    .replace(/```[\s\S]*?```/g, '')
    // inline code
    .replace(/`[^`\n]+`/g, '')
    // URLs
    .replace(/https?:\/\/\S+/g, '')
    // absolute Unix paths  (e.g. /Users/foo/bar/baz.js)
    .replace(/(?:^|\s)\/(?:[a-zA-Z0-9_.@-]+\/)+[a-zA-Z0-9_.@-]*/gm, ' ')
    // lines that look like terminal output (start with $ or >)
    .replace(/^\s*[$>].+$/gm, '')
    // excessive blank lines
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const words = out.split(/\s+/).filter(w => /[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ]/.test(w));
  return words.length >= 3 ? out : null;
}
