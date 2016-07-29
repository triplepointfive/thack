WALL = "#"

window.rand = ( max ) ->
  Math.floor( Math.random() * max )

Array.prototype.max = ->
  Math.max.apply( Math, this )

Array.prototype.min = ->
  Math.min.apply( Math, this )

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

  notCross: ( rect ) ->
    ( rect.x > @x + @w ) ||
    ( rect.y > @y + @h ) ||
    ( rect.x + rect.w < @x ) ||
    ( rect.y + rect.h < @y )

class Renderer
  constructor: ( display ) ->
    @display = display
    @i = 0

  renderRect: ( rect ) ->
    colors = @buildColor()

    horizontalLine = Array( rect.w + 1 ).join( WALL )

    @display.drawText rect.x, rect.y, "#{ colors }#{ horizontalLine }"
    @display.drawText rect.x, ( rect.y + rect.h - 1 ), "#{ colors }#{ horizontalLine }"

    i = 1
    while i < rect.h - 1
      @display.drawText rect.x, ( rect.y + i ), "#{ colors }#{ WALL }"
      @display.drawText ( rect.x + rect.w - 1 ), ( rect.y + i ), "#{ colors }#{ WALL }"

      i += 1


  buildColor: () ->
    # Calculate the foreground color, getting progressively darker
    # and the background color, getting progressively lighter.
    foreground = ROT.Color.toRGB([255 - (@i*20), 255 - (@i*20), 255 - (@i*20)])
    background = ROT.Color.toRGB([@i*20, @i*20, @i*20])

    @i += 1

    # Create the color format specifier.
    "%c{#{ foreground }}%b{#{ background }}"

class DungeonGenerator
  MIN_SIZE = 4
  MAX_SIZE = 10
  ROOMS_COUNT = 30

  constructor: ->
    rooms = []

    i = 0
    while i < ROOMS_COUNT
      rooms.push generateRoom()
      i += 1

    @rooms = normalize( fuzzifyRooms( rooms ) )
    # @rooms = [ new Rect( 50, 50, 7, 10 ), new Rect( 58, 50, 6, 6 ), new Rect( 65, 50, 10, 8 ), ]

  generateRoom = ->
    new Rect( 0, 0, MIN_SIZE + rand( MAX_SIZE - MIN_SIZE ), MIN_SIZE + rand( MAX_SIZE - MIN_SIZE ) )

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
    minX = rooms.map( ( room ) -> room.x ).min()
    minY = rooms.map( ( room ) -> room.y ).min()
    rooms.forEach( ( room ) -> room.move( - minX, - minY ) )
    rooms.filter( ( room ) -> ( room.x + room.w < 100 ) && ( room.y + room.h < 100 ) )

$ ->
  # Check if rot.js can work on this browser
  if !ROT.isSupported()
    alert("The rot.js library isn't supported by your browser.")
  else
    # Create a display 80 characters wide and 20 characters tall
    display = new ROT.Display({ width:100, height:100 })

    # Add the container to our HTML page
    document.body.appendChild( display.getContainer() )

    dungeon = new DungeonGenerator

    console.log dungeon.rooms

    render = new Renderer( display )

    for room in dungeon.rooms

      render.renderRect room

