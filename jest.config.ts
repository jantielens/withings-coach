import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.json',
      },
    ],
  },
  projects: [
    // Node tests (services, classification, API, hooks)
    {
      displayName: 'node',
      testEnvironment: 'node',
      roots: ['<rootDir>/src'],
      testPathIgnorePatterns: ['<rootDir>/src/__tests__/components/'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
      },
      transform: {
        '^.+\\.tsx?$': [
          'ts-jest',
          {
            tsconfig: 'tsconfig.json',
          },
        ],
      },
    },
    // Component tests (jsdom)
    {
      displayName: 'jsdom',
      testEnvironment: 'jsdom',
      roots: ['<rootDir>/src/__tests__/components'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '\\.css$': '<rootDir>/src/__mocks__/styleMock.js',
        '^rehype-highlight$': '<rootDir>/src/__mocks__/rehypePlugin.js',
        '^rehype-raw$': '<rootDir>/src/__mocks__/rehypePlugin.js',
      },
      transformIgnorePatterns: [
        'node_modules/.+',
      ],
      transform: {
        '^.+\\.tsx?$': [
          'ts-jest',
          {
            tsconfig: 'tsconfig.json',
          },
        ],
        '^.+\\.jsx?$': [
          'ts-jest',
          {
            tsconfig: 'tsconfig.json',
          },
        ],
      },
    },
  ],
};

export default config;
