import Phaser from 'phaser';
import { js as EasyStar } from 'easystarjs';
import { GridManager } from '../GridManager';
import { TILE_SIZE } from '../scenes/GameScene';

export type StaffType = 'janitor' | 'mechanic';

export class Staff extends Phaser.GameObjects.Container {
  public staffType: StaffType;
  private sprite: Phaser.GameObjects.Sprite;
  private easyStar: EasyStar;
  private gridManager: GridManager;
  private currentPath: { x: number, y: number }[] = [];
  private moveSpeed: number = 80;
  private gridOffset: number;
  private currentState: 'IDLE' | 'WALKING' | 'WORKING' = 'IDLE';
  private targetObj: { id?: string, x: number, y: number } | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, type: StaffType, easyStar: EasyStar, gridManager: GridManager, gridOffset: number) {
    super(scene, x, y);
    this.staffType = type;
    this.gridOffset = gridOffset;
    this.easyStar = easyStar;
    this.gridManager = gridManager;

    this.sprite = scene.add.sprite(0, 0, type);
    this.add(this.sprite);
    scene.add.existing(this);

    this.think();
  }

  think() {
    if (this.currentState !== 'IDLE') return;

    // Search for work
    const objects = this.gridManager.getAllObjects().objects;

    if (this.staffType === 'janitor') {
      const trashes = objects.filter(o => o.type === 'trash');
      if (trashes.length > 0) {
        // Pick closest trash
        trashes.sort((a, b) => Phaser.Math.Distance.Between(this.x, this.y, a.x, a.y) - Phaser.Math.Distance.Between(this.x, this.y, b.x, b.y));
        const target = trashes[0];

        this.targetObj = { x: target.x, y: target.y };
        this.currentState = 'WALKING';
        this.calculatePath(this.x, this.y, target.x, target.y, () => {
          this.currentState = 'WORKING';
          this.work();
        });
        return;
      }
    } else if (this.staffType === 'mechanic') {
      const broken = objects.filter(o => o.condition !== undefined && o.condition <= 0);
      if (broken.length > 0) {
         broken.sort((a, b) => Phaser.Math.Distance.Between(this.x, this.y, a.x, a.y) - Phaser.Math.Distance.Between(this.x, this.y, b.x, b.y));
         const target = broken[0];

         this.targetObj = { id: target.id, x: target.x, y: target.y };
         this.currentState = 'WALKING';

         // Path to adjacent tile
         const adjacent = [
            { x: target.x, y: target.y + TILE_SIZE },
            { x: target.x, y: target.y - TILE_SIZE },
            { x: target.x + TILE_SIZE, y: target.y },
            { x: target.x - TILE_SIZE, y: target.y }
         ];

         let tX = target.x;
         let tY = target.y + TILE_SIZE;
         for (let pos of adjacent) {
            if (this.gridManager.isWalkable(pos.x, pos.y)) {
               tX = pos.x;
               tY = pos.y;
               break;
            }
         }

         this.calculatePath(this.x, this.y, tX, tY, () => {
            this.currentState = 'WORKING';
            this.work();
         });
         return;
      }
    }

    // If no work, wander randomly
    this.wander();
  }

  work() {
    setTimeout(() => {
      if (!this.scene || !this.targetObj) return;

      if (this.staffType === 'janitor') {
        this.gridManager.removeObject(this.targetObj.x, this.targetObj.y);
      } else if (this.staffType === 'mechanic' && this.targetObj.id) {
        this.gridManager.repairObject(this.targetObj.id);
      }

      window.dispatchEvent(new CustomEvent('refresh-sprites'));

      this.targetObj = null;
      this.currentState = 'IDLE';
      this.think();
    }, 2000);
  }

  wander() {
     const snappedX = Math.floor(this.x / TILE_SIZE) * TILE_SIZE;
     const snappedY = Math.floor(this.y / TILE_SIZE) * TILE_SIZE;

     const rX = snappedX + Phaser.Math.Between(-5, 5) * TILE_SIZE;
     const rY = snappedY + Phaser.Math.Between(-5, 5) * TILE_SIZE;

     if (this.gridManager.isWalkable(rX, rY)) {
        this.currentState = 'WALKING';
        this.calculatePath(this.x, this.y, rX, rY, () => {
           this.currentState = 'IDLE';
           setTimeout(() => this.think(), 1000);
        });
     } else {
        setTimeout(() => this.think(), 1000);
     }
  }

  calculatePath(startX: number, startY: number, endX: number, endY: number, onComplete: () => void) {
    const gridX1 = Math.floor(startX / TILE_SIZE) + this.gridOffset;
    const gridY1 = Math.floor(startY / TILE_SIZE) + this.gridOffset;
    const gridX2 = Math.floor(endX / TILE_SIZE) + this.gridOffset;
    const gridY2 = Math.floor(endY / TILE_SIZE) + this.gridOffset;

    this.easyStar.findPath(gridX1, gridY1, gridX2, gridY2, (path) => {
      if (path === null) {
        this.currentState = 'IDLE';
        setTimeout(() => this.think(), 1000);
      } else {
        this.currentPath = path.map(p => ({
          x: (p.x - this.gridOffset) * TILE_SIZE,
          y: (p.y - this.gridOffset) * TILE_SIZE
        }));
        if (this.currentPath.length > 0) this.currentPath.shift();
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
