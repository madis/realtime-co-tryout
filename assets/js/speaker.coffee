jQuery ->
  sender = new Sender
  $('#message').keyup (event) ->
    if event.keyCode == 13 # Enter was released
      message = $(@).val()
      sender.send message
      $(@).val('')