const sample = require('lodash.samplesize')
const { log, parseColor, parseColors } = require('lifx-tile-effects-framework').utils
const noColor = parseColor('white', { brightness: 0.001, kelvin: 3750 })

module.exports = class {
  
  static async create({ device, tiles, bounds }) {
    return await (new this({ device, tiles, bounds })).boot()
  }

  static getFlushColor() {
    return { ...noColor, brightness: 0 }
  }

  constructor({ device, tiles, bounds }) {
    this.device = device
    this.tiles = tiles
    this.bounds = bounds
    this.splats = undefined
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
    this.splats = this.createSplats()
    this.tileDuration = 125
  }

  createSplats() {
    const splats = Array(1 + Math.floor(Math.random() * (this.tiles.length - 1)))
    const indexes = sample([...Array(this.tiles.length).keys()], splats.length)
    for (let s = 0; s < splats.length; s++) {
      const tile = this.tiles.find(tile => tile.tile_index === indexes[s])
      const dots = Array(1 + Math.floor(Math.random() * 7))
      for (let d = 0; d < dots.length; d++) {
        const y = (tile.top-1) - this.bounds.top + Math.floor(Math.random() * (tile.height+2))
        dots[d] = {
          x: (tile.left-1) - this.bounds.left + Math.floor(Math.random() * (tile.width+2)),
          initialY: y,
          y: y + Math.floor(Math.random() * 2),
          maxLength: Math.floor(tile.height/4) + Math.floor(Math.random() * tile.height/2),
          speed: 0.25 + Math.random() * 0.25,
          brightness: 1.0,
          state: 'waiting',
          delay: 3000 + Math.floor(Math.random() * 3000),
        }
      }
      const splat = {
        state: 'show',
        dots,
      }
      splats[s] = splat
    }
    return splats
  }

  async step() {
    this.stepSplats()
    this.renderSplats()
    await this.updateTiles()
    this.tileDuration = 2000
    this.checkSplats()
  }

  stepSplats() {
    this.splats = this.splats.map((splat, i) => {
      if (splat.state === 'done') return splat
      splat.dots = splat.dots.map(dot => {
        if (dot.state === 'done') return dot
        dot.delay -= this.getStepMilliseconds()
        if (dot.state !== 'waiting') dot.y += dot.speed
        if (dot.delay > 0) return dot
        switch (dot.state) {
          case 'waiting':
            dot.state = 'moving'
            dot.delay = 5000 + Math.floor(Math.random() * 1000)
            break
          case 'moving':
            dot.state = 'fading'
            break
          case 'fading':
            if (dot.brightness > 0) dot.brightness = Math.max(0, dot.brightness - 0.05)
            if (dot.brightness > 0) return dot
            dot.state = 'faded'
            dot.delay = 2000
            break
          case 'faded':
            dot.state = 'done'
            const done = splat.dots.filter(dot => dot.state === 'done')
            if (done.length === splat.dots.length) splat.state = 'done'
            break
        }
        return dot
      })
      return splat
    })
  }

  renderSplats() {
    const colors = Array(this.bounds.width * this.bounds.height).fill(noColor)
    this.splats.forEach(splat => {
      splat.dots.forEach(dot => {
        const dotBot = dot.y
        const dotTop = dot.initialY
        const dotLength = Math.min(dot.maxLength, Math.max(1, dotBot - dotTop))
        let i = 1, percent, index
        for (let y = dotBot; y >= dotTop; y--) {
          index = (Math.round(y) * this.bounds.width) + dot.x
          if (index < 0) continue
          percent = i / dotLength
          colors[index] = i === 1
            ? parseColor('red', { brightness: 0.25 * dot.brightness, kelvin: 1500 })
            : parseColor('red', { brightness: 0.1 * dot.brightness, kelvin: 3750 })
          i++
        }
      })
    })
    this.colors = colors
  }

  async updateTiles() {
    for (const tile of this.tiles) {
      await this.device.tileSetTileState64({
        tile_index: tile.tile_index,
        length: 1,
        duration: this.tileDuration,
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

  checkSplats() {
    const done = this.splats.filter(splat => splat.state === 'done')
    if (done.length === this.splats.length) this.setInitialState()
  }

  getStepMilliseconds() {
    return 250
  }

}
