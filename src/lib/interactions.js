const getCoords = async function (page, selector) {
  const element = await page.$(selector)
  const rect = await page.evaluate(element => {
    const { top, left, bottom, right } = element.getBoundingClientRect()
    return { top, left, bottom, right }
  }, element)
  return rect
}

const dragThing = async function (page, selector, xMovement, yMovement) {
  const coords = await getCoords(page, selector)
  const steps = Math.floor(Math.max(Math.abs(xMovement), Math.abs(yMovement)) / 2)
  await page.hover(selector)
  await page.mouse.down()
  await page.mouse.move(parseFloat(coords.left + xMovement), parseFloat(coords.top + yMovement), { steps })
  return page.mouse.up()
}

module.exports = {
  getCoords,
  dragThing
}
