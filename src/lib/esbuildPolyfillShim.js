/* eslint-disable no-extend-native */
// Injected into every esbuild bundle. Replaces the runtime behaviour of the babel plugins
// babel-plugin-transform-object-assign and babel-plugin-array-includes, plus browserify's
// implicit `process` global shim.

if (typeof Object.assign !== 'function') {
  Object.assign = function (target) {
    for (let i = 1; i < arguments.length; i++) {
      const source = arguments[i]
      if (source) {
        for (const key in source) {
          if (Object.prototype.hasOwnProperty.call(source, key)) target[key] = source[key]
        }
      }
    }
    return target
  }
}

if (!Array.prototype.includes) {
  Array.prototype.includes = function (searchElement, fromIndex) {
    return this.indexOf(searchElement, fromIndex) !== -1
  }
}

// browserify auto-injected a `process` shim. esbuild does not. Without this, any dependency
// reading `process.env.*` throws "process is not defined" at runtime (builds fine, breaks live).
if (typeof window !== 'undefined' && typeof window.process === 'undefined') {
  window.process = { env: {}, browser: true }
}
