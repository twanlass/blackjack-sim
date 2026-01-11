import { Card, calculateScore, getCardValue } from './deck';

export type Action = 'hit' | 'stand' | 'split' | 'double';

export interface Advice {
  action: Action;
  reason: string;
}

function getDealerValue(card: Card): number {
  // For strategy purposes, treat face cards as 10, Ace as 11
  return getCardValue(card);
}

function isDealerWeak(dealerUpCard: Card): boolean {
  const value = getDealerValue(dealerUpCard);
  return value >= 2 && value <= 6;
}

function isPair(cards: Card[]): boolean {
  return cards.length === 2 && cards[0].rank === cards[1].rank;
}

// Dealer bust probabilities by up card (approximate)
const DEALER_BUST_CHANCE: Record<number, number> = {
  2: 35, 3: 37, 4: 40, 5: 42, 6: 42,
  7: 26, 8: 24, 9: 23, 10: 23, 11: 17,
};

export function getAdvice(playerCards: Card[], dealerUpCard: Card, canPlayerSplit: boolean): Advice {
  const score = calculateScore(playerCards);
  const dealerValue = getDealerValue(dealerUpCard);
  const dealerWeak = isDealerWeak(dealerUpCard);
  const bustChance = DEALER_BUST_CHANCE[dealerValue] || 23;

  // Check for split opportunities first
  if (canPlayerSplit && isPair(playerCards)) {
    const rank = playerCards[0].rank;

    // Aces: Always split
    if (rank === 'A') {
      return { action: 'split', reason: 'Two chances at 21 beats one hand starting at 12.' };
    }

    // 8s: Always split
    if (rank === '8') {
      return { action: 'split', reason: '16 is the worst hand. Two hands starting at 8 are much better.' };
    }

    // 10s: Never split (20 is great)
    if (rank === '10' || rank === 'J' || rank === 'Q' || rank === 'K') {
      return { action: 'stand', reason: '20 is nearly unbeatable. Never break up a winning hand.' };
    }

    // 5s: Never split (10 is better for doubling)
    if (rank === '5') {
      // Fall through to handle as 10
    } else {
      // Other pairs - split against weak dealer
      if (dealerWeak) {
        return { action: 'split', reason: `Dealer has ${bustChance}% bust chance. Split to maximize winnings.` };
      }
    }
  }

  // Stand on 17 or more
  if (score >= 17) {
    return { action: 'stand', reason: '17+ is strong. Risk of busting outweighs potential gain.' };
  }

  // Hit on 8 or less
  if (score <= 8) {
    return { action: 'hit', reason: "Can't bust with one card. Always improve a weak hand." };
  }

  // Double down on 11
  if (score === 11) {
    return { action: 'double', reason: 'Best doubling spot - any 10-card gives you 21.' };
  }

  // Double down on 10 against weak dealer
  if (score === 10 && dealerWeak) {
    return { action: 'double', reason: `Strong hand + dealer ${bustChance}% bust chance = double your bet.` };
  }

  // 12-16 decision based on dealer strength
  if (score >= 12 && score <= 16) {
    if (dealerWeak) {
      return { action: 'stand', reason: `Dealer has ${bustChance}% bust chance. Let them take the risk.` };
    } else {
      const likelyTotal = dealerValue === 11 ? '21' : `${dealerValue + 10}`;
      return { action: 'hit', reason: `Dealer likely has ${likelyTotal}. You need to improve to have a chance.` };
    }
  }

  // 9-10 without double opportunity
  if (score === 9) {
    return { action: 'hit', reason: 'Good starting point. One more card could make this strong.' };
  }
  if (score === 10) {
    return { action: 'hit', reason: 'Strong hand - a 10-card gives you 20.' };
  }

  // Default to hit
  return { action: 'hit', reason: 'Improve your hand.' };
}

export function formatAdvice(advice: Advice): string {
  switch (advice.action) {
    case 'hit':
      return 'HIT';
    case 'stand':
      return 'STAND';
    case 'split':
      return 'SPLIT';
    case 'double':
      return 'DOUBLE (or Hit)';
  }
}
