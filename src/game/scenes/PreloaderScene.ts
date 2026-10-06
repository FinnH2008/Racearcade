import Phaser from 'phaser';

export class PreloaderScene extends Phaser.Scene {
  constructor() {
    super('PreloaderScene');
  }

  preload() {
    // Generate simple textures programmatically
    this.createTexture('floor', 32, 32, 0x444444);
    this.createTexture('wall', 32, 32, 0x888888, 0x222222);
    this.createTexture('door', 32, 32, 0x5c4033, 0x3e2723);

    // Arcade machines
    this.createTexture('arcade_racing', 32, 32, 0xff0000, 0xaa0000); // Red
    this.createTexture('arcade_fighting', 32, 32, 0x0000ff, 0x0000aa); // Blue
    this.createTexture('arcade_crane', 32, 32, 0xff00ff, 0xaa00aa); // Pink

    // Character
    this.createCircleTexture('customer', 16, 0x00ff00, 0x005500); // Green circle

    // New Objects
    this.createTexture('vending', 32, 32, 0xffa500, 0xcc8400); // Orange
    this.createTexture('toilet', 32, 32, 0xdddddd, 0xaaaaaa); // White/Gray
    this.createTexture('trashcan', 32, 32, 0x333333, 0x111111); // Dark Gray

    // Dirt/Trash
    this.createCircleTexture('trash', 4, 0x8b4513); // Small brown circle
    this.createCircleTexture('broken_indicator', 8, 0xff0000, 0x000000); // Red alert dot

    // Staff
    this.createCircleTexture('janitor', 16, 0x00ffff, 0x008888); // Cyan circle
    this.createCircleTexture('mechanic', 16, 0xffff00, 0x888800); // Yellow circle
  }

  createTexture(key: string, width: number, height: number, color: number, outlineColor?: number) {
    const graphics = this.make.graphics({ x: 0, y: 0 });

    graphics.fillStyle(color, 1);
    graphics.fillRect(0, 0, width, height);

    if (outlineColor !== undefined) {
      graphics.lineStyle(2, outlineColor, 1);
      graphics.strokeRect(1, 1, width - 2, height - 2);
    }

    graphics.generateTexture(key, width, height);
  }

  createCircleTexture(key: string, radius: number, color: number, outlineColor?: number) {
    const graphics = this.make.graphics({ x: 0, y: 0 });

    graphics.fillStyle(color, 1);
    graphics.fillCircle(radius, radius, radius);

    if (outlineColor !== undefined) {
      graphics.lineStyle(2, outlineColor, 1);
      graphics.strokeCircle(radius, radius, radius - 1);
    }

    graphics.generateTexture(key, radius * 2, radius * 2);
  }

  create() {
    this.scene.start('GameScene');
  }
}
