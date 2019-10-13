const { log, parseColor, parseColors } = require('lifx-tile-effects-framework').utils
const noColor = parseColor('white', { saturation: 1, brightness: 0, kelvin: 1500 })
const frame = parseColors(require('../frames/nun'))
const frameIn = parseColors(require('../frames/nun'), { saturation: 0.5, brightness: 0.5 })

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
          const duration = 3000 + Math.floor(Math.random() * 3000)
          assign.state = 'showing'
          assign.delay = duration/2
          params.duration = duration
          params.colors = frameIn
          break
        case 'showing':
          assign.state = 'leaving'
          assign.delay = Math.floor(Math.random() * 1000)
          params.duration = 0
          params.colors = frame
          break
        case 'leaving':
          assign.state = 'waiting'
          assign.delay = 1000 + Math.floor(Math.random() * 5000)
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
