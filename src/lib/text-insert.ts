/**
 * Puts text in place of the selection of a text field the way typing does (document.execCommand
 * "insertText"), so Ctrl+Z / the editor's undo button can take it back and React's onChange runs.
 * Browsers that refuse the command get the new value through `fallback` instead (no undo step).
 */
export function insertText(el: HTMLInputElement | HTMLTextAreaElement, text: string, fallback: (value: string) => void) {
  el.focus();
  const start = el.selectionStart ?? el.value.length;
  const end = el.selectionEnd ?? el.value.length;
  let done = false;
  try {
    done = document.execCommand("insertText", false, text);
  } catch {
    done = false;
  }
  if (!done) fallback(el.value.slice(0, start) + text + el.value.slice(end));
  return start;
}
