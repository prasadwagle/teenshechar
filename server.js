/**
 * This is the main Node.js server script for your project
 * Check out the two endpoints this back-end API provides in fastify.get and fastify.post below
 */

const path = require("path");

// Require the fastify framework and instantiate it
const fastify = require("fastify")({
  // Set this to true for detailed logging:
  logger: false,
});

// Setup our static files
fastify.register(require("@fastify/static"), {
  root: path.join(__dirname, "public"),
  prefix: "/", // optional: default '/'
});

// Formbody lets us parse incoming forms
fastify.register(require("@fastify/formbody"));

// View is a templating manager for fastify
fastify.register(require("@fastify/view"), {
  engine: {
    handlebars: require("handlebars"),
  },
});

// Load and parse SEO data
const seo = require("./src/seo.json");
if (seo.url === "glitch-default") {
  seo.url = `https://${process.env.PROJECT_DOMAIN}.glitch.me`;
}

/**
 * Our home page route
 *
 * Returns src/pages/index.hbs with data built into it
 */
fastify.get("/", function (request, reply) {
  // params is an object we'll pass to our handlebars template
  let params = { seo: seo };

  // If someone clicked the option for a random color it'll be passed in the querystring
  if (request.query.randomize) {
    // We need to load our color data file, pick one at random, and add it to the params
    const colors = require("./src/colors.json");
    const allColors = Object.keys(colors);
    let currentColor = allColors[(allColors.length * Math.random()) << 0];

    // Add the color properties to the params object
    params = {
      color: colors[currentColor],
      colorError: null,
      seo: seo,
    };
  }

  // The Handlebars code will be able to access the parameter values and build them into the page
  return reply.view("/src/pages/index.hbs", params);
  // return reply.view("/public/index.html", params);

});

const { suits, ranks, createDeck, shuffle, deal, cardCmp } = require("./cards.js");
let games = new Map();
/**
 * Our POST route to handle and react to form submissions
 *
 * Accepts body data indicating the user choice
 */
fastify.post("/", function (request, reply) {
  let gameId = request.body.gameId;
  let numPlayers = parseInt(request.body.numPlayers);
  let playerName = request.body.playerName;  
  console.log(gameId, numPlayers, playerName);
  
  let params = {
    gameId: gameId,
    playerName: playerName,
  };
  
  if (games.has(gameId)) {
    let game = games.get(gameId);
    let players = game.players;
    if (players.length === game.numPlayers) {
      params.maxPlayers = "max players reached"
    } else {
      let player = {}
      player.playerName = playerName;
      game.players.push(player);
    }
  } else {
    let player = {}
    player.playerName = playerName;
    let game = { 
      id: gameId,
      numPlayers: numPlayers,
      players: [player],
      socketConnections: [],
      deck: null,
      noCardPlayed: true,
      bidPlayer: null,
      bidAmount: 0,
      trump: null,
      cardsOnTable: [],
      playerTurn: 0,
      tricks: [],
      state: "initialized"
    };
    games.set(gameId, game);
  }
        
  return reply.view("/src/pages/game.hbs", params);
});


// Run the server and report out to the logs
fastify.listen(
  { port: process.env.PORT, host: "0.0.0.0" },
  function (err, address) {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    console.log(`Your app is listening on ${address}`);
  }
);

var WebSocket = require("ws");

var server = fastify.server;

// Connect our Websocket server to our server variable to serve requests on the same port:
var wsServer = new WebSocket.Server({ server });

// This function will send a message to all clients connected to the websocket:
function broadcast(socketConnections, data) {
  socketConnections.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

wsServer.on('connection', function (socket) {
    // Some feedback on the console
    console.log("A client just connected");
  
    // Attach some behavior to the incoming socket
    socket.on('message', function (msg) {
        console.log("Received message from client: "  + msg);

        let msgObj = JSON.parse(msg);
        let msgType = msgObj.msgType;
        let gameId = msgObj.gameId;
        let playerName = msgObj.playerName;
        let game = games.get(gameId);
     
        if (msgType === "intro") {
          game.socketConnections.push(socket);
          let player = playerFind(game.players, playerName); 
          console.log(JSON.stringify(player.obj));
          player.obj.socketConnection = socket;
          if (game.socketConnections.length === game.numPlayers) {
            broadcastPlayers(game);
            startGame(game);
          }
        } else if (msgType === "bid") {
          let player = playerFind(game.players, playerName); 
          game.bidPlayer = player.idx;
          game.trump = msgObj.trump;
          game.bidAmount = msgObj.bidAmount;
          broadcastBid(game);
          dealCards(game);
          game.playerTurn = (player.idx + 1) % game.numPlayers;
          broadcastPlayerTurn(game);    
        } else if (msgType === "playCard") {
          let card = {}
          card.player = game.playerTurn;
          card.playCard = msgObj.playCard;
          game.cardsOnTable.push(card);
          broadcastCardsOnTable(game); 
          // console.log(game.cardsOnTable.length, game.numPlayers);
          if (game.noCardPlayed) {
            game.noCardPlayed = false;
            broadcastTrump(game);
          }
          if (game.cardsOnTable.length === game.numPlayers) {
            console.log("Trick complete");
            // Trick is done
            // Find who won it
            let player = whoWonTrick(game.cardsOnTable, game.trump);

            // Add trick to tricks
            // Broadcast tricks
            let trick = {}
            trick.winner = player;
            trick.winnerName = game.players[player].playerName;
            trick.cards = game.cardsOnTable;
            game.tricks.push(trick);
            broadcastTricks(game);

            // Make playerTurn to that player
            game.playerTurn = player;
            broadcastPlayerTurn(game);    

            // Reset cardsOnTable 
            game.cardsOnTable = [];
            // broadcastCardsOnTable(game) 
            let numPlayersToTricks = {2: 6, 3: 7, 4: 6}
            console.log("numTricks, total", game.tricks.length, numPlayersToTricks[game.numPlayers]);
            if (game.tricks.length === numPlayersToTricks[game.numPlayers]) {
              endGame(game);
            }
          } else {
            game.playerTurn = (game.playerTurn + 1) % game.numPlayers;
            broadcastPlayerTurn(game);    
          }
        } else if (msgType === "chatInput") {
          let msg = {
            msgType: "chatOutput",
            chatOutput: playerName + ": " + msgObj.chatInput,
            sender: playerName
          }
          broadcast(game.socketConnections, JSON.stringify(msg));          
        } else if (msgType === "playAgain") {
          if (game.state === "end") {
            broadcastRestart(game);
            startGame(game);
          }
        }
    });
});

function playerFind(players, playerName) {
  for (let i = 0; i < players.length; i++) {
    if (players[i].playerName === playerName) {
      let player = {}
      player.idx = i;
      player.obj = players[i];
      return player;
    }
  }
}

function whoWonTrick(cardsOnTable, trump) {
  // console.log (cardsOnTable, trump);
  let winner = cardsOnTable[0].player;
  let winningCard = cardsOnTable[0].playCard;
  for (let i = 1; i < cardsOnTable.length; i++) {
    if (cardCmp(cardsOnTable[i].playCard, winningCard, trump) === 1) {
      winningCard = cardsOnTable[i].playCard;
      winner = cardsOnTable[i].player;
    }
  }
  console.log(winner,winningCard);
  return winner;
}

function broadcastCardsOnTable(game) {
  let msg = {
    msgType: "cardsOnTable",
    cardsOnTable: game.cardsOnTable
  }
  broadcast(game.socketConnections, JSON.stringify(msg));
}

function broadcastBid(game) {
  let msg = {
    msgType: "bid",
    bidPlayerName: game.players[game.bidPlayer].playerName,
    bidAmount: game.bidAmount
  }
  broadcast(game.socketConnections, JSON.stringify(msg));
}

function broadcastGameEnd(game) {
  let msg = {
    msgType: "gameEnd",
    tricks: game.tricks
  }
  broadcast(game.socketConnections, JSON.stringify(msg));  
}

function broadcastTrump(game) {
  let msg = {
    msgType: "trump",
    trump: game.trump
  }
  broadcast(game.socketConnections, JSON.stringify(msg));
}

function broadcastTricks(game) {
  let msg = {
    msgType: "tricks",
    tricks: game.tricks
  }
  broadcast(game.socketConnections, JSON.stringify(msg));
}

function broadcastRestart(game) {
  let msg = {
    msgType: "restart",
  }
  broadcast(game.socketConnections, JSON.stringify(msg));
}

function startGame(game) {
  game.state = "start";
  game.noCardPlayed = true;
  game.bidPlayer = null;
  game.bidAmount = 0;
  game.trump = null;
  game.cardsOnTable = [];
  game.tricks = [];
  let deck = createDeck(suits, ranks);
  shuffle(deck);   
  game.deck = deck;  
  dealCards(game);
  game.playerTurn = 0;
  broadcastPlayerTurn(game);
}

function endGame(game) {
  game.state = "end";
  console.log("Game state = ", game.state)
  broadcastGameEnd(game);
}

function broadcastPlayers(game) {
  console.log("Broadcasting players list ");
  let players = game.players;
  let playerNames = players.map(player => player.playerName);
  let msg = {
    msgType: "playerNames",
    playerNames: playerNames
  }
  broadcast(game.socketConnections, JSON.stringify(msg));  
}

function broadcastPlayerTurn(game) {
  console.log("Broadcasting player turn");
  let msg = {
    msgType: "playerTurn",
    playerTurn: game.players[game.playerTurn].playerName
  }
  broadcast(game.socketConnections, JSON.stringify(msg));  
}

function dealCards(game) {  
  let players = game.players;
  for (let i = 0; i < players.length; i++) {
    let player = players[i];
    let numCards = 3;
    let hand = deal(game.deck, numCards);  
    player.hand = hand;
    let msg = {
      msgType: "hand",
      hand: hand
    }    
    player.socketConnection.send(JSON.stringify(msg));
  }  

}