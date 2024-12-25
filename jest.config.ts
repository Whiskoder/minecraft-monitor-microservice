import type { Config } from 'jest';

const config: Config = {
  // Automatically clear mock calls, instances, contexts and results before every test
  clearMocks: true,
  // Indicates whether the coverage information should be collected while executing the test
  collectCoverage: true,
  // The directory where Jest should output its coverage files
  coverageDirectory: 'coverage',
  // Indicates which provider should be used to instrument code for coverage
  coverageProvider: 'v8',
  // A map from regular expressions to module names or to arrays of module names that allow to stub out resources with a single module
  moduleNameMapper: {
    '^@app/(.*)$': '<rootDir>/src/app/$1',
    '^@modules/(.*)$': '<rootDir>/src/app/modules/$1',
    '^@config/(.*)$': '<rootDir>/src/app/config/$1',
  },
  // A preset that is used as a base for Jest's configuration
  preset: 'ts-jest',
  // The paths to modules that run some code to configure or set up the testing environment before each test
  setupFiles: ['<rootDir>/setupTests.ts'],
  // The test environment that will be used for testing
  testEnvironment: 'jest-environment-node',
};

export default config;
