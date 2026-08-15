import Phaser from 'phaser'

type Tile = {
  row: number
  col: number
  type: number
  circle: Phaser.GameObjects.Arc
}

export default class GameScene extends Phaser.Scene {
  private readonly rows = 8
  private readonly cols = 7
  private readonly tileSize = 120

  private board: (Tile | null)[][] = []
  private selectedTile: Tile | null = null

  private score = 0
private scoreText!: Phaser.GameObjects.Text
private comboMultiplier = 1

  private readonly colors = [
    0xff5c8a,
    0xffc857,
    0x5dd39e,
    0x5dade2,
    0x9b5de5,
    0xff8c42,
  ]

  constructor() {
    super('GameScene')
  }

  create() {
    this.cameras.main.setBackgroundColor('#87CEEB')

    this.add
      .text(540, 130, '🐶 Frenchie Chiki Match', {
        fontFamily: 'Arial',
        fontSize: '52px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)

    this.add
      .text(540, 205, 'Livello 1', {
        fontFamily: 'Arial',
        fontSize: '32px',
        color: '#ffffff',
      })
      .setOrigin(0.5)
this.scoreText = this.add
  .text(540, 250, 'Punteggio: 0', {
    fontFamily: 'Arial',
    fontSize: '28px',
    color: '#ffffff',
    fontStyle: 'bold',
  })
  .setOrigin(0.5)
    this.createBoard()
  }

  private createBoard() {
    const boardWidth = this.cols * this.tileSize
    const boardHeight = this.rows * this.tileSize

    const startX = (1080 - boardWidth) / 2
    const startY = 360

    this.add
      .rectangle(
        540,
        startY + boardHeight / 2,
        boardWidth + 40,
        boardHeight + 40,
        0xffffff,
        0.25
      )
      .setStrokeStyle(6, 0xffffff, 0.7)

    this.board = []

    for (let row = 0; row < this.rows; row++) {
      this.board[row] = []

      for (let col = 0; col < this.cols; col++) {
        let type: number

        do {
          type = Phaser.Math.Between(0, this.colors.length - 1)
        } while (this.createsInitialMatch(row, col, type))

        const x =
          startX + col * this.tileSize + this.tileSize / 2

        const y =
          startY + row * this.tileSize + this.tileSize / 2

        const circle = this.add
          .circle(x, y, 48, this.colors[type])
          .setStrokeStyle(6, 0xffffff, 0.9)
          .setInteractive({ useHandCursor: true })

        const tile: Tile = {
          row,
          col,
          type,
          circle,
        }

        circle.on('pointerdown', () => {
          this.selectTile(tile)
        })

        this.board[row][col] = tile
      }
    }
  }

  private createsInitialMatch(
    row: number,
    col: number,
    type: number
  ): boolean {
    if (
      col >= 2 &&
      this.board[row]?.[col - 1]?.type === type &&
      this.board[row]?.[col - 2]?.type === type
    ) {
      return true
    }

    if (
      row >= 2 &&
      this.board[row - 1]?.[col]?.type === type &&
      this.board[row - 2]?.[col]?.type === type
    ) {
      return true
    }

    return false
  }

  private selectTile(tile: Tile) {
  // Se non c'è ancora una pedina selezionata
  if (!this.selectedTile) {
    this.selectedTile = tile
    tile.circle.setScale(1.18)
    return
  }

  // Se clicchiamo di nuovo sulla stessa pedina
  if (this.selectedTile === tile) {
    tile.circle.setScale(1)
    this.selectedTile = null
    return
  }

  const rowDistance = Math.abs(this.selectedTile.row - tile.row)
  const colDistance = Math.abs(this.selectedTile.col - tile.col)

  const areAdjacent = rowDistance + colDistance === 1

  // Se le pedine non sono vicine, cambiamo selezione
  if (!areAdjacent) {
    this.selectedTile.circle.setScale(1)
    this.selectedTile = tile
    tile.circle.setScale(1.18)
    return
  }

  const firstTile = this.selectedTile

  firstTile.circle.setScale(1)
  this.selectedTile = null

  this.swapTiles(firstTile, tile)
}
private swapTiles(tileA: Tile, tileB: Tile, isReverting = false) {
const rowA = tileA.row
  const colA = tileA.col
  const rowB = tileB.row
  const colB = tileB.col
this.board[rowA][colA] = tileB
this.board[rowB][colB] = tileA

  tileA.row = rowB
  tileA.col = colB

  tileB.row = rowA
  tileB.col = colA

  const xA = tileA.circle.x
  const yA = tileA.circle.y

  const xB = tileB.circle.x
  const yB = tileB.circle.y

  this.tweens.add({
    targets: tileA.circle,
    x: xB,
    y: yB,
    duration: 220,
    ease: 'Power2',
  })

  this.tweens.add({
    targets: tileB.circle,
    x: xA,
    y: yA,
    duration: 220,
    ease: 'Power2',
    onComplete: () => {
if (isReverting) return
const matchCreated = this.hasMatch()
console.log('MATCH TROVATO:', matchCreated)
   if (!matchCreated) {
console.log('MOSSA NON VALIDA')
this.swapTiles(tileA, tileB, true)
   }
   if (matchCreated) {
  const matches = this.findMatches()
  console.log('PEDINE DEL TRIS:', matches)
  this.score += matches.length * 100
this.scoreText.setText(`Punteggio: ${this.score}`)
  matches.forEach(tile => {
  tile.circle.destroy()
  this.board[tile.row][tile.col] = null as any
   })
   this.collapseTiles()
   this.refillBoard()
  this.time.delayedCall(400, () => {
  this.checkCascadeMatches()
})


}

}
})

  

  

}
private hasMatch(): boolean {
  // Controllo orizzontale
  for (let row = 0; row < this.rows; row++) {
    for (let col = 0; col < this.cols - 2; col++) {
      const tile = this.board[row][col]
if (!tile) continue
const type = tile.type

      const tileB = this.board[row][col + 1]
const tileC = this.board[row][col + 2]

if (
  tileB &&
  tileC &&
  tileB.type === type &&
  tileC.type === type
) {
        return true
      }
    }
  }

  // Controllo verticale
  for (let col = 0; col < this.cols; col++) {
    for (let row = 0; row < this.rows - 2; row++) {
      const tile = this.board[row][col]
if (!tile) continue
const type = tile.type


      const tileB = this.board[row + 1][col]
const tileC = this.board[row + 2][col]


if (
  tileB &&
  tileC &&
  tileB.type === type &&
  tileC.type === type
) {

        return true
      }
    }
  }

  return false
}
private findMatches(): Tile[] {
  const matches = new Set<Tile>()

  // Cerca i match orizzontali
  for (let row = 0; row < this.rows; row++) {
    for (let col = 0; col < this.cols - 2; col++) {
      const tileA = this.board[row][col]
      const tileB = this.board[row][col + 1]
      const tileC = this.board[row][col + 2]
if (!tileA || !tileB || !tileC) continue

      if (
        tileA.type === tileB.type &&
        tileA.type === tileC.type
      ) {
        matches.add(tileA)
        matches.add(tileB)
        matches.add(tileC)
      }
    }
  }

  // Cerca i match verticali
  for (let col = 0; col < this.cols; col++) {
    for (let row = 0; row < this.rows - 2; row++) {
      const tileA = this.board[row][col]
      const tileB = this.board[row + 1][col]
      const tileC = this.board[row + 2][col]
if (!tileA || !tileB || !tileC) continue

      if (
        tileA.type === tileB.type &&
        tileA.type === tileC.type
      ) {
        matches.add(tileA)
        matches.add(tileB)
        matches.add(tileC)
      }
    }
  }

  return Array.from(matches)
}
private collapseTiles() {
  for (let col = 0; col < this.cols; col++) {
    let emptyRow = this.rows - 1

    for (let row = this.rows - 1; row >= 0; row--) {
      const tile = this.board[row][col]

      if (tile) {
        if (row !== emptyRow) {
          this.board[emptyRow][col] = tile
          this.board[row][col] = null

          tile.row = emptyRow
          this.tweens.add({
  targets: tile.circle,
  y: tile.circle.y + (emptyRow - row) * this.tileSize,
  duration: 300,
  ease: 'Bounce.easeOut',
})
        }

        emptyRow--
      }
    }
  }
}
private refillBoard() {
  const boardWidth = this.cols * this.tileSize
  const startX = (1080 - boardWidth) / 2
  const startY = 360

  for (let col = 0; col < this.cols; col++) {
    for (let row = 0; row < this.rows; row++) {
      if (this.board[row][col] !== null) continue

      const type = Phaser.Math.Between(0, this.colors.length - 1)

      const x =
        startX + col * this.tileSize + this.tileSize / 2

      const finalY =
        startY + row * this.tileSize + this.tileSize / 2

      const circle = this.add
        .circle(x, finalY - this.tileSize * 2, 48, this.colors[type])
        .setStrokeStyle(6, 0xffffff, 0.9)
        .setInteractive({ useHandCursor: true })

      const tile: Tile = {
        row,
        col,
        type,
        circle,
      }

      circle.on('pointerdown', () => {
        this.selectTile(tile)
      })

      this.board[row][col] = tile

      this.tweens.add({
        targets: circle,
        y: finalY,
        duration: 300,
        ease: 'Bounce.easeOut',
      })
    }
  }
}
private checkCascadeMatches() {
  const matches = this.findMatches()

  if (matches.length === 0) {
  this.comboMultiplier = 1
  return
}
this.comboMultiplier++
this.score += matches.length * 100 * this.comboMultiplier

this.scoreText.setText(`Punteggio: ${this.score}`)
  matches.forEach(tile => {
    tile.circle.destroy()
    this.board[tile.row][tile.col] = null
  })

  this.time.delayedCall(250, () => {
    this.collapseTiles()

    this.time.delayedCall(350, () => {
      this.refillBoard()

      this.time.delayedCall(400, () => {
        this.checkCascadeMatches()
      })
    })
  })
}

}

