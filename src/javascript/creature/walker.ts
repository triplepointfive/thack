import { MAX_X, MAX_Y, Point, rand, succ, twoDimArray } from "../utils"
import { Stage, Type, TileType } from "../game"

class TileRecall {
  constructor( public seen: boolean, public tangible: boolean ) {}
}

type NodeID = string

const leePath = function( x0: number, y0: number, walker: Walker ): Array< Point > {
  let stageMemory: Array< Array< number > > = twoDimArray( MAX_X, MAX_Y, () => { return undefined } )
  let pointsToVisit: Array< Point > = []
  let pointsToCheck: Array< Point > = [ { x: x0, y: y0 } ]

  let step = 0
  while ( pointsToCheck.length && !pointsToVisit.length ) {
    // console.log(pointsToCheck )
    let wavePoints: Array< Point > = []

    pointsToCheck.forEach( ( point: Point ) => {
      // TODO: Compare, current value might be lower
      if ( walker.stageMemory[ point.x ][ point.y ].tangible ||
          stageMemory[ point.x ][ point.y ] !== undefined ) {
        return
      }

      stageMemory[ point.x ][ point.y ] = step

      if ( walker.stageMemory[ point.x ][ point.y ].seen ) {
        wavePoints.push( { x: point.x - 1, y: point.y })
        wavePoints.push( { x: point.x + 1, y: point.y })
        wavePoints.push( { x: point.x, y: point.y - 1 })
        wavePoints.push( { x: point.x, y: point.y + 1 })
        wavePoints.push( { x: point.x - 1, y: point.y - 1 })
        wavePoints.push( { x: point.x + 1, y: point.y - 1 })
        wavePoints.push( { x: point.x + 1, y: point.y + 1 })
        wavePoints.push( { x: point.x - 1, y: point.y + 1 })
      } else {
        pointsToVisit.push( point )
      }
    })
    step++

    pointsToCheck = wavePoints
  }

  if ( pointsToVisit.length ) {
    // pointsToVisit[ Math.floor( Math.random() * pointsToVisit.length ) ]
    return buildRoad( pointsToVisit[ 0 ], stageMemory )
  } else {
    return []
  }
}

const buildRoad = function ( point: Point, stageMemory: Array< Array< number > > ): Array< Point > {
  let x0 = point.x, y0 = point.y
  let chain = [ { x: x0, y: y0 } ]

  let delta: Point = undefined

  while ( stageMemory[ x0 ][ y0 ] !== 0 ) {

    delta = [
      { x: -1, y: 0 }, { x: 1, y: 0 }, { x: 0, y: -1 }, { x: 0, y: 1 },
      { x: -1, y: -1 }, { x: 1, y: 1 }, { x: 1, y: -1 }, { x: -1, y: 1 }
    ].find( ( dp ): boolean => {

      return stageMemory[ x0 + dp.x ] &&
        ( stageMemory[ x0 + dp.x ][ y0 + dp.y ] === stageMemory[ x0 ][ y0 ] - 1 )
    })

    x0 += delta.x
    y0 += delta.y

    chain.unshift( { x: x0, y: y0 } )
  }

  return chain
}

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
  graph: graphlib.Graph
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

// TODO: Ensure seen is build before act() is called!
export class Walker {
  tile: Type
  stageMemory: Array< Array< TileRecall > >
  path: Array< Point >
  private p1: RandomWalking

  constructor( public x: number, public y: number ) {
    this.tile = new Type( TileType.humanoid )
    // this.p1 = new RandomWalking( x, y )
    this.stageMemory = twoDimArray( MAX_X, MAX_Y, () => { return new TileRecall( false, false ) } )
    // this.p1 = new Patrol( x, y )
    // this.p1.addNode( 1, 3 )
    // this.p1.addNode( 20, 3 )
    // this.p1.addNode( 20, 7 )
    // this.p1.addNode( 12, 7 )
    // this.p1.addNode( 12, 3 )
    // this.p1.currentNodeID = 'a'
    this.path = []
  }

  act( stage: Stage ): void {
    if ( !this.path.length ) {
      const somePath: Array< Point > = leePath( this.x, this.y, this )
      if ( somePath.length ) {
        this.path = somePath
        this.act( stage )
      }
    } else {
      const nextPoint = this.path.shift()
      if ( stage.at( nextPoint.x, nextPoint.y ).tangible() ) {
        this.path = []
        this.act( stage )
      } else {
        this.x = nextPoint.x
        this.y = nextPoint.y
      }
    }
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

    const radius = 10
    for ( let i = -radius; i <= radius; i++ )
      for ( let j = -radius; j <= radius; j++ )
        if ( i * i + j * j < radius * radius )
          los( this.x, this.y, this.x + i, this.y + j )

    return mask
  }
}

