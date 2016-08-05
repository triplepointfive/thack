import { MAX_X, MAX_Y, Rect } from "./javascript/utils";
import { Walker, Renderer, Stage } from "./javascript/game";

import * as DrawnGenerator from "./javascript/generators/drawn";

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

    let stage: Stage = DrawnGenerator.generate(
      MAX_X,
      MAX_Y,
      [
        "########",
        "#......#         #########",
        "#......###########.......#",
        "#......'.........'.......#",
        "#......#####'#####.......#",
        "#### ###   #.#   ###'#####",
        " #....#    #.#####.....#",
        " #....#    #..... .....#",
        " #....#    #######.....#",
        " ######          #######"
      ]
    )

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

    let walker = new Walker( 1, 1 )

    setInterval( () => {
      display.clear()
      render.renderStage( stage, walker)
      render.renderTile(  walker.x, walker.y, walker.tile.printTile() )
      walker.act()
    }, 500 )
  }
});
