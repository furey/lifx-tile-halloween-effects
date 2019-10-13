const sample = require('lodash.samplesize')
const { log, parseColor, parseColors } = require('lifx-tile-effects-framework').utils
const kelvin = 3000
const noColor = parseColor('yellow', { brightness: 0, kelvin })
const frames = {
  center: parseColors(require('../frames/eyes/center'), { kelvin }),
  left: parseColors(require('../frames/eyes/left'), { kelvin }),
  right: parseColors(require('../frames/eyes/right'), { kelvin }),
}

module.exports = class {

  static getFlushColor() {
    return noColor
  }

  static async create({ device, tiles }) {
    return await (new this({ device, tiles })).boot()
  }

  constructor({ device, tiles }) {
    this.device = device
    this.tiles = tiles
    this.activeTile = {}
  }

  async boot() {
    log('Setting initial state…')
    this.setInitialState()
    log('Running…')
    await this.step()  
    setInterval(async () => await this.step(), this.getStepMilliseconds())
  }

  setInitialState() {
    this.activeTile = {
      tile_index: this.getNextActiveIndex(),
      state: 'waiting',
      delay: 0,
    }
  }
  
  getNextActiveIndex() {
    if (this.tiles.length === 1) return this.tiles[0].tile_index
    const indexes = this.tiles.map(tile => tile.tile_index)
    const active = this.activeTile.tile_index
    return sample(indexes.filter(i => i !== active))[0]
  }

  async step() {
    this.stepTiles()
    await this.updateTiles()
  }

  stepTiles() {
    this.activeTile = {
      ...this.activeTile,
      delay: this.activeTile.delay - this.getStepMilliseconds(),
    }
  }

  async updateTiles() {
    if (this.activeTile.delay > 0) return
    const tile = this.tiles.find(tile => tile.tile_index === this.activeTile.tile_index)
    const state = this.getStateAfter(this.activeTile.state)
    if (state === 'waiting') this.setInitialState()
    let assign = { state }
    let params = {
      tile_index: this.activeTile.tile_index,
      length: 1,
    }
    switch (state) {
      case 'waiting':
        assign.delay = 1500 + Math.floor(Math.random() * 2000)
        params.duration = 250
        params.colors = Array(tile.width * tile.height).fill(noColor)
        break
      case 'center':
        assign.delay = 2000 + Math.floor(Math.random() * 3000)
        params.duration = 250
        params.colors = frames.center
        break
      case 'left':
        assign.delay = 1000 + Math.floor(Math.random() * 2000)
        params.duration = 250
        params.colors = frames.left
        break
      case 'right':
        assign.delay = 1000 + Math.floor(Math.random() * 2000)
        params.duration = 250
        params.colors = frames.right
        break
      case 'blink':
        assign.delay = 250
        params.duration = 250
        params.colors = Array(tile.width * tile.height).fill(noColor)
        break
      case 'leaving':
        assign.delay = 500
        params.duration = 250
        params.colors = Array(tile.width * tile.height).fill(noColor)
        break
    }
    this.activeTile = {
      ...this.activeTile,
      ...assign,
    }
    await this.device.tileSetTileState64(params).catch(console.error)
  }

  getStateAfter(state) {
    if (state === 'blink') return this.activeTile.previous
    this.activeTile.previous = state
    if (state === 'waiting') return 'center'
    if (state === 'leaving') return 'waiting'
    if (Math.random() < 0.3) return 'leaving'
    if (Math.random() < 0.3) return 'blink'
    const options = ['center', 'left', 'right']
    return sample(options.filter(option => option !== state))[0]
  }

  getStepMilliseconds() {
    return 250
  }

}
