import { MAX_X, MAX_Y, Point, rand, succ, twoDimArray } from "./utils"
import { Room, Road } from "./generators/dungeon"

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

export class Renderer {
  constructor( private display: any ) {  }

  renderStage( stage: Stage, walker: Walker ): void {
    const visionMask: Array< Array< boolean > > = walker.visionMask( stage )

    stage.field.forEach( ( row: Array< Type >, x: number ) => {
      row.forEach( ( tile: Type, y: number ) => {
        if ( visionMask[ x ][ y ] ) {
          this.renderTile( x, y, stage.at( x, y ).printTile() )
        }
      })
    })
  }

  renderTile( x: number, y: number, tile: DisplayTile ): void {
    const colors: string = this.buildColor( tile.foreground, tile.background )
    this.display.drawText( x, y, `${ colors }${ tile.char }` )
  }

  buildColor( foreground: RGBColor, background: RGBColor ): string {
    return `%c{${ ROT.Color.toRGB( foreground ) }}%b{${ ROT.Color.toRGB( background ) }}`
  }
}

const white: RGBColor = [ 255, 255, 255 ]
const black: RGBColor = [   0,   0,   0 ]
const red:   RGBColor = [ 255,   0,   0 ]
const green: RGBColor = [   0, 255,   0 ]
const blue:  RGBColor = [   0,   0, 255 ]

export enum TileType {
  wall,
  space,
  unknown,
  humanoid
}

export class Type {
  public static get tileTypes(): { [ key: string ]: DisplayTile } {
    return {
      [ TileType.wall ]:     new DisplayTile( "#", black, white, { tangible: true, visible: true  }  ),
      [ TileType.space ]:    new DisplayTile( ".", white, black, { tangible: false, visible: true   } ),
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

type NodeID = string

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

class Patrol {
  i: NodeID
  step: number
  graph: any
  lastNodeVisit: { [ key: string ]: number }
  currentNodeID: NodeID
  targetNodeID: NodeID

  constructor( public x: number, public y: number ) {
    this.i = "a"

    this.step = 0
    this.graph = new graphlib.Graph()

    this.addNode( this.x, this.y, false )
    this.lastNodeVisit = {}

    this.markNodeVisited( this.currentNodeID )
  }

  act(): void {
    this.step += 1

    if ( this.targetNodeID ) {
      if ( this.reachedNode( this.targetNodeID ) ) {
        this.currentNodeID = this.targetNodeID
        this.markNodeVisited( this.currentNodeID )

        this.pickUpNewTarget()
      }
    } else {
      this.pickUpNewTarget()
    }

    this.moveToTarget()
  }

  moveToTarget(): void {
    const pos: Point = this.graph.node( this.targetNodeID )
    if ( pos.x !== this.x ) {
      this.x += pos.x > this.x ? 1 : -1
    } else if ( pos.y !== this.y ) {
      this.y += pos.y > this.y ? 1 : -1
    } else {
      this.x += rand( 3 ) - 1
      this.y += rand( 3 ) - 1
    }
  }

  reachedNode( nodeID: NodeID ): boolean {
    const pos: Point = this.graph.node( nodeID )
    return ( pos.x === this.x ) && ( pos.y === this.y )
  }

  pickUpNewTarget(): void {
    let seenLastID: NodeID = this.currentNodeID
    let seenLastStep: number = this.lastNodeVisit[ seenLastID ]

    this.graph.neighbors( this.currentNodeID ).forEach( ( nodeID: NodeID ) => {
      if ( seenLastStep > ( this.lastNodeVisit[ nodeID ] || 0 ) )
        seenLastID = nodeID
        seenLastStep = this.lastNodeVisit[ seenLastID ]
      }
    )

    this.targetNodeID = seenLastID
  }

  markNodeVisited( nodeID: NodeID ): void {
    this.lastNodeVisit[ nodeID ] = this.step
  }

  addNode( x: number, y: number, withEdge: boolean = true ): void {
    this.graph.setNode( this.i, { x: x, y: y } )
    if ( withEdge ) {
      this.graph.setEdge( this.currentNodeID, this.i )
    }
    this.currentNodeID = this.i
    this.i = succ( this.i )
  }
}

export class Walker {
  tile: Type
  private p1: RandomWalking

  constructor( public x: number, public y: number ) {
    this.tile = new Type( TileType.humanoid )
    this.p1 = new RandomWalking( x, y )
    // this.p1 = new Patrol( x, y )
    // this.p1.addNode( 1, 3 )
    // this.p1.addNode( 20, 3 )
    // this.p1.addNode( 20, 7 )
    // this.p1.addNode( 12, 7 )
    // this.p1.addNode( 12, 3 )
    // this.p1.currentNodeID = 'a'
  }

  act( stage: Stage ): void {
    this.p1.act( stage, this )
    this.x = this.p1.x
    this.y = this.p1.y
  }

  visionMask( stage: Stage ): Array< Array< boolean> > {
    let mask = twoDimArray( MAX_X, MAX_Y, () => { return false } )

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
          mask[ xnext ][ ynext ] = true
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

      mask[ x1 ][ y1 ] = true
    }

    const radius = 10
    for ( let i = -radius; i <= radius; i++ )
      for ( let j = -radius; j <= radius; j++ )
        if ( i * i + j * j < radius * radius )
          los( this.x, this.y, this.x + i, this.y + j )

    return mask
  }
}

const newWall = function(): Type {
  return new Type( TileType.wall )
}

const newSpace = function(): Type {
  return new Type( TileType.space )
}

export class Stage {
  field: Array< Array< Type > >

  constructor( dimX: number, dimY: number, baseBlock: ( () => Type ) = newWall ) {
    this.field = twoDimArray( dimX, dimY, baseBlock )
  }

  at( x: number, y: number ): Type {
    return this.field[ x ][ y ]
  }

  addVerticalLine( x: number, y: number, h: number ): void {
    let j = 0
    while ( j < h ) {
      this.field[ x ][ y + j ] = newSpace()
      j += 1
    }
  }

  addHorizontalLine( x: number, y: number, w: number ): void {
    let i = 0
    while ( i < w ) {
      this.field[ x + i ][ y ] = newSpace()
      i += 1
    }
  }

  addRoom( room: Room ): void {
    let i: number = 0
    while ( i < room.w ) {
      let j: number = 0
      while ( j < room.h ) {
        this.field[ room.x + i ][ room.y + j ] = newSpace()
        j++
      }

      i++
    }
  }

  addRoad( road: Road ): void {
    let [ hx, hy, w ] = road.horizontalLine()
    this.addHorizontalLine( hx, hy, w )

    let [ vx, vy, h ] = road.verticallLine()
    this.addVerticalLine( vx, vy, h )
  }
}
