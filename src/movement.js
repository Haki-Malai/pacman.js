export const DEFAULT_TILE_SIZE = 16;

export function canMove(direction, movedY, movedX, collisionTiles = {}, tileSize = DEFAULT_TILE_SIZE) {
    const current = collisionTiles.current ?? {};
    const down = collisionTiles.down ?? {};
    const right = collisionTiles.right ?? {};

    if (direction === 'up') {
        if (current.up) {
            return movedY < 0 && movedY >= -tileSize;
        }
        return true;
    } else if (direction === 'down') {
        if (down.up) {
            return movedY > 0 && movedY <= tileSize;
        }
        return true;
    } else if (direction === 'right') {
        if (right.left) {
            return movedX > 0 && movedX <= tileSize;
        }
        return true;
    } else if (direction === 'left') {
        if (current.left) {
            return movedX < 0 && movedX >= -tileSize;
        }
        return true;
    }
    return true;
}

export function getAvailableDirections(collisionTiles, currentDirection, tileSize = DEFAULT_TILE_SIZE) {
    const opposites = { up: 'down', down: 'up', left: 'right', right: 'left' };
    const directions = ['up', 'down', 'left', 'right'].filter((direction) => {
        if (direction === opposites[currentDirection]) {
            return false;
        }
        return canMove(direction, 0, 0, collisionTiles, tileSize);
    });
    if (!directions.length && currentDirection && opposites[currentDirection]) {
        const fallback = opposites[currentDirection];
        if (canMove(fallback, 0, 0, collisionTiles, tileSize)) {
            directions.push(fallback);
        }
    }
    return directions;
}

export function applyBufferedDirection(pacman, collisionTiles, tileSize = DEFAULT_TILE_SIZE, canMoveFn = canMove) {
    const current = pacman?.direction?.current;
    const next = pacman?.direction?.next;
    if (!next || next === current) {
        return current;
    }
    const moved = pacman?.moved ?? { x: 0, y: 0 };
    if (moved.x !== 0 || moved.y !== 0) {
        return current;
    }
    if (!['up', 'down', 'left', 'right'].includes(next)) {
        return current;
    }
    if (canMoveFn(next, moved.y ?? 0, moved.x ?? 0, collisionTiles, tileSize)) {
        pacman.direction.current = next;
        if (next === 'left' || next === 'right') {
            pacman.moved.x = 0;
        } else {
            pacman.moved.y = 0;
        }
    }
    return pacman?.direction?.current;
}
