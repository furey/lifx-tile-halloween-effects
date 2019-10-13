const { log, parseColor } = require('lifx-tile-effects-framework').utils
const noColor = parseColor('red', { brightness: 0 })

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
    this.columns = undefined
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
    this.columns = this.createColumns()
  }

  createColumns() {
    const max = this.tiles[0].height/2
    const length = this.bounds.height + Math.floor(Math.random() * this.bounds.height)
    const columns = []
    for (let i = 0; i < this.bounds.width; i++) {
      let y = -max/2 + Math.floor(Math.random() * max/2) * (Math.random() < 0.5 ? -1 : 1)
      columns.push({
        y,
        length,
        speed: 0.5 + Math.random() * 0.25,
        hasTail: Math.random() < 0.75,
      })
    }
    return columns
  }

  async step() {
    this.stepColumns()
    this.renderColumns()
    await this.updateTiles()
    this.checkBounds()
  }

  stepColumns() {
    this.columns = this.columns.map(col => {
      col.y += col.speed
      return col
    })
  }

  renderColumns() {
    const colors = Array(this.bounds.width * this.bounds.height).fill(noColor)
    this.columns.forEach((col, x) => {
      const colBot = col.y
      const colTop = col.y - col.length
      let i = 1, percent, index
      for (let y = colBot; y > colTop; y--) {
        index = (Math.round(y) * this.bounds.width) + x
        if (index < 0) continue
        percent = i / col.length
        colors[index] = 
          col.hasTail && i === Math.floor(col.length*0.6)
          || percent < 0.5
            ? parseColor('red', { kelvin: 1500 })
            : percent < 0.75
              ? parseColor('red', { brightness: 0.25, kelvin: 1500 })
              : parseColor('red', { brightness: 0.1, kelvin: 1500 })
        i++
      }
    })
    this.colors = colors
  }

  async updateTiles() {
    for (const tile of this.tiles) {
      await this.device.tileSetTileState64({
        tile_index: tile.tile_index,
        length: 1,
        duration: 750,
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

  checkBounds() {
    const outside = this.columns.filter(col => this.isOutsideBounds(col)) 
    if (outside.length === this.columns.length) this.setInitialState()
  }

  isOutsideBounds(col) {
    return col.y - col.length - this.tiles[0].height*1.5 > this.bounds.height
  }

  getStepMilliseconds() {
    return 250
  }

}
