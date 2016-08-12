import { MAX_X, MAX_Y, Point, twoDimArray } from "../utils"
import { AI, TileRecall, Walker, leePath } from "../ai"
import { Patrol } from "./patrol"

import { Logger } from "../logger"

const NEW_POINT_EVERY: number = 10

class Explorer implements AI {
  path: Array< Point >
  private step: number

  constructor( public patrol: Patrol = undefined ) {
    this.path = []
    this.step = NEW_POINT_EVERY
  }

  act( walker: Walker ): void {
    this.updatePatrol( walker )
    if ( !this.path.length ) {
      this.buildNewPath( walker )
      if ( this.path.length ) {
        this.act( walker )
      } else {
        Logger.info( "I'm done, time to patrol" )
        walker.ai = this.patrol
      }
    } else {
      const nextPoint: Point = this.path.shift()
      if ( walker.stageMemory[ nextPoint.x ][ nextPoint.y ].tangible ) {
        this.path = []
        this.act( walker )
      } else {
        walker.x = nextPoint.x
        walker.y = nextPoint.y
      }
    }
  }

  private buildNewPath( walker: Walker ): void {
    this.path = leePath( walker, ( x, y ) => {
      return !walker.stageMemory[ x ][ y ].seen
    })
  }

  private updatePatrol( walker: Walker ): void {
    if ( this.step === NEW_POINT_EVERY ) {
      this.step = 0
      if ( this.patrol === undefined ) {
        this.patrol = new Patrol( walker.x, walker.y )
      } else {
        this.patrol.addNode( walker.x, walker.y )
      }
    }

    this.step++
  }
}

export { Explorer }
