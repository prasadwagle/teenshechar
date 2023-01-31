const suits = ["s", "h", "d", "c"];
const ranks = ["j", "9", "a", "10", "k", "q"];

function createDeck(suits, ranks) {
    var deck = []
    for (let i = 0; i < suits.length; i++) {
        for (let j = 0; j < ranks.length; j++) {
            deck.push({"suit": suits[i], "rank": ranks[j]})
        }
    }
    return deck;
}

function shuffle(deck) {
    // console.log(deck.length);
    // console.log(JSON.stringify(deck));
    for (let i = 0; i < (deck.length - 1); i++) {
      let rfloat = Math.random() * (deck.length - i);
      let r = Math.floor(rfloat);
      // console.log(i, deck.length, rfloat, r);
      let tmp = deck[i];
      deck[i] = deck[r];
      deck[r] = tmp;
    }
}

function deal(deck, numCards) {
    var hand = [];
    for (let i = 0; i < numCards; i++) {
        let card = deck.pop()
        hand.push(card)
    }
    return hand
}

function suitCmp(suit1, suit2, trump) {
  if (suit1 === suit2) {
    return 0
  } else {
    if (suit1 === trump) {
      return 1
    } else {
      return -1
    }
  }
}

function rankCmp(rank1, rank2) {
  if (ranks.indexOf(rank1) < ranks.indexOf(rank2)) {
    return 1
  } else if (ranks.indexOf(rank1) < ranks.indexOf(rank2)) {
    return -1
  } else {
    return 0
  }
}

function cardCmp(card1, card2, trump) {
  if (suitCmp(card1.suit, card2.suit) === 0) {
    return rankCmp(card1.rank, card2.rank);
  } else {
    return suitCmp(card1.suit, card2.suit, trump);
  }
}

// Test
// console.log("hi")
// let deck = createDeck(suits, ranks);
// shuffle(deck);
// let numCards = 4;
// let hand = deal(deck, numCards);

// let card1, card2, retval;
// card1 = {suit: "h", rank: "j"};
// card2 = {suit: "h", rank: "9"};
// retval = cardCmp(card1, card2, "s")
// card1 = {suit: "h", rank: "j"};
// card2 = {suit: "s", rank: "9"};
// retval = cardCmp(card1, card2, "s")
// console.log(retval)
module.exports = {suits, ranks, createDeck, shuffle, deal, cardCmp}