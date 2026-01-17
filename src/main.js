import Phaser from 'phaser';
import './style.css';
import { applyBufferedDirection, canMove as canMoveHelper, getAvailableDirections as getAvailableDirectionsHelper } from './movement.js';

class Game extends Phaser.Scene {
    constructor() {
        super()
    }

    getTileProperties(tile) {
        const props = tile?.propertiesOriented ?? tile?.properties ?? {};
        return {
            collides: !!props.collides,
            penGate: !!props.penGate,
            portal: !!props.portal,
            up: !!props.blocksUp,
            down: !!props.blocksDown,
            left: !!props.blocksLeft,
            right: !!props.blocksRight
        };
    }

    prepareCollisionLayer() {
        const normalize = (tile) => {
            const props = tile?.properties ?? {};
            return {
                collides: !!props.collides,
                penGate: !!props.penGate,
                portal: !!props.portal,
                blocksUp: !!props.blocksUp,
                blocksDown: !!props.blocksDown,
                blocksLeft: !!props.blocksLeft,
                blocksRight: !!props.blocksRight
            };
        };
        const orient = (base, tile) => {
            let edges = {
                blocksUp: base.blocksUp,
                blocksRight: base.blocksRight,
                blocksDown: base.blocksDown,
                blocksLeft: base.blocksLeft
            };
            const rotationSteps = ((Math.round((tile?.rotation ?? 0) / (Math.PI / 2)) % 4) + 4) % 4;
            for (let i = 0; i < rotationSteps; i++) {
                edges = {
                    blocksUp: edges.blocksLeft,
                    blocksRight: edges.blocksUp,
                    blocksDown: edges.blocksRight,
                    blocksLeft: edges.blocksDown
                };
            }
            if (tile?.flipX) {
                const left = edges.blocksLeft;
                edges.blocksLeft = edges.blocksRight;
                edges.blocksRight = left;
            }
            if (tile?.flipY) {
                const up = edges.blocksUp;
                edges.blocksUp = edges.blocksDown;
                edges.blocksDown = up;
            }
            return {
                collides: base.collides,
                penGate: base.penGate,
                portal: base.portal,
                ...edges
            };
        };
        this.wallsLayer.forEachTile((tile) => {
            const base = normalize(tile);
            tile.propertiesOriented = orient(base, tile);
        });
    }

    getCollisionTilesFor(entity) {
        const tileSize = this.tileSize ?? 16;
        const offsets = [
            { key: 'current', dx: 0, dy: 0 },
            { key: 'up', dx: 0, dy: -tileSize },
            { key: 'down', dx: 0, dy: tileSize },
            { key: 'left', dx: -tileSize, dy: 0 },
            { key: 'right', dx: tileSize, dy: 0 }
        ];
        const collisionTiles = {};
        offsets.forEach(({ key, dx, dy }) => {
            const tile = this.wallsLayer.getTileAtWorldXY(entity.x + dx, entity.y + dy, true, this.camera);
            collisionTiles[key] = this.getTileProperties(tile);
        });
        return collisionTiles;
    }

    canMove(direction, movedY, movedX, collisionTiles) {
        return canMoveHelper(direction, movedY, movedX, collisionTiles, this.tileSize ?? 16);
    }

    advanceEntity(entity, direction, speed = 1) {
        if (direction === 'right') {
            entity.x += speed;
            entity.moved.x += speed;
        } else if (direction === 'left') {
            entity.x -= speed;
            entity.moved.x -= speed;
        } else if (direction === 'up') {
            entity.y -= speed;
            entity.moved.y -= speed;
        } else if (direction === 'down') {
            entity.y += speed;
            entity.moved.y += speed;
        }
    }

    getAvailableDirections(collisionTiles, currentDirection) {
        return getAvailableDirectionsHelper(collisionTiles, currentDirection, this.tileSize ?? 16);
    }
    
    preload() {
        this.load.image('tiles', 'assets/sprites/Tileset.png');
        this.load.image('point', 'assets/sprites/Point.png');
        this.load.image('banana', 'assets/sprites/Banana.png');
        this.load.image('cherry', 'assets/sprites/Cherry.png');
        this.load.image('heart', 'assets/sprites/Heart.png');
        this.load.image('pear', 'assets/sprites/Pear.png');
        this.load.image('strawberry', 'assets/sprites/Strawberry.png');
        this.load.spritesheet('pacman', 'assets/sprites/PacMan.png', { frameWidth: 85, frameHeight: 91});
        this.load.spritesheet('blinky', 'assets/sprites/Blinky.png', { frameWidth: 85, frameHeight: 91});
        this.load.spritesheet('clyde', 'assets/sprites/Clyde.png', { frameWidth: 85, frameHeight: 91});
        this.load.spritesheet('pinky', 'assets/sprites/Pinky.png', { frameWidth: 85, frameHeight: 91});
        this.load.spritesheet('inky', 'assets/sprites/Inky.png', { frameWidth: 85, frameHeight: 91});
        this.load.spritesheet('scared', 'assets/sprites/Scared.png', { frameWidth: 85, frameHeight: 91});
        this.load.tilemapTiledJSON('maze', 'assets/mazes/default/pacman.json');
    }

    create() {
        const SPRITE_WIDTH = 10;
        const SPRITE_HEIGHT = 10;
        this.map = this.make.tilemap({ key: 'maze' });
        this.tiles = this.map.addTilesetImage('tileset', 'tiles', this.tileWidth=16, this.tileHeight=16);
        this.tileSize = this.map.tileWidth;
        this.floorLayer = this.map.createLayer('Floor', this.tiles, 0, 0).setDepth(0);
        this.wallsLayer = this.map.createLayer('Walls', this.tiles, 0, 0).setDepth(1);
        this.prepareCollisionLayer();
        const getProperty = (obj, name, fallback) => {
            if (!obj || !obj.properties) return fallback;
            const property = obj.properties.find((prop) => prop.name === name);
            return property ? property.value : fallback;
        };
        const spawnLayer = this.map.getObjectLayer('Spawns');
        const dotLayer = this.map.getObjectLayer('Dots');
        const spawnObjects = spawnLayer?.objects ?? [];
        const pacmanSpawn = spawnObjects.find((obj) => obj.type === 'pacman');
        const ghostHome = spawnObjects.find((obj) => obj.type === 'ghost-home');
        const pacmanSpawnX = pacmanSpawn?.x ?? this.map.tileToWorldX(25) + SPRITE_WIDTH;
        const pacmanSpawnY = pacmanSpawn?.y ?? this.map.tileToWorldY(26) + SPRITE_HEIGHT;
        const ghostStartX = getProperty(ghostHome, 'startX', 0);
        const ghostEndX = getProperty(ghostHome, 'endX', 0);
        const ghostY = ghostHome ? Math.round(ghostHome.y / this.map.tileHeight) : 0;
        const ghostCount = getProperty(ghostHome, 'ghostCount', 8);
        
        // Pacman sprite
        this.pacman = this.physics.add.sprite(pacmanSpawnX, pacmanSpawnY, 'pacman').setDepth(2);
        this.pacman.displayWidth = SPRITE_WIDTH;
        this.pacman.displayHeight = SPRITE_HEIGHT;
        this.pacman.moved = {
            x : 0,
            y : 0
        };
        this.pacman.direction = {
            next : 'right',
            current : 'right'
        };
        // Animation sets
        this.anims.create({
            key: 'eat',
            frames: this.anims.generateFrameNames('pacman', {start: 0, end: 3}),
            yoyo: true,
            frameRate: 16
        });

        this.anims.create({
            key: 'scaredIdle',
            frames: this.anims.generateFrameNames('scared', {start: 0, end: 7}),
            yoyo: true,
            frameRate: 4,
            repeat: -1
        });
        this.anims.create({
            key: 'inkyIdle',
            frames: this.anims.generateFrameNames('inky', {start: 0, end: 7}),
            yoyo: true,
            frameRate: 4,
            repeat: -1
        });
        this.anims.create({
            key: 'clydeIdle',
            frames: this.anims.generateFrameNames('clyde', {start: 0, end: 7}),
            yoyo: true,
            frameRate: 4,
            repeat: -1
        });
        this.anims.create({
            key: 'pinkyIdle',
            frames: this.anims.generateFrameNames('pinky', {start: 0, end: 7}),
            yoyo: true,
            frameRate: 4,
            repeat: -1
        });
        this.anims.create({
            key: 'blinkyIdle',
            frames: this.anims.generateFrameNames('blinky', {start: 0, end: 7}),
            yoyo: true,
            frameRate: 4,
            repeat: -1
        });

        // Ghost sprites
        this.ghostGroup = this.physics.add.group();
        this.ghosts = new Array(ghostCount)
        const divideBy4 = this.ghosts.length/4; // So there are almost the same amount of ghosts from a certain type
        for (let i = 0; i < this.ghosts.length; i++) {
        window.addEventListener('keydown', (e) => { //for testing
            console.log(e.keyCode) //72 = H
            if (e.keyCode == 72) this.ghosts[i].state.scared = !this.ghosts[i].state.scared;
        });
            // Find random box in prison
            var randomIntegerTemp = Math.floor(Math.random() * (ghostEndX - ghostStartX)) + ghostStartX;
            // Divide No# of ghosts by 4 so there are 4 of the same with a chance to be 1 less blinky than the others, for example if 7 ghosts 2*inky...1*blinky
            var tempKey
            if (i < divideBy4) {
                tempKey = 'inky';
            } else if (i >= divideBy4 && i < divideBy4*2) {
                tempKey = 'clyde';
            } else if (i >= divideBy4*2 && i < divideBy4*3) {
                tempKey = 'pinky';
            } else {
                tempKey = 'blinky';
            }
            // Use temp for temporary holder for the sprite
            var temp = this.ghostGroup.create(this.map.tileToWorldX(randomIntegerTemp)+SPRITE_WIDTH, this.map.tileToWorldY(ghostY)+SPRITE_HEIGHT, tempKey);
            temp.displayWidth = SPRITE_WIDTH + 1;
            temp.displayHeight = SPRITE_HEIGHT + 1;
            temp.moved = {
                x : 0,
                y : 0
            };
            temp.key = tempKey;
            temp.state = {
                free : true,
                soonFree : false,
                scared : false,
                dead : false,
                animation : 'default'
            };
            temp.speed = 1;
            temp.play(tempKey+'Idle');
            if (Math.floor(Math.random()*2) === 1){ // 50% chance for each direction to start
                temp.direction = 'right';
            } else {
                temp.direction = 'left';
            }
            this.ghosts[i] = temp;
        }

        this.points = this.physics.add.group();
        const dotObjects = dotLayer?.objects ?? [];
        dotObjects.forEach((dot) => {
            const pointType = getProperty(dot, 'pointType', 0);
            let temp;
            switch (pointType) {
                case 0:
                    temp = this.points.create(dot.x, dot.y, 'point');
                    temp.displayHeight = 2.5;
                    temp.displayWidth = 2.5;
                    break;
                case 1:
                    temp = this.points.create(dot.x, dot.y, 'point');
                    temp.displayHeight = 4;
                    temp.displayWidth = 4;
                    break;
                case 2:
                    temp = this.points.create(dot.x, dot.y, 'cherry');
                    temp.displayHeight = 4;
                    temp.displayWidth = 4;
                    break;
                case 3:
                    temp = this.points.create(dot.x, dot.y, 'strawberry');
                    temp.displayHeight = 4;
                    temp.displayWidth = 4;
                    break;
                case 4:
                    temp = this.points.create(dot.x, dot.y, 'banana');
                    temp.displayHeight = 4;
                    temp.displayWidth = 4;
                    break;
                case 5:
                    temp = this.points.create(dot.x, dot.y, 'pear');
                    temp.displayHeight = 4;
                    temp.displayWidth = 4;
                    break;
                case 6:
                    temp = this.points.create(dot.x, dot.y, 'heart');
                    temp.displayHeight = 4;
                    temp.displayWidth = 4;
                    break;
                default:
                    break;
            }
        });

        this.physics.add.overlap(this.pacman, this.points, eatPoint, null, this);

        this.camera = this.camera = this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
        this.camera.zoomTo(5);
        this.cameras.main.startFollow(this.pacman, true, 0.09, 0.09);
        
        this.cursors = this.input.keyboard.createCursorKeys();

        function eatPoint(pacman, point) { // Causion! Don't remove 'pacman' even if it's unused!
            point.disableBody(true, true);
            this.pacman.play('eat');
        }
    }
    update(_time, _delta) {
        // Moves the ghosts
        for (let i = 0; i < this.ghosts.length; i++) {
            const ghost = this.ghosts[i];
            if (moving && !ghost.state.soonFree) {
                ghost.state.soonFree = true;
                setTimeout(() => {ghost.state.free = true}, 5000);
            }
            // Check if the animation is set, otherwise it will reset it before it loops
            if (ghost.state.scared && ghost.state.animation != 'scared') {
                ghost.play('scaredIdle');
                ghost.state.animation = 'scared';
                ghost.speed = 0.5;
            } else if (ghost.state.animation === 'scared' && !ghost.state.scared) {
                ghost.play(ghost.key + 'Idle');
                ghost.state.animation = 'default';
                ghost.speed = 1;
            }
            const collisionTiles = this.getCollisionTilesFor(ghost);
            const canMoveCurrent = this.canMove(ghost.direction, ghost.moved.y, ghost.moved.x, collisionTiles);
            if (ghost.state.free) {
                if (canMoveCurrent) {
                    if (ghost.moved.y === 0 && ghost.moved.x === 0) {
                        const options = this.getAvailableDirections(collisionTiles, ghost.direction);
                        if (options.length) {
                            ghost.direction = options[Math.floor(Math.random() * options.length)];
                        }
                    }
                    this.advanceEntity(ghost, ghost.direction, ghost.speed);
                } else if (ghost.moved.y === 0 && ghost.moved.x === 0) {
                    const perpendicular = ghost.direction === 'right' || ghost.direction === 'left' ? ['up', 'down'] : ['right', 'left'];
                    const options = perpendicular.filter((direction) => this.canMove(direction, ghost.moved.y, ghost.moved.x, collisionTiles));
                    if (options.length) {
                        ghost.direction = options[Math.floor(Math.random() * options.length)];
                    } else {
                        const opposites = { up: 'down', down: 'up', left: 'right', right: 'left' };
                        const fallback = opposites[ghost.direction];
                        if (fallback && this.canMove(fallback, ghost.moved.y, ghost.moved.x, collisionTiles)) {
                            ghost.direction = fallback;
                        }
                    }
                }           
            } else {  // Jail movement
                if (!canMoveCurrent && ghost.moved.y === 0 && ghost.moved.x === 0) {
                    ghost.direction = ghost.direction === 'right' ? 'left' : 'right';
                }
                this.advanceEntity(ghost, ghost.direction, ghost.speed);
            }
            // Reset values of moved
            if (Math.abs(ghost.moved.y) === this.tileSize) {
                ghost.moved.y = 0;
            }
            if (Math.abs(ghost.moved.x) === this.tileSize) {
                ghost.moved.x = 0;
            }
        }

        // Rotates the PacMan
        if (this.pacman.direction.current === 'right') {
            this.pacman.angle = 0;
            if (this.pacman.flipY) this.pacman.flipY = false; 
        } else if (this.pacman.direction.current === 'left' && this.pacman.angle != -180) {
            this.pacman.angle = 180;
            if (!this.pacman.flipY) this.pacman.flipY = true; 
        }
        if (this.pacman.direction.current === 'up' && this.pacman.angle != -90) {
            this.pacman.angle = -90;
        } else if (this.pacman.direction.current === 'down' && this.pacman.angle != 90) {
            this.pacman.angle = 90;
        }

        // After tileSize moved it means that we traveled a full box
        if (Math.abs(this.pacman.moved.y) === this.tileSize) {
            this.pacman.moved.y = 0;
        }
        if (Math.abs(this.pacman.moved.x) === this.tileSize) {
            this.pacman.moved.x = 0;
        }
        
        // Here the direction is set. Only one direction is saved, i find it necessery to save it on an array
        if (this.cursors.left.isDown) {
            this.pacman.direction.next = 'left';
        } else if (this.cursors.right.isDown) {
            this.pacman.direction.next = 'right';
        } else if ((this.cursors.up.isDown)) {
            this.pacman.direction.next = 'up';
        } else if (this.cursors.down.isDown) {
            this.pacman.direction.next = 'down'; 
        }
        
        // Those are needed for checking collision
        const collisionTiles = this.getCollisionTilesFor(this.pacman);
        
        // Here we check if we can set the current direction same to the next
        applyBufferedDirection(
            this.pacman,
            collisionTiles,
            this.tileSize ?? 16,
            (direction) => this.canMove(direction, this.pacman.moved.y, this.pacman.moved.x, collisionTiles)
        );
        
        if (this.canMove(this.pacman.direction.current, this.pacman.moved.y, this.pacman.moved.x, collisionTiles)) {
            if (moving === false) {
                return false;
            }
            this.advanceEntity(this.pacman, this.pacman.direction.current, 1);
        }
    }
}

var moving = true;

window.addEventListener("click", () => moving = !moving);

const config = {
    type: Phaser.WEBGL,
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: '#2d2d2d',
    parent: 'phaser-example',
    physics: {
        default: 'arcade', //impact
        arcade: {
            gravity: 0
        }
    },
    fps: {
        target: 60,
        forceSetTimeOut: true
    },
    pixelArt: true,
    scene: [ Game ]
};
new Phaser.Game(config);
