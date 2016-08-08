import { Stage, Type, TileType } from "../game"

export const generate = function( dimX: number, dimY: number, map: Array< string > ): Stage {
  let stage = new Stage( dimX, dimY, () => { return new Type( TileType.unknown ) } )

  for ( let i: number = 0; i < map.length; i++ ) {
    for ( let j: number = 0; j < map[ i ].length; j++ ) {
      switch ( map[ i ][ j ] ) {
        case "#":
          stage.field[ j ][ i ] = new Type( TileType.wall )
          break
        // case '.':
          // stage.field[ j ][ i ] = new Type( TileType.space )
          // break
        default:
          stage.field[ j ][ i ] = new Type( TileType.space )
          break
      }
    }
  }

  return stage
}
