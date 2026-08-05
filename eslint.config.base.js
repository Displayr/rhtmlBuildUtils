// Shared eslint flat config for rhtmlBuildUtils and the widget repos that consume it.
//
// NB eslint 10 removed .eslintrc support entirely (deprecated in 9, the ESLINT_USE_FLAT_CONFIG=false
// escape hatch went with it), so this file replaces the .eslintrc that used to live here and in every
// widget repo. A widget repo adopts it with a one line eslint.config.js:
//
//     module.exports = require('rhtmlBuildUtils/eslint.config.base')
//
// NB the style rules used to come from eslint-config-standard, which cannot come along: it caps at
// eslint 8, and its flat config successor (neostandard) caps at eslint 9. eslint 10 also REMOVED the
// core formatting rules that eslint-config-standard configured (quotes, array-bracket-spacing, ...),
// which now live in @stylistic. So standard's layout is reproduced through @stylistic's customize()
// factory plus the overrides below, chosen so that this migration reformats no existing code.
const js = require('@eslint/js')
const stylistic = require('@stylistic/eslint-plugin')
const n = require('eslint-plugin-n')
const promise = require('eslint-plugin-promise')
const globals = require('globals')

// Generated output, vendored code, and mustache templates that are not valid standalone JS.
// eslint ignores node_modules itself, so it is not listed.
//
// NB a config object containing ONLY `ignores` sets global ignores. Merging these into an object that
// also carries `rules` would instead scope them to that one object, and they would not apply to the
// other configs in the array -- so the generated directories would get linted after all.
const ignores = [
  '**/*.template.js',
  'browser/**',
  'inst/**',
  'man/**',
  'R/**',
  'docs/**',
  'examples/**',
  '.tmp/**'
]

// Files that are executed in the browser, not in node: the esbuild inject shim, and the node modules
// that embed callbacks which puppeteer serialises into the page (page.evaluate / waitForFunction).
// The old .eslintrc set env.browser = false globally and got away with it because
// eslint-config-standard does not extend eslint:recommended and so never enabled no-undef.
const browserContextFiles = [
  'src/lib/esbuildPolyfillShim.js',
  'src/lib/renderExamplePageTest.helper.js'
]

// The *.jest.test.js files under src/tasks/*/assets are templates, not tests of this repo. They are
// copied into the widget repo (by copySnapshotJestRunnerToProject) and require 'rhtmlBuildUtils' and
// a generated './test_plan', neither of which resolves from here. jest.config.js excludes them from
// the test run for the same reason.
const copiedTemplateTests = ['src/tasks/*/assets/*.jest.test.js']

// The experiment UI is browser ES modules (`import _ from 'lodash'`), bundled by esbuild. It parsed
// under the old .eslintrc only because eslint-config-standard set sourceType: 'module' for the whole
// project, including the CommonJS majority. eslint-plugin-n's recommended-script config is correctly
// CommonJS, so the genuinely-ESM files now say so for themselves.
const browserEsmFiles = ['src/tasks/experiment/assets/ui/**/*.js']

module.exports = [
  { ignores },

  js.configs.recommended,

  // recommended-script, not recommended-module: these repos are CommonJS. This also supplies
  // languageOptions.sourceType = 'commonjs' and the node globals, so neither is set again below.
  n.configs['flat/recommended-script'],

  stylistic.configs.customize({
    indent: 2,
    quotes: 'single',
    semi: false,
    jsx: false
  }),

  {
    // NB the promise plugin is registered but its `recommended` set is deliberately NOT applied.
    // eslint-config-standard only ever enabled promise/param-names, and the recommended set adds
    // always-return / catch-or-return / no-callback-in-promise / no-nesting, which flag 14 places in
    // this repo. Those are worth addressing, but rewriting promise chains is not a dependency upgrade.
    plugins: { promise },
    languageOptions: {
      ecmaVersion: 2022,
      // The old .eslintrc set env.jest globally rather than only for test files. Preserved as is:
      // narrowing it to *.jest.test.js is a separate decision from this dependency upgrade.
      globals: { ...globals.jest }
    },
    rules: {
      'promise/param-names': 'error',

      // NB eslint's own default for no-unused-vars flags unused trailing function ARGUMENTS, but
      // eslint-config-standard set args: 'none', and much of src/tasks takes a `gulp` parameter it
      // never uses. Keeping standard's setting is what makes this a dependency change rather than a
      // refactor of every task module. Removing those dead parameters belongs with the gulp removal.
      'no-unused-vars': ['error', {
        args: 'none',
        caughtErrors: 'none',
        ignoreRestSiblings: true,
        vars: 'all'
      }],

      // This is a build tool and a git hook: exiting with a specific code is the interface, not a
      // smell. Every call site has a comment explaining the exit code it is propagating.
      'n/no-process-exit': 'off',

      // NB these two came from eslint-config-standard and are NOT in js.configs.recommended. They are
      // restored explicitly because the tree carries deliberate eslint-disable directives for both
      // (the esbuild polyfill shim extends natives on purpose; one test uses new Function to prove a
      // round trip). Without the rules enabled those directives count as unused, and `eslint --fix`
      // deletes them -- silently dropping the rules everywhere else rather than just at those sites.
      'no-extend-native': 'error',
      'no-new-func': 'error',

      // @stylistic's customize() defaults are close to standard but differ on these five. Set to
      // standard's values so no existing file is reformatted.
      '@stylistic/comma-dangle': ['error', 'never'],
      '@stylistic/space-before-function-paren': ['error', 'always'],
      '@stylistic/brace-style': ['error', '1tbs', { allowSingleLine: true }],
      '@stylistic/quote-props': ['error', 'as-needed'],

      // Not enabled by eslint-config-standard, and the tree mixes `x => ...` with `(x) => ...`.
      // Turning it on would be a reformat, so leave the existing mix alone.
      '@stylistic/arrow-parens': 'off',
      '@stylistic/max-statements-per-line': 'off'
    }
  },

  {
    files: browserContextFiles,
    languageOptions: { globals: { ...globals.browser } }
  },

  {
    files: copiedTemplateTests,
    rules: { 'n/no-missing-require': 'off' }
  },

  {
    files: browserEsmFiles,
    languageOptions: {
      sourceType: 'module',
      globals: { ...globals.browser }
    },
    rules: {
      // These resolve their imports from the widget repo's node_modules once bundled, not from here.
      'n/no-missing-import': 'off',
      'n/no-extraneous-import': 'off',

      // eslint-plugin-n judges API availability against package.json engines.node. That is the wrong
      // question for code that only ever runs in a browser: without this it reports `fetch` as an
      // unsupported node builtin. The three files that call fetch used to carry a `/* global fetch */`
      // comment to work around the missing browser globals; those are gone now that the globals are
      // declared here, since they would otherwise trip no-redeclare.
      'n/no-unsupported-features/node-builtins': 'off'
    }
  }
]
