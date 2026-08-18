const parseTaskNames = require('./parseTaskNames')

// Decides which tasks `rhtml <argv>` should run, including the fallback to `default`.
//
// NB "no arguments at all" and "arguments given, none of which parsed as a task name" are DIFFERENT
// and must not share the fallback. parseTaskNames stops at the first flag, so `rhtml --fix lint`
// yields [], and falling back to `default` there resolves to `build`, whose first step is `clean` --
// which deletes browser/, inst/, R/ and .tmp/. A developer typing the flag first would silently have
// their build output wiped, and inst/ and R/ are committed in a widget repo. The two cases the parser
// was written for (`--from HEAD`, `-t someFilter`) at least failed loudly; this one did damage.
const resolveTaskNames = (argv) => {
  const requested = parseTaskNames(argv)

  if (argv.length && !requested.length) {
    throw new Error(`no task name before the first flag in: rhtml ${argv.join(' ')}`)
  }

  return requested.length ? requested : ['default']
}

module.exports = resolveTaskNames
