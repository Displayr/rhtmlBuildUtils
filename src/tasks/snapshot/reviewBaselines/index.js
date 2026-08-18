// Builds a local side-by-side review page for image snapshot baselines.
//
// Why this exists: GitHub's diff renderer gives up on a few hundred binary
// files ("Unable to render code block"), which is exactly the size of a
// regenerated baseline set. Reviewing the images is the real gate when accepting
// new baselines -- a rendering regression accepted there is invisible afterwards
// -- so it needs to be possible outside the PR view.
//
// Usage:
//   rhtml reviewBaselines --from HEAD              compare working tree against HEAD
//   rhtml reviewBaselines --from abc123^ --to abc123   compare a commit against its parent
//
// Output: .tmp/reviewBaselines/index.html

const _ = require('lodash')
const fs = require('fs-extra')
const path = require('path')
const shell = require('shelljs')
const widgetConfig = require('../../../lib/widgetConfig')
const findBaselinePngs = require('../../../lib/findBaselinePngs')
const getCommandLineArgs = require('./parseCommandLineArguments')

const WORKING_TREE = '(working tree)'

module.exports = () => {
  return function (done) {
    const args = getCommandLineArgs()

    if (!args.from) {
      return done(new Error(
        'reviewBaselines needs --from <ref>, the baselines to compare against.\n' +
        '  rhtml reviewBaselines --from HEAD\n' +
        '  rhtml reviewBaselines --from abc123^ --to abc123'
      ))
    }

    const { snapshotTesting, basePath } = widgetConfig
    const env = args.env || snapshotTesting.env
    const branch = args.branch || snapshotTesting.branch
    const snapshotPath = [snapshotTesting.snapshotDirectory, env, branch].join('/')

    const outputDirectory = path.join(basePath, '.tmp', 'reviewBaselines')
    fs.removeSync(outputDirectory)
    fs.mkdirpSync(outputDirectory)

    // Guard against comparing a ref with itself, which would report every
    // baseline as identical -- a silently wrong answer from a tool whose whole
    // job is spotting differences.
    if (args.to) {
      const resolve = (ref) => shell.exec(`git rev-parse "${ref}"`, { cwd: basePath, silent: true })
      const fromSha = resolve(args.from)
      const toSha = resolve(args.to)
      if (fromSha.code === 0 && toSha.code === 0 && fromSha.stdout.trim() === toSha.stdout.trim()) {
        return done(new Error(
          `--from "${args.from}" and --to "${args.to}" both resolve to ${fromSha.stdout.trim().slice(0, 7)}, ` +
          'so there is nothing to compare.'
        ))
      }
    }

    let from, to
    try {
      from = materialise({ ref: args.from, snapshotPath, outputDirectory, basePath, name: 'from' })
      to = args.to
        ? materialise({ ref: args.to, snapshotPath, outputDirectory, basePath, name: 'to' })
        : {
            root: path.join(basePath, ...snapshotPath.split('/')),
            label: WORKING_TREE,
            // index.html sits at <basePath>/.tmp/reviewBaselines/, so the working
            // tree is two levels up
            relativeToOutput: `../../${snapshotPath}`
          }
    } catch (error) {
      return done(error)
    }

    const pairs = collectPairs({ from, to })
    if (!pairs.length) {
      return done(new Error(
        `No .png baselines found under ${snapshotPath} in either ref. ` +
        'Check --env and --branch: the path is <snapshotDirectory>/<env>/<branch>.'
      ))
    }

    const outputFile = path.join(outputDirectory, 'index.html')
    fs.writeFileSync(outputFile, renderPage({ pairs, from, to, snapshotPath }), 'utf8')

    const counts = _.countBy(pairs, 'status')
    console.log(`reviewBaselines: ${pairs.length} baseline(s) under ${snapshotPath}`)
    console.log(`  ${_.map(counts, (n, status) => `${n} ${status}`).join(', ')}`)
    console.log(`  open ${outputFile}`)
    done()
  }
}

// Extract the snapshot tree at a ref into the output directory. Deliberately
// avoids `git archive | tar` -- the pipe is unreliable under shelljs on Windows,
// which shells out through cmd.exe. Writing the tar then extracting it works on
// both, since Windows has shipped bsdtar since 1803.
const materialise = ({ ref, snapshotPath, outputDirectory, basePath, name }) => {
  const destination = path.join(outputDirectory, name)
  const tarFile = path.join(outputDirectory, `${name}.tar`)
  fs.mkdirpSync(destination)

  // The ref is quoted because shelljs shells through cmd.exe on Windows, where
  // ^ is the escape character -- an unquoted "HEAD^" silently becomes "HEAD",
  // which would compare a commit against itself and report no differences.
  const archive = shell.exec(
    `git archive --format=tar --output="${tarFile}" "${ref}" -- "${snapshotPath}"`,
    { cwd: basePath, silent: true }
  )
  if (archive.code !== 0) {
    throw new Error(`Could not read ${snapshotPath} at "${ref}": ${archive.stderr.trim()}`)
  }

  // Extract with cwd set to the destination and a RELATIVE path to the archive.
  // GNU tar (which is what Git Bash provides on Windows) reads an absolute
  // Windows path as an rsh-style host spec and fails with
  // "Cannot connect to C: resolve failed". Relative paths avoid the drive letter
  // and work under both GNU tar and the bsdtar that ships with Windows.
  const extract = shell.exec(`tar -xf "../${path.basename(tarFile)}"`, {
    cwd: destination, silent: true
  })
  if (extract.code !== 0) {
    throw new Error(`Could not extract the snapshot archive for "${ref}": ${extract.stderr.trim()}`)
  }
  fs.removeSync(tarFile)

  return {
    root: path.join(destination, ...snapshotPath.split('/')),
    label: ref,
    relativeToOutput: `${name}/${snapshotPath}`
  }
}

const collectPairs = ({ from, to }) => {
  const relativePaths = _.union(findBaselinePngs(from.root), findBaselinePngs(to.root)).sort()

  return relativePaths.map((relativePath) => {
    const fromFile = path.join(from.root, ...relativePath.split('/'))
    const toFile = path.join(to.root, ...relativePath.split('/'))
    const hasFrom = fs.existsSync(fromFile)
    const hasTo = fs.existsSync(toFile)

    let status
    if (!hasFrom) { status = 'added' } else if (!hasTo) { status = 'removed' } else {
      status = fs.readFileSync(fromFile).equals(fs.readFileSync(toFile)) ? 'identical' : 'changed'
    }

    return {
      relativePath,
      status,
      collection: relativePath.includes('/') ? relativePath.replace(/\/[^/]+$/, '') : '(root)',
      name: relativePath.replace(/^.*\//, ''),
      fromSrc: hasFrom ? `${from.relativeToOutput}/${relativePath}` : null,
      toSrc: hasTo ? `${to.relativeToOutput}/${relativePath}` : null
    }
  })
}

const escapeHtml = (value) => String(value)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const LABELS = {
  changed: 'changed',
  added: 'new - no baseline in --from',
  removed: 'removed',
  identical: 'identical - not regenerated'
}

const renderPage = ({ pairs, from, to, snapshotPath }) => {
  const counts = _.countBy(pairs, 'status')
  const summary = _(['changed', 'added', 'removed', 'identical'])
    .filter((status) => counts[status])
    .map((status) => `${counts[status]} ${status}`)
    .join(' &middot; ')

  const body = _(pairs)
    .groupBy('collection')
    .map((items, collection) => {
      const heading = `<h2>${escapeHtml(collection)} <span class="badge">` +
        `${_.map(_.countBy(items, 'status'), (n, s) => `${n} ${s}`).join(' ')}</span></h2>`
      return heading + items.map(renderPair).join('\n')
    })
    .join('\n')

  return `<!doctype html>
<meta charset="utf-8">
<title>Baseline review: ${escapeHtml(from.label)} to ${escapeHtml(to.label)}</title>
<style>
 body{font:14px/1.5 system-ui,sans-serif;margin:0;padding:1.5rem;background:#0d1117;color:#e6edf3}
 h1{font-size:1.25rem;margin:0 0 .25rem}
 h2{font-size:1rem;margin:2rem 0 .5rem;border-bottom:1px solid #30363d;padding-bottom:.3rem}
 .sub{color:#8b949e;margin:0 0 1rem}
 .badge{font-weight:400;font-size:.8rem;color:#8b949e;margin-left:.5rem}
 .bar{position:sticky;top:0;background:#161b22;border:1px solid #30363d;border-radius:6px;
      padding:.6rem .8rem;margin-bottom:1rem;z-index:5;display:flex;gap:.5rem;flex-wrap:wrap;align-items:center}
 button{font:inherit;background:#21262d;color:#e6edf3;border:1px solid #30363d;border-radius:6px;
        padding:.3rem .7rem;cursor:pointer}
 button.on{background:#1f6feb;border-color:#1f6feb}
 .pair{border:1px solid #30363d;border-radius:6px;margin:.6rem 0;background:#161b22;overflow:hidden}
 .hd{display:flex;justify-content:space-between;align-items:center;gap:1rem;
     padding:.4rem .7rem;background:#0d1117;border-bottom:1px solid #30363d}
 code{font:12px ui-monospace,monospace;word-break:break-all}
 .tag{font-size:.72rem;padding:.1rem .5rem;border-radius:99px;white-space:nowrap}
 .tag.changed{background:#1f6feb33;color:#79c0ff;border:1px solid #1f6feb66}
 .tag.added{background:#23863633;color:#7ee787;border:1px solid #2ea04366}
 .tag.identical{background:#9e6a0333;color:#e3b341;border:1px solid #9e6a0366}
 .tag.removed{background:#da363333;color:#ff7b72;border:1px solid #f8514966}
 .cols{display:grid;grid-template-columns:1fr 1fr;gap:.5rem;padding:.5rem}
 figure{margin:0}
 figcaption{font-size:.72rem;color:#8b949e;margin-bottom:.25rem}
 img{max-width:100%;height:auto;display:block;background:#fff;border:1px solid #30363d;border-radius:3px}
 .missing{padding:2rem;text-align:center;color:#8b949e;border:1px dashed #30363d;border-radius:3px}
 @media (max-width:900px){.cols{grid-template-columns:1fr}}
</style>
<h1>Baseline review &mdash; <code>${escapeHtml(snapshotPath)}</code></h1>
<p class="sub">Left: <code>${escapeHtml(from.label)}</code>. Right: <code>${escapeHtml(to.label)}</code>.
Accepting these images makes them the definition of correct, so a regression accepted here is invisible afterwards.
Start with <strong>identical</strong>: a baseline that did not regenerate usually means its test errored before reaching the snapshot.</p>
<div class="bar">
  <strong>${summary}</strong>
  <span style="flex:1"></span>
  <button data-f="all" class="on">all</button>
  <button data-f="changed">changed</button>
  <button data-f="added">new</button>
  <button data-f="identical">identical</button>
  <button data-f="removed">removed</button>
</div>
${body}
<script>
 document.querySelectorAll('.bar button').forEach(function (button) {
   button.onclick = function () {
     document.querySelectorAll('.bar button').forEach(function (other) {
       other.classList.toggle('on', other === button)
     })
     var filter = button.dataset.f
     document.querySelectorAll('.pair').forEach(function (pair) {
       pair.style.display = (filter === 'all' || pair.dataset.kind === filter) ? '' : 'none'
     })
     document.querySelectorAll('h2').forEach(function (heading) {
       var node = heading.nextElementSibling
       var any = false
       while (node && node.tagName !== 'H2') {
         if (node.classList.contains('pair') && node.style.display !== 'none') { any = true }
         node = node.nextElementSibling
       }
       heading.style.display = any ? '' : 'none'
     })
   }
 })
</script>
`
}

const renderPair = ({ relativePath, status, name, fromSrc, toSrc }) => {
  const side = (src, caption, missingText) => '<figure><figcaption>' + caption + '</figcaption>' +
    (src
      ? `<img loading="lazy" src="${escapeHtml(src)}" alt="${escapeHtml(relativePath)}">`
      : `<div class="missing">${missingText}</div>`) + '</figure>'

  return `<div class="pair" data-kind="${status}">` +
    `<div class="hd"><code>${escapeHtml(name)}</code>` +
    `<span class="tag ${status}">${LABELS[status]}</span></div>` +
    '<div class="cols">' +
    side(fromSrc, 'before', 'no baseline') +
    side(toSrc, 'after', 'removed') +
    '</div></div>'
}
