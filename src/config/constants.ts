export const TILE_SIZE = 16;

export const SPRITE_SIZE = {
  pacman: 10,
  ghost: 11,
} as const;

export const SPEED = {
  pacman: 1,
  ghost: 1,
} as const;

export const PACMAN_PORTAL_BLINK = {
  durationMs: 1500,
  intervalMs: 120,
} as const;

export const CAMERA = {
  zoom: 5,
  followLerp: { x: 0.09, y: 0.09 },
} as const;

export const COARSE_POINTER_MEDIA_QUERY = '(hover: none) and (pointer: coarse)';
export const MOBILE_SWIPE_THRESHOLD_PX = 18;
export const MOBILE_SWIPE_AXIS_LOCK_RATIO = 1.2;
export const MOBILE_TAP_MAX_DELTA_PX = 10;

export const INITIAL_LIVES = 3;
export const GHOST_JAIL_RELEASE_DELAY_MS = 5000;
export const GHOST_JAIL_RELEASE_INTERVAL_MS = 900;
export const GHOST_JAIL_MOVE_SPEED = 0.5;
export const GHOST_JAIL_RELEASE_ALIGN_TWEEN_MS = 260;
export const GHOST_JAIL_RELEASE_TWEEN_MS = 650;

export const COLLECTIBLE_CONFIG: Record<
  number,
  {
    texture: string;
    size: number;
    score: number;
  }
> = {
  0: { texture: 'point', size: 2.5, score: 10 },
  1: { texture: 'point', size: 4, score: 50 },
  2: { texture: 'cherry', size: 4, score: 100 },
  3: { texture: 'strawberry', size: 4, score: 150 },
  4: { texture: 'banana', size: 4, score: 200 },
  5: { texture: 'pear', size: 4, score: 250 },
  6: { texture: 'heart', size: 4, score: 300 },
};
