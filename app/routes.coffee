module.exports = (app) ->
  app.get '/', (req, res) -> 
    res.render 'index'
  app.get '/audience', (req, res) -> 
    res.render 'audience'