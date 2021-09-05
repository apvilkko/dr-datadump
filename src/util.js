const asHex = (g) => g.toString(16).padStart(2, '0')
const hArr = (arr) => arr.map((x) => asHex(x)).join(' ')

module.exports = {
  asHex,
  hArr,
}
