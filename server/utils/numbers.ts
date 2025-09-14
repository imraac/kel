/**
 * Centralized numeric parsing and validation utilities
 * Returns proper number types for Zod validation
 */

export function roundTo(n: number, decimals = 2): number {
  return Math.round((n + Number.EPSILON) * 10 ** decimals) / 10 ** decimals;
}

export interface ParseOptions {
  allowNegative?: boolean;
  optional?: boolean;
}

export interface DecimalParseOptions extends ParseOptions {
  decimals?: number;
}

export function parseDecimal(
  input: unknown,
  options: DecimalParseOptions = {}
): number | undefined {
  const { decimals = 2, allowNegative = false, optional = false } = options;

  // Handle undefined/null
  if (input === undefined || input === null) {
    if (optional) return undefined;
    throw new Error("Value is required");
  }

  let n: number;

  // Handle number input
  if (typeof input === 'number') {
    if (!isFinite(input)) {
      throw new Error("Value must be a finite number");
    }
    n = input;
  }
  // Handle string input
  else if (typeof input === 'string') {
    const trimmed = input.trim();
    if (trimmed === '') {
      if (optional) return undefined;
      throw new Error("Value cannot be empty");
    }
    n = Number(trimmed);
    if (!isFinite(n)) {
      throw new Error(`Invalid numeric value: ${input}`);
    }
  }
  // Invalid input type
  else {
    throw new Error(`Invalid input type: ${typeof input}`);
  }

  // Check negative values
  if (!allowNegative && n < 0) {
    throw new Error("Value cannot be negative");
  }

  return roundTo(n, decimals);
}

export function parseIntStrict(
  input: unknown,
  options: ParseOptions & { allowZero?: boolean } = {}
): number | undefined {
  const { allowNegative = false, optional = false, allowZero = true } = options;

  // Handle undefined/null
  if (input === undefined || input === null) {
    if (optional) return undefined;
    throw new Error("Value is required");
  }

  let n: number;

  // Handle number input
  if (typeof input === 'number') {
    if (!isFinite(input)) {
      throw new Error("Value must be a finite number");
    }
    if (!Number.isInteger(input)) {
      throw new Error("Value must be an integer");
    }
    n = input;
  }
  // Handle string input
  else if (typeof input === 'string') {
    const trimmed = input.trim();
    if (trimmed === '') {
      if (optional) return undefined;
      throw new Error("Value cannot be empty");
    }
    n = Number(trimmed);
    if (!isFinite(n)) {
      throw new Error(`Invalid numeric value: ${input}`);
    }
    if (!Number.isInteger(n)) {
      throw new Error("Value must be an integer");
    }
  }
  // Invalid input type
  else {
    throw new Error(`Invalid input type: ${typeof input}`);
  }

  // Check zero values
  if (!allowZero && n === 0) {
    throw new Error("Value cannot be zero");
  }

  // Check negative values
  if (!allowNegative && n < 0) {
    throw new Error("Value cannot be negative");
  }

  return n;
}

export interface FieldConfig {
  decimals?: Record<string, number>;
  integers?: string[];
  optional?: string[];
  allowNegative?: string[];
}

export function normalizeNumericFields(
  obj: Record<string, unknown>,
  config: FieldConfig
): Record<string, unknown> {
  const { decimals = {}, integers = [], optional = [], allowNegative = [] } = config;
  const result = { ...obj };

  // Process decimal fields
  for (const [field, decimalPlaces] of Object.entries(decimals)) {
    if (field in obj) {
      try {
        result[field] = parseDecimal(obj[field], {
          decimals: decimalPlaces,
          optional: optional.includes(field),
          allowNegative: allowNegative.includes(field)
        });
      } catch (error) {
        throw new Error(`${field}: ${(error as Error).message}`);
      }
    }
  }

  // Process integer fields
  for (const field of integers) {
    if (field in obj) {
      try {
        result[field] = parseIntStrict(obj[field], {
          optional: optional.includes(field),
          allowNegative: allowNegative.includes(field),
          allowZero: true
        });
      } catch (error) {
        throw new Error(`${field}: ${(error as Error).message}`);
      }
    }
  }

  return result;
}