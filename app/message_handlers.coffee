
ALPHABET = 'abcdefghijklmnopqrstuvwxyz'
distributions = {}
for letter in ALPHABET
  distributions[letter.charCodeAt 0] = 0


console.log 'distributions', distributions
parseMessage = (message) ->
  for letter in message
    if(ALPHABET.indexOf(letter) > 0)
      console.log "doing #{letter}"
      code = letter.charCodeAt 0
      if distributions[code]?
        distributions[code] += 1
  distributions

plotify = (data) ->
  result = []
  for key, value of data
    result.push {x: key, y: value}
  result
  # [
  #     {y: '2012', a: 100}
  #     {y: '2011', a: 75}
  #     {y: '2010', a: 50}
  #     {y: '2009', a: 75}
  #     {y: '2008', a: 50}
  #     {y: '2007', a: 75}
  #     {y: '2006', a: 100}
  #   ]

module.exports =
  chat: (data) ->
    console.log 'waht another channel', data.client.getAnnouncementSubChannel()
    dist = parseMessage(data.message.text)
    console.log 'dist is', dist
    plotified = plotify(dist)
    console.log 'plotified : ', plotified
    data.client.send 'statistics', JSON.stringify(plotified)
  statistics: (data) ->
    console.log 'wtf statistics', data

