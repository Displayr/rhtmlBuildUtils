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

// Browser ES modules (`import _ from 'lodash'`), bundled by esbuild -- as opposed to the node CommonJS
// that everything else here and in a widget repo is written in. These parsed under the old .eslintrc
// only because eslint-config-standard set sourceType: 'module' for the WHOLE project, including the
// CommonJS majority; eslint-plugin-n's recommended-script config is correctly CommonJS, so the
// genuinely-ESM files have to say so for themselves.
//
// NB the widget entries matter as much as this package's own. `theSrc/scripts` is the standardised home
// for a widget's source -- both widgetEntryPoint and widgetFactory point into it (see
// src/config/default.widget.config.js) -- and it is ALL browser ESM. Without these globs a widget repo
// adopting this config gets a parsing error on every one of its own source files. Globs that do not
// apply in a given repo simply match nothing, so one list serves both.
const browserEsmFiles = [
  // this package's own experiment UI
  'src/tasks/experiment/assets/ui/**/*.js',
  // a widget repo's source, and any browser javascript it serves from the internal web server
  'theSrc/scripts/**/*.js',
  'theSrc/internal_www/js/**/*.js'
]

// A widget repo's test tree -- the widget-side counterpart of browserContextFiles above. These files
// run in node, but the callbacks they hand to page.evaluate / waitForFunction are serialised into the
// browser, so they reference `window` and `document` in code that never executes here. rhtmlDonut also
// keeps an ES module helper under theSrc/test (utils/addTestFixturesToWindow.js), so this tree is
// mixed: sourceType module covers that one without disturbing the CommonJS majority, whose `require`
// and `module.exports` parse the same either way.
const widgetTestFiles = ['theSrc/test/**/*.js']

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

      // @stylistic's customize() defaults are close to standard but differ on these. Set to standard's
      // values so no existing file is reformatted.
      '@stylistic/comma-dangle': ['error', 'never'],
      '@stylistic/space-before-function-paren': ['error', 'always'],
      '@stylistic/brace-style': ['error', '1tbs', { allowSingleLine: true }],
      '@stylistic/quote-props': ['error', 'as-needed'],

      // NB customize() defaults this to 'before', but eslint-config-standard used 'after' -- i.e. a
      // wrapped expression keeps the operator at the END of the line. Nothing on master happened to
      // wrap an operator, so the mismatch stayed invisible until a file written under the old config
      // was added, which then reported 13 errors for style that was previously correct. Ternaries keep
      // the operator at the start, which is standard's own exception.
      '@stylistic/operator-linebreak': ['error', 'after', {
        overrides: { '?': 'before', ':': 'before', '|>': 'before' }
      }],

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
  },

  {
    files: widgetTestFiles,
    languageOptions: {
      sourceType: 'module',
      globals: { ...globals.browser }
    },
    rules: {
      // NB puppeteer is deliberately NOT a dependency of a widget repo. It comes from here, because the
      // browser version is what decides whether the widget's image baselines are valid, and declaring
      // it in both places would let the two drift and silently invalidate every baseline. So it
      // resolves at runtime while being absent from the widget's package.json -- exactly the shape
      // these two rules report.
      //
      // n/no-missing-require is deliberately left ON: a require that resolves to nothing is still a
      // defect here, and switching it off would turn the whole test tree into an unchecked directory.
      'n/no-extraneous-require': 'off',
      'n/no-extraneous-import': 'off'
    }
  }
]
