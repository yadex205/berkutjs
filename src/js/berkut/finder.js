/* global BERKUT, Vue */

;(function() {
    'use strict'

    const migemo = require('migemo')
    const Path = require('path')
    const UUID = require('uuid')
    const crawl = require('../lib/crawl')

    const Search = function() {
        this._data = []
        this._cache = []
    }

    Search.prototype = {
        setData: function(data) {
            this._data = data
        },
        search: function(rawQuery) {
            if (this._cache[rawQuery]) {
                return this._cache[rawQuery]
            }
            const queries = this._createQuery(rawQuery)
            const result = this._data.map((filepath) => {
                const basename = Path.basename(filepath)
                const precision = queries.map((query) => {
                    const match = filepath.match(query)
                    return match ? match.index : -1
                }).filter((index) => {
                    return index >= 0
                }).length
                return {
                    precision: precision,
                    path: filepath
                }
            }).filter((single) => {
                return single.precision >= Math.max(1, queries.length - 1)
            }).sort((a, b) => {
                return b.precision - a.precision
            }).map((single) => {
                return single.path
                })
            this._cache[rawQuery] = result
            return result
        },
        _createQuery: function (rawQuery) {
            return rawQuery.split(/\s|_|\-/ig).map((rawSingle) => {
                let query
                try {
                    query = migemo.toRegex(rawSingle)
                } catch (e) {
                    query = new RegExp(rawSingle)
                }
                return query
            })
        }
    }

    const Finder = Vue.extend({
        el: () => { return document.querySelector('#berkut-finder') },
        data: () => { return {
            query: '',
            results: [],
            _searcher: null,
            _thumbnail: null,
            _thumbnailCache: {},
            _resultId: null
        } },
        watch: {
            'query': function (val, prevVal) {
                if (val.length === 0) {
                    this.updateResult(this._cache)
                    return
                }
                this.updateResult(this._searcher.search(val))
            }
        },
        ready: function () {
            this._searcher = new Search()
            this._thumbnail = require('../lib/thumbnail')
            this._thumbnailCache = {}
            this.crawl()
        },
        methods: {
            crawl: function() {
                crawl((files) => {
                    this._cache = files
                    this.updateResult(files)
                    this._searcher.setData(files)
                })
            },
            updateResult: function (results) {
                const resultId = UUID.v4()
                this.results = results.map((filepath) => {
                    return {
                        path: filepath,
                        name: Path.basename(filepath),
                        src: this._thumbnailCache[filepath]
                    }
                })
                this._resultId = resultId
                this.results.forEach((result, index) => {
                    if(result.src || resultId !== this._resultId) { return }
                    this._thumbnail.findOrCreate(result.path, (thumbPath) => {
                        if(resultId !== this._resultId) { return }
                        this.$set(`results[${index}].src`, thumbPath)
                    })
                })
            },
            beginDrag: function(index, event) {
                event.dataTransfer.setData('text/plain', this.results[index].path)
            }
        }
    })

    BERKUT.Finder = Finder
    BERKUT.Search = Search
})()
