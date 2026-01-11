import './style.css';
import {
  GameState,
  createInitialState,
  drawCard,
  checkForBlackjack,
  hit,
  stand,
  split,
  canPlayerSplit,
  getPlayerScore,
  getDealerScore,
} from './game';
import { renderCardsToElement } from './render';
import { getAdvice, formatAdvice } from './strategy';

let gameState: GameState = createInitialState();
let isDealing = false;
let lastPhase: string = 'betting';

// Stats tracking
const stats = {
  wins: 0,
  losses: 0,
  pushes: 0,
  blackjacks: 0,
};

// Betting
const BET_AMOUNT = 10;
let bankroll = 1000;
let currentBets: number[] = [BET_AMOUNT]; // bet per hand (for splits)

const DEAL_DELAY = 400; // ms between each card

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const dealerCardsEl = document.getElementById('dealer-cards')!;
const dealerScoreEl = document.getElementById('dealer-score')!;
const playerHandsEl = document.getElementById('player-hands')!;
const playerScoreEl = document.getElementById('player-score')!;
const messageEl = document.getElementById('message')!;

const hitBtn = document.getElementById('hit-btn') as HTMLButtonElement;
const standBtn = document.getElementById('stand-btn') as HTMLButtonElement;
const doubleBtn = document.getElementById('double-btn') as HTMLButtonElement;
const splitBtn = document.getElementById('split-btn') as HTMLButtonElement;
const dealBtn = document.getElementById('deal-btn') as HTMLButtonElement;
const bankrollEl = document.getElementById('bankroll')!;

const adviceEl = document.getElementById('advice')!;
const adviceReasonEl = document.getElementById('advice-reason')!;
const statsEl = document.getElementById('stats')!;

// Advisor toggle functionality for mobile
const advisorEl = document.getElementById('advisor')!;
const advisorToggleBtn = document.getElementById('advisor-toggle')!;
const advisorCloseBtn = document.getElementById('advisor-close')!;

function openAdvisor(): void {
  advisorEl.classList.remove('hidden');
  advisorEl.classList.add('flex');
  document.body.style.overflow = 'hidden';
}

function closeAdvisor(): void {
  advisorEl.classList.add('hidden');
  advisorEl.classList.remove('flex');
  document.body.style.overflow = '';
}

advisorToggleBtn.addEventListener('click', openAdvisor);
advisorCloseBtn.addEventListener('click', closeAdvisor);

// Close advisor when clicking backdrop (mobile only)
advisorEl.addEventListener('click', (e: MouseEvent) => {
  if (e.target === advisorEl) {
    closeAdvisor();
  }
});

function updateStats(): void {
  // Only update when transitioning to complete
  if (gameState.phase === 'complete' && lastPhase !== 'complete') {
    gameState.playerHands.forEach((hand, index) => {
      const bet = currentBets[index] || BET_AMOUNT;
      if (hand.result === 'win') {
        stats.wins++;
        bankroll += bet * 2; // return bet + winnings
      } else if (hand.result === 'blackjack') {
        stats.wins++;
        stats.blackjacks++;
        bankroll += bet + bet * 1.5; // return bet + 3:2 payout
      } else if (hand.result === 'lose') {
        stats.losses++;
        // bet already deducted
      } else if (hand.result === 'push') {
        stats.pushes++;
        bankroll += bet; // return bet
      }
    });
  }
  lastPhase = gameState.phase;
}

function renderStats(): void {
  const total = stats.wins + stats.losses + stats.pushes;
  const winRate = total > 0 ? Math.round((stats.wins / total) * 100) : 0;
  statsEl.innerHTML = `
    <div class="stat"><span class="stat-value">${stats.wins}</span> W</div>
    <div class="stat"><span class="stat-value">${stats.losses}</span> L</div>
    <div class="stat"><span class="stat-value">${stats.pushes}</span> P</div>
    <div class="stat-divider"></div>
    <div class="stat"><span class="stat-value">${winRate}%</span> Win Rate</div>
  `;
}

function render(): void {
  // Render dealer cards
  const hideDealer = !gameState.dealerRevealed;
  renderCardsToElement(dealerCardsEl, gameState.dealerHand, hideDealer, true);

  // Dealer score
  if (gameState.dealerHand.length > 0) {
    if (hideDealer) {
      dealerScoreEl.textContent = `(${getDealerScore(gameState)})`;
    } else {
      dealerScoreEl.textContent = `(${getDealerScore(gameState, true)})`;
    }
  } else {
    dealerScoreEl.textContent = '';
  }

  // Render player hands
  playerHandsEl.innerHTML = '';
  gameState.playerHands.forEach((hand, index) => {
    const handDiv = document.createElement('div');
    handDiv.className = 'hand';
    if (index === gameState.activeHandIndex && gameState.phase === 'playing') {
      handDiv.classList.add('active');
    }

    const cardsDiv = document.createElement('div');
    cardsDiv.className = 'cards';
    renderCardsToElement(cardsDiv, hand.cards);
    handDiv.appendChild(cardsDiv);

    if (hand.result) {
      const resultSpan = document.createElement('div');
      resultSpan.className = 'hand-score';
      resultSpan.textContent = formatResult(hand.result);
      handDiv.appendChild(resultSpan);
    }
    playerHandsEl.appendChild(handDiv);
  });

  // Player score summary
  if (gameState.playerHands.length === 1) {
    playerScoreEl.textContent = `(${getPlayerScore(gameState)})`;
  } else {
    playerScoreEl.textContent = '';
  }

  // Message
  if (gameState.phase === 'complete') {
    const results = gameState.playerHands.map(h => h.result);
    const allWin = results.every(r => r === 'win' || r === 'blackjack');
    const allLose = results.every(r => r === 'lose');

    if (allWin) {
      messageEl.textContent = 'You win!';
      messageEl.className = 'win';
    } else if (allLose) {
      messageEl.textContent = 'Dealer wins!';
      messageEl.className = 'lose';
    } else {
      messageEl.textContent = 'Round complete';
      messageEl.className = '';
    }
  } else if (gameState.phase === 'betting') {
    messageEl.textContent = 'Press New Game to start';
    messageEl.className = '';
  } else {
    messageEl.textContent = '';
    messageEl.className = '';
  }

  // Button states
  const playing = gameState.phase === 'playing';
  const activeHand = gameState.playerHands[gameState.activeHandIndex];
  const canDouble = playing && activeHand?.cards.length === 2 && bankroll >= currentBets[gameState.activeHandIndex];

  hitBtn.disabled = !playing || isDealing;
  standBtn.disabled = !playing || isDealing;
  doubleBtn.disabled = !canDouble || isDealing;
  splitBtn.disabled = !playing || !canPlayerSplit(gameState) || isDealing || bankroll < BET_AMOUNT;
  dealBtn.disabled = playing || isDealing || bankroll < BET_AMOUNT;

  // Clear button highlights
  hitBtn.classList.remove('recommended');
  standBtn.classList.remove('recommended');
  doubleBtn.classList.remove('recommended');
  splitBtn.classList.remove('recommended');

  // Render bankroll
  const totalBet = currentBets.reduce((a, b) => a + b, 0);
  bankrollEl.innerHTML = `<span class="bankroll-amount">$${bankroll}</span> | Bet: $${totalBet}`;

  // Strategy advice
  if (playing && gameState.dealerHand.length > 0) {
    const activeHand = gameState.playerHands[gameState.activeHandIndex];
    const dealerUpCard = gameState.dealerHand[0];
    const advice = getAdvice(activeHand.cards, dealerUpCard, canPlayerSplit(gameState));

    adviceEl.textContent = formatAdvice(advice);
    adviceEl.className = advice.action;
    adviceReasonEl.textContent = advice.reason;

    // Highlight recommended button
    if (advice.action === 'double' && canDouble) {
      doubleBtn.classList.add('recommended');
    } else if (advice.action === 'hit' || (advice.action === 'double' && !canDouble)) {
      hitBtn.classList.add('recommended');
    } else if (advice.action === 'stand') {
      standBtn.classList.add('recommended');
    } else if (advice.action === 'split') {
      splitBtn.classList.add('recommended');
    }
  } else {
    adviceEl.textContent = '-';
    adviceEl.className = '';
    adviceReasonEl.textContent = 'Deal to start';
  }

  // Update and render stats
  updateStats();
  renderStats();
}

function formatResult(result: string): string {
  switch (result) {
    case 'win':
      return 'WIN';
    case 'lose':
      return 'BUST';
    case 'push':
      return 'PUSH';
    case 'blackjack':
      return 'BLACKJACK!';
    default:
      return result;
  }
}

hitBtn.addEventListener('click', () => {
  gameState = hit(gameState);
  render();
});

standBtn.addEventListener('click', () => {
  gameState = stand(gameState);
  render();
});

doubleBtn.addEventListener('click', () => {
  if (gameState.phase !== 'playing') return;
  const handIndex = gameState.activeHandIndex;
  const bet = currentBets[handIndex];

  // Double the bet
  bankroll -= bet;
  currentBets[handIndex] = bet * 2;

  // Take one card then stand
  gameState = hit(gameState);
  if (gameState.phase === 'playing') {
    gameState = stand(gameState);
  }
  render();
});

splitBtn.addEventListener('click', () => {
  // Deduct additional bet for split hand
  bankroll -= BET_AMOUNT;
  currentBets.splice(gameState.activeHandIndex + 1, 0, BET_AMOUNT);

  gameState = split(gameState);
  render();
});

async function dealAnimated(): Promise<void> {
  if (isDealing || bankroll < BET_AMOUNT) return;

  isDealing = true;

  // Place bet
  bankroll -= BET_AMOUNT;
  currentBets = [BET_AMOUNT];

  gameState = createInitialState();
  gameState.phase = 'playing';
  render();

  // Deal cards one by one: player, dealer, player, dealer
  await delay(DEAL_DELAY);
  gameState.playerHands[0].cards.push(drawCard(gameState));
  render();

  await delay(DEAL_DELAY);
  gameState.dealerHand.push(drawCard(gameState));
  render();

  await delay(DEAL_DELAY);
  gameState.playerHands[0].cards.push(drawCard(gameState));
  render();

  await delay(DEAL_DELAY);
  gameState.dealerHand.push(drawCard(gameState));
  render();

  // Check for blackjack after all cards dealt
  gameState = checkForBlackjack(gameState);
  isDealing = false;
  render();
}

dealBtn.addEventListener('click', dealAnimated);

// Initial render
render();
