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
          tile = stage.at( x, y ).printTile()
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

class Walker
  constructor: ( x, y ) ->
    @x = x
    @y = y

  visionMask: ->
    mask = twoDimArray MAX_X, MAX_Y, -> false

    i = Math.max( @x - 10, 0 )
    while i < Math.min( @x + 10, MAX_X )
      j = Math.max( @y - 10, 0 )
      while j < Math.min( @y + 10, MAX_Y )
        mask[ i ][ j ] = true
        j++
      i++
    mask

class Type
  white = [ 0, 0, 0 ]
  black = [ 255, 255, 255 ]
  red   = [ 255, 0, 0 ]
  green = [ 0, 255, 0 ]
  blue  = [ 0, 0, 255 ]

  tileTypes =
    wall:     new TileType( "#", white, black, visible: true,  tangible: true  )
    space:    new TileType( " ", white, black, visible: false, tangible: false )
    unknown:  new TileType( " ", white, black, visible: false, tangible: true  )

    humanoid: new TileType( "@", white, black, visible: true,  tangible: true  )

  constructor: ( type, opts = {} ) ->
    @type = type

  printTile: ->
    tileTypes[ @type ]

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

    i = 1
    while i < w
      @field[ x + i ][ y ] = newSpace()
      i += 1

    [ x, y, h ] = road.verticallLine()

    j = 1
    while j < h
      @field[ x ][ y + j ] = newSpace()
      j += 1

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

    dungeon = new DungeonGenerator

    render = new Renderer( display )

    stage = new Stage( MAX_X, MAX_Y )

    walker = new Walker( 20, 20 )

    for room in dungeon.rooms
      stage.addRoom room

    for road in dungeon.roads
      stage.addRoad road

    setInterval ->
      walker.x++
      walker.y++

      render.renderStage stage, walker
    , 100
