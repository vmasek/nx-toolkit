/* eslint-disable */
export default {
  displayName: 'inject-migration',
  preset: '../../jest.preset.js',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/packages/inject-migration',
  setupFilesAfterEnv: ['<rootDir>/jest-setup-matchers.ts'],
};
