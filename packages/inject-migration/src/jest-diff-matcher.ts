import type { MatcherFunction } from 'expect';
import { diff } from 'jest-diff';
const normalize = (str) => str.trim().replace(/\r?\n/g, '\n');

export const toMatchWithDiff: MatcherFunction<[expected: string]> = (
  actual: string,
  expected: string
) => {
  const normalizedActual = normalize(actual);
  const normalizedExpected = normalize(expected);

  if (normalizedActual === normalizedExpected) {
    return {
      message: () =>
        // `this` context will have correct typings
        `Expected result matches the actual.\n${actual}`,
      pass: true,
    };
  } else {
    return {
      message: () =>
        [
          `Expected result does not match the actual.`,
          `Received actual:\n${actual}\n`,
          `Diff of expected vs actual:\n`,
          `${diff(expected, actual)}`,
        ].join('\n'),
      pass: false,
    };
  }
};
