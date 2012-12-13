Hands-on topic for enterprise software seminar
==============================================
Task
----
A simple proof‐of‐concept implementation of 
visualizing activity from a social channel in soft 
real‐time. Show us what and how you did it.
http://www.xrtml.org for further information


Criteria for Evaluation of Presentations
----------------------------------------
The lecturer will give a grade to your presentation based on
the following criteria (one point per criterion):
1. Slides: Is the amount of text appropriate? Are figures and 
tables used appropriately where possible?
2. Public speaking/oratory: Is the posture appropriate? Is the 
voice level and intonation engaging? Is the gesturing
appropriate? Is the rhythm engaging?
3. Structure: Is the structure of the presentation clear? Are the 
transitions between logical parts of the presentation clearly 
articulated?
4. Content: Does the presentation highlight the main points of 
the paper? Is the level of detail appropriate? Are examples 
used appropriately?
5. Timeliness: Does the presentation use the allocated time
appropriately? Is the time limit respected?


Solution
========
Application for graphing letter distribution of user input sent from many sources.

1. People can enter text
2. Text will be sent to everybody else
3. Graph will be drawn based on the distribution of letters.

For that 2 channels: chat, statistics.

3 Roles
  1. server - subscribes to a chat channel. Calculates letter counts for input message. Publishes it to the statistics channel.
  2. speaker - can send messages to the chat channel
  3. audience - subscribe to chat and statistics channels. Chat channel data is being shown as text. Statistics channel data is used for plotting.

Running
-------
In terminal:

1. Clone the repo ```git clone git@github.com:madis/realtime-co-tryout.git```
2. Install [nodejs & npm](http://nodejs.org/)
3. install required packages ```npm install```
4. Run server ```coffee server```

In browser:

1. Open [Speaker](http://localhost:3000/)
2. Open [Audience](http://localhost:3000/audience)

Links
=====
[API documentation](http://docs.xrtml.org/2-1-0/pubsub/node-js/ortcclient.html)

[Documentation for nodejs](http://docs.xrtml.org/2-1-0/pubsub/node-js/ortcclient.html)

[Morris the plotting library used](http://www.oesmith.co.uk/morris.js/)

[Pricing](http://app.realtime.co/pricing)