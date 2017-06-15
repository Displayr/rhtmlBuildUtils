const _ = require('lodash')

class ApplitoolsResultTracker {
  constructor () {
    this.batchName = null
    this.batchUrl = null
    this.rawRecords = []
    this.failedSnapshotCount = 0
    this.failedScenarioNames = []
    this._onDiff = 'fail'
    this.validOnDiffValues = [ 'pass', 'fail' ]
  }

  onDiff (newOnDiff) {
    if (!this.validOnDiffValues.includes(newOnDiff)) {
      throw new Error(`Invalid onDiff value: ${newOnDiff}`)
    }
    this._onDiff = newOnDiff
  }

  addResult (result) {
    this.rawRecords.push(result)
    if (!this.batchName) {
      this.batchName = result.batchName
      this.batchUrl = _.get(result, 'appUrls.batch')
    }

    if (!result.isPassed) {
      this.failedSnapshotCount++
      this.failedScenarioNames.push(result.name)
      console.error(`WARNING: "${result.name}" had a failed snapshot.`)
    }
  }

  processResults () {
    if (!this.passed()) {
      if (this._onDiff === 'fail') {
        throw new Error(this.getErrorSummary())
      } else {
        console.log(`WARNING (onDiff=pass): ${this.getErrorSummary()}`)
      }
    } else {
      console.log(`INFO: All snapshots passed. Batch Url: ${this.batchUrl}`)
    }
  }

  passed () {
    return this.failedSnapshotCount === 0
  }

  getErrorSummary () {
    return `${this.batchName} batch had ${this.failedSnapshotCount} failed snapshot${(this.failedSnapshotCount > 1) ? 's' : ''}.\n Batch Url: ${this.batchUrl}`
  }
}

module.exports = ApplitoolsResultTracker
