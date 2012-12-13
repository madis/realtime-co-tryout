
ALPHABET = ';abcdefghijklmnopqrstuvwxyz'
distributions = {}
for letter in ALPHABET
  distributions[letter.charCodeAt 0] = 0

parseMessage = (message) ->
  for letter in message
    if(ALPHABET.indexOf(letter) > 0)
      code = letter.charCodeAt 0
      if distributions[code]?
        distributions[code] += 1
  distributions

plotify = (data) ->
  result = []
  for key, value of data
    result.push {x: key, y: value}
  result

module.exports =
  chat: (data) ->
    dist = parseMessage(data.message.text)
    plotified = plotify(dist)
    data.client.send 'statistics', JSON.stringify(plotified)
  statistics: (data) ->
    console.log 'received statistics', data

