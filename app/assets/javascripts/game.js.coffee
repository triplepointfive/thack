WALL = "#"

class Rect
  constructor: ( x, y, w, h ) ->
    # TODO: Validate?
    @x = x
    @y = y
    @w = w
    @h = h

  intercross: ( rect ) ->
    not (
      ( rect.x > @x + @w ) ||
      ( rect.y > @y + @h ) ||
      ( rect.x + rect.w < @x ) ||
      ( rect.y + rect.h < @y )
    )

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
      @display.drawText ( rect.x + rect.h - 1 ), ( rect.y + i ), "#{ colors }#{ WALL }"

      i += 1


  buildColor: () ->
    # Calculate the foreground color, getting progressively darker
    # and the background color, getting progressively lighter.
    foreground = ROT.Color.toRGB([255 - (@i*20),
                                  255 - (@i*20),
                                  255 - (@i*20)])
    background = ROT.Color.toRGB([@i*20, @i*20, @i*20])

    @i += 1

    # Create the color format specifier.
    "%c{#{ foreground }}%b{#{ background }}"

class DungeonGenerator


$ ->
  # Check if rot.js can work on this browser
  if !ROT.isSupported()
    alert("The rot.js library isn't supported by your browser.")
  else
    # Create a display 80 characters wide and 20 characters tall
    display = new ROT.Display({ width:80, height:20 })

    # Add the container to our HTML page
    document.body.appendChild( display.getContainer() )

    rect = new Rect( 3, 3, 1, 1 )
    rect2 = new Rect( 8, 3, 2, 2 )
    rect3 = new Rect( 13, 3, 3, 3 )
    rect4 = new Rect( 20, 3, 4, 4 )
    rect5 = new Rect( 28, 3, 5, 5 )

    render = new Renderer( display )

    render.renderRect rect
    render.renderRect rect2
    render.renderRect rect3
    render.renderRect rect4
    render.renderRect rect5

