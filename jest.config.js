/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest/presets/js-with-ts',
  testEnvironment: "node",
  moduleDirectories: [
    "node_modules",
    "src"
  ],
  roots: [
    "<rootDir>"
  ],
  modulePaths: [
    "<rootDir>"
  ],
  moduleNameMapper: {
    '^@agents/(.*)$': ['<rootDir>/src/agents/$1'],
    '^@components/(.*)$': ['<rootDir>/src/components/$1'],
    '^@misc/(.*)$': ['<rootDir>/src/misc/$1']
  },
  transformIgnorePatterns: [
    
  ],
};