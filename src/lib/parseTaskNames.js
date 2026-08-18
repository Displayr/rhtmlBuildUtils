// Task names are the LEADING positional arguments of `rhtml <task>... [--flags]`, stopping at the first
// flag. Everything from the first flag onward belongs to the flags, which each task parses for itself.
//
// NB the stop-at-first-flag rule is the whole point. A space-separated flag VALUE is a bare word, so
// filtering on "does not start with -" reads the HEAD in `--from HEAD`, or the filter in
// `-t someFilter`, as a task name -- which fails with "unknown task 'HEAD'". gulp behaved the same way,
// taking task names first.
//
// Extracted from src/cli.js so it can be tested without executing the CLI, which calls process.exit.
module.exports = function parseTaskNames (argv) {
  const firstFlag = argv.findIndex(arg => arg.startsWith('-'))
  return (firstFlag === -1) ? argv : argv.slice(0, firstFlag)
}
