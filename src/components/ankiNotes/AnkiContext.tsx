import React, { createContext, useContext, useState, useRef, useEffect, ReactNode } from 'react';

interface AnkiContextType {
  selectedDeck: string;
  setSelectedDeck: (deck: string) => void;
  selectedDeckRef: React.RefObject<string>;
}

const AnkiContext = createContext<AnkiContextType | undefined>(undefined);

export const AnkiProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [selectedDeck, setSelectedDeck] = useState<string>('');

  // The Ref ensures the WebSocket always reads the freshest value
  // without triggering re-renders or dependency cycle issues.
  const selectedDeckRef = useRef<string>('');

  useEffect(() => {
    selectedDeckRef.current = selectedDeck;
  }, [selectedDeck]);

  return (
    <AnkiContext.Provider value={{ selectedDeck, setSelectedDeck, selectedDeckRef }}>
      {children}
    </AnkiContext.Provider>
  );
};

export const useAnki = () => {
  const context = useContext(AnkiContext);
  if (!context) {
    throw new Error('useAnki must be used within an AnkiProvider');
  }
  return context;
};