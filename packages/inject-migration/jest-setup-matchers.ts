import { expect } from '@jest/globals';
import { toMatchWithDiff } from './src/jest-diff-matcher';

expect.extend({
  toMatchWithDiff,
});
