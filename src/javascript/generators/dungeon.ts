import { MAX_X, MAX_Y, Rect, Point, rand, min, max } from "../utils"

const THICKNESS = 0;

export class Room extends Rect {
  notCross( rect: Rect ): boolean {
    return ( rect.x - THICKNESS > this.x + this.w ) ||
      ( rect.y - THICKNESS > this.y + this.h ) ||
      ( rect.x + rect.w < this.x - THICKNESS ) ||
      ( rect.y + rect.h < this.y - THICKNESS )
  }

  pointWithin(): Point {
    return {
      x: this.x + 1 + rand( this.w - 1 ),
      y: this.y + 1 + rand( this.h - 1 )
    }
  }
}

export class Road extends Rect {
  lined: boolean;

  constructor( x: number, y: number, w: number, h: number ) {
    super( x, y, w, h );
    this.lined = ( ( x >= w ) && ( y >= h ) ) || ( w >= x ) && ( h >= y );
  }

  horizontalLine(): [ number, number, number ] {
    // x
    // |\
    // .-x
    if ( this.lined )
      return [ Math.min( this.x, this.w ), Math.max( this.y, this.h ), Math.abs( this.w - this.x ) ]
    // .-x
    // |/
    // x
    else
      return [ Math.min( this.x, this.w ), Math.min( this.y, this.h ), Math.abs( this.w - this.x ) ]
  }

  verticallLine(): [ number, number, number ] {
    // x
    // |\
    // .-x
    if ( this.lined )
      return [ Math.min( this.x, this.w ), Math.min( this.y, this.h ), Math.abs( this.h - this.y ) ]
    // .-x
    // |/
    // x
    else
      return [ Math.min( this.x, this.w ), Math.min( this.y, this.h ), Math.abs( this.h - this.y ) ]
  }
}

const MIN_SIZE: number = 4;
const MAX_SIZE: number = 10;
const ROOMS_COUNT: number = 25;

class DungeonGenerator {
  rooms: Array< Room >;
  roads: Array< Road >;

  constructor() {
    let rooms = []

    let i = 0
    while( i < ROOMS_COUNT ) {
      rooms.push( this.generateRoom() );
      i += 1
    }

    this.rooms = this.normalize( this.fuzzifyRooms( rooms ) );
    this.roads = this.buildRoads( this.rooms );
  }

  private generateRoom(): Room {
    return new Room(
      0,
      0,
      MIN_SIZE + rand( MAX_SIZE - MIN_SIZE ),
      MIN_SIZE + rand( MAX_SIZE - MIN_SIZE )
    );
  }

  private fuzzifyRooms( rooms: Array< Room > ): Array< Room > {
    let pickedRooms: Array< Room > = [ rooms.shift() ];

    while( rooms.length ) {
      let currentRoom: Room = rooms.shift()

      let angle: number = rand( 360 ) / 180 * Math.PI

      // TODO: Build table with these values.
      const cos: number = Math.cos( angle )
      const sin: number = Math.sin( angle )
      let l: number = 0
      let dx: number = 0
      let dy: number = 0

      while ( !pickedRooms.every( ( room ) => currentRoom.notCross( room ) )) {
        let ndx = Math.round( l * cos );
        let ndy = Math.round( l * sin );

        while ( true ) {
          l += 1;
          ndx = Math.round( l * cos );
          ndy = Math.round( l * sin );

          if ( ndx != dx || ndy != dy ) {
            break;
          }
        }

        currentRoom.move( ndx - dx, ndy - dy );
        dx = ndx;
        dy = ndy;
      }

      pickedRooms.push( currentRoom );
    }

    return pickedRooms;
  }

  private normalize( rooms: Array< Room > ): Array< Room > {
    const minX = min( rooms.map( ( room ) => room.x ) ) - 1;
    const minY = min( rooms.map( ( room ) => room.y ) ) - 1;
    rooms.forEach( ( room ) => { room.move( - minX, - minY ) } );

    return rooms.filter( ( room: Room ) => {
      return ( room.x + room.w < MAX_X ) && ( room.y + room.h < MAX_Y );
    })
  }

  private buildRoads( rooms: Array< Room > ) {
    let points: Array< Point > = rooms.map( ( room ) => { return room.pointWithin() } );

    let connectedPoints: Array< Point > = [ points.shift() ];
    let roads: Array< Road > = [];

    const distance = function( point1: Point, point2: Point ): number {
      // No need to calc square root since it's being used for comparison only.
      return ( point1.x - point2.x ) ** 2 + ( point1.y - point2.y ) ** 2;
    }

    while ( points.length ) {
      let currentPoint = points.shift()

      let pointToConnect = connectedPoints[ 0 ]
      let minDistance = distance( currentPoint, pointToConnect )

      connectedPoints.forEach( ( point ) => {
        const currentDistance = distance( point, currentPoint )
        if( currentDistance < minDistance ) {
          pointToConnect = point
          minDistance = currentDistance
        }
      })

      connectedPoints.push( currentPoint )

      roads.push( new Road(
        currentPoint[ 0 ],
        currentPoint[ 1 ],
        pointToConnect[ 0 ],
        pointToConnect[ 1 ]
      ))
    }

    return roads
  }
}
