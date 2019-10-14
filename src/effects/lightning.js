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
    this.bolt = undefined
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
    this.bolt = this.createBolt()
  }

  createBolt() {
    return {
      origin: Math.floor(Math.random() * this.bounds.width),
      flashCount: 0,
      totalFlashes: 1 + Math.floor(Math.random() * 3),
      delay: 0,
      state: 'flash'
    }
  }

  async step() {
    await this.stepBolt()
  }

  async stepBolt() {
    this.bolt.delay -= this.getStepMilliseconds()
    if (this.bolt.delay > 0) return
    switch (this.bolt.state) {
      case 'flash':
        this.bolt.flashCount++
        this.generateCanvas()
        this.renderCanvas()
        await this.updateTiles()
        if (this.bolt.flashCount < this.bolt.totalFlashes) {
          this.bolt.delay = this.getStepMilliseconds()
          this.bolt.state = 'midFlash'
        } else {
          this.bolt.delay = this.getStepMilliseconds()
          this.bolt.state = 'postFlash'
        }
        break;
      case 'midFlash':
        await this.clearTiles()
        this.bolt.delay = this.getStepMilliseconds()
        this.bolt.state = 'flash'
        break;
      case 'postFlash':
        const duration = 1000 + Math.floor(Math.random() * 1000)
        await this.clearTiles(duration)
        this.bolt.delay = duration + 1000 + Math.floor(Math.random() * 3000)
        this.bolt.state = 'waiting'
        break;
      case 'waiting':
        this.bolt = this.createBolt()
        break;
    }
  }

  generateCanvas() {
    const canvas = [...Array(this.bounds.height)].map(() =>
      [...Array(this.bounds.width)]
    )
    let x = this.bolt.origin
    for (let y = 0; y < this.bounds.height; y++) {
      x = x - 1 + Math.floor(Math.random() * 3)
      x = Math.max(0, Math.min(this.bounds.width - 1, x))
      canvas[y][x] = '⚡️'
    }
    this.canvas = canvas
  }

  renderCanvas() {
    const colors = Array(this.bounds.width * this.bounds.height).fill(noColor)
    const hue = 210/360
    this.canvas.forEach((row, y) => {
      this.canvas[y].forEach((col, x) => {
        if (col !== '⚡️') return
        let index = (Math.round(y) * this.bounds.width) + x
        colors[index] = {
          hue,
          saturation: this.getSaturation(),
          brightness: 1,
          kelvin: 9000
        }
      })
    })
    this.colors = colors
  }

  getSaturation() {
    return 0.125 + Math.random() * 0.375
  }

  async clearTiles(duration = 0) {
    await this.device.tileSetTileState64({
      tile_index: this.tiles[0].tile_index,
      length: this.tiles.length,
      duration,
      colors: Array(64).fill(noColor)
    }).catch(console.error)
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
    return 200
  }

}
