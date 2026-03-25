// src/utils/detect-stack.js

const STACK_PATTERNS = [
  {
    name: 'nextjs',
    patterns: [/\bnext\.?js\b/i, /\bnext\s+app\s+router\b/i, /\bvercel\b/i],
    weight: 10,
  },
  {
    name: 'react-native',
    patterns: [/\breact\s+native\b/i, /\bexpo\b/i, /\bmobile\s+app\b/i],
    weight: 10,
  },
  {
    name: 'express-api',
    patterns: [
      /\bexpress\b/i,
      /\brest\s*(?:ful)?\s*api\b/i,
      /\bapi\s+backend\b/i,
      /\bbackend\s+(?:api|server)\b/i,
    ],
    weight: 5,
  },
];

export function detectStack(specContent) {
  const scores = {};

  for (const stack of STACK_PATTERNS) {
    scores[stack.name] = 0;
    for (const pattern of stack.patterns) {
      if (pattern.test(specContent)) {
        scores[stack.name] += stack.weight;
      }
    }
  }

  let best = 'generic';
  let bestScore = 0;

  for (const [name, score] of Object.entries(scores)) {
    if (score > bestScore) {
      best = name;
      bestScore = score;
    }
  }

  return best;
}
