import { MAX_X, MAX_Y, Rect } from "./javascript/utils";
import { Walker, Renderer, Stage } from "./javascript/game";

$(function() {
  if (!ROT.isSupported()) {
    alert("The rot.js library isn't supported by your browser.");
  } else {
    // Create a display 80 characters wide and 20 characters tall
    const display = new ROT.Display({ width: MAX_X, height: MAX_Y })

    // Add the container to our HTML page
    $('#game-screen').append( display.getContainer() )

    // dungeon = new DungeonGenerator

    const render = new Renderer( display )

    let stage = new Stage( MAX_X, MAX_Y )

    stage.addVerticalLine( 1, 1, 19)
    stage.addHorizontalLine( 1, 20, 30)
    stage.addVerticalLine( 30, 1, 20)

    // for room in dungeon.rooms
      // stage.addRoom room

    // for road in dungeon.roads
      // stage.addRoad road

    const freeSpot = function( stage: Stage ) {
      for( let i = 0; i < stage.field.length; i++ ) {
        for( let j = 0; j < stage.field[ i ].length; j++ ) {
          if ( !stage.field[ i ][ j ].tangible() ) {
            return [ i, j ]
          }
        }
      }
    }

    let [ x, y ] = freeSpot( stage )

    let walker = new Walker( 30, 1 )

    setInterval( () => {
      display.clear()
      render.renderStage( stage, walker)
      render.renderTile(  walker.p.x, walker.p.y, walker.tile.printTile() )
      walker.p.act()
    }, 100 )
  }
});
