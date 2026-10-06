import Phaser from 'phaser';
import { useGameStore } from '../../store/gameStore';
import { GridManager } from '../GridManager';
import { js as EasyStar } from 'easystarjs';
import { Customer } from '../objects/Customer';
import { Staff } from '../objects/Staff';

export const TILE_SIZE = 32;

export class GameScene extends Phaser.Scene {
  private controls!: Phaser.Cameras.Controls.SmoothedKeyControl;
  private gridGraphics!: Phaser.GameObjects.Graphics;
  public gridManager!: GridManager;

  private cursorRect!: Phaser.GameObjects.Rectangle;
  private spritesGroup!: Phaser.GameObjects.Group;

  private easyStar!: EasyStar;
  private customersGroup!: Phaser.GameObjects.Group;
  private staffGroup!: Phaser.GameObjects.Group;
  private pathfindingGrid!: number[][];
  private gridOffset = 50; // To handle negative coordinates, we shift by 50 tiles

  constructor() {
    super('GameScene');
  }

  create() {
    // Setup camera
    const cam = this.cameras.main;
    cam.setBounds(-1000, -1000, 2000, 2000);
    cam.setZoom(1);

    this.gridManager = new GridManager();
    this.spritesGroup = this.add.group();
    this.customersGroup = this.add.group();
    this.staffGroup = this.add.group();

    this.setupPathfinding();

    window.addEventListener('hire-staff', (e: any) => {
      this.spawnStaff(e.detail.type);
    });

    window.addEventListener('save-grid', () => {
       const data = this.gridManager.serialize();
       localStorage.setItem('arcade_grid_data', data);
    });

    window.addEventListener('load-grid', () => {
       const data = localStorage.getItem('arcade_grid_data');
       if (data) {
          this.gridManager.deserialize(data);
          this.refreshSprites();
          this.updatePathfindingGrid();
       }
    });

    // Game Clock
    this.time.addEvent({
      delay: 1000, // Every real second is some game time
      callback: this.advanceClock,
      callbackScope: this,
      loop: true
    });

    // Spawn a customer every few seconds
    this.time.addEvent({
      delay: 5000,
      callback: this.spawnCustomer,
      callbackScope: this,
      loop: true
    });

    // Handle external sprite refreshes
    window.addEventListener('refresh-sprites', () => {
       this.refreshSprites();
    });

    // Grid graphics
    this.gridGraphics = this.add.graphics();
    this.drawGrid();

    // Placement Cursor
    this.cursorRect = this.add.rectangle(0, 0, TILE_SIZE, TILE_SIZE, 0xffffff, 0.3);
    this.cursorRect.setOrigin(0, 0);

    // Camera controls
    const cursors = this.input.keyboard!.createCursorKeys();
    const controlConfig = {
      camera: this.cameras.main,
      left: cursors.left,
      right: cursors.right,
      up: cursors.up,
      down: cursors.down,
      acceleration: 0.04,
      drag: 0.0005,
      maxSpeed: 0.7
    };
    this.controls = new Phaser.Cameras.Controls.SmoothedKeyControl(controlConfig);

    // Zoom on wheel
    this.input.on('wheel', (_pointer: Phaser.Input.Pointer, _gameObjects: any, _deltaX: number, deltaY: number, _deltaZ: number) => {
      let newZoom = cam.zoom;
      if (deltaY > 0) {
        newZoom -= 0.1;
      } else {
        newZoom += 0.1;
      }
      cam.setZoom(Phaser.Math.Clamp(newZoom, 0.5, 2));
    });

    // Pan on drag (middle mouse or right click)
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!pointer.isDown) return;

      // Middle or right click to pan
      if (pointer.button === 1 || pointer.button === 2) {
        cam.scrollX -= (pointer.x - pointer.prevPosition.x) / cam.zoom;
        cam.scrollY -= (pointer.y - pointer.prevPosition.y) / cam.zoom;
      }
    });

    // Handle placement clicking
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // Left click only
      if (pointer.button === 0) {
        const store = useGameStore.getState();
        if (store.buildMode === null) {
          this.handleSelection(pointer);
        } else {
          this.handlePlacement(pointer);
        }
      }
    });

    // Disable context menu on right click for panning
    this.input.mouse!.disableContextMenu();
  }

  handlePlacement(pointer: Phaser.Input.Pointer) {
    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const snappedX = Math.floor(worldPoint.x / TILE_SIZE) * TILE_SIZE;
    const snappedY = Math.floor(worldPoint.y / TILE_SIZE) * TILE_SIZE;

    // Get current build mode from Zustand store
    const store = useGameStore.getState();
    const mode = store.buildMode;

    if (!mode) return;

    let placed = false;
    let cost = 0;

    switch(mode) {
      case 'floor':
        cost = 10;
        if (store.money >= cost) placed = this.gridManager.addFloor(snappedX, snappedY);
        break;
      case 'wall':
        cost = 50;
        if (store.money >= cost) placed = this.gridManager.addWall(snappedX, snappedY);
        break;
      case 'door':
        cost = 100;
        if (store.money >= cost) placed = this.gridManager.addObject(snappedX, snappedY, 'door');
        break;
      case 'arcade_racing':
        cost = 1000;
        if (store.money >= cost) placed = this.gridManager.addObject(snappedX, snappedY, 'arcade_racing');
        break;
      case 'arcade_fighting':
        cost = 800;
        if (store.money >= cost) placed = this.gridManager.addObject(snappedX, snappedY, 'arcade_fighting');
        break;
      case 'arcade_crane':
        cost = 500;
        if (store.money >= cost) placed = this.gridManager.addObject(snappedX, snappedY, 'arcade_crane');
        break;
      case 'vending':
        cost = 300;
        if (store.money >= cost) placed = this.gridManager.addObject(snappedX, snappedY, 'vending');
        break;
      case 'toilet':
        cost = 400;
        if (store.money >= cost) placed = this.gridManager.addObject(snappedX, snappedY, 'toilet');
        break;
      case 'trashcan':
        cost = 50;
        if (store.money >= cost) placed = this.gridManager.addObject(snappedX, snappedY, 'trashcan');
        break;
    }

    if (placed) {
      store.deductMoney(cost);
      this.refreshSprites();
      this.updatePathfindingGrid();
    }
  }

  setupPathfinding() {
    this.easyStar = new EasyStar();
    this.easyStar.setAcceptableTiles([0]);
    this.updatePathfindingGrid();
  }

  updatePathfindingGrid() {
    // Create a 100x100 grid for pathfinding (representing -50 to +50 tiles from center)
    const gridSize = this.gridOffset * 2;
    this.pathfindingGrid = Array(gridSize).fill(0).map(() => Array(gridSize).fill(0));

    // 0 = walkable, 1 = obstacle

    const { walls, objects } = this.gridManager.getAllObjects();

    for (const w of walls) {
      const gX = Math.floor(w.x / TILE_SIZE) + this.gridOffset;
      const gY = Math.floor(w.y / TILE_SIZE) + this.gridOffset;
      if (gX >= 0 && gX < gridSize && gY >= 0 && gY < gridSize) {
        this.pathfindingGrid[gY][gX] = 1;
      }
    }

    for (const o of objects) {
      // Machines, vending, and toilets block pathing. Doors and trashcans do not block completely.
      if (o.type.startsWith('arcade_') || o.type === 'vending' || o.type === 'toilet') {
        const gX = Math.floor(o.x / TILE_SIZE) + this.gridOffset;
        const gY = Math.floor(o.y / TILE_SIZE) + this.gridOffset;
        if (gX >= 0 && gX < gridSize && gY >= 0 && gY < gridSize) {
          this.pathfindingGrid[gY][gX] = 1;
        }
      }
    }

    this.easyStar.setGrid(this.pathfindingGrid);
  }

  handleSelection(pointer: Phaser.Input.Pointer) {
    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const snappedX = Math.floor(worldPoint.x / TILE_SIZE) * TILE_SIZE;
    const snappedY = Math.floor(worldPoint.y / TILE_SIZE) * TILE_SIZE;

    const obj = this.gridManager.getObjectAt(snappedX, snappedY);
    if (obj && obj.type.startsWith('arcade_')) {
      // Dispatch custom event to React
      const event = new CustomEvent('inspect-machine', {
        detail: { id: obj.id, type: obj.type }
      });
      window.dispatchEvent(event);
    }
  }

  advanceClock() {
    const store = useGameStore.getState();
    const wasOpen = store.isOpen;

    // Advance 5 in-game minutes every real second
    store.advanceTime(5);

    // Check if we just closed
    const isOpen = useGameStore.getState().isOpen;
    if (wasOpen && !isOpen) {
       this.generateDailyReport();
    }
  }

  generateDailyReport() {
    const store = useGameStore.getState();

    // Calculate expenses
    const objects = this.gridManager.getAllObjects().objects;
    let machines = 0;
    for (const obj of objects) {
      if (obj.type.startsWith('arcade_') || obj.type === 'vending') machines++;
    }

    // Simple economy calculation for expenses (e.g. $10 electricity per machine)
    const machineExpenses = machines * 10;

    // $100 per staff member
    const staffExpenses = this.staffGroup.getChildren().length * 100;

    const totalExpenses = machineExpenses + staffExpenses;
    store.deductMoney(totalExpenses);

    store.setDailyReport({
       income: 0, // This would require complex tracking, simplified for now
       expenses: totalExpenses
    });
  }

  spawnCustomer() {
    const store = useGameStore.getState();
    if (!store.isOpen) return;

    // Check if we have a door, else don't spawn
    const hasDoor = this.gridManager.getAllObjects().objects.some(o => o.type === 'door');
    if (!hasDoor) return;

    const startX = 0;
    const startY = -200; // Spawn slightly off top
    const customer = new Customer(this, startX, startY, this.easyStar, this.gridManager, this.gridOffset);
    this.customersGroup.add(customer);
  }

  spawnStaff(type: 'janitor' | 'mechanic') {
    const hasDoor = this.gridManager.getAllObjects().objects.some(o => o.type === 'door');
    const startX = hasDoor ? 0 : 0;
    const startY = hasDoor ? 0 : 0;

    const staff = new Staff(this, startX, startY, type, this.easyStar, this.gridManager, this.gridOffset);
    this.staffGroup.add(staff);
  }

  refreshSprites() {
    this.spritesGroup.clear(true, true);

    const { floors, walls, objects } = this.gridManager.getAllObjects();

    for (const f of floors) {
      const sprite = this.add.sprite(f.x, f.y, 'floor').setOrigin(0, 0);
      this.spritesGroup.add(sprite);
    }

    for (const w of walls) {
      const sprite = this.add.sprite(w.x, w.y, 'wall').setOrigin(0, 0);
      this.spritesGroup.add(sprite);
    }

    for (const o of objects) {
      const sprite = this.add.sprite(o.x, o.y, o.type).setOrigin(0, 0);
      this.spritesGroup.add(sprite);

      // Draw broken indicator if needed
      if (o.condition !== undefined && o.condition <= 0) {
        const indicator = this.add.sprite(o.x + TILE_SIZE/2, o.y, 'broken_indicator');
        this.spritesGroup.add(indicator);
      }
    }
  }

  update(_time: number, delta: number) {
    this.controls.update(delta);

    const pointer = this.input.activePointer;
    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const snappedX = Math.floor(worldPoint.x / TILE_SIZE) * TILE_SIZE;
    const snappedY = Math.floor(worldPoint.y / TILE_SIZE) * TILE_SIZE;

    this.cursorRect.setPosition(snappedX, snappedY);

    // Hide cursor if no build mode
    const store = useGameStore.getState();
    this.cursorRect.setVisible(store.buildMode !== null);
  }

  drawGrid() {
    this.gridGraphics.clear();
    this.gridGraphics.lineStyle(1, 0x333333, 0.5);

    const bounds = 2000;
    const half = bounds / 2;

    for (let i = -half; i <= half; i += TILE_SIZE) {
      this.gridGraphics.moveTo(-half, i);
      this.gridGraphics.lineTo(half, i);
      this.gridGraphics.moveTo(i, -half);
      this.gridGraphics.lineTo(i, half);
    }
    this.gridGraphics.strokePath();
  }
}
