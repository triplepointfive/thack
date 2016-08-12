import { twoDimArray } from "./utils"
import { Walker } from "./creature/walker"

type RGBColor = [ number, number, number ]

interface TileOpts {
  visible?: boolean
  tangible?: boolean
}

class DisplayTile {
  visible: boolean
  tangible: boolean

  constructor( public char: string, public foreground: RGBColor, public background: RGBColor,
              opts: TileOpts = {} ) {
    this.visible  = ( opts.visible === undefined ) ? true : opts.visible
    this.tangible = ( opts.tangible === undefined ) ? true : opts.tangible
  }
}

enum Effect {
  Shaded
}

export class Renderer {
  constructor( private display: ROT.Display ) {  }

  renderStage( stage: Stage, walker: Walker ): void {
    for ( let i = -walker.radius - 1; i <= walker.radius + 1; i++ ) {
      for ( let j = -walker.radius - 1; j <= walker.radius + 1; j++ ) {
        const x = walker.x + i,
              y = walker.y + j
        if ( x >= 0 && y >= 0 && x < stage.dimX && y < stage.dimY ) {
          if ( walker.stageMemory[ x ][ y ].visible ) {
            this.renderTile( x, y, stage.at( x, y ).printTile() )
          } else if ( walker.stageMemory[ x ][ y ].seen ) {
            this.renderTile( x, y, stage.at( x, y ).printTile(), [ Effect.Shaded ] )
          }
        }
      }
    }
  }

  renderTile( x: number, y: number, tile: DisplayTile, effects: Array< Effect > = [] ): void {
    const colors: string = this.buildColor( tile.foreground, tile.background, effects )
    this.display.drawText( x, y, `${ colors }${ tile.char }` )
  }

  buildColor( foreground: RGBColor, background: RGBColor, effects: Array< Effect > ): string {
    let fColor: RGBColor = foreground, bColor: RGBColor = background

    if ( effects.indexOf( Effect.Shaded ) >= 0 ) {
      const f = ( fColor[ 0 ] + fColor[ 1 ] + fColor[ 2 ] ) / 3
      fColor = [ f, f, f ]

      const b = ( bColor[ 0 ] + bColor[ 1 ] + bColor[ 2 ] ) / 3
      bColor = [ b, b, b ]
    }

    return `%c{${ ROT.Color.toRGB( fColor ) }}%b{${ ROT.Color.toRGB( bColor ) }}`
  }
}

const white:  RGBColor = [ 255, 255, 255 ]
const black:  RGBColor = [   0,   0,   0 ]
const red:    RGBColor = [ 255,   0,   0 ]
const green:  RGBColor = [   0, 255,   0 ]
const blue:   RGBColor = [   0,   0, 255 ]
const yellow: RGBColor = [ 150, 150,   0 ]

export enum TileType {
  wall,
  space,
  unknown,
  humanoid
}

export class Type {
  public static get tileTypes(): { [ key: string ]: DisplayTile } {
    return {
      [ TileType.wall ]:     new DisplayTile( "#", yellow, yellow, { tangible: true, visible: true  }  ),
      [ TileType.space ]:    new DisplayTile( ".", yellow, black, { tangible: false, visible: true   } ),
      [ TileType.unknown ]:  new DisplayTile( " ", black, white, { tangible: true, visible: false }  ),
      [ TileType.humanoid ]: new DisplayTile( "@", green, black, { tangible: true, visible: true  }  )
    }
  }

  constructor( public type: TileType ) {}

  tangible(): boolean {
    return this.printTile().tangible
  }

  printTile(): DisplayTile {
    return Type.tileTypes[ this.type ]
  }
}

const newWall = function(): Type {
  return new Type( TileType.wall )
}

export class Stage {
  field: Array< Array< Type > >

  constructor( public dimX: number, public dimY: number, baseBlock: ( () => Type ) = newWall ) {
    this.field = twoDimArray( dimX, dimY, baseBlock )
  }

  at( x: number, y: number ): Type {
    return this.field[ x ][ y ]
  }
}
