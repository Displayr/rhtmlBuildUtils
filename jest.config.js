module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],

  // NB this repo's own tests use the same *.jest.test.js convention as the widget projects that
  // consume it, which is what src/tasks/misc/jestSpecTests.js passes to jest via --testMatch.
  // processTestPlans.test.js is deliberately excluded by this pattern: it is an unported mocha
  // suite (see the TODO at the top of that file).
  testMatch: ['**/*.jest.test.js'],

  // NB src/tasks/*/assets/*.jest.test.js are templates, not tests of this repo. They get copied
  // into the widget project being built (by copySnapshotJestRunnerToProject) and require
  // 'rhtmlBuildUtils' plus a generated ./test_plan, neither of which resolves from here.
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/src/tasks/.*/assets/']
}
