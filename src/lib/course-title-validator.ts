/**
 * Validates whether a course title update qualifies as a minor spelling / typo fix
 * versus a complete title overhaul / rebranding.
 */
export function checkTitleMinorSpellingFix(originalTitle?: string | null, newTitle?: string | null): {
  isMinorFix: boolean;
  isIdentical: boolean;
  similarity: number;
  wordOverlap: number;
  reason: string;
} {
  const orig = (originalTitle || '').trim().toLowerCase();
  const next = (newTitle || '').trim().toLowerCase();

  if (!orig || !next || orig === next) {
    return {
      isMinorFix: true,
      isIdentical: orig === next,
      similarity: 1,
      wordOverlap: 1,
      reason: 'Title unchanged or identical'
    };
  }

  // 1. Calculate Levenshtein Distance
  const m = orig.length;
  const n = next.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (orig[i - 1] === next[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  const dist = dp[m][n];
  const maxLen = Math.max(m, n);
  const similarity = maxLen > 0 ? (maxLen - dist) / maxLen : 1;

  // 2. Calculate Word Overlap
  const cleanWord = (w: string) => w.replace(/[^a-z0-9]/g, '');
  const origWords = orig.split(/\s+/).map(cleanWord).filter(Boolean);
  const nextWords = next.split(/\s+/).map(cleanWord).filter(Boolean);

  let commonCount = 0;
  for (const w of origWords) {
    if (nextWords.includes(w)) {
      commonCount += 1;
    }
  }

  const wordOverlap = origWords.length > 0 ? commonCount / origWords.length : 1;

  // Rule:
  // Must preserve at least 65% character similarity AND at least 50% word overlap,
  // OR if character similarity is extremely high (>= 80% for minor 1-2 char typo fixes)
  const isMinorFix = (similarity >= 0.65 && wordOverlap >= 0.50) || similarity >= 0.80;

  let reason = '';
  if (isMinorFix) {
    reason = `Minor spelling/typo fix detected (${Math.round(similarity * 100)}% similarity).`;
  } else {
    reason = `Title change too large (${Math.round(similarity * 100)}% similarity). In Quick Minor Edit, you can only fix typos and spelling mistakes.`;
  }

  return {
    isMinorFix,
    isIdentical: false,
    similarity,
    wordOverlap,
    reason
  };
}
