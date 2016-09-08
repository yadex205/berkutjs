const wc = require('wcjs-prebuilt')
const uuid = require('node-uuid')
const EventEmitter = require('events')
require('ref')

const PlayerManager = function (core) {
    this.players = {}
    this.events = new EventEmitter()
    this._core = core

    this._events()
}

PlayerManager.prototype = {
    _events: function () {
        ['play', 'pause', 'stop'].forEach((methodName) => {
            this._core.on(`player-manager:${methodName}`, (event, ...args) => {
                this[methodName](...args)
            })
        })
        this._core.on('player-manager:create', (event) => {
            const id = this.create()
            event.returnValue = id
        })
    },
    _createConfiguredPlayer: function (id) {
        const player = new wc.VlcPlayer()
        player.playlist.mode = player.playlist.Loop
        player.onFrameReady = (videoFrame) => {
            const address = Buffer.from(videoFrame.buffer).address()
            this.events.emit(`on-frame-ready:${id}`, id, videoFrame)
            this._core.send('controller', 'player-manager:on-frame-ready', id, address)
        }
        return player
    },
    create: function () {
        const id = uuid.v1()
        this.players[id] = this._createConfiguredPlayer(id)
        return id
    },
    destroy: function (id) {
        this.players[id].close()
        this.events.removeAllListeners(`on-frame-ready:${id}`)
        delete this.players[id]
    },
    play: function (id, mrl) {
        this.players[id].play(mrl)
    },
    pause: function (id) {
        this.players[id].pause()
    },
    stop: function (id) {
        this.players[id].stop()
    },
    seek: function (id, time, isWrap) {
        const player = this.players[id]
        if (isWrap === true) {
            if (time > player.length) {
                time -= player.length
            } else if (time < 0) {
                time = player.length - time
            }
            player.time = time
        }
    },
    getPlayer: function (id) {
        return this.players[id]
    }
}

module.exports = PlayerManager