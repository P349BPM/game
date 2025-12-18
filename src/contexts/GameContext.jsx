import { createContext, useState } from 'react';

export const GameContext = createContext();

export const GameProvider = ({ children }) => {
  const [gameState] = useState({
    powerUps: { extraTime: 2 },
    stats: { correct: 0, wrong: 0 }
  });

  return (
    <GameContext.Provider value={{ gameState }}>
      {children}
    </GameContext.Provider>
  );
};