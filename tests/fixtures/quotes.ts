/** Shared sample quotes for unit, render, and E2E tests. */

export const SHORT = { text: 'Be the change you wish to see in the world.', author: 'Gandhi' } as const;

const words =
  'Hope is the thing with feathers that perches in the soul and sings the tune without the words and never stops at all';

function exactly(n: number): string {
  // Two line breaks, then words until exactly n graphemes (all ASCII here, so length === graphemes).
  let body = '';
  while (body.length < n) body += `${words} `;
  const chars = body.slice(0, n - 2).split('');
  // Replace the first space after each third with a line break, so words stay whole.
  chars[chars.indexOf(' ', Math.floor(n / 3))] = '\n';
  chars[chars.indexOf(' ', Math.floor((2 * n) / 3))] = '\n';
  return `${chars
    .join('')
    .trimEnd()
    .padEnd(n - 2, '.')}..`;
}

export const LONG_500 = { text: exactly(500), author: 'Emily Dickinson' } as const;
export const TOO_LONG_501 = { text: `${exactly(500)}!`, author: null } as const;
export const UNICODE = { text: 'Café — “naïve” 🌻', author: 'Zoë' } as const;
/** Polytonic Greek. Covered by some catalog fonts (e.g. EB Garamond) but not all. */
export const GREEK = { text: 'Γνῶθι σεαυτόν', author: null } as const;
export const WHITESPACE_ONLY = { text: '  \n\t  \n ', author: null } as const;
