import { GameEvent, gameEvents, getGameState } from '../../../state/gameState';

export class HudOverlayAdapter {
  private readonly container: HTMLDivElement;
  private readonly scoreText: HTMLSpanElement;
  private readonly livesCountText: HTMLSpanElement;
  private readonly livesIcons: HTMLDivElement;
  private readonly onScoreChanged: (_score: number) => void;
  private readonly onLivesChanged: (_lives: number) => void;

  constructor(private readonly mount: HTMLElement) {
    this.mount.querySelector('[data-game-hud]')?.remove();

    this.container = document.createElement('div');
    this.container.className =
      'pointer-events-none absolute inset-x-0 bottom-0 z-50 flex items-center justify-between gap-4 bg-black/90 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-100 sm:text-sm';
    this.container.style.position = 'fixed';
    this.container.style.left = '0';
    this.container.style.right = '0';
    this.container.style.bottom = '0';
    this.container.style.zIndex = '9998';
    this.container.style.pointerEvents = 'none';
    this.container.style.display = 'flex';
    this.container.style.alignItems = 'center';
    this.container.style.justifyContent = 'space-between';
    this.container.style.gap = '1rem';
    this.container.style.padding = '10px 16px';
    this.container.style.background = 'rgba(0, 0, 0, 0.9)';
    this.container.style.borderTop = '1px solid rgba(255, 255, 255, 0.18)';
    this.container.style.color = '#f4f4f5';
    this.container.style.fontSize = '14px';
    this.container.style.fontWeight = '600';
    this.container.style.letterSpacing = '0.12em';
    this.container.style.textTransform = 'uppercase';
    this.container.style.fontFamily = '"Orbitron", ui-sans-serif, system-ui, sans-serif';
    this.container.setAttribute('data-game-hud', 'true');

    const scoreSection = document.createElement('div');
    scoreSection.className = 'flex min-w-0 items-center gap-2';
    scoreSection.style.display = 'flex';
    scoreSection.style.alignItems = 'center';
    scoreSection.style.gap = '0.5rem';
    scoreSection.setAttribute('data-hud-score', 'true');

    const scoreLabel = document.createElement('span');
    scoreLabel.className = 'text-zinc-400';
    scoreLabel.style.color = '#a1a1aa';
    scoreLabel.textContent = 'Score';

    this.scoreText = document.createElement('span');
    this.scoreText.className = 'tabular-nums text-zinc-100';
    this.scoreText.style.color = '#f4f4f5';
    this.scoreText.style.fontVariantNumeric = 'tabular-nums';
    this.scoreText.setAttribute('data-hud-score-value', 'true');

    scoreSection.append(scoreLabel, this.scoreText);

    const livesSection = document.createElement('div');
    livesSection.className = 'flex items-center justify-end gap-2';
    livesSection.style.display = 'flex';
    livesSection.style.alignItems = 'center';
    livesSection.style.justifyContent = 'flex-end';
    livesSection.style.gap = '0.5rem';
    livesSection.setAttribute('data-hud-lives', 'true');

    const livesLabel = document.createElement('span');
    livesLabel.className = 'text-zinc-400';
    livesLabel.style.color = '#a1a1aa';
    livesLabel.textContent = 'Lives';

    this.livesIcons = document.createElement('div');
    this.livesIcons.className = 'flex items-center gap-1';
    this.livesIcons.style.display = 'flex';
    this.livesIcons.style.alignItems = 'center';
    this.livesIcons.style.gap = '0.25rem';
    this.livesIcons.setAttribute('data-hud-lives-icons', 'true');

    this.livesCountText = document.createElement('span');
    this.livesCountText.className = 'tabular-nums text-zinc-300';
    this.livesCountText.style.color = '#d4d4d8';
    this.livesCountText.style.fontVariantNumeric = 'tabular-nums';
    this.livesCountText.setAttribute('data-hud-lives-value', 'true');

    livesSection.append(livesLabel, this.livesIcons, this.livesCountText);
    this.container.append(scoreSection, livesSection);

    const state = getGameState();
    this.setScore(state.score);
    this.setLives(state.lives);

    this.onScoreChanged = (score: number) => {
      this.setScore(score);
    };

    this.onLivesChanged = (lives: number) => {
      this.setLives(lives);
    };

    gameEvents.on(GameEvent.ScoreChanged, this.onScoreChanged);
    gameEvents.on(GameEvent.LivesChanged, this.onLivesChanged);

    this.mount.appendChild(this.container);
  }

  destroy(): void {
    gameEvents.off(GameEvent.ScoreChanged, this.onScoreChanged);
    gameEvents.off(GameEvent.LivesChanged, this.onLivesChanged);
    this.container.remove();
  }

  private setScore(score: number): void {
    this.scoreText.textContent = String(score);
  }

  private setLives(lives: number): void {
    const safeLives = Math.max(0, Math.floor(lives));
    this.livesCountText.textContent = String(safeLives);
    this.livesIcons.replaceChildren();

    for (let i = 0; i < safeLives; i += 1) {
      this.livesIcons.appendChild(this.createHeartIcon());
    }
  }

  private createHeartIcon(): HTMLImageElement {
    const icon = document.createElement('img');
    icon.src = 'assets/sprites/Heart.png';
    icon.alt = '';
    icon.setAttribute('aria-hidden', 'true');
    icon.className = 'h-4 w-4 object-contain';
    icon.style.width = '16px';
    icon.style.height = '16px';
    icon.style.objectFit = 'contain';
    return icon;
  }
}
