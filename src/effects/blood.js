const { log, parseColor } = require('lifx-tile-effects-framework').utils
const noColor = parseColor('red', { brightness: 0 })

module.exports = class {
  
  static async create({ device, tiles, bounds }) {
    return await (new this({ device, tiles, bounds })).boot()
  }

  static getFlushColor() {
    return noColor
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
    this.columns = [...Array(this.bounds.width)].map(this.createColumn.bind(this))
  }

  createColumn() {
    const firstTile = this.tiles[0]
    return {
      y: -1 - Math.floor(Math.random() * firstTile.height),
      length: firstTile.height + Math.floor(Math.random() * (this.bounds.height - firstTile.height)),
      speed: 0.5 + Math.random() * 0.25,
      brightness: 0.25 + Math.random() * 0.75,
      hasTail: Math.random() < 0.75,
      isHidden: Math.random() < 0.3,
    }
  }

  async step() {
    this.stepColumns()
    this.renderColumns()
    await this.updateTiles()
  }

  stepColumns() {
    this.columns = this.columns.map(col => {
      col.y += col.speed
      if (this.isOutsideBounds(col)) col = this.createColumn()
      return col
    })
  }

  isOutsideBounds(col) {
    return col.y - col.length - this.tiles[0].height*2 > this.bounds.height
  }

  renderColumns() {
    const colors = Array(this.bounds.width * this.bounds.height).fill(noColor)
    this.columns.forEach((col, x) => {
      if (col.isHidden) return
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
            ? parseColor('red', { brightness: col.brightness, kelvin: 1500 })
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

  getStepMilliseconds() {
    return 250
  }

}
