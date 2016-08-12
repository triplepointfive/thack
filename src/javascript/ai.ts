import { MAX_X, MAX_Y, Point, twoDimArray } from "./utils"
import { Walker } from "./creature/walker"

interface AI {
  act( walker: Walker ): void
}

class TileRecall {
  constructor( public seen: boolean, public tangible: boolean ) {}
}

const leePath = function ( walker: Walker,
                           destination: ( x: number, y: number ) => boolean
                         ): Array< Point > {
  let stageMemory: Array< Array< number > > = twoDimArray( MAX_X, MAX_Y, () => { return undefined } )
  let pointsToVisit: Array< Point > = []
  let pointsToCheck: Array< Point > = [ { x: walker.x, y: walker.y } ]

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
      if ( destination( point.x, point.y ) ) {
        pointsToVisit.push( point )
      } else {
        wavePoints.push( { x: point.x - 1, y: point.y })
        wavePoints.push( { x: point.x + 1, y: point.y })
        wavePoints.push( { x: point.x, y: point.y - 1 })
        wavePoints.push( { x: point.x, y: point.y + 1 })
        wavePoints.push( { x: point.x - 1, y: point.y - 1 })
        wavePoints.push( { x: point.x + 1, y: point.y - 1 })
        wavePoints.push( { x: point.x + 1, y: point.y + 1 })
        wavePoints.push( { x: point.x - 1, y: point.y + 1 })
      }
    })
    step++

    pointsToCheck = wavePoints
  }

  if ( pointsToVisit.length ) {
    pointsToVisit[ Math.floor( Math.random() * pointsToVisit.length ) ]
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

export { AI, TileRecall, Walker, leePath }
