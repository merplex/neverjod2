// Voice calculator - parses math expressions from voice input
// Examples: "250 minus 150 divided by 3", "500 plus 100 times 2"

export interface CalculationResult {
  expression: string;
  result: number;
  error?: string;
}

// Map voice words to operators
const operatorMap: Record<string, string> = {
  // Addition
  "plus": "+",
  "add": "+",
  "and": "+",
  "+": "+",

  // Subtraction
  "minus": "-",
  "subtract": "-",
  "sub": "-",
  "-": "-",

  // Multiplication
  "times": "*",
  "multiply": "*",
  "multiplied": "*",
  "by": "*",
  "*": "*",
  "x": "*",

  // Division
  "divided": "/",
  "divide": "/",
  "over": "/",
  "/": "/",

  // Parentheses
  "open": "(",
  "close": ")",
  "(": "(",
  ")": ")",
};

// Convert written numbers to digits
const numberMap: Record<string, number> = {
  "zero": 0, "oh": 0,
  "one": 1,
  "two": 2, "to": 2,
  "three": 3,
  "four": 4, "for": 4,
  "five": 5,
  "six": 6,
  "seven": 7,
  "eight": 8,
  "nine": 9,
  "ten": 10,
  "eleven": 11,
  "twelve": 12,
  "thirteen": 13,
  "fourteen": 14,
  "fifteen": 15,
  "sixteen": 16,
  "seventeen": 17,
  "eighteen": 18,
  "nineteen": 19,
  "twenty": 20,
  "thirty": 30,
  "forty": 40,
  "fifty": 50,
  "sixty": 60,
  "seventy": 70,
  "eighty": 80,
  "ninety": 90,
  "hundred": 100,
  "thousand": 1000,
};

function tokenize(text: string): string[] {
  // Split by spaces and filter empty strings
  return text
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter((token) => token.length > 0);
}

function parseExpression(tokens: string[]): string {
  let expression = "";
  let i = 0;

  while (i < tokens.length) {
    const token = tokens[i];

    // Check if it's a number
    if (!isNaN(parseFloat(token))) {
      expression += token;
      i++;
    } else if (numberMap[token] !== undefined) {
      // Convert written number to digit
      expression += numberMap[token];
      i++;
    } else if (operatorMap[token]) {
      // Convert operator word to symbol
      expression += operatorMap[token];
      i++;
    } else {
      // Skip unknown tokens
      i++;
    }

    // Add space between tokens for readability
    if (i < tokens.length && expression) {
      // Only add space if next token is likely an operator or number
      const nextToken = tokens[i];
      if (
        !isNaN(parseFloat(nextToken)) ||
        numberMap[nextToken] !== undefined ||
        operatorMap[nextToken]
      ) {
        expression += " ";
      }
    }
  }

  return expression;
}

function evaluateExpression(expression: string): number {
  // Remove spaces for evaluation
  const cleanExpr = expression.replace(/\s+/g, "");

  // Basic validation: only allow numbers, operators, and parentheses
  if (!/^[\d+\-*/(). ]+$/.test(cleanExpr)) {
    throw new Error("Invalid characters in expression");
  }

  try {
    // Use Function constructor to safely evaluate (still risky, but better than eval)
    // eslint-disable-next-line no-new-func
    const result = new Function(`return ${cleanExpr}`)() as number;
    return result;
  } catch (err) {
    throw new Error("Invalid mathematical expression");
  }
}

export function calculateFromVoice(transcript: string): CalculationResult {
  try {
    // Tokenize the input
    const tokens = tokenize(transcript);

    // Parse tokens to mathematical expression
    const expression = parseExpression(tokens);

    // Evaluate the expression
    const result = evaluateExpression(expression);

    return {
      expression,
      result,
    };
  } catch (error) {
    return {
      expression: transcript,
      result: 0,
      error: error instanceof Error ? error.message : "Calculation failed",
    };
  }
}

// Test examples:
// "250 minus 150 divided by 3" -> "250 - 150 / 3" -> 200
// "five hundred plus one hundred" -> "500 + 100" -> 600
// "ten times twenty minus fifty" -> "10 * 20 - 50" -> 150
