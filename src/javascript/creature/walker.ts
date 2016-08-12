import { MAX_X, MAX_Y, Point, rand, succ, twoDimArray } from "../utils"
import { Stage, Type, TileType } from "../game"
import { AI, TileRecall } from "../ai"
import { Explorer } from "../ai/explorer.ts"

class RandomWalking {
  direction: number

  constructor( public x: number, public y: number ) { this.randomDirection() }

  act( stage: Stage, walker: Walker ): void {
    switch ( this.direction ) {
      // Up
      case 0:
        if ( stage.at( this.x, this.y - 1 ).tangible() ) {
          this.randomDirection()
        } else {
          this.y--
        }
        break
      // Down
      case 1:
        if ( stage.at( this.x, this.y + 1 ).tangible() ) {
          this.randomDirection()
        } else {
          this.y++
        }
        break
      // Left
      case 2:
        if ( stage.at( this.x - 1, this.y ).tangible() ) {
          this.randomDirection()
        } else {
          this.x--
        }
        break
      // Right
      case 3:
        if ( stage.at( this.x + 1, this.y ).tangible() ) {
          this.randomDirection()
        } else {
          this.x++
        }
      default:
        break
    }

    this.curiosity( stage )
  }

  // Looks for doorways, would anyone pass them?
  curiosity( stage: Stage ): void {
    let p1: boolean, p2: boolean, p3: boolean,
        p4: boolean,              p6: boolean,
        p7: boolean, p8: boolean, p9: boolean

    p1 = stage.at( this.x - 1, this.y - 1 ).tangible()
    p2 = stage.at( this.x    , this.y - 1 ).tangible()
    p3 = stage.at( this.x + 1, this.y - 1 ).tangible()
    p4 = stage.at( this.x - 1, this.y     ).tangible()
    p6 = stage.at( this.x + 1, this.y     ).tangible()
    p7 = stage.at( this.x - 1, this.y + 1 ).tangible()
    p8 = stage.at( this.x    , this.y + 1 ).tangible()
    p9 = stage.at( this.x + 1, this.y + 1 ).tangible()

    if ( p1 && p3 && !p2 && this.horizontal() ) {
      // Up
      this.direction = 0
    } else if ( p7 && p9 && !p8 && this.horizontal() ) {
      // Down
      this.direction = 1
    } else if ( p1 && p7 && !p4 && !this.horizontal() ) {
      // Left
      this.direction = 2
    } else if ( p3 && p9 && !p6 && !this.horizontal() ) {
      // Right
      this.direction = 3
    }
  }

  horizontal(): boolean {
    return this.direction === 2 || this.direction === 3
  }

  randomDirection(): void {
    this.direction = rand( 4 )
  }
}

// TODO: Ensure seen is build before act() is called!
export class Walker {
  ai: AI
  tile: Type
  stageMemory: Array< Array< TileRecall > >
  radius: number

  constructor( public x: number, public y: number ) {
    this.tile = new Type( TileType.humanoid )
    this.stageMemory = twoDimArray( MAX_X, MAX_Y, () => { return new TileRecall( false, false ) } )
    this.radius = 10
    this.ai = new Explorer()
  }

  act( stage: Stage ): void {
    this.ai.act( this )
  }

  visionMask( stage: Stage ): Array< Array< boolean> > {
    let mask = twoDimArray( MAX_X, MAX_Y, () => { return false } )

    const see = ( x: number, y: number, tangible: boolean ): void => {
      mask[ x ][ y ] = true
      this.stageMemory[ x ][ y ].seen = true
      this.stageMemory[ x ][ y ].tangible = tangible
    }

    /* Los calculation */
    const los = ( x0: number,  y0: number,  x1: number,  y1: number ) => {
      const dx = x1 - x0
      const dy = y1 - y0
      const sx = x0 < x1 ? 1 : -1
      const sy = y0 < y1 ? 1 : -1

      // sx and sy are switches that enable us to compute the LOS in a single quarter of x/y plan
      let xnext = x0
      let ynext = y0

      const denom = Math.sqrt(dx * dx + dy * dy)

      const dist = 0.5 * denom

      while (xnext !== x1 || ynext !== y1) {
        if ( stage.field[ xnext ][ ynext ].tangible() ) {
          see( xnext, ynext, true )
          return
        }

        if ( Math.abs( dy * ( xnext - x0 + sx ) - dx * ( ynext - y0 ) ) < dist ) {
          xnext += sx
        } else if ( Math.abs( dy * ( xnext - x0 ) - dx * ( ynext - y0 + sy ) ) < dist ) {
          ynext += sy
        } else {
          xnext += sx
          ynext += sy
        }
      }

      see( x1, y1, stage.field[ x1 ][ y1 ].tangible() )
    }

    for ( let i = -this.radius; i <= this.radius; i++ )
      for ( let j = -this.radius; j <= this.radius; j++ )
        if ( i * i + j * j < this.radius * this.radius )
          los( this.x, this.y, this.x + i, this.y + j )

    return mask
  }
}

