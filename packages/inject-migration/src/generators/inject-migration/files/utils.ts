export function lowerCaseFirstLetter(text: string): string {
  return text[0].toLowerCase() + text.slice(1);
}

/**
 * Escaped new lines in code with block comments, so they can be restored by {@link restoreNewLines}
 * @param {string} code The code to escape new lines in
 * @returns The same code but with new lines escaped using block comments
 */
export function escapeNewLines(code: string) {
  return code.replace(/\n\n/g, '\n/* :newline: */');
}

/**
 * Reverses {@link escapeNewLines} and restores new lines
 * @param {string} code The code with escaped new lines
 * @returns The same code with new lines restored
 */
export function restoreNewLines(code: string) {
  return code.replace(/\/\* :newline: \*\//g, '\n');
}
