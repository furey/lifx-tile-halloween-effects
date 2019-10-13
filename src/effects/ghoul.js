const { log, parseColor, parseColors } = require('lifx-tile-effects-framework').utils
const kelvin = 4500
const noColor = parseColor('white', { brightness: 0, kelvin })
const frame = parseColors(require('../frames/ghoul'), { saturation: 0, kelvin })

module.exports = class {
  
  static async create({ device, tiles }) {
    return await (new this({ device, tiles })).boot()
  }

  static getFlushColor() {
    return noColor
  }

  constructor({ device, tiles }) {
    this.device = device
    this.tiles = tiles
  }

  async boot() {
    log('Setting initial state…')
    this.setInitialState()
    log('Running…')
    await this.step()  
    setInterval(async () => await this.step(), this.getStepMilliseconds())
  }

  setInitialState() {
    for (let i = 0; i < this.tiles.length; i++) {
      const tile = this.tiles[i]
      this.tiles[i] = {
        ...tile,
        state: 'waiting',
        delay: 0,
      }
    }
  }

  async step() {
    this.stepTiles()
    await this.updateTiles()
  }

  stepTiles() {
    for (let i = 0; i < this.tiles.length; i++) {
      const tile = this.tiles[i]
      this.tiles[i] = {
        ...tile,
        delay: tile.delay - this.getStepMilliseconds(),
      }
    }
  }

  async updateTiles() {
    for (let i = 0; i < this.tiles.length; i++) {
      const tile = this.tiles[i]
      if (tile.delay > 0) continue
      let assign = {}
      let params = {
        tile_index: tile.tile_index,
        length: 1,
      }
      switch (tile.state) {
        case 'waiting':
          assign.state = 'showing'
          assign.delay = 0
          params.duration = 0
          params.colors = frame
          break
        case 'showing':
          assign.state = 'waiting'
          assign.delay = Math.floor(Math.random() * 5000)
          params.duration = 1000
          params.colors = Array(tile.width * tile.height).fill(noColor)
          break
      }
      this.tiles[i] = {
        ...tile,
        ...assign,
      }
      await this.device.tileSetTileState64(params).catch(console.error)  
    }
  }

  getStepMilliseconds() {
    return 250
  }

}
