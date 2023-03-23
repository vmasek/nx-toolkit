export declare module 'expect' {
  interface AsymmetricMatchers {
    toMatchWithDiff(expected: string): void;
  }
  interface Matchers<R> {
    toMatchWithDiff(expected: string): R;
  }
}
