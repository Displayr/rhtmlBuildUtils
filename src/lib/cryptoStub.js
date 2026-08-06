// Stands in for node's `crypto` when esbuild bundles a widget. Aliased in src/lib/compileES6.js.
//
// Why a stub is the DEFAULT rather than crypto-browserify:
//
// bignumber.js@2 -- used by rhtmlCombinedScatter and rhtmlLabeledScatter -- reaches for crypto with
//
//     if ( !cryptoObj ) try { cryptoObj = require('cry' + 'pto'); } catch (e) {}
//
// The string concatenation and the try/catch are deliberate: they stop a bundler statically resolving
// crypto, and browserify duly shipped none of it. esbuild constant-folds the concatenation, so it DOES
// resolve, and aliasing to crypto-browserify then pulled 616 KiB across 180 files (elliptic, four separate
// copies of bn.js, asn1.js, browserify-sign, diffie-hellman) into rhtmlCombinedScatter's bundle, taking it
// from 1651 to 2341 KiB -- all for a code path (BigNumber.random) that nothing calls. Stubbing reproduces
// what browserify shipped for years.
//
// A widget that genuinely needs crypto in the browser opts back in from its widget.config.js:
//
//     esbuildOptions: { alias: { crypto: 'crypto-browserify' } }
//
// NB rhtmlPictographs is the known case: CacheService.js and SvgDefinitionManager.js call
// crypto.createHash for cache keys, so it must opt in when it moves off 7.2.3.
//
// NB the members below THROW rather than being absent, so a widget that needs crypto fails with an
// actionable message rather than "crypto.createHash is not a function". Everything else is undefined,
// which is what bignumber's own feature detection expects.
const unavailable = (name) => () => {
  throw new Error(
    `node's crypto.${name}() is not in this bundle. rhtmlBuildUtils stubs 'crypto' by default, because ` +
    'resolving it pulls ~600 KiB of crypto-browserify into the widget for a code path that is usually ' +
    'never called. If this widget really does need crypto in the browser, opt back in from ' +
    'build/config/widget.config.js with: esbuildOptions: { alias: { crypto: \'crypto-browserify\' } }'
  )
}

module.exports = {
  createHash: unavailable('createHash'),
  createHmac: unavailable('createHmac'),
  randomBytes: unavailable('randomBytes'),
  randomFillSync: unavailable('randomFillSync'),
  pbkdf2: unavailable('pbkdf2'),
  pbkdf2Sync: unavailable('pbkdf2Sync')
}
