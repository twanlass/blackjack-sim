import { Card, createDeck, shuffle, calculateScore, canSplit } from './deck';

export type GamePhase = 'betting' | 'playing' | 'dealer-turn' | 'complete';
export type HandResult = 'win' | 'lose' | 'push' | 'blackjack' | null;

export interface Hand {
  cards: Card[];
  result: HandResult;
  stood: boolean;
}

export interface GameState {
  deck: Card[];
  dealerHand: Card[];
  playerHands: Hand[];
  activeHandIndex: number;
  phase: GamePhase;
  dealerRevealed: boolean;
}

export function createInitialState(): GameState {
  return {
    deck: shuffle(createDeck()),
    dealerHand: [],
    playerHands: [{ cards: [], result: null, stood: false }],
    activeHandIndex: 0,
    phase: 'betting',
    dealerRevealed: false,
  };
}

export function drawCard(state: GameState): Card {
  if (state.deck.length === 0) {
    state.deck = shuffle(createDeck());
  }
  return state.deck.pop()!;
}

export function deal(_state: GameState): GameState {
  const newState = createInitialState();

  // Deal 2 cards each
  newState.playerHands[0].cards.push(drawCard(newState));
  newState.dealerHand.push(drawCard(newState));
  newState.playerHands[0].cards.push(drawCard(newState));
  newState.dealerHand.push(drawCard(newState));

  newState.phase = 'playing';

  return checkForBlackjack(newState);
}

export function checkForBlackjack(state: GameState): GameState {
  const playerScore = calculateScore(state.playerHands[0].cards);
  const dealerScore = calculateScore(state.dealerHand);

  if (playerScore === 21) {
    return {
      ...state,
      dealerRevealed: true,
      phase: 'complete',
      playerHands: [{
        ...state.playerHands[0],
        result: dealerScore === 21 ? 'push' : 'blackjack',
      }],
    };
  }

  return state;
}

export function hit(state: GameState): GameState {
  if (state.phase !== 'playing') return state;

  const newState = { ...state, playerHands: [...state.playerHands] };
  const hand = { ...newState.playerHands[newState.activeHandIndex] };
  hand.cards = [...hand.cards, drawCard(newState)];
  newState.playerHands[newState.activeHandIndex] = hand;

  const score = calculateScore(hand.cards);
  if (score > 21) {
    hand.result = 'lose';
    hand.stood = true;
    return moveToNextHand(newState);
  }

  return newState;
}

export function stand(state: GameState): GameState {
  if (state.phase !== 'playing') return state;

  const newState = { ...state, playerHands: [...state.playerHands] };
  const hand = { ...newState.playerHands[newState.activeHandIndex] };
  hand.stood = true;
  newState.playerHands[newState.activeHandIndex] = hand;

  return moveToNextHand(newState);
}

function moveToNextHand(state: GameState): GameState {
  const nextIndex = state.activeHandIndex + 1;

  if (nextIndex < state.playerHands.length) {
    return { ...state, activeHandIndex: nextIndex };
  }

  // All hands complete, dealer's turn
  return dealerPlay(state);
}

function dealerPlay(state: GameState): GameState {
  const newState = { ...state, dealerRevealed: true, phase: 'dealer-turn' as GamePhase };

  // Check if all player hands busted
  const allBusted = newState.playerHands.every(h => h.result === 'lose');
  if (allBusted) {
    newState.phase = 'complete';
    return newState;
  }

  // Dealer draws until 17+
  while (calculateScore(newState.dealerHand) < 17) {
    newState.dealerHand = [...newState.dealerHand, drawCard(newState)];
  }

  const dealerScore = calculateScore(newState.dealerHand);
  const dealerBusted = dealerScore > 21;

  // Determine results
  newState.playerHands = newState.playerHands.map(hand => {
    if (hand.result) return hand; // Already determined (busted)

    const playerScore = calculateScore(hand.cards);

    if (dealerBusted) {
      return { ...hand, result: 'win' as HandResult };
    }
    if (playerScore > dealerScore) {
      return { ...hand, result: 'win' as HandResult };
    }
    if (playerScore < dealerScore) {
      return { ...hand, result: 'lose' as HandResult };
    }
    return { ...hand, result: 'push' as HandResult };
  });

  newState.phase = 'complete';
  return newState;
}

export function split(state: GameState): GameState {
  if (state.phase !== 'playing') return state;

  const hand = state.playerHands[state.activeHandIndex];
  if (!canSplit(hand.cards)) return state;

  const newState = { ...state, playerHands: [...state.playerHands] };

  // Split into two hands
  const card1 = hand.cards[0];
  const card2 = hand.cards[1];

  const hand1: Hand = { cards: [card1, drawCard(newState)], result: null, stood: false };
  const hand2: Hand = { cards: [card2, drawCard(newState)], result: null, stood: false };

  newState.playerHands.splice(state.activeHandIndex, 1, hand1, hand2);

  return newState;
}

export function canPlayerSplit(state: GameState): boolean {
  if (state.phase !== 'playing') return false;
  const hand = state.playerHands[state.activeHandIndex];
  return canSplit(hand.cards);
}

export function getPlayerScore(state: GameState, handIndex: number = 0): number {
  return calculateScore(state.playerHands[handIndex]?.cards || []);
}

export function getDealerScore(state: GameState, revealed: boolean = false): number {
  if (!revealed && !state.dealerRevealed) {
    // Only show first card value
    return state.dealerHand.length > 0 ? calculateScore([state.dealerHand[0]]) : 0;
  }
  return calculateScore(state.dealerHand);
}
