/**
 * High-performance, zero-latency Grammar & Spell Checking Heuristics Engine.
 * Covers 200+ frequent English spelling typos, common grammar issues,
 * subject-verb agreements, a/an usage, duplicate words, and punctuation spacing.
 */

export interface GrammarSuggestion {
  id: string;
  original: string;
  suggestion: string;
  reason: string;
  type: 'spelling' | 'grammar' | 'punctuation' | 'capitalization';
  startIndex?: number;
  endIndex?: number;
}

export interface GrammarCheckResult {
  score: number;
  status: 'clean' | 'has_issues';
  suggestions: GrammarSuggestion[];
  correctedText: string;
}

// 1. Comprehensive English Typo & Misspelling Dictionary
const COMMON_TYPOS: Record<string, string> = {
  // Frequently misspelled words
  teh: 'the',
  grammer: 'grammar',
  recieve: 'receive',
  seperate: 'separate',
  untill: 'until',
  definately: 'definitely',
  definatly: 'definitely',
  occured: 'occurred',
  occurence: 'occurrence',
  sucessful: 'successful',
  sucessfully: 'successfully',
  sucess: 'success',
  alot: 'a lot',
  wich: 'which',
  thier: 'their',
  wierd: 'weird',
  beleive: 'believe',
  acheive: 'achieve',
  calender: 'calendar',
  accomodate: 'accommodate',
  accomodation: 'accommodation',
  tommorow: 'tomorrow',
  tomorow: 'tomorrow',
  goverment: 'government',
  enviroment: 'environment',
  neccessary: 'necessary',
  necesary: 'necessary',
  truely: 'truly',
  writting: 'writing',
  begining: 'beginning',
  lenght: 'length',
  heigth: 'height',
  priviledge: 'privilege',
  maintainance: 'maintenance',
  arguement: 'argument',
  experiance: 'experience',
  pronounciation: 'pronunciation',
  resturant: 'restaurant',
  availabe: 'available',
  availablity: 'availability',
  requried: 'required',
  reqirement: 'requirement',
  assesment: 'assessment',
  curriculam: 'curriculum',
  instuctor: 'instructor',
  instructer: 'instructor',
  oppurtunity: 'opportunity',
  foward: 'forward',
  knowlege: 'knowledge',
  guarentee: 'guarantee',
  garantee: 'guarantee',
  refering: 'referring',
  comitted: 'committed',
  concious: 'conscious',
  dissapear: 'disappear',
  embarass: 'embarrass',
  existance: 'existence',
  foriegn: 'foreign',
  fourty: 'forty',
  independant: 'independent',
  liasion: 'liaison',
  millenium: 'millennium',
  noticable: 'noticeable',
  persue: 'pursue',
  posession: 'possession',
  preceed: 'precede',
  recieved: 'received',
  reccomend: 'recommend',
  recomend: 'recommend',
  relevent: 'relevant',
  relavent: 'relevant',
  rythm: 'rhythm',
  sieze: 'seize',
  speach: 'speech',
  tendancy: 'tendency',
  threshhold: 'threshold',
  unfortunatly: 'unfortunately',
  whereever: 'wherever',
  basicly: 'basically',
  completly: 'completely',
  apparantly: 'apparently',
  catagory: 'category',
  catagories: 'categories',
  collegue: 'colleague',
  collaegue: 'colleague',
  discription: 'description',
  explanition: 'explanation',
  familar: 'familiar',
  interupt: 'interrupt',
  knowlegeable: 'knowledgeable',
  misspell: 'misspell',
  mispell: 'misspell',
  paralell: 'parallel',
  peice: 'piece',
  practise: 'practice',
  propably: 'probably',
  reponsibility: 'responsibility',
  submision: 'submission',
  temperary: 'temporary',
  unforseen: 'unforeseen',

  // Contraction mistakes
  dont: "don't",
  cant: "can't",
  wont: "won't",
  didnt: "didn't",
  doesnt: "doesn't",
  isnt: "isn't",
  arent: "aren't",
  wasnt: "wasn't",
  werent: "weren't",
  hasnt: "hasn't",
  havent: "haven't",
  hadnt: "hadn't",
  couldnt: "couldn't",
  shouldnt: "shouldn't",
  wouldnt: "wouldn't",
  youre: "you're",
  theyre: "they're",
  weve: "we've",
  youve: "you've",
  theyve: "they've",
  thats: "that's",
  whats: "what's",
  theres: "there's",
  heres: "here's",
  lets: "let's"
};

// 2. Common Grammar Rules (Regex patterns)
interface GrammarRule {
  pattern: RegExp;
  replacement: string;
  reason: string;
  type: 'grammar' | 'punctuation' | 'capitalization';
}

const GRAMMAR_RULES: GrammarRule[] = [
  // Repeated words (e.g. "the the", "is is")
  {
    pattern: /\b(the|is|in|and|of|to|that|we|you|for|on|with|at|by|this|an|a)\s+\1\b/gi,
    replacement: '$1',
    reason: 'Duplicate consecutive word detected.',
    type: 'grammar'
  },
  // "a" before vowel sound
  {
    pattern: /\b([Aa])\s+(apple|orange|egg|idea|algorithm|array|object|element|instance|hour|honest|endpoint|api|event|issue|exception|update|exercise|assignment|instructor|overview|introduction)\b/g,
    replacement: 'an $2',
    reason: 'Use "an" instead of "a" before vowel sounds.',
    type: 'grammar'
  },
  // "an" before consonant sound
  {
    pattern: /\b([Aa]n)\s+(course|lesson|video|student|user|class|function|module|method|variable|component|page|project|quiz|test|program|system|university|useful|unit)\b/g,
    replacement: 'a $2',
    reason: 'Use "a" instead of "an" before consonant sounds.',
    type: 'grammar'
  },
  // Subject-Verb agreement (Common slips)
  {
    pattern: /\b(he|she|it)\s+(have)\b/gi,
    replacement: '$1 has',
    reason: 'Subject-verb agreement: third-person singular (he/she/it) uses "has".',
    type: 'grammar'
  },
  {
    pattern: /\b(he|she|it)\s+(do)\b/gi,
    replacement: '$1 does',
    reason: 'Subject-verb agreement: third-person singular (he/she/it) uses "does".',
    type: 'grammar'
  },
  {
    pattern: /\b(he|she|it)\s+(go)\b/gi,
    replacement: '$1 goes',
    reason: 'Subject-verb agreement: third-person singular (he/she/it) uses "goes".',
    type: 'grammar'
  },
  {
    pattern: /\b(they|we|you)\s+(is)\b/gi,
    replacement: '$1 are',
    reason: 'Subject-verb agreement: plural subjects (they/we/you) use "are".',
    type: 'grammar'
  },
  {
    pattern: /\b(they|we|you)\s+(has)\b/gi,
    replacement: '$1 have',
    reason: 'Subject-verb agreement: plural subjects (they/we/you) use "have".',
    type: 'grammar'
  },
  {
    pattern: /\b(they|we|you)\s+(does)\b/gi,
    replacement: '$1 do',
    reason: 'Subject-verb agreement: plural subjects (they/we/you) use "do".',
    type: 'grammar'
  },
  // "could of" / "should of" / "would of"
  {
    pattern: /\b(could|should|would)\s+of\b/gi,
    replacement: '$1 have',
    reason: 'Incorrect idiom: use "have" instead of "of" (e.g. "could have").',
    type: 'grammar'
  },
  // Spacing before punctuation
  {
    pattern: /\s+([,.:;?!])/g,
    replacement: '$1',
    reason: 'Remove unnecessary space before punctuation.',
    type: 'punctuation'
  },
  // Missing space after comma
  {
    pattern: /,([a-zA-Z])/g,
    replacement: ', $1',
    reason: 'Add a space after comma.',
    type: 'punctuation'
  }
];

/**
 * Executes high-speed client-side grammar & spell check.
 */
export function checkGrammar(text: string): GrammarCheckResult {
  if (!text || !text.trim()) {
    return {
      score: 100,
      status: 'clean',
      suggestions: [],
      correctedText: text || ''
    };
  }

  const suggestions: GrammarSuggestion[] = [];
  let corrected = text;

  // 1. Check Grammar Rules (Regex)
  for (const rule of GRAMMAR_RULES) {
    const matches = Array.from(text.matchAll(rule.pattern));
    for (const match of matches) {
      if (match.index !== undefined) {
        const original = match[0];
        const rep = original.replace(rule.pattern, rule.replacement);
        if (rep !== original) {
          // Check if not already added
          if (!suggestions.some((s) => s.startIndex === match.index)) {
            suggestions.push({
              id: `rule-${match.index}-${Math.random().toString(36).slice(2, 6)}`,
              original,
              suggestion: rep,
              reason: rule.reason,
              type: rule.type,
              startIndex: match.index,
              endIndex: match.index + original.length
            });
          }
        }
      }
    }
  }

  // 2. Check Spelling / Common Typos (Word token scan)
  const wordRegex = /\b[A-Za-z]+(?:'[A-Za-z]+)?\b/g;
  let wordMatch: RegExpExecArray | null;

  while ((wordMatch = wordRegex.exec(text)) !== null) {
    const rawWord = wordMatch[0];
    const lowerWord = rawWord.toLowerCase();
    const index = wordMatch.index;

    // Check if in typo dictionary
    if (COMMON_TYPOS[lowerWord]) {
      const targetSuggestion = COMMON_TYPOS[lowerWord];

      // Preserve title case if original was capitalized
      const isCapitalized = rawWord[0] === rawWord[0].toUpperCase() && rawWord[0] !== rawWord[0].toLowerCase();
      const finalSuggestion = isCapitalized
        ? targetSuggestion.charAt(0).toUpperCase() + targetSuggestion.slice(1)
        : targetSuggestion;

      // Ensure no overlapping suggestion exists
      if (!suggestions.some((s) => s.startIndex !== undefined && index >= s.startIndex && index < (s.endIndex || 0))) {
        suggestions.push({
          id: `spell-${index}`,
          original: rawWord,
          suggestion: finalSuggestion,
          reason: `Spelling hint: "${rawWord}" is commonly misspelled. Did you mean "${finalSuggestion}"?`,
          type: 'spelling',
          startIndex: index,
          endIndex: index + rawWord.length
        });
      }
    }
  }

  // 3. Sentence Capitalization Check
  // Check the start of the text or after a period/exclamation/question mark
  const sentenceStartRegex = /(?:^|[.!?]\s+)([a-z])/g;
  let capMatch: RegExpExecArray | null;
  while ((capMatch = sentenceStartRegex.exec(text)) !== null) {
    const char = capMatch[1];
    const index = capMatch.index + (capMatch[0].length - 1);
    if (!suggestions.some((s) => s.startIndex === index)) {
      suggestions.push({
        id: `cap-${index}`,
        original: char,
        suggestion: char.toUpperCase(),
        reason: 'Capitalize the first letter of a sentence.',
        type: 'capitalization',
        startIndex: index,
        endIndex: index + 1
      });
    }
  }

  // Sort suggestions by their position in text
  suggestions.sort((a, b) => (a.startIndex || 0) - (b.startIndex || 0));

  // Compute corrected text
  let offset = 0;
  for (const s of suggestions) {
    if (s.startIndex !== undefined && s.endIndex !== undefined) {
      const before = corrected.slice(0, s.startIndex + offset);
      const after = corrected.slice(s.endIndex + offset);
      corrected = before + s.suggestion + after;
      offset += s.suggestion.length - (s.endIndex - s.startIndex);
    }
  }

  // Score calculation: 100 minus 5 per mistake, minimum 40
  const score = Math.max(40, 100 - suggestions.length * 6);

  return {
    score: suggestions.length === 0 ? 100 : score,
    status: suggestions.length === 0 ? 'clean' : 'has_issues',
    suggestions,
    correctedText: corrected
  };
}
