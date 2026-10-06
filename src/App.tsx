import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { config } from './game/config';
import { UI } from './components/UI';

export function App() {
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!gameRef.current) {
      gameRef.current = new Phaser.Game(config);
    }

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#111]">
      <div id="game-container" className="absolute inset-0" />
      <UI />
    </div>
  );
}

export default App;
