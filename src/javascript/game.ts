import { MAX_X, MAX_Y, Point, rand, succ, twoDimArray } from "./utils"
import { Room, Road } from "./generators/dungeon"

type RGBColor = [ number, number, number ];

interface TileOpts {
  visible?: boolean;
  tangible?: boolean;
}

class DisplayTile {
  visible: boolean;
  tangible: boolean;

  constructor( public char: string, public foreground: RGBColor, public background: RGBColor,
              opts: TileOpts = {} ) {
    this.visible  = ( opts.visible == undefined ) ? true : opts.visible;
    this.tangible = ( opts.tangible == undefined ) ? true : opts.tangible;
  }
}

export class Renderer {
  constructor( private display: any ) {  }

  renderStage( stage: Stage, walker: any ) {
    const visionMask: Array< Array< boolean > > = walker.visionMask();

    stage.field.forEach( ( row: Array< Type >, x: number ) => {
      row.forEach( ( tile: Type, y: number ) => {
        if( visionMask[ x ][ y ] ) {
          this.renderTile( x, y, stage.at( x, y ).printTile() )
        }
      })
    })
  }

  renderTile( x: number, y: number, tile: DisplayTile ) {
    const colors: string = this.buildColor( tile.foreground, tile.background )
    this.display.drawText( x, y, `${ colors }${ tile.char }` )
  }

  buildColor( foreground: RGBColor, background: RGBColor ): string {
    return `%c{${ ROT.Color.toRGB( foreground ) }}%b{${ ROT.Color.toRGB( background ) }}`
  }
}

const white: RGBColor = [ 255, 255, 255 ];
const black: RGBColor = [   0,   0,   0 ];
const red:   RGBColor = [ 255,   0,   0 ];
const green: RGBColor = [   0, 255,   0 ];
const blue:  RGBColor = [   0,   0, 255 ];

enum TileType {
  wall,
  space,
  unknown,
  humanoid
}

class Type {
  public static get tileTypes(): { [ key: string ]: DisplayTile } {
    return {
      [ TileType.wall ]:     new DisplayTile( "#", black, white, { visible: true,  tangible: true }  ),
      [ TileType.space ]:    new DisplayTile( " ", black, white, { visible: false, tangible: false } ),
      [ TileType.unknown ]:  new DisplayTile( " ", black, white, { visible: false, tangible: true }  ),
      [ TileType.humanoid ]: new DisplayTile( "@", green, black, { visible: true,  tangible: true }  )
    }
  }

  constructor( public type: TileType ) {}

  tangible(): boolean {
    return this.printTile().tangible
  }

  printTile(): DisplayTile {
    return Type.tileTypes[ this.type ];
  }
}

type NodeID = string;

class Patrol {
  i: NodeID;
  step: number;
  graph: any;
  lastNodeVisit: { [ key: string ]: number };
  currentNodeID: NodeID;
  targetNodeID: NodeID;

  constructor( public x: number, public y: number ) {
    this.i = 'a';

    this.step = 0;
    this.graph = new graphlib.Graph();

    this.addNode( this.x, this.y, false );
    this.lastNodeVisit = {};

    this.markNodeVisited( this.currentNodeID );
  }

  act(): void {
    this.step += 1;

    if ( this.targetNodeID ) {
      if ( this.reachedNode( this.targetNodeID ) ) {
        // Logger.warning( "Got to the target '#{ this.targetNodeID }'" )
        this.currentNodeID = this.targetNodeID;
        this.markNodeVisited( this.currentNodeID );

        this.pickUpNewTarget();
      }
    } else {
      this.pickUpNewTarget();
    }

    this.moveToTarget();
  }

  moveToTarget(): void {
    const pos: Point = this.graph.node( this.targetNodeID );
    if ( pos.x != this.x ) {
      this.x += pos.x > this.x ? 1 : -1;
    } else if ( pos.y != this.y ) {
      this.y += pos.y > this.y ? 1 : -1;
    } else {
      this.x += rand( 3 ) - 1;
      this.y += rand( 3 ) - 1;
    }
  }

  reachedNode( nodeID: NodeID ): boolean {
    const pos: Point = this.graph.node( nodeID );
    return ( pos.x == this.x ) && ( pos.y == this.y );
  }

  pickUpNewTarget(): void {
    // Logger.info( "Going from '#{ this.currentNodeID }': #{ JSON.stringify this.graph.node( this.currentNodeID ) }" )

    let seenLastID: NodeID = this.currentNodeID;
    let seenLastStep: number = this.lastNodeVisit[ seenLastID ];

    this.graph.neighbors( this.currentNodeID ).forEach( ( nodeID: NodeID ) => {
      if( seenLastStep > ( this.lastNodeVisit[ nodeID ] || 0 ) )
        seenLastID = nodeID;
        seenLastStep = this.lastNodeVisit[ seenLastID ];
      }
    )

    // Logger.warning( "To '#{ seenLastID }': #{ JSON.stringify this.graph.node( seenLastID ) }" )
    this.targetNodeID = seenLastID
  }

  markNodeVisited( nodeID: NodeID ): void {
    this.lastNodeVisit[ nodeID ] = this.step;
  }

  addNode( x: number, y: number, withEdge: boolean = true ): void {
    this.graph.setNode( this.i, { x: x, y: y } );
    if ( withEdge ) {
      this.graph.setEdge( this.currentNodeID, this.i );
    };
    this.currentNodeID = this.i;
    this.i = succ( this.i );
  }
}

export class Walker {
  tile: Type;
  p: Patrol;

  constructor( public x: number, public y: number ) {
    this.tile = new Type( TileType.humanoid );
    this.p = new Patrol( x, y );
    this.p.addNode( 30, 20 );
    this.p.addNode( 1, 20 );
    this.p.addNode( 1, 1 );
    this.p.currentNodeID = 'a';
  }

  visionMask(): Array< Array< boolean> > {
    let mask = twoDimArray( MAX_X, MAX_Y, () => { false } );

    let i: number = Math.max( this.p.x - 10, 0 )
    while( i < Math.min( this.p.x + 10, MAX_X ) ) {
      let j = Math.max( this.p.y - 10, 0 );
      while( j < Math.min( this.p.y + 10, MAX_Y ) ) {
        mask[ i ][ j ] = true;
        j++;
      }
      i++
    }

    return mask;
  }
}

const newWall = function(): Type {
  return new Type( TileType.wall );
}

const newSpace = function(): Type {
  return new Type( TileType.space );
}

export class Stage {
  field: Array< Array< Type > >;

  constructor( dimX: number, dimY: number ) {
    this.field = twoDimArray( dimX, dimY, newWall )
  }

  at( x: number, y: number ): Type {
    return this.field[ x ][ y ];
  }

  addVerticalLine( x: number, y: number, h: number ): void {
    let j = 0
    while( j < h ) {
      this.field[ x ][ y + j ] = newSpace()
      j += 1
    }
  }

  addHorizontalLine( x: number, y: number, w: number ): void {
    let i = 0
    while( i < w ) {
      this.field[ x + i ][ y ] = newSpace()
      i += 1
    }
  }

  addRoom( room: Room ): void {
    let i: number = 0
    while( i < room.w ) {
      let j: number = 0
      while( j < room.h ) {
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
