/**
 * Safe Mathematical Expression Evaluator for Currency/Transaction Calculation
 * Supports +, -, *, /, %, parentheses, and Indonesian thousand separators.
 */

export function sanitizeExpression(input: string): string {
  if (!input) return '';
  return input
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/:/g, '/')
    .replace(/x/gi, '*')
    .replace(/\s+/g, '');
}

/**
 * Tokenize and safely evaluate an arithmetic expression without using eval()
 */
export function evaluateMathExpression(expr: string): number | null {
  if (!expr || typeof expr !== 'string') return null;

  const cleaned = sanitizeExpression(expr);
  if (!cleaned) return null;

  // Verify only allowed characters: digits, ., +, -, *, /, %, (, )
  if (!/^[0-9.+\-*/%()]+$/.test(cleaned)) {
    return null;
  }

  // Pre-process: if numbers have dot separators like 50.000.000, normalize them.
  // If dot is followed by 3 digits at end or before operator, treat as thousands separator.
  let normalized = cleaned;
  // If a number has multiple dots, e.g. 1.500.000, remove all dots from that number.
  normalized = normalized.replace(/(\d+)\.(\d{3})(?=\D|$)/g, '$1$2');
  // Handle remaining dots in numbers with multiple dots
  while (/(\d+)\.(\d{3})(?=\D|$)/.test(normalized)) {
    normalized = normalized.replace(/(\d+)\.(\d{3})(?=\D|$)/g, '$1$2');
  }

  try {
    const tokens = tokenize(normalized);
    if (!tokens || tokens.length === 0) return null;
    const result = parseExpression(tokens);
    if (result !== null && !isNaN(result) && isFinite(result)) {
      return Math.round(result);
    }
    return null;
  } catch (err) {
    return null;
  }
}

type Token = 
  | { type: 'NUMBER'; value: number }
  | { type: 'OP'; value: '+' | '-' | '*' | '/' | '%' }
  | { type: 'LPAREN' }
  | { type: 'RPAREN' };

function tokenize(str: string): Token[] | null {
  const tokens: Token[] = [];
  let i = 0;

  while (i < str.length) {
    const char = str[i];

    if (char === '+' || char === '-' || char === '*' || char === '/' || char === '%') {
      // Check for unary minus / plus at start or after another operator / left paren
      if ((char === '-' || char === '+') && (tokens.length === 0 || tokens[tokens.length - 1].type === 'OP' || tokens[tokens.length - 1].type === 'LPAREN')) {
        // Read the number following unary sign
        let numStr = char;
        i++;
        while (i < str.length && (/\d|\./.test(str[i]))) {
          numStr += str[i];
          i++;
        }
        if (numStr === '-' || numStr === '+') return null;
        const val = parseFloat(numStr);
        if (isNaN(val)) return null;
        tokens.push({ type: 'NUMBER', value: val });
        continue;
      }

      tokens.push({ type: 'OP', value: char });
      i++;
    } else if (char === '(') {
      tokens.push({ type: 'LPAREN' });
      i++;
    } else if (char === ')') {
      tokens.push({ type: 'RPAREN' });
      i++;
    } else if (/\d|\./.test(char)) {
      let numStr = '';
      while (i < str.length && (/\d|\./.test(str[i]))) {
        numStr += str[i];
        i++;
      }
      const val = parseFloat(numStr);
      if (isNaN(val)) return null;
      tokens.push({ type: 'NUMBER', value: val });
    } else {
      return null;
    }
  }

  return tokens;
}

// Recursive descent parser for:
// Expression = Term (( '+' | '-' ) Term)*
// Term = Factor (( '*' | '/' | '%' ) Factor)*
// Factor = NUMBER | '(' Expression ')'

class TokenReader {
  private index = 0;
  constructor(private tokens: Token[]) {}

  peek(): Token | undefined {
    return this.tokens[this.index];
  }

  next(): Token | undefined {
    return this.tokens[this.index++];
  }

  hasMore(): boolean {
    return this.index < this.tokens.length;
  }
}

function parseExpression(tokens: Token[]): number | null {
  const reader = new TokenReader(tokens);
  const result = parseAddSub(reader);
  if (reader.hasMore()) {
    return null; // Leftover tokens
  }
  return result;
}

function parseAddSub(reader: TokenReader): number | null {
  let left = parseMulDiv(reader);
  if (left === null) return null;

  while (reader.hasMore()) {
    const nextToken = reader.peek();
    if (nextToken && nextToken.type === 'OP' && (nextToken.value === '+' || nextToken.value === '-')) {
      reader.next(); // consume operator
      const right = parseMulDiv(reader);
      if (right === null) return null;
      if (nextToken.value === '+') {
        left = left + right;
      } else {
        left = left - right;
      }
    } else {
      break;
    }
  }

  return left;
}

function parseMulDiv(reader: TokenReader): number | null {
  let left = parseFactor(reader);
  if (left === null) return null;

  while (reader.hasMore()) {
    const nextToken = reader.peek();
    if (nextToken && nextToken.type === 'OP' && (nextToken.value === '*' || nextToken.value === '/' || nextToken.value === '%')) {
      reader.next(); // consume operator
      const right = parseFactor(reader);
      if (right === null) return null;
      if (nextToken.value === '*') {
        left = left * right;
      } else if (nextToken.value === '/') {
        if (right === 0) return null; // Division by zero
        left = left / right;
      } else if (nextToken.value === '%') {
        if (right === 0) return null;
        left = left % right;
      }
    } else {
      break;
    }
  }

  return left;
}

function parseFactor(reader: TokenReader): number | null {
  const token = reader.next();
  if (!token) return null;

  if (token.type === 'NUMBER') {
    return token.value;
  }

  if (token.type === 'LPAREN') {
    const inner = parseAddSub(reader);
    if (inner === null) return null;
    const closing = reader.next();
    if (!closing || closing.type !== 'RPAREN') {
      return null; // Mismatched parenthesis
    }
    return inner;
  }

  return null;
}
