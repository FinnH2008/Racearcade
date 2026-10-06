export interface GridObject {
  id: string;
  x: number;
  y: number;
  type: string;
}

export class GridManager {
  private floors: Map<string, GridObject> = new Map();
  private walls: Map<string, GridObject> = new Map();
  private objects: Map<string, GridObject> = new Map(); // doors, arcades

  getKey(x: number, y: number) {
    return `${x},${y}`;
  }

  addFloor(x: number, y: number): boolean {
    const key = this.getKey(x, y);
    if (!this.floors.has(key) && !this.walls.has(key)) {
      this.floors.set(key, { id: key, x, y, type: 'floor' });
      return true;
    }
    return false;
  }

  addWall(x: number, y: number): boolean {
    const key = this.getKey(x, y);
    if (!this.walls.has(key) && !this.objects.has(key)) {
      this.walls.set(key, { id: key, x, y, type: 'wall' });
      this.floors.delete(key); // Wall replaces floor
      return true;
    }
    return false;
  }

  addObject(x: number, y: number, type: string): boolean {
    const key = this.getKey(x, y);
    // Needs a floor to place objects (unless it's a door, which replaces wall, but we'll simplify)
    if (type === 'door') {
      if (this.walls.has(key) && !this.objects.has(key)) {
        this.walls.delete(key);
        this.objects.set(key, { id: key, x, y, type });
        return true;
      }
    } else {
      if (this.floors.has(key) && !this.objects.has(key) && !this.walls.has(key)) {
        this.objects.set(key, { id: key, x, y, type });
        return true;
      }
    }
    return false;
  }

  isWalkable(x: number, y: number): boolean {
    const key = this.getKey(x, y);
    // Walkable if there's no wall, and no blocking object (doors are walkable, machines might block the tile itself but you stand next to it to play)
    if (this.walls.has(key)) return false;

    // For simplicity, let's say arcade machines block the tile they are on
    const obj = this.objects.get(key);
    if (obj && obj.type.startsWith('arcade_')) {
      return false;
    }

    return true; // Outside grass is walkable, floors are walkable, doors are walkable
  }

  getAllObjects() {
    return {
      floors: Array.from(this.floors.values()),
      walls: Array.from(this.walls.values()),
      objects: Array.from(this.objects.values())
    };
  }

  getObjectAt(x: number, y: number) {
     return this.objects.get(this.getKey(x, y));
  }
}

// Global instance so React and Phaser can easily share it if needed,
// but usually Phaser should own it. We'll instantiate it in GameScene.
