const { h, render, Component } = preact

const PER_ROW = 6
const MAX_ROWS = 4

/* UTILITY FUNCTIONS */

const range = (count) => {
    return Array(count).fill().map((_, i) => i)
}

const randomElement = (items) => {
    const randomIndex = Math.floor(Math.random() * items.length)
    return items[randomIndex]
}

const toHex = (color) => {
    return chroma.hsl(color.h, color.s / 100, color.l / 100).hex()
}

/* CLASSES */

class StatTable {
    constructor(items) {
        this.table = items.map(item => ({ item, value: 1 }))
    }

    random() {
        const totalValue = this.table.reduce((prev, curr) => prev + curr.value, 0)
        const randomValue = Math.random() * totalValue

        let valueSoFar = 0
        let chosenItem = null
        this.table.forEach(({ item, value }) => {
            if (randomValue > valueSoFar && randomValue <= valueSoFar + value) chosenItem = item
            valueSoFar += value
        })

        return chosenItem
    }

    nearby(item, distance) {
        let newItem = item + distance
        if (newItem >= this.table.length) newItem -= this.table.length
        if (newItem < 0) newItem += this.table.length
        return newItem
    }

    reduceFavor() {
        this.table = this.table.map(({ item, value }) => ({ item, value: Math.max(1, Math.floor(value / 2)) }))
    }

    favorItem(favoredItem, amount) {
        this.table = this.table.map(({ item, value }) => ({ item, value: item === favoredItem ? value + amount : value }))
    }

    favor(item, rate = 10, spread = 10) {
        this.reduceFavor()

        this.favorItem(item, rate * spread)

        const prevItems = range(spread).map(n => {
            const nearbyItem = this.nearby(item, -(n + 1))
            this.favorItem(nearbyItem, rate * (spread - n))
        })

        const nextItems = range(spread).map(n => {
            const nearbyItem = this.nearby(item, n + 1)
            this.favorItem(nearbyItem, rate * (spread - n))
        })
    }
}

class PaletteBreeder {
    constructor() {
        const huePoints = [
            '#FD0000',
            '#CB0073',
            '#7009A9',
            '#3914AE',
            '#123FAA',
            '#009898',
            '#00CA00',
            '#9EEC00',
            '#FDFD00',
            '#FDD100',
            '#FDA900',
            '#FD7300',
            '#FD0000'
        ]

        const hueScale = chroma.scale(huePoints).mode('lab').colors(360)
        const hues = hueScale.map(color => Math.floor(chroma(color).get('hsl.h')))

        this.hueTable = new StatTable(hues)
        this.satTable = new StatTable(range(100))
        this.lumTable = new StatTable(range(100))

        this.hueTileTable = new StatTable(range(360))
        this.satTileTable = new StatTable(range(100))
        this.lumTileTable = new StatTable(range(100))

        this.hueSpriteTable = new StatTable(range(360))
        this.satSpriteTable = new StatTable(range(100))
        this.lumSpriteTable = new StatTable(range(100))
    }

    generate(tableName = '') {
        const h = this['hue' + tableName].random()
        const s = this['sat' + tableName].random()
        const l = this['lum' + tableName].random()
        return { h, s, l }
    }

    generateBaseColor() {
        return this.generate('Table')
    }

    generateTileMod() {
        return this.generate('TileTable')
    }

    generateSpriteMod() {
        return this.generate('SpriteTable')
    }

    modColor(baseValue, baseMod) {
        const lowerPortion = baseValue
        const upperPortion = 100 - baseValue
        const portion = Math.min(lowerPortion, upperPortion)

        const percentMod = (baseMod / 100) - 0.5
        const d = portion * percentMod

        let val = baseValue + d

        if (val < 0) val = 0
        if (val >= 100) val = 100

        return Math.floor(val)
    }

    generateColorFrom(base, mod) {
        let h = base.h + mod.h
        if (h >= 360) h -= 360

        const s = this.modColor(base.s, mod.s)

        const l = this.modColor(base.l, mod.l)

        return { h, s, l }
    }

    favor(base, tile, sprite) {
        this.hueTable.favor(base.h)
        this.satTable.favor(base.s)
        this.lumTable.favor(base.l)

        this.hueTileTable.favor(tile.h)
        this.satTileTable.favor(tile.s)
        this.lumTileTable.favor(tile.l)

        this.hueSpriteTable.favor(sprite.h)
        this.satSpriteTable.favor(sprite.s)
        this.lumSpriteTable.favor(sprite.l)
    }
}

/* COMPONENTS */

class Heart extends Component {
    constructor(props) {
        super(props)

        this.width = 7
        this.height = 7

        this.data = {
            filled: [
                0, 0, 1, 0, 1, 0, 0,
                0, 1, 1, 1, 1, 1, 0,
                1, 1, 1, 1, 1, 1, 1,
                1, 1, 1, 1, 1, 1, 1,
                0, 1, 1, 1, 1, 1, 0,
                0, 0, 1, 1, 1, 0, 0,
                0, 0, 0, 1, 0, 0, 0
            ],
            empty: [
                0, 0, 1, 0, 1, 0, 0,
                0, 1, 0, 1, 0, 1, 0,
                1, 0, 0, 0, 0, 0, 1,
                1, 0, 0, 0, 0, 0, 1,
                0, 1, 0, 0, 0, 1, 0,
                0, 0, 1, 0, 1, 0, 0,
                0, 0, 0, 1, 0, 0, 0
            ]
        }
    }

    container(contents) {
        return h('svg', {
            width: '100%',
            viewBox: `0 0 ${this.width} ${this.height}`,
            'shape-rendering': 'crispEdges'
        }, contents)
    }

    pixels(data) {
        return data.map((point, i) => {
            if (point === 0) return null

            const y = Math.floor(i / this.height)
            const x = i - (this.width * y)

            return h('rect', {
                x,
                y,
                width: 1,
                height: 1,
                fill: this.props.color
            })
        })
    }

    render(props) {
        const data = this.data[props.type]
        const pixels = this.pixels(data)
        const container = this.container(pixels)
        return h('div', { class: 'heart' }, container)
    }
}

class Palette extends Component {
    render({ baseColor, tileMod, tileColor, spriteMod, spriteColor, update, isSelected }) {
        return h('button',
            {
                class: 'palette' + (isSelected ? ' selected' : ''),
                style: { backgroundColor: toHex(baseColor) },
                onclick: () => update(baseColor, tileMod, spriteMod)
            },
            h('div', { class: 'palette-inner' }, [
                h('div', { class: 'heart-row' }, [
                    h(Heart, { type: 'filled', color: toHex(tileColor) }),
                    h(Heart, { type: 'empty', color: toHex(tileColor) })
                ]),
                h('div', { class: 'heart-row' }, [
                    h(Heart, { type: 'empty', color: toHex(spriteColor) }),
                    h(Heart, { type: 'filled', color: toHex(spriteColor) })
                ])
            ])
        )
    }
}

class PaletteLine extends Component {
    render({ palettes, update, selectedCol, rowKey, isFading }) {
        const children = palettes.map((palette, colKey) =>
            h(Palette,
                {
                    key: rowKey + '-' + colKey,
                    update: (baseColor, tileMod, spriteMod) => update(baseColor, tileMod, spriteMod, rowKey, colKey),
                    isSelected: selectedCol === colKey,
                    ...palette
                }
            )
        )
        return h('div', { class: 'palette-line' + (isFading ? ' fading' : '') }, children)
    }
}

class ColorCodes extends Component {
    select(e) {
        const target = e.target
        const value = target.value

        target.setSelectionRange(0, value.length)

        try {
            document.execCommand('copy')
        }
        catch (e) { }
    }

    render({ baseColor, tileColor, spriteColor }) {
        const baseHex = toHex(baseColor)
        const tileHex = toHex(tileColor)
        const spriteHex = toHex(spriteColor)

        return h('div', { class: 'color-codes' },
            [
                h('input', { type: 'text', onclick: this.select, value: baseHex, style: { backgroundColor: baseHex } }),
                h('input', { type: 'text', onclick: this.select, value: tileHex, style: { backgroundColor: tileHex } }),
                h('input', { type: 'text', onclick: this.select, value: spriteHex, style: { backgroundColor: spriteHex } })
            ]
        )
    }
}

class PaletteList extends Component {
    constructor(props) {
        super(props)

        this.state = {
            history: [],
            selectedRow: null,
            selectedCol: null
        }

        this.breeder = new PaletteBreeder()

        this.update = this.update.bind(this)
        this.generatePalettes = this.generatePalettes.bind(this)

        this.generatePalettes()
    }

    generatePalettes() {

        const palettes = range(PER_ROW).map(i => {

            const baseColor = this.breeder.generateBaseColor()

            const tileMod = this.breeder.generateTileMod()
            const tileColor = this.breeder.generateColorFrom(baseColor, tileMod)

            const spriteMod = this.breeder.generateSpriteMod()
            const spriteColor = this.breeder.generateColorFrom(baseColor, spriteMod)

            return { baseColor, tileMod, tileColor, spriteMod, spriteColor }

        })

        let history = this.state.history.concat([palettes])

        this.setState({ history })

    }

    update(baseColor, tileMod, spriteMod, rowId, colId) {
        this.breeder.favor(baseColor, tileMod, spriteMod)
        this.generatePalettes()
        this.setState({ selectedRow: rowId, selectedCol: colId })
    }

    render(props, { history, selectedRow, selectedCol }) {
        let children = []

        children.push(h('h1', {}, 'palettsy'))
        children.push(h('h2', {}, 'a palette generator for ', h('a', { href: 'http://ledoux.io/bitsy/editor.html' }, 'bitsy')))

        const paletteLines = history.map((palettes, key) => h(PaletteLine,
            {
                key,
                rowKey: key,
                palettes,
                update: this.update,
                selectedCol: selectedRow === key ? selectedCol : null,
                isFading: key < history.length - MAX_ROWS
            }
        )).slice(Math.max(0, history.length - MAX_ROWS - 1))
        children = children.concat(paletteLines)

        if (selectedRow != null && selectedCol != null) {
            const currentPalette = history[selectedRow][selectedCol]
            const { baseColor, tileColor, spriteColor } = currentPalette
            const colorCodes = h(ColorCodes, { baseColor, tileColor, spriteColor })
            children.push(colorCodes)
        }

        children.push(h('h3', {}, [
            'by ', h('a', { href: 'https://zenzoa.com' }, 'sarah gould'), ' - source on ', h('a', { href: 'https://github.com/sarahgould/palettsy' }, 'github')
        ]))

        return h('div', { class: 'palette-list' }, children)
    }
}

/* SETUP */

window.onload = () => {

    render(
        h(PaletteList)
    , document.getElementsByTagName('main')[0])

}