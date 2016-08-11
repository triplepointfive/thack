// Stolen from here http://www.roguebasin.com/index.php?title=Maze_Generation
import { Stage, Type, TileType } from "../game"
import { twoDimArray, rand } from "../utils"

new Type( TileType.space )
new Type( TileType.unknown )

const CELL_R = 2
const LINK_FIRST = 100
const LINK_OVER_CHANCE = 15

const generate = function( dimX: number, dimY: number ): Stage {
  return new MazeGenerator( dimX, dimY ).generate()
}

// This saves us from making a bunch of similar conditionals
// inside our Maze function.
const dirList = [ [0, -1], [1, 0], [0, 1], [-1, 0] ]

const linkAnyway = function(): boolean {
  return rand( LINK_OVER_CHANCE ) === ( LINK_OVER_CHANCE - 1 )
}

class MazeGenerator {
  stage: Stage
  cell: Array< Array< boolean >>
  maxCW: number
  maxCH: number

  constructor( protected maxW: number, protected maxH: number ) {
    this.stage = new Stage( maxW, maxH, () => { return new Type( TileType.wall ) } )
    this.cell = twoDimArray( maxW, maxH, () => { return false } )
    this.maxCW = Math.round( this.maxW / CELL_R ) - 1
    this.maxCH = Math.round( this.maxH / CELL_R ) - 1
  }

  generate(): Stage {
    // Desired startX/startY;
    let rx = Math.round( this.maxCW / 2 ),
        ry = Math.round( this.maxCH / 2 ),
        dx,
        dy,
        dir = 0,
        count = 0,
        totalCells = this.maxCW * this.maxCH,
        visitedCells = 1 // The Cell we just assigned to 1!

    this.cell[ rx ][ ry ] = true

    while ( visitedCells < totalCells ) {
        count++
        if ( count < LINK_FIRST ) {
            this.fillCells()
        }

        // Use Direction Lookup table for more Generic dig function.
        const dir = rand( 4 )

        dx = dirList[ dir ][ 0 ]
        dy = dirList[ dir ][ 1 ]

        if ( this.inRange(rx * CELL_R + dx, ry * CELL_R + dy) && !this.cell[rx + dx][ry + dy] || linkAnyway() ) {
          this.linkCells(rx * CELL_R, ry * CELL_R, ( rx + dx ) * CELL_R, ( ry + dy ) * CELL_R)
          rx += dx
          ry += dy
        } else {
          do {
            rx = rand( this.maxCW )
            ry = rand( this.maxCH )
          } while ( !this.cell[rx][ry] )
        }

        /* NOTE: Above code checks whether to-be-dug cell is free.
         *        If it isn't, and rand()%7 == 6, it links it anyways.
         *        This is done to create loops and give a more cavelike appearance.
         */

        this.cell[rx][ry] = true

        this.stage.field[rx * CELL_R][ry * CELL_R] = new Type( TileType.space )

        visitedCells++
    }

    this.fillCells()

    return this.stage
  }

  // This function puts Floor Tiles on our map based on our larger 'cells'
  private fillCells(): void {
    for ( let i = 0; i < this.maxCW; i++ ) {
      for ( let j = 0; j < this.maxCH; j++ ) {
        if ( this.cell[ i ][ j ] )
          this.stage.field[ i * CELL_R ][ j * CELL_R ] = new Type( TileType.space )
      }
    }
  }

  // Links our Cells
  private linkCells( x0: number, y0: number, x1: number, y1: number ): void {
    let cx: number = x0, cy: number = y0

    while ( cx !== x1 ) {
      if ( x0 > x1 )
        cx--
      else
        cx++
      if ( this.inRange( cx, cy ) )
        this.stage.field[cx][cy] = new Type( TileType.space )
    }
    while ( cy !== y1 ) {
      if (y0 > y1)
        cy--
      else
        cy++
      if ( this.inRange( cx, cy ) )
        this.stage.field[ cx ][ cy ] = new Type( TileType.space )
    }
  }

  // (x, y) wont jump us off map?
  private inRange( x: number, y: number ): boolean {
    return x > 2 && y > 2 && x < this.maxW - 2 && y < this.maxH - 2
  }
}

export { generate }
