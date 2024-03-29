express = require 'express'
stylus = require 'stylus'
assets = require 'connect-assets'

app = express()
# Add Connect Assets
app.use assets()
# Set the public folder as static assets
app.use express.static(process.cwd() + '/public')
# Set View Engine
app.set 'view engine', 'jade'
# Get root_path return index view

# Define Port
port = process.env.PORT or process.env.VMC_APP_PORT or 3000
# Start Server
app.listen port, -> console.log "Listening on #{port}\nPress CTRL-C to stop server."

 # Set up pages
require('./app/routes')(app);

# Set up messaging
RtsWrapper = require './app/rts_client'
subscriptions = require './app/message_handlers'

rtsWrapper = new RtsWrapper subscriptions
