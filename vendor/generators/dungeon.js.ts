import "../utils.js"

const THICKNESS = 0;

class Room extends Rect {
  notCross( rect: Rect ): boolean {
    return ( rect.x - THICKNESS > this.x + this.w ) ||
      ( rect.y - THICKNESS > this.y + this.h ) ||
      ( rect.x + rect.w < this.x - THICKNESS ) ||
      ( rect.y + rect.h < this.y - THICKNESS )
  }

  pointWithin(): [number, number] {
    return [ this.x + 1 + rand( this.w - 1 ), this.y + 1 + rand( this.h - 1 ) ]
  }
}
