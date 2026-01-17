import { describe, expect, it, vi } from 'vitest';
import { applyBufferedDirection, canMove } from '../movement.js';

const tileSize = 16;

describe('canMove', () => {
    it('stops entry into a tile that blocks upward movement but allows finishing the step already taken', () => {
        const collisionTiles = {
            current: { up: true },
            down: { up: false },
            right: { left: false },
            left: {}
        };

        expect(canMove('up', 0, 0, collisionTiles, tileSize)).toBe(false);
        expect(canMove('up', -1, 0, collisionTiles, tileSize)).toBe(true);
        expect(canMove('up', -tileSize - 1, 0, collisionTiles, tileSize)).toBe(false);
    });

    it('uses the tile ahead to block downward movement', () => {
        const collisionTiles = {
            current: {},
            down: { up: true },
            right: { left: false },
            left: {}
        };

        expect(canMove('down', 0, 0, collisionTiles, tileSize)).toBe(false);
        expect(canMove('down', 5, 0, collisionTiles, tileSize)).toBe(true);
        expect(canMove('down', tileSize + 1, 0, collisionTiles, tileSize)).toBe(false);
    });

    it('respects walls on neighboring tiles when moving right but allows clear lateral travel otherwise', () => {
        const blockedRight = {
            current: {},
            down: {},
            right: { left: true },
            left: {}
        };
        const clearTiles = {
            current: { left: false },
            down: {},
            right: { left: false },
            left: {}
        };

        expect(canMove('right', 0, 0, blockedRight, tileSize)).toBe(false);
        expect(canMove('right', 0, 8, blockedRight, tileSize)).toBe(true);
        expect(canMove('right', 0, tileSize + 1, blockedRight, tileSize)).toBe(false);
        expect(canMove('left', 0, 0, clearTiles, tileSize)).toBe(true);
    });
});

describe('applyBufferedDirection', () => {
    const collisionTiles = { current: {}, down: {}, right: {}, left: {} };

    it('switches to the buffered direction when centered and the path is open', () => {
        const pacman = { moved: { x: 0, y: 0 }, direction: { current: 'right', next: 'up' } };
        const canMoveSpy = vi.fn(() => true);

        const result = applyBufferedDirection(pacman, collisionTiles, tileSize, canMoveSpy);

        expect(result).toBe('up');
        expect(pacman.direction.current).toBe('up');
        expect(canMoveSpy).toHaveBeenCalledWith('up', 0, 0, collisionTiles, tileSize);
    });

    it('ignores buffered input until pacman is centered on a tile', () => {
        const pacman = { moved: { x: 4, y: 0 }, direction: { current: 'right', next: 'up' } };
        const canMoveSpy = vi.fn(() => true);

        const result = applyBufferedDirection(pacman, collisionTiles, tileSize, canMoveSpy);

        expect(result).toBe('right');
        expect(pacman.direction.current).toBe('right');
        expect(canMoveSpy).not.toHaveBeenCalled();
    });

    it('keeps the current direction if the buffered turn is blocked', () => {
        const pacman = { moved: { x: 0, y: 0 }, direction: { current: 'right', next: 'up' } };
        const canMoveSpy = vi.fn(() => false);

        const result = applyBufferedDirection(pacman, collisionTiles, tileSize, canMoveSpy);

        expect(result).toBe('right');
        expect(pacman.direction.current).toBe('right');
        expect(canMoveSpy).toHaveBeenCalledOnce();
    });
});
