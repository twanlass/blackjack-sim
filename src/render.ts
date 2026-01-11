import { Card, SUIT_SYMBOLS } from './deck';

// ASCII card template (7 lines x 9 chars)
function renderCard(card: Card): string[] {
  const suit = SUIT_SYMBOLS[card.suit];
  const rank = card.rank.padEnd(2, ' ');
  const rankRight = card.rank.padStart(2, ' ');

  return [
    '\u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510',
    `\u2502${rank}     \u2502`,
    '\u2502       \u2502',
    `\u2502   ${suit}   \u2502`,
    '\u2502       \u2502',
    `\u2502     ${rankRight}\u2502`,
    '\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518',
  ];
}

function renderCardBack(): string[] {
  return [
    '\u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510',
    '\u2502\u2592\u2592\u2592\u2592\u2592\u2592\u2592\u2502',
    '\u2502\u2592\u2592\u2592\u2592\u2592\u2592\u2592\u2502',
    '\u2502\u2592\u2592\u2592\u2592\u2592\u2592\u2592\u2502',
    '\u2502\u2592\u2592\u2592\u2592\u2592\u2592\u2592\u2502',
    '\u2502\u2592\u2592\u2592\u2592\u2592\u2592\u2592\u2502',
    '\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518',
  ];
}

export function renderCards(cards: Card[], hideSecond: boolean = false, separateFirst: boolean = false): string {
  if (cards.length === 0) return '';

  const renderedCards = cards.map((card, i) => {
    if (hideSecond && i === 1) {
      return renderCardBack();
    }
    return renderCard(card);
  });

  // Combine cards horizontally
  const lines: string[] = [];
  for (let row = 0; row < 7; row++) {
    // Add extra space after first card for dealer hand
    if (separateFirst && renderedCards.length > 1) {
      const firstCard = renderedCards[0][row];
      const restCards = renderedCards.slice(1).map(c => c[row]).join(' ');
      lines.push(firstCard + '      ' + restCards);
    } else {
      lines.push(renderedCards.map(c => c[row]).join(' '));
    }
  }

  return lines.join('\n');
}

function renderSingleCard(card: Card): string {
  const suit = SUIT_SYMBOLS[card.suit];
  const rank = card.rank.padEnd(2, ' ');
  const rankRight = card.rank.padStart(2, ' ');

  return [
    '\u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510',
    `\u2502${rank}     \u2502`,
    '\u2502       \u2502',
    `\u2502   ${suit}   \u2502`,
    '\u2502       \u2502',
    `\u2502     ${rankRight}\u2502`,
    '\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518',
  ].join('\n');
}

function renderSingleCardBack(): string {
  return [
    '\u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510',
    '\u2502\u2592\u2592\u2592\u2592\u2592\u2592\u2592\u2502',
    '\u2502\u2592\u2592\u2592\u2592\u2592\u2592\u2592\u2502',
    '\u2502\u2592\u2592\u2592\u2592\u2592\u2592\u2592\u2502',
    '\u2502\u2592\u2592\u2592\u2592\u2592\u2592\u2592\u2502',
    '\u2502\u2592\u2592\u2592\u2592\u2592\u2592\u2592\u2502',
    '\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518',
  ].join('\n');
}

export function renderCardsToElement(element: HTMLElement, cards: Card[], hideSecond: boolean = false, separateFirst: boolean = false): void {
  element.innerHTML = '';

  cards.forEach((card, i) => {
    const pre = document.createElement('pre');
    pre.className = 'card-display';

    if (hideSecond && i === 1) {
      pre.textContent = renderSingleCardBack();
      pre.classList.add('card-back');
    } else {
      pre.textContent = renderSingleCard(card);
    }

    // Add extra margin after first card for dealer hand
    if (separateFirst && i === 0 && cards.length > 1) {
      pre.classList.add('card-separated');
    }

    element.appendChild(pre);
  });
}
