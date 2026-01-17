import Phaser from 'phaser';
import './style.css';

class Game extends Phaser.Scene {
    constructor() {
        super()
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
        this.load.json('levelData', 'assets/mazes/default/data.json');
    }

    create() {
        const SPRITE_WIDTH = 10;
        const SPRITE_HEIGHT = 10;
        this.map = this.make.tilemap({ key: 'maze' });
        this.tiles = this.map.addTilesetImage('tileset', 'tiles', this.tileWidth=16, this.tileHeight=16);
        this.layer = this.map.createLayer(0, this.tiles, 0, 0).setDepth(1);
        this.levelData = this.cache.json.get('levelData');
        
        // Pacman sprite
        this.pacman = this.physics.add.sprite(this.map.tileToWorldX(this.levelData.startsXAt)+SPRITE_WIDTH, this.map.tileToWorldY(this.levelData.startsYAt)+SPRITE_HEIGHT, 'pacman').setDepth(2);
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
        this.ghosts = new Array(this.levelData.amountOfGhosts)
        const divideBy4 = this.ghosts.length/4; // So there are almost the same amount of ghosts from a certain type
        for (let i = 0; i < this.ghosts.length; i++) {
        window.addEventListener('keydown', (e) => { //for testing
            console.log(e.keyCode) //72 = H
            if (e.keyCode == 72) this.ghosts[i].state.scared = !this.ghosts[i].state.scared;
        });
            // Find random box in prison
            var randomIntegerTemp = Math.floor(Math.random() * (this.levelData.prisonEndX - this.levelData.prisonStartX)) + this.levelData.prisonStartX;
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
            var temp = this.ghostGroup.create(this.map.tileToWorldX(randomIntegerTemp)+SPRITE_WIDTH, this.map.tileToWorldY(this.levelData.prisonY)+SPRITE_HEIGHT, tempKey);
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

        for (let i = 2; i < this.levelData.pointTypesGrid.length+1; i++) {
            for (let j = 2; j < this.levelData.pointTypesGrid[0].length+1; j++) {
                if (shouldAddPoint(this.layer.getTileAt(j, i), j, i, this.levelData)) {
                    switch (this.levelData.pointTypesGrid[i-2][j-2]) {
                        case 0:
                            var temp = this.points.create(this.map.tileToWorldX(j)+10, this.map.tileToWorldY(i)+10, 'point');
                            temp.displayHeight = 2.5;
                            temp.displayWidth = 2.5;
                            break;
                        case 1:
                            var temp = this.points.create(this.map.tileToWorldX(j)+10, this.map.tileToWorldY(i)+10, 'point');
                            temp.displayHeight = 4;
                            temp.displayWidth = 4;
                            break;
                        case 2:
                            var temp = this.points.create(this.map.tileToWorldX(j)+10, this.map.tileToWorldY(i)+10, 'cherry');
                            temp.displayHeight = 4;
                            temp.displayWidth = 4;
                            break;
                        case 3:
                            var temp = this.points.create(this.map.tileToWorldX(j)+10, this.map.tileToWorldY(i)+10, 'strawberry');
                            temp.displayHeight = 4;
                            temp.displayWidth = 4;
                            break;
                        case 4:
                            var temp = this.points.create(this.map.tileToWorldX(j)+10, this.map.tileToWorldY(i)+10, 'banana');
                            temp.displayHeight = 4;
                            temp.displayWidth = 4;
                            break;
                        case 5:
                            var temp = this.points.create(this.map.tileToWorldX(j)+10, this.map.tileToWorldY(i)+10, 'pear');
                            temp.displayHeight = 4;
                            temp.displayWidth = 4;
                            break;
                        case 6:
                            var temp = this.points.create(this.map.tileToWorldX(j)+10, this.map.tileToWorldY(i)+10, 'heart');
                            temp.displayHeight = 4;
                            temp.displayWidth = 4;
                            break;
                    }
                }
            }
        }

        this.physics.add.overlap(this.pacman, this.points, eatPoint, null, this);

        this.camera = this.camera = this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
        this.camera.zoomTo(5);
        this.cameras.main.startFollow(this.pacman, true, 0.09, 0.09);
        
        this.cursors = this.input.keyboard.createCursorKeys();


        function shouldAddPoint(tile, x, y, levelData) {
            if ((tile.index != 15 || tile.rotation !=0) && (tile.index != 16 || tile.rotation !=0) && (tile.index != 24 || tile.rotation !=0) && (tile.index != 25 || tile.rotation !=0) && (tile.index != 26 || tile.rotation !=0) && (tile.index != 27 || tile.rotation !=0) && (tile.index != 28 || tile.rotation !=0)){
                if (x != levelData.startsXAt || y != levelData.startsYAt) 
                    return true;
            } else {
                return false;
            }
        }

        function eatPoint(pacman, point) { // Causion! Don't remove 'pacman' even if it's unused!
            point.disableBody(true, true);
            this.pacman.play('eat');
        }
    }
    update(time, delta) {
        const WEIRD_TILE_ROTATION = 4.71238898038469;
        // Moves the ghosts
        for (let i = 0; i < this.ghosts.length; i++) {
            if (moving && !this.ghosts[i].state.soonFree) {
                this.ghosts[i].state.soonFree = true;
                setTimeout(() => {this.ghosts[i].state.free = true}, 5000);
            }
            // Check if the animation is set, otherwise it will reset it before it loops
            if (this.ghosts[i].state.scared && this.ghosts[i].state.animation != 'scared') {
                this.ghosts[i].play('scaredIdle');
                this.ghosts[i].state.animation = 'scared';
                this.ghosts[i].speed = 0.5;
            } else if (this.ghosts[i].state.animation === 'scared' && !this.ghosts[i].state.scared) {
                this.ghosts[i].play(this.ghosts[i].key + 'Idle');
                this.ghosts[i].state.animation = 'default';
                this.ghosts[i].speed = 1;
            }
            var collisionTiles = {
                current : this.layer.getTileAtWorldXY(this.ghosts[i].x, this.ghosts[i].y, true, this.camera).index,
                currentRotation : this.layer.getTileAtWorldXY(this.ghosts[i].x, this.ghosts[i].y, true, this.camera).rotation,
                right : this.layer.getTileAtWorldXY(this.ghosts[i].x + 16, this.ghosts[i].y, true, this.camera).index,
                rightRotation : this.layer.getTileAtWorldXY(this.ghosts[i].x + 16, this.ghosts[i].y, true, this.camera).rotation,
                down : this.layer.getTileAtWorldXY(this.ghosts[i].x, this.ghosts[i].y + 16, true, this.camera).index,
                downRotation : this.layer.getTileAtWorldXY(this.ghosts[i].x, this.ghosts[i].y + 16, true, this.camera).rotation
            };
            // Check if the ghost is in jail...
            if (this.ghosts[i].state.free) {
                // Just like below, checks if it should ad to the sprites x or y
                if (canMove(this.ghosts[i].direction, this.ghosts[i].moved.y, this.ghosts[i].moved.x, collisionTiles)) {
                    // Also change to turn change direction when possible and not only when it's necessery
                    if (this.ghosts[i].moved.y === 0 && this.ghosts[i].moved.x === 0) {
                        if (collisionTiles.current === 2 && (collisionTiles.currentRotation === 0 || collisionTiles.currentRotation === WEIRD_TILE_ROTATION)) {
                            if (Math.floor(Math.random()*2) === 1 && i % 2 === 0) {
                                this.ghosts[i].direction = 'up';
                            }
                        }
                        if ((collisionTiles.down === 18 && collisionTiles.downRotation === WEIRD_TILE_ROTATION) || (collisionTiles.down === 2 && collisionTiles.downRotation === 0)) {
                            if (Math.floor(Math.random()*2) === 1 && i % 2 === 1) {
                                this.ghosts[i].direction = 'down';
                            }
                        }
                        if ((collisionTiles.current === 19 && collisionTiles.currentRotation === 0)) {
                            if (Math.floor(Math.random()*2) === 1 && i % 2 === 0) {
                                this.ghosts[i].direction = 'left';
                            }
                        }
                        if ((collisionTiles.right === 18 && collisionTiles.rightRotation === 0)) {
                            if (Math.floor(Math.random()*2) === 1 && i % 2 === 1) {
                                this.ghosts[i].direction = 'right';
                            }
                        }
                    }
                    if (this.ghosts[i].direction === 'right') {
                        this.ghosts[i].x += this.ghosts[i].speed;
                        this.ghosts[i].moved.x += this.ghosts[i].speed;
                    }
                    else if (this.ghosts[i].direction === 'left') {
                        this.ghosts[i].x -= this.ghosts[i].speed;
                        this.ghosts[i].moved.x -= this.ghosts[i].speed;
                    }
                    else if (this.ghosts[i].direction === 'up') {
                        this.ghosts[i].y -= this.ghosts[i].speed;
                        this.ghosts[i].moved.y -= this.ghosts[i].speed;
                    }
                    else if (this.ghosts[i].direction === 'down') {
                        this.ghosts[i].y += this.ghosts[i].speed;
                        this.ghosts[i].moved.y += this.ghosts[i].speed;
                    }
                } else if (this.ghosts[i].moved.y === 0, this.ghosts[i].moved.x === 0) {
                    // When not able to move in that direction, choose a random one but not one that is the opposite direction because it can look akward
                    if (this.ghosts[i].direction == 'right' || this.ghosts[i].direction == 'left') {
                        const DIRECTIONS = ['up', 'down'];
                        do{
                            var tempRandomInteger = Math.floor(Math.random() * 2);
                            this.ghosts[i].direction = DIRECTIONS[tempRandomInteger];
                        } while (!canMove(this.ghosts[i].direction, this.ghosts[i].moved.y, this.ghosts[i].moved.x, collisionTiles));
                    } else if (this.ghosts[i].direction == 'up' || this.ghosts[i].direction == 'down') {
                        const DIRECTIONS = ['right', 'left'];
                        do{
                            var tempRandomInteger = Math.floor(Math.random() * 2);
                            this.ghosts[i].direction = DIRECTIONS[tempRandomInteger];
                        } while (!canMove(this.ghosts[i].direction, this.ghosts[i].moved.y, this.ghosts[i].moved.x, collisionTiles));
                    }
                }           
            } else {  // Jail movement
                if (this.ghosts[i].moved.y === 0 && this.ghosts[i].moved.x === 0) {
                    if (collisionTiles.current === 15 && collisionTiles.currentRotation === 0 && this.ghosts[i].direction === 'left') {
                        this.ghosts[i].direction = 'right';
                    }
                    if (collisionTiles.right === 10 && collisionTiles.rightRotation === WEIRD_TILE_ROTATION && this.ghosts[i].direction === 'right') {
                        this.ghosts[i].direction = 'left';
                    }
                }
                if (this.ghosts[i].direction === 'right') {
                    this.ghosts[i].x += this.ghosts[i].speed;
                    this.ghosts[i].moved.x += this.ghosts[i].speed;
                } else if (this.ghosts[i].direction === 'left') {
                    this.ghosts[i].x -= this.ghosts[i].speed;
                    this.ghosts[i].moved.x -= this.ghosts[i].speed;
                } else if (this.pacman.direction.current === 'up') {
                this.pacman.y -= this.ghosts[i].speed;
                this.pacman.moved.y -= this.ghosts[i].speed;
                } else if (this.pacman.direction.current === 'down') {
                    this.pacman.y += this.ghosts[i].speed;
                    this.pacman.moved.y += this.ghosts[i].speed;
                }
            }
            // Reset values of moved
            if (Math.abs(this.ghosts[i].moved.y) === 16) {
                this.ghosts[i].moved.y = 0;
            }
            if (Math.abs(this.ghosts[i].moved.x) === 16) {
                this.ghosts[i].moved.x = 0;
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

        // After 16 moved it means that we traveled a full box
        if (Math.abs(this.pacman.moved.y) === 16) {
            this.pacman.moved.y = 0;
        }
        if (Math.abs(this.pacman.moved.x) === 16) {
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
        var collisionTiles = {
            current : this.layer.getTileAtWorldXY(this.pacman.x, this.pacman.y, true, this.camera).index,
            currentRotation : this.layer.getTileAtWorldXY(this.pacman.x, this.pacman.y, true, this.camera).rotation,
            right : this.layer.getTileAtWorldXY(this.pacman.x + 16, this.pacman.y, true, this.camera).index,
            rightRotation : this.layer.getTileAtWorldXY(this.pacman.x + 16, this.pacman.y, true, this.camera).rotation,
            down : this.layer.getTileAtWorldXY(this.pacman.x, this.pacman.y + 16, true, this.camera).index,
            downRotation : this.layer.getTileAtWorldXY(this.pacman.x, this.pacman.y + 16, true, this.camera).rotation
        };
        
        // Here we check if we can set the current direction same to the next
        if (this.pacman.direction.current != this.pacman.direction.next) {
            if ((this.pacman.direction.next === 'left' || this.pacman.direction.next === 'right') && this.pacman.moved.x === 0 && this.pacman.moved.y === 0) {
                if (canMove(this.pacman.direction.next, this.pacman.moved.y, this.pacman.moved.x, collisionTiles)) {
                    this.pacman.direction.current = this.pacman.direction.next;
                    this.pacman.moved.x = 0;
                }
            }
            else if (((this.pacman.direction.next === 'up') || (this.pacman.direction.next === 'down')) && (this.pacman.moved.y === 0) && (this.pacman.moved.x === 0)) {
                if (canMove(this.pacman.direction.next, this.pacman.moved.y, this.pacman.moved.x, collisionTiles)) {
                    this.pacman.direction.current = this.pacman.direction.next;
                    this.pacman.moved.y = 0;
                }
            }
        }
        
        if (canMove(this.pacman.direction.current, this.pacman.moved.y, this.pacman.moved.x, collisionTiles)) {
            if (moving === false) {
                return false;
            }
            if (this.pacman.direction.current === 'right') {
                this.pacman.x += 1;
                this.pacman.moved.x += 1;
            }
            else if (this.pacman.direction.current === 'left') {
                this.pacman.x -= 1;
                this.pacman.moved.x -= 1;
            }
            else if (this.pacman.direction.current === 'up') {
                this.pacman.y -= 1;
                this.pacman.moved.y -= 1;
            }
            else if (this.pacman.direction.current === 'down') {
                this.pacman.y += 1;
                this.pacman.moved.y += 1;
            }
        }
        
        function canMove(direction, movedY, movedX, collisionTiles) {
            if (direction === 'up') {
                if (((collisionTiles.current === 1 || collisionTiles.current === 3 || collisionTiles.current === 4 || collisionTiles.current === 9 || collisionTiles.current === 18 || collisionTiles.current === 23) && collisionTiles.currentRotation === 0) || ((collisionTiles.current === 9 || collisionTiles.current === 10) && collisionTiles.currentRotation > 4)) {
                    if ((movedY >= -16) && (movedY < 0)) {
                        return true;
                    } else {
                        return false;
                    }
                } else {
                    return true;
                }
            } else if (direction === 'down') {
                if (((collisionTiles.down === 3 || collisionTiles.down === 4 || collisionTiles.down === 15 || collisionTiles.down === 16 || collisionTiles.down === 18 || collisionTiles.down === 1 || collisionTiles.down === 24 || collisionTiles.down === 25 || collisionTiles.down === 26 || collisionTiles.down === 27 || collisionTiles.down === 28) && collisionTiles.downRotation === 0) || ((collisionTiles.down === 9 || collisionTiles.down === 10) && collisionTiles.downRotation > 4)) {
                    if ((movedY <= 16) && (movedY > 0)) {
                        return true;
                    } else {
                        return false;
                    }
                } else {
                    return true;
                }
            } else if (direction === 'right') {
                if (((collisionTiles.right === 1 || collisionTiles.right === 15 || collisionTiles.right === 24) && collisionTiles.rightRotation === 0) || ((collisionTiles.right === 3 || collisionTiles.right === 4 || collisionTiles.right === 10 || collisionTiles.right === 18 || collisionTiles.right === 23) && collisionTiles.rightRotation > 4)) {
                    if ((movedX <= 16) && (movedX > 0)) {
                        return true;
                    } else {
                        return false;
                    }
                } else {
                    return true;
                }
            } else if (direction === 'left') {
                if (((collisionTiles.current === 1 || collisionTiles.current === 16 || collisionTiles.current === 28) && collisionTiles.currentRotation === 0) || ((collisionTiles.current === 3 || collisionTiles.current == 4 || collisionTiles.current == 10 || collisionTiles.current == 18) && collisionTiles.currentRotation > 4)) {
                    if ((movedX >= -16) && (movedX < 0)) {
                        return true;
                    } else {
                        return false;
                    }
                } else {
                    return true;
                }
            }
        }
    }
}

var moving = false;

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
const GAME = new Phaser.Game(config);
