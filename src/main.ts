import { MAX_X, MAX_Y, Rect } from "./javascript/utils"
import { Walker, Renderer, Stage } from "./javascript/game"

import * as DrawnGenerator from "./javascript/generators/drawn"
import * as DungeonGenerator from "./javascript/generators/dungeon"

$( function(): void {
  if (!ROT.isSupported()) {
    alert("The rot.js library isn't supported by your browser.")
  } else {
    // Create a display 80 characters wide and 20 characters tall
    const display = new ROT.Display({ height: MAX_Y, width: MAX_X })

    // Add the container to our HTML page
    $( "#game-screen" ).append( display.getContainer() )

    let stage = DungeonGenerator.generate( MAX_X, MAX_Y )

    const render = new Renderer( display )

    // let stage: Stage = DrawnGenerator.generate(
    //   MAX_X,
    //   MAX_Y,
    //   [
    //     "########",
    //     "#......#         #########",
    //     "#......###########.......#",
    //     "#......'.........'.......#",
    //     "#......#####'#####.......#",
    //     "#### ###   #.#   ###'#####",
    //     " #....#    #.#####.....#",
    //     " #....#    #..... .....#",
    //     " #....#    #######.....#",
    //     " ######          #######"
    //   ]
    // )

    const freeSpot = function( stage: Stage ): [ number, number ] {
      for ( let i = 0; i < stage.field.length; i++ ) {
        for ( let j = 0; j < stage.field[ i ].length; j++ ) {
          if ( !stage.field[ i ][ j ].tangible() ) {
            return [ i, j ]
          }
        }
      }
    }

    let [ x, y ] = freeSpot( stage )

    let walker = new Walker( x, y )

    setInterval( () => {
      display.clear()
      render.renderStage( stage, walker)
      render.renderTile(  walker.x, walker.y, walker.tile.printTile() )
      walker.act( stage )
    }, 50 )
  }
})
