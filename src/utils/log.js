/**
 * Set a terminal color to the message
 *
 * @param {string} msg - text to wrap
 * @param {string} color - color
 * @returns {string}
 */
export function wrapInColor(msg, color) {
  return '\x1b[' + color + 'm' + msg + '\x1b[0m';
}

/**
 * Terminal output colors
 */
export const consoleColors = {
  fgCyan: 36,
  fgRed: 31,
  fgGreen: 32,
};

/**
 * Decorates terminal log
 *
 * @param {string} message - message to print
 * @param {string} [color] - message color
 * @param {boolean} [skipLineBreak] - pass true to prevent adding an empty linebreak
 */
export function log(message, color = consoleColors.fgCyan, skipLineBreak = false) {
  console.log(wrapInColor('🦅 Hawk | ' + message + (!skipLineBreak ? '\n' : ''), color));
}
