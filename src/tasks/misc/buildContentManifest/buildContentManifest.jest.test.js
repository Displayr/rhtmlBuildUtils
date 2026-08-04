const fs = require('fs')
const path = require('path')

// NB buildContentManifest pulls in widgetConfig, which requires a build/config/widget.config
// from the consuming widget project. That file does not exist in this repo, so stub it out.
jest.mock('../../../lib/widgetConfig', () => ({ basePath: '/fake/project' }))
jest.mock('recursive-readdir-sync')

const recursiveReaddirSync = require('recursive-readdir-sync')
const { getContentFiles, groupContentFiles } = require('./buildContentManifest')

const baseContentPath = path.join('/fake/project', 'theSrc/internal_www/content')

describe('getContentFiles', () => {
  beforeEach(() => {
    jest.spyOn(fs, 'existsSync').mockReturnValue(true)
  })

  afterEach(() => {
    jest.restoreAllMocks()
    recursiveReaddirSync.mockReset()
  })

  // NB fixtures are built with path.join so each OS exercises its own separator. The relative
  // paths returned here are used as web URLs, so they must always use '/'.
  test('returns paths relative to the content dir, using url separators', () => {
    recursiveReaddirSync.mockReturnValue([
      path.join(baseContentPath, 'functional', 'colors.html'),
      path.join(baseContentPath, 'index.html')
    ])

    expect(getContentFiles()).toEqual(['functional/colors.html', 'index.html'])
  })

  test('excludes non html files and content templates', () => {
    recursiveReaddirSync.mockReturnValue([
      path.join(baseContentPath, 'functional', 'colors.html'),
      path.join(baseContentPath, 'functional', 'notes.md'),
      path.join(baseContentPath, 'content_template.html')
    ])

    expect(getContentFiles()).toEqual(['functional/colors.html'])
  })

  test('returns an empty list when the content dir does not exist', () => {
    fs.existsSync.mockReturnValue(false)

    expect(getContentFiles()).toEqual([])
    expect(recursiveReaddirSync).not.toHaveBeenCalled()
  })
})

describe('groupContentFiles', () => {
  test('groups by the first path segment and prefixes the web path', () => {
    expect(groupContentFiles(['functional/colors.html', 'functional/sizes.html', 'visual/fonts.html']))
      .toEqual({
        functional: ['/content/functional/colors.html', '/content/functional/sizes.html'],
        visual: ['/content/visual/fonts.html']
      })
  })

  test('groups files at the content root under misc', () => {
    expect(groupContentFiles(['index.html']))
      .toEqual({ misc: ['/content/index.html'] })
  })
})
