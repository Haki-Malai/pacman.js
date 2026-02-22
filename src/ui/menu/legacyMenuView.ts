type LegacyMenuStage = 'idle' | 'intro' | 'menu' | 'starting';

type LegacyButtonKind = 'start' | 'options' | 'exit';

interface LegacyMenuButtonParts {
  kind: LegacyButtonKind;
  prefix: string;
  accent: string;
  suffix: string;
}

export interface LegacyMenuView {
  root: HTMLElement;
  startButton: HTMLButtonElement;
  optionsButton: HTMLButtonElement;
  exitButton: HTMLButtonElement;
  statusLabel: HTMLParagraphElement;
}

const LEGACY_AUTHOR_NAME = 'HAKI MALAI';
const LEGACY_AUTHOR_LETTER_IN_DURATIONS = [
  '1.2s',
  '1.1s',
  '0.9s',
  '1.5s',
  '1.4s',
  '1.3s',
  '1.6s',
  '0.8s',
  '1.7s',
] as const;
const LEGACY_AUTHOR_LETTER_OUT_DURATIONS = [
  '1.8s',
  '1.9s',
  '1.7s',
  '2.3s',
  '2.1s',
  '1.8s',
  '1.8s',
  '1.7s',
  '1.6s',
] as const;
const LEGACY_AUTHOR_LETTER_OUT_DELAY = '0.5s';

export function createLegacyMenuView(stage: LegacyMenuStage): LegacyMenuView {
  const root = createRoot(stage);
  const frame = createFrame();

  frame.append(createClickHint(), createCredits(), createLogo());

  const actions = document.createElement('div');
  actions.className = 'legacy-menu-actions';

  const startButton = createButton({
    kind: 'start',
    prefix: 'S',
    accent: 'T',
    suffix: 'ART',
  });

  const optionsButton = createButton({
    kind: 'options',
    prefix: 'OPT',
    accent: 'IO',
    suffix: 'NS',
  });

  const exitButton = createButton({
    kind: 'exit',
    prefix: 'E',
    accent: 'X',
    suffix: 'IT',
  });

  actions.append(startButton, optionsButton, exitButton);

  const statusLabel = document.createElement('p');
  statusLabel.className = 'legacy-menu-status';
  statusLabel.textContent = 'Tap or press Enter to begin.';

  frame.append(actions, statusLabel);
  root.append(frame);

  return {
    root,
    startButton,
    optionsButton,
    exitButton,
    statusLabel,
  };
}

function createRoot(stage: LegacyMenuStage): HTMLElement {
  const root = document.createElement('section');
  root.className = 'legacy-menu-root';
  root.dataset.stage = stage;
  root.dataset.introPhase = 'go';
  root.tabIndex = 0;
  root.setAttribute('aria-label', 'Pac-Man start menu');
  return root;
}

function createFrame(): HTMLElement {
  const frame = document.createElement('div');
  frame.className = 'legacy-menu-frame';
  return frame;
}

function createClickHint(): HTMLElement {
  const clickHint = document.createElement('p');
  clickHint.className = 'legacy-click-hint';
  clickHint.textContent = 'Click!';
  return clickHint;
}

function createCredits(): HTMLElement {
  const credit = document.createElement('div');
  credit.className = 'legacy-credit';

  const madeBy = document.createElement('span');
  madeBy.className = 'legacy-credit-made-by';
  madeBy.textContent = 'Made by';

  const author = document.createElement('div');
  author.className = 'legacy-credit-name';

  let letterIndex = 0;

  [...LEGACY_AUTHOR_NAME].forEach((char) => {
    const letter = document.createElement('span');
    if (char.trim().length > 0) {
      const lane = letterIndex % 2 === 0 ? 'legacy-credit-letter--up' : 'legacy-credit-letter--down';
      const inDuration =
        LEGACY_AUTHOR_LETTER_IN_DURATIONS[letterIndex] ?? LEGACY_AUTHOR_LETTER_IN_DURATIONS[0];
      const outDuration =
        LEGACY_AUTHOR_LETTER_OUT_DURATIONS[letterIndex] ?? LEGACY_AUTHOR_LETTER_OUT_DURATIONS[0];

      letter.className = `legacy-credit-letter ${lane}`;
      letter.style.setProperty('--legacy-letter-intro-in-duration', inDuration);
      letter.style.setProperty('--legacy-letter-intro-out-duration', outDuration);
      letter.style.setProperty('--legacy-letter-intro-out-delay', LEGACY_AUTHOR_LETTER_OUT_DELAY);

      letterIndex += 1;
    } else {
      letter.className = 'legacy-credit-space';
    }

    letter.textContent = char;
    author.append(letter);
  });

  credit.append(madeBy, author);
  return credit;
}

function createLogo(): HTMLElement {
  const logo = document.createElement('div');
  logo.className = 'legacy-logo';

  const pac = createLogoSprite('/assets/sprites/Pac.png', 'Pac');
  pac.classList.add('legacy-logo-pac');

  const dash = createLogoSprite('/assets/sprites/Dash.png', 'Dash');
  dash.classList.add('legacy-logo-dash');

  const man = createLogoSprite('/assets/sprites/Man.png', 'Man');
  man.classList.add('legacy-logo-man');

  logo.append(pac, dash, man);
  return logo;
}

function createLogoSprite(src: string, alt: string): HTMLImageElement {
  const image = document.createElement('img');
  image.className = 'legacy-logo-sprite';
  image.src = src;
  image.alt = alt;
  image.draggable = false;
  return image;
}

function createButton(parts: LegacyMenuButtonParts): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `legacy-menu-button legacy-menu-button--${parts.kind}`;

  const prefix = document.createElement('span');
  prefix.textContent = parts.prefix;

  const accent = document.createElement('span');
  accent.className = 'legacy-menu-accent';
  accent.textContent = parts.accent;

  const suffix = document.createElement('span');
  suffix.textContent = parts.suffix;

  button.append(prefix, accent, suffix);
  return button;
}
