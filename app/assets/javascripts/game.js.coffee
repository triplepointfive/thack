WALL = "#"
MAX_X = 100
MAX_Y = 100

rand = ( max ) ->
  Math.floor( Math.random() * max )

Array.prototype.max = ->
  Math.max.apply( Math, this )

Array.prototype.min = ->
  Math.min.apply( Math, this )

twoDimArray = ( dimX, dimY, value ) ->
  field = Array( dimX )

  i = 0
  while i < dimX
    field[i] = new Array(dimY)
    j = 0
    while j < dimY
      field[i][j] = value( i, j )
      j++
    i++

  field

succ = ( c ) ->
  String.fromCharCode( c.charCodeAt( 0 ) + 1 )

class Rect
  constructor: ( x, y, w, h ) ->
    # TODO: Validate?
    @x = x
    @y = y
    @w = w
    @h = h

  move: ( x, y ) ->
    @x += x
    @y += y

class Room extends Rect
  THICKNESS = 0

  notCross: ( rect ) ->
    ( rect.x - THICKNESS > @x + @w ) ||
    ( rect.y - THICKNESS > @y + @h ) ||
    ( rect.x + rect.w < @x - THICKNESS ) ||
    ( rect.y + rect.h < @y - THICKNESS )

  pointWithin: ->
    return [ @x + 1 + rand( @w - 1 ), @y + 1 + rand( @h - 1 ) ]

class Road extends Rect
  constructor: ( x, y, w, h ) ->
    super( x, y, w, h )
    @lined = ( ( x >= w ) && ( y >= h ) ) || ( w >= x ) && ( h >= y )

  horizontalLine: ->
    # x
    # |\
    # .-x
    if @lined
      [ Math.min( @x, @w ), Math.max( @y, @h ), Math.abs( @w - @x ) ]
    # .-x
    # |/
    # x
    else
      [ Math.min( @x, @w ), Math.min( @y, @h ), Math.abs( @w - @x ) ]

  verticallLine: ->
    # x
    # |\
    # .-x
    if @lined
      [ Math.min( @x, @w ), Math.min( @y, @h ), Math.abs( @h - @y ) ]
    # .-x
    # |/
    # x
    else
      [ Math.min( @x, @w ), Math.min( @y, @h ), Math.abs( @h - @y ) ]

class Renderer
  constructor: ( display ) ->
    @display = display

  renderStage: ( stage, walker ) ->
    visionMask = walker.visionMask()

    stage.field.forEach ( row, x ) =>
      row.forEach ( tile, y ) =>
        if visionMask[ x ][ y ]
          @renderTile x, y, stage.at( x, y ).printTile()

  renderTile: ( x, y, tile ) ->
    colors = @buildColor( tile.foreground, tile.background )
    @display.drawText x, y, "#{ colors }#{ tile.char }"

  buildColor: ( foreground, background )->
    "%c{#{ ROT.Color.toRGB( foreground ) }}" +
    "%b{#{ ROT.Color.toRGB( background ) }}"

class TileType
  constructor: ( char, foreground, background, opts = {} ) ->
    @char       = char
    @foreground = foreground
    @background = background

    @visible    = opts.visible ? true
    @tangible   = opts.tangible ? true

class window.Patrol
  constructor: ( x, y ) ->
    @x = x
    @y = y

    @i = 'a'

    @step = 0
    @graph = new graphlib.Graph()

    @addNode( @x, @y, false )
    @lastNodeVisit = {}

    @markNodeVisited @currentNodeID

  act: ( stage ) ->
    @step++

    if @targetNodeID
      if @reachedNode( @targetNodeID )
        Logger.warning( "Got to the target '#{ @targetNodeID }'" )
        @currentNodeID = @targetNodeID
        @markNodeVisited @currentNodeID

        @pickUpNewTarget()
    else
      @pickUpNewTarget()

    @moveToTarget()

  moveToTarget: ->
    pos = @graph.node @targetNodeID
    if pos.x != @x
      @x += if pos.x > @x then 1 else -1
    else if pos.y != @y
      @y += if pos.y > @y then 1 else -1
    else
      @x += rand( 3 ) - 1
      @y += rand( 3 ) - 1

  reachedNode: ( nodeID ) ->
    pos = @graph.node nodeID
    ( pos.x == @x ) && ( pos.y == @y )

  pickUpNewTarget: ->
    Logger.info( "Going from '#{ @currentNodeID }': #{ JSON.stringify @graph.node( @currentNodeID ) }" )

    seenLastID = @currentNodeID
    seenLastStep = @lastNodeVisit[ seenLastID ]

    @graph.neighbors( @currentNodeID ).forEach ( nodeID ) =>
      if seenLastStep > ( @lastNodeVisit[ nodeID ] || 0 )
        seenLastID = nodeID
        seenLastStep = @lastNodeVisit[ seenLastID ]

    Logger.warning( "To '#{ seenLastID }': #{ JSON.stringify @graph.node( seenLastID ) }" )
    @targetNodeID = seenLastID

  markNodeVisited: ( nodeID ) ->
    @lastNodeVisit[ nodeID ] = @step

  addNode: ( x, y, withEdge = true ) ->
    @graph.setNode( @i, { x: x, y: y } )
    @graph.setEdge( @currentNodeID, @i ) if withEdge
    @currentNodeID = @i
    @i = succ @i

class window.Walker
  constructor: ( x, y ) ->
    @x = x
    @y = y
    @tile = new Type( 'humanoid' )
    @p = new Patrol( x, y )
    @p.addNode( 30, 20 )
    @p.addNode( 1, 20 )
    @p.addNode( 1, 1 )
    @p.currentNodeID = 'a'

  visionMask: ->
    mask = twoDimArray MAX_X, MAX_Y, -> false

    i = Math.max( @p.x - 10, 0 )
    while i < Math.min( @p.x + 10, MAX_X )
      j = Math.max( @p.y - 10, 0 )
      while j < Math.min( @p.y + 10, MAX_Y )
        mask[ i ][ j ] = true
        j++
      i++
    mask

class window.Type
  white = [ 255, 255, 255 ]
  black = [ 0, 0, 0 ]
  red   = [ 255, 0, 0 ]
  green = [ 0, 255, 0 ]
  blue  = [ 0, 0, 255 ]

  tileTypes =
    wall:     new TileType( "#", black, white, visible: true,  tangible: true  )
    space:    new TileType( " ", black, white, visible: false, tangible: false )
    unknown:  new TileType( " ", black, white, visible: false, tangible: true  )
    humanoid: new TileType( "@", green, black, visible: true,  tangible: true  )

  constructor: ( type, opts = {} ) ->
    @type = type

  tangible: ->
    @printTile().tangible

  printTile: ->
    tileTypes[ @type ]

class LocationNode
  constructor: ( x, y ) ->
    @x = x
    @y = y

class window.Stage
  at: ( x, y ) ->
    @field[ x ][ y ]

  see: ( x, y ) ->

  newWall = ->
    new Type( 'wall' )

  newSpace = ->
    new Type( 'space' )

  constructor: ( dimX, dimY ) ->
    @field = twoDimArray( dimX, dimY, -> newWall() )

  addVerticalLine: ( x, y, h ) ->
    j = 0
    while j < h
      @field[ x ][ y + j ] = newSpace()
      j += 1

  addHorizontalLine: ( x, y, w ) ->
    i = 0
    while i < w
      @field[ x + i ][ y ] = newSpace()
      i += 1

  addRoom: ( room ) ->
    i = 0
    while i < room.w
      j = 0
      while j < room.h
        @field[ room.x + i ][ room.y + j ] = newSpace()
        j++
      i++

  addRoad: ( road ) ->
    [ x, y, w ] = road.horizontalLine()
    addHorizontalLine x, y, w

    [ x, y, h ] = road.verticallLine()
    addVerticalLine x, y, h

class window.Logger
  block = undefined

  @info: ( message ) ->
    @withClass 'info', message

  @warning: ( message ) ->
    @withClass 'warning', message

  @danger: ( message ) ->
    @withClass 'danger', message

  @withClass: ( classes, message ) ->
    @get().append(
      "<tr class='hidden'>
        <td>#{ moment().format( "hh:mm:ss" ) }</td>
        <td class='#{ classes }'>#{ message }</td>
        </tr>"
    )
    $( "tr.hidden" ).fadeIn()

  @get: ->
    block ?= $( "#game-logs" )

class DungeonGenerator
  MIN_SIZE = 4
  MAX_SIZE = 10
  ROOMS_COUNT = 25

  constructor: ->
    rooms = []

    i = 0
    while i < ROOMS_COUNT
      rooms.push generateRoom()
      i += 1

    @rooms = normalize( fuzzifyRooms( rooms ) )
    @roads = buildRoads @rooms

  generateRoom = ->
    new Room(
      0,
      0,
      MIN_SIZE + rand( MAX_SIZE - MIN_SIZE ),
      MIN_SIZE + rand( MAX_SIZE - MIN_SIZE )
    )

  fuzzifyRooms = ( rooms ) ->
    pickedRooms = [ rooms.shift() ]

    while rooms.length
      currentRoom = rooms.shift()

      angle = rand( 360 ) / 180 * Math.PI

      # TODO: Build table with these values.
      cos = Math.cos( angle )
      sin = Math.sin( angle )
      l = 0
      dx = 0
      dy = 0

      until pickedRooms.every( ( room ) -> currentRoom.notCross room )
        loop
          l += 1
          ndx = Math.round( l * cos )
          ndy = Math.round( l * sin )
          break if ndx != dx || ndy != dy

        currentRoom.move( ndx - dx, ndy - dy )
        dx = ndx
        dy = ndy

      pickedRooms.push currentRoom

    pickedRooms

  normalize = ( rooms ) ->
    minX = rooms.map( ( room ) -> room.x ).min() - 1
    minY = rooms.map( ( room ) -> room.y ).min() - 1
    rooms.forEach( ( room ) -> room.move( - minX, - minY ) )
    rooms.filter ( room ) ->
      ( room.x + room.w < MAX_X ) && ( room.y + room.h < MAX_Y )

  buildRoads = ( rooms ) ->
    points = rooms.map( ( room ) -> room.pointWithin() )

    connectedPoints = [ points.shift() ]
    roads = []

    distance = ( point1, point2 ) ->
      # TODO: Add class for points.
      [ x1, y1 ] = point1
      [ x2, y2 ] = point2
      # No need to calc square root since it's being used for comparison only.
      ( x1 - x2 ) ** 2 + ( y1 - y2 ) ** 2

    while points.length
      currentPoint = points.shift()

      pointToConnect = connectedPoints[ 0 ]
      minDistance = distance( currentPoint, pointToConnect )

      connectedPoints.forEach ( point ) ->
        currentDistance = distance( point, currentPoint )
        if currentDistance < minDistance
          pointToConnect = point
          minDistance = currentDistance

      connectedPoints.push currentPoint

      roads.push new Road(
        currentPoint[ 0 ],
        currentPoint[ 1 ],
        pointToConnect[ 0 ],
        pointToConnect[ 1 ]
      )

    roads

$ ->
  # Check if rot.js can work on this browser
  if !ROT.isSupported()
    alert("The rot.js library isn't supported by your browser.")
  else
    # Create a display 80 characters wide and 20 characters tall
    display = new ROT.Display width: MAX_X, height: MAX_Y

    # Add the container to our HTML page
    $('#game-screen').append( display.getContainer() )

    # dungeon = new DungeonGenerator

    render = new Renderer( display )

    stage = new Stage( MAX_X, MAX_Y )

    stage.addVerticalLine 1, 1, 19
    stage.addHorizontalLine 1, 20, 30
    stage.addVerticalLine 30, 1, 20

    # for room in dungeon.rooms
      # stage.addRoom room

    # for road in dungeon.roads
      # stage.addRoad road

    freeSpot = ->
      for row, i in stage.field
        for v, j in row
          unless v.tangible()
            return [ i, j ]

    [ x, y ] = freeSpot()

    walker = new Walker( 30, 1 )

    console.log walker

    setInterval ->
      display.clear()
      render.renderStage stage, walker
      render.renderTile walker.p.x, walker.p.y, walker.tile.printTile()
      walker.p.act()
    , 100
