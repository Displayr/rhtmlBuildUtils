module.exports = function () {
  this.When(/^I resize the widget to ([0-9]+)x([0-9]+)$/, function (width, height) {
    function resize (width, height) {
      if (typeof window.resizeHook !== 'undefined') {
        return window.resizeHook(parseInt(width), parseInt(height))
      } else {
        throw new Error('no resizeHook on window object. Widget lib must implement resizeHook')
      }
    }

    return browser.executeScript(resize, width, height)
  })
}
