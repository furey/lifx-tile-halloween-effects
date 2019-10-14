const { log, parseColor } = require('lifx-tile-effects-framework').utils
const noColor = parseColor('blue', { brightness: 0 })

module.exports = class {

  static getFlushColor() {
    return noColor
  }

  static async create({ device, tiles, bounds }) {
    return await (new this({ device, tiles, bounds })).boot()
  }

  constructor({ device, tiles, bounds }) {
    this.device = device
    this.tiles = tiles
    this.bounds = bounds
    this.canvas = undefined
    this.colors = undefined
  }

  async boot() {
    log('Setting initial state…')
    this.setInitialState()
    log('Running…')
    await this.step()  
    setInterval(async () => await this.step(), this.getStepMilliseconds())
  }

  setInitialState() {
    this.canvas = this.createLightning()
  }

  createLightning() {
    const canvas = [...Array(this.bounds.height)].map(() =>
      [...Array(this.bounds.width)]
    )
    let x = Math.floor(Math.random() * this.bounds.width)
    for (let y = 0; y < this.bounds.height; y++) {
      x = x - 1 + Math.floor(Math.random() * 3)
      x = Math.max(0, Math.min(this.bounds.width - 1, x))
      canvas[y][x] = 'w'
    }
    return canvas
  }

  async step() {
    this.stepCanvas()
    this.renderCanvas()
    await this.updateTiles()
  }

  stepCanvas() {
    this.canvas = this.createLightning()
  }

  renderCanvas() {
    const colors = Array(this.bounds.width * this.bounds.height).fill(noColor)
    this.canvas.forEach((row, y) => {
      this.canvas[y].forEach((col, x) => {
        if (col === undefined) return
        let index = (Math.round(y) * this.bounds.width) + x
        colors[index] = parseColor(col)
      })
    })
    this.colors = colors
  }

  async updateTiles() {
    for (const tile of this.tiles) {
      await this.device.tileSetTileState64({
        tile_index: tile.tile_index,
        length: 1,
        duration: 0,
        colors: this.getTileColors(tile),
      }).catch(console.error)
    }
  }

  getTileColors(tile) {
    const colors = []
    let tileX = tile.left - this.bounds.left
    let tileY = tile.top - this.bounds.top
    for (let y = 0; y < tile.height; y++) {
      for (let x = 0; x < tile.width; x++) {
        colors.push(this.colors[
          (tileY + y) * this.bounds.width +
          (tileX + x)
        ])
      }
    }
    return colors
  }

  getStepMilliseconds() {
    return 1000
  }

}
