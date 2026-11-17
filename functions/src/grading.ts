export type Options = { ignoreCase: boolean; ignorePunctuation: boolean };
export type AlignedWord = { status: 'correct' | 'incorrect' | 'missing' | 'extra'; expected?: string; actual?: string };
export function tokenize(text: string, options: Options): { raw: string; key: string }[] {
  // Remove punctuation within whitespace-delimited words; retain original display tokens.
  return (text.normalize('NFKC').match(/\S+/gu) ?? []).map(raw => {
    let key = options.ignorePunctuation ? raw.replace(/\p{P}/gu, '') : raw;
    if (options.ignoreCase) key = key.toLocaleLowerCase('en');
    return { raw, key };
  }).filter(t => t.key.length > 0);
}
export function grade(expected: string, actual: string, options: Options) {
  const a = tokenize(expected, options), b = tokenize(actual, options);
  if (a.length > 500 || b.length > 500) throw new Error('Maximum 500 words per answer.');
  const rows = Array.from({ length: a.length + 1 }, () => new Uint16Array(b.length + 1));
  for (let i = 0; i <= a.length; i++) rows[i][0] = i;
  for (let j = 0; j <= b.length; j++) rows[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
    rows[i][j] = Math.min(rows[i - 1][j] + 1, rows[i][j - 1] + 1, rows[i - 1][j - 1] + (a[i - 1].key === b[j - 1].key ? 0 : 1));
  }
  const alignment: AlignedWord[] = [];
  let i = a.length, j = b.length;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && rows[i][j] === rows[i - 1][j - 1] + (a[i - 1].key === b[j - 1].key ? 0 : 1)) {
      alignment.push({ status: a[i - 1].key === b[j - 1].key ? 'correct' : 'incorrect', expected: a[--i].raw, actual: b[--j].raw });
    } else if (i > 0 && rows[i][j] === rows[i - 1][j] + 1) {
      alignment.push({ status: 'missing', expected: a[--i].raw });
    } else alignment.push({ status: 'extra', actual: b[--j].raw });
  }
  alignment.reverse();
  const counts = { correct: 0, incorrect: 0, missing: 0, extra: 0 };
  alignment.forEach(word => counts[word.status]++);
  const errors = rows[a.length][b.length];
  const score = a.length === 0 ? (b.length === 0 ? 100 : 0) : Math.round(100 * Math.max(0, 1 - errors / a.length));
  return { score, alignment, counts, expectedWords: a.length, errors };
}
