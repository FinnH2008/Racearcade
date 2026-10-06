export interface GridObject {
  id: string;
  x: number;
  y: number;
  type: string;
  condition?: number; // 0 to 100 for machines
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
        let condition = undefined;
        if (type.startsWith('arcade_') || type === 'vending' || type === 'toilet') {
          condition = 100;
        }
        this.objects.set(key, { id: key, x, y, type, condition });
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

  removeObject(x: number, y: number) {
    const key = this.getKey(x, y);
    if (this.objects.has(key)) {
       this.objects.delete(key);
       return true;
    }
    return false;
  }

  damageObject(id: string, amount: number) {
    // Find object by id since x/y might be harder to get from the customer
    for (const obj of this.objects.values()) {
      if (obj.id === id && obj.condition !== undefined) {
        obj.condition = Math.max(0, obj.condition - amount);
        return obj.condition;
      }
    }
    return -1;
  }

  repairObject(id: string) {
    for (const obj of this.objects.values()) {
      if (obj.id === id && obj.condition !== undefined) {
        obj.condition = 100;
        return true;
      }
    }
    return false;
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

  // Serialization for save/load
  serialize(): string {
    return JSON.stringify(this.getAllObjects());
  }

  deserialize(data: string) {
    try {
      const parsed = JSON.parse(data);
      this.floors.clear();
      this.walls.clear();
      this.objects.clear();

      for (const f of parsed.floors || []) this.floors.set(f.id, f);
      for (const w of parsed.walls || []) this.walls.set(w.id, w);
      for (const o of parsed.objects || []) this.objects.set(o.id, o);

      return true;
    } catch (e) {
      console.error("Failed to deserialize grid data", e);
      return false;
    }
  }
}

// Global instance so React and Phaser can easily share it if needed,
// but usually Phaser should own it. We'll instantiate it in GameScene.
