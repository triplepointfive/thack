import { MAX_X, MAX_Y, Point, rand, succ, twoDimArray } from "../utils"
import { Stage, Type, TileType } from "../game"
import { AI, TileRecall } from "../ai"
import { Explorer } from "../ai/explorer.ts"

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

