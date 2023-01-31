/* - - - - - - - - - -
Game variable storage:
  - - - - - - - - - - */


/* - - - - - - - - - -
   Setup Websocket:
  - - - - - - - - - - */

// Match websocket protocol to page protocol (ws/http or wss/https):
var wsProtocol = window.location.protocol == "https:" ? "wss" : "ws";

// Set up new websocket connection to server
var connection = new WebSocket(`${wsProtocol}://${window.location.hostname}:${window.location.port}`);

let gameId, playerName, playerTurn;
let hand = [];

// Log successful connection
connection.onopen = function() {
  console.log("Websocket connected!");

  var c = document.getElementById("gameId");
  gameId = c.innerHTML;
  gameId = gameId.trim();
  console.log("gameId", gameId);

  var c = document.getElementById("playerName");
  playerName = c.innerHTML;
  playerName = playerName.trim();
  console.log("playerName", playerName);
  
  startGame();
};

// Set this function to run every time the websocket receives a message from the server:
// Each message will have data that represents a player that has moved.
connection.onmessage = function(message) {
  console.log("New Message:");
  console.log(message);
  var parsedMessageData = JSON.parse(message.data);
  console.log("Parsed Message Data:");
  console.log(JSON.stringify(parsedMessageData));
  
  // var c = document.getElementById("game-info-all");
  // c.innerHTML = JSON.stringify(parsedMessageData);
  
  let msgType = parsedMessageData.msgType;

  if (msgType === "bid") {
    var c = document.getElementById("bidAmount");
    c.innerHTML = JSON.stringify(parsedMessageData.bidAmount);
    var c = document.getElementById("bidPlayerName");
    c.innerHTML = JSON.stringify(parsedMessageData.bidPlayerName);
  } else if (msgType === "trump") {
    var c = document.getElementById("trump");
    c.innerHTML = JSON.stringify(parsedMessageData.trump);
  } else if (msgType === "hand") {
    let curHand = parsedMessageData.hand;
    console.log(hand, curHand);
    hand = hand.concat(curHand);
    var c = document.getElementById("playerHand");
    c.innerHTML = JSON.stringify(hand);
  } else if (msgType === "playerNames") {
    var c = document.getElementById("playerNames");
    c.innerHTML = JSON.stringify(parsedMessageData.playerNames);  
  } else if (msgType === "playerTurn") {
    playerTurn = parsedMessageData.playerTurn;
    var c = document.getElementById("playerTurn");
    c.innerHTML = JSON.stringify(playerTurn);  
    var c = document.getElementById("notYourTurn");
    c.innerHTML = "";
  } else if (msgType === "cardsOnTable") {
    var c = document.getElementById("cardsOnTable");
    c.innerHTML = JSON.stringify(parsedMessageData.cardsOnTable);  
  } else if (msgType === "chatOutput") {
    var c = document.getElementById("chatWindow");
    c.innerHTML = c.innerHTML + "<br>" + JSON.stringify(parsedMessageData.chatOutput);  
  } else if (msgType === "notYourTurn") {
    var c = document.getElementById("notYourTurn");
    c.innerHTML = "Please be patient. It's not your turn :)";
  } else if (msgType === "tricks") {
    var c = document.getElementById("tricks");
    var tricks = parsedMessageData.tricks;
    c.innerHTML = "";
    for (var i = 0; i < tricks.length; i++) {
      c.innerHTML = c.innerHTML + "Trick " + i + " winner " + tricks[i].winnerName + "<br>";
    }
  } else if (msgType === "gameEnd") {
    var c = document.getElementById("tricks");
    var tricks = parsedMessageData.tricks;
    c.innerHTML = "Game Ended <br> ";
    for (var i = 0; i < tricks.length; i++) {
      c.innerHTML = c.innerHTML + JSON.stringify(tricks[i]) + "<br>";
    }    
  } else if (msgType === "restart") {
    restartGame();
  }
};

function restartGame() {
    var c = document.getElementById("bidAmount");
    c.innerHTML = "";
    var c = document.getElementById("bidPlayerName");
    c.innerHTML = "";
    var c = document.getElementById("trump");
    c.innerHTML = "";
    var c = document.getElementById("playerHand");
    c.innerHTML = "";
    var c = document.getElementById("playerTurn");
    c.innerHTML = "";
    var c = document.getElementById("notYourTurn");
    c.innerHTML = "";
    var c = document.getElementById("cardsOnTable");
    c.innerHTML = "";
    var c = document.getElementById("tricks");
    c.innerHTML = "";
    var c = document.getElementById("bidAmountInput");
    c.value = "";
    var c = document.getElementById("trumpInput");  
    c.value = "";
    var c = document.getElementById("playCard");
    c.value = "";
    hand = [];
    var c = document.getElementById("playerHand");
    c.innerHTML = "";
}

// Game function which starts once websocket is connected:
function startGame() {

  var c = document.getElementById("gameInfo");

  var msg = {
    msgType: "intro",
    gameId: gameId,
    playerName: playerName,
  }

  connection.send(JSON.stringify(msg));

  function gameLoop() {
    // Clear canvas
    // ctx.clearRect(0, 0, 200, 200);
  }

  gameLoop();
}

function bid() {
  let bidAmount = document.getElementById("bidAmountInput").value;
  let trump = document.getElementById("trumpInput").value;
  console.log("Bid", bidAmount, trump);
  var msg = {
    msgType: "bid",
    gameId: gameId,
    playerName: playerName,
    bidAmount: bidAmount,
    trump: trump
  }
  connection.send(JSON.stringify(msg));
}

function playAgain() {
  var msg = {
    msgType: "playAgain",
    gameId: gameId,
    playerName: playerName,
  }
  connection.send(JSON.stringify(msg));
}

function playCard() {
  console.log("playerName, playerTurn", playerName, playerTurn);
  if (playerName != playerTurn) {
    var c = document.getElementById("notYourTurn");
    c.innerHTML = "Please be patient. It's not your turn :)";
    return
  }
  let cardNumber = document.getElementById("playCard").value;
  console.log("cardNumber", cardNumber);
  var msg = {
    msgType: "playCard",
    gameId: gameId,
    playerName: playerName,
    playCard: hand[cardNumber]
  }
  connection.send(JSON.stringify(msg));
  hand.splice(cardNumber, 1);
  var c = document.getElementById("playerHand");
  c.innerHTML = JSON.stringify(hand);
}


function sendChat() {
  let chatInput = document.getElementById("chatInput").value;
  var msg = {
    msgType: "chatInput",
    gameId: gameId,
    playerName: playerName,
    chatInput: chatInput
  }
  connection.send(JSON.stringify(msg));
}
