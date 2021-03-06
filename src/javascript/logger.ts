let block: JQuery = undefined

export class Logger {
  public static info( message: string ): void {
    this.withClass( "info", message )
  }

  public static warning( message: string ): void {
    this.withClass( "warning", message )
  }

  public static danger( message: string ): void {
    this.withClass( "danger", message )
  }

  private static withClass( classes: string, message: string ): void {
    // `<tr class='hidden'>
    this.get().append(
      `<tr>
        <td>${ moment().format( "hh:mm:ss" ) }</td>
        <td class='${ classes }'>${ message }</td>
        </tr>`
    )
    // $( "tr.hidden" ).fadeIn()
  }

  private static get(): JQuery {
    return block ? block : ( block = $( "#game-logs" ) )
  }
}
