import Phaser from 'phaser';
import { js as EasyStar } from 'easystarjs';
import { GridManager } from '../GridManager';
import { TILE_SIZE } from '../scenes/GameScene';
import { useGameStore } from '../../store/gameStore';

export type CustomerState = 'SPAWNED' | 'WALKING_TO_DOOR' | 'EVALUATING' | 'WALKING_TO_MACHINE' | 'PLAYING' | 'LEAVING';

export class Customer extends Phaser.GameObjects.Container {
  public currentState: CustomerState = 'SPAWNED';
  private sprite: Phaser.GameObjects.Sprite;
  public targetMachine: string | null = null;
  private easyStar: EasyStar;
  private gridManager: GridManager;
  private currentPath: { x: number, y: number }[] = [];
  private moveSpeed: number = 60; // pixels per second
  public budget: number;
  public patience: number;
  private thoughtBubble: Phaser.GameObjects.Text;
  private gridOffset: number;

  constructor(scene: Phaser.Scene, x: number, y: number, easyStar: EasyStar, gridManager: GridManager, gridOffset: number) {
    super(scene, x, y);
    this.gridOffset = gridOffset;

    this.easyStar = easyStar;
    this.gridManager = gridManager;
    this.budget = Phaser.Math.Between(5, 30);
    this.patience = Phaser.Math.Between(50, 100);

    this.sprite = scene.add.sprite(0, 0, 'customer');
    this.add(this.sprite);

    this.thoughtBubble = scene.add.text(0, -20, '', { fontSize: '12px', color: '#fff', backgroundColor: '#000' });
    this.thoughtBubble.setOrigin(0.5, 1);
    this.add(this.thoughtBubble);

    scene.add.existing(this);

    this.think();
  }

  setThought(text: string) {
    this.thoughtBubble.setText(text);
    setTimeout(() => {
      if (this.scene) this.thoughtBubble.setText('');
    }, 2000);
  }

  think() {
    switch (this.currentState) {
      case 'SPAWNED':
        this.findDoor();
        break;
      case 'EVALUATING':
        this.findMachine();
        break;
      case 'LEAVING':
        this.leave();
        break;
    }
  }

  findDoor() {
    const objects = this.gridManager.getAllObjects().objects;
    const doors = objects.filter(o => o.type === 'door');

    if (doors.length === 0) {
      this.setThought("No door!");
      setTimeout(() => this.think(), 2000);
      return;
    }

    // Go to first door for simplicity
    const door = doors[0];
    this.currentState = 'WALKING_TO_DOOR';
    this.calculatePath(this.x, this.y, door.x, door.y, () => {
      // Reached door, check entry fee
      const store = useGameStore.getState();
      const fee = store.globalEntryFee;

      if (fee > this.budget) {
        this.setThought("Too expensive!");
        store.addReputation(-1); // Penalty for high prices
        this.currentState = 'LEAVING';
        this.think();
      } else {
        if (fee > 0) {
           store.addMoney(fee);
           this.budget -= fee;
           this.setThought("Paid entry");
        }

        // Wait a little before evaluating machines
        setTimeout(() => {
          if (!this.scene) return;
          this.currentState = 'EVALUATING';
          this.think();
        }, 500);
      }
    });
  }

  findMachine() {
    const objects = this.gridManager.getAllObjects().objects;
    const machines = objects.filter(o => o.type.startsWith('arcade_'));

    if (machines.length === 0) {
      this.setThought("No games?");
      this.currentState = 'LEAVING';
      this.think();
      return;
    }

    // Pick random machine
    const machine = machines[Phaser.Math.Between(0, machines.length - 1)];
    this.targetMachine = machine.id;
    this.currentState = 'WALKING_TO_MACHINE';

    // Find an adjacent tile to the machine to stand on
    const adjacent = [
      { x: machine.x, y: machine.y + TILE_SIZE },
      { x: machine.x, y: machine.y - TILE_SIZE },
      { x: machine.x + TILE_SIZE, y: machine.y },
      { x: machine.x - TILE_SIZE, y: machine.y }
    ];

    // Try to find a walkable adjacent tile
    let targetX = machine.x;
    let targetY = machine.y + TILE_SIZE; // Default below

    for (let pos of adjacent) {
        if (this.gridManager.isWalkable(pos.x, pos.y)) {
            targetX = pos.x;
            targetY = pos.y;
            break;
        }
    }


    this.calculatePath(this.x, this.y, targetX, targetY, () => {
      this.currentState = 'PLAYING';
      this.playGame();
    });
  }

  playGame() {
    if (!this.targetMachine) {
       this.currentState = 'LEAVING';
       this.think();
       return;
    }

    const store = useGameStore.getState();
    const price = store.getMachinePrice(this.targetMachine);

    if (price > this.budget) {
       this.setThought("Can't afford!");
       this.currentState = 'LEAVING';
       this.think();
       return;
    }

    if (price > this.patience / 5) { // Simple logic: if price is too high compared to patience, angry
       this.setThought("Ripoff!");
       store.addReputation(-2);
       this.currentState = 'LEAVING';
       this.think();
       return;
    }

    this.setThought("Playing!");

    // Pay store
    store.addMoney(price);
    this.budget -= price;

    // Reward for good pricing
    if (price < 3) {
      store.addReputation(1);
    }

    // Simulate playing for a bit
    setTimeout(() => {
      if (!this.scene) return;

      // Play another or leave
      if (this.budget > 2 && Math.random() > 0.3) {
        this.currentState = 'EVALUATING';
      } else {
        this.currentState = 'LEAVING';
      }
      this.think();
    }, Phaser.Math.Between(3000, 7000));
  }

  leave() {
    this.setThought("Bye!");
    // Go back to spawn (or offscreen)
    this.calculatePath(this.x, this.y, 0, -200, () => {
      this.destroy();
    });
  }

  calculatePath(startX: number, startY: number, endX: number, endY: number, onComplete: () => void) {
    const gridX1 = Math.floor(startX / TILE_SIZE) + this.gridOffset;
    const gridY1 = Math.floor(startY / TILE_SIZE) + this.gridOffset;
    const gridX2 = Math.floor(endX / TILE_SIZE) + this.gridOffset;
    const gridY2 = Math.floor(endY / TILE_SIZE) + this.gridOffset;

    this.easyStar.findPath(gridX1, gridY1, gridX2, gridY2, (path) => {
      if (path === null) {
        this.setThought("Can't reach!");
        this.currentState = 'LEAVING';
        setTimeout(() => this.think(), 1000);
      } else {
        this.currentPath = path.map(p => ({
          x: (p.x - this.gridOffset) * TILE_SIZE,
          y: (p.y - this.gridOffset) * TILE_SIZE
        }));
        // Remove start tile
        if (this.currentPath.length > 0) this.currentPath.shift();

        // Setup tween sequence to move along path
        this.moveNextNode(onComplete);
      }
    });
    this.easyStar.calculate();
  }

  moveNextNode(onComplete: () => void) {
    if (this.currentPath.length === 0) {
      onComplete();
      return;
    }

    const nextNode = this.currentPath.shift()!;
    const distance = Phaser.Math.Distance.Between(this.x, this.y, nextNode.x, nextNode.y);
    const duration = (distance / this.moveSpeed) * 1000;

    this.scene.tweens.add({
      targets: this,
      x: nextNode.x,
      y: nextNode.y,
      duration: duration,
      onComplete: () => {
        this.moveNextNode(onComplete);
      }
    });
  }
}
