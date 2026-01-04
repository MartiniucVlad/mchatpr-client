// src/services/WebSocketContext.tsx
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';

// Define the shape of a generic message handler
type MessageHandler = (data: any) => void;

interface WebSocketContextType {
  isConnected: boolean;
  sendMessage: (data: any) => void;
  // Subscribe returns a cleanup function (unsubscribe)
  subscribe: (type: string, handler: MessageHandler) => () => void;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export const WebSocketProvider: React.FC<{ token: string | null; children: React.ReactNode }> = ({ token, children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);

  // This map holds arrays of functions to call for each event type
  // Example: { "chat_message": [chatFunction], "learning_update": [sidebarFunction] }
  const subscribersRef = useRef<Record<string, MessageHandler[]>>({});

  useEffect(() => {
    if (!token) return;

    console.log("🔵 WebSocket Effect Triggered. Token:", token.substring(0, 10) + "...");
    // Connect to the new HUB endpoint
    const ws = new WebSocket(`ws://127.0.0.1:8000/ws/hub?token=${encodeURIComponent(token)}`);
    socketRef.current = ws;

    ws.onopen = () => {
        console.log("🟢 Connected to WS Hub");
        setIsConnected(true);
    };

    ws.onclose = () => {
        console.log("🔴 Disconnected from WS Hub");
        setIsConnected(false);
    };

    ws.onmessage = (event) => {
      try {
          const data = JSON.parse(event.data);
          const eventType = data.type; // Server MUST send this now

          if (!eventType) {
              console.warn("Received WS message without 'type':", data);
              return;
          }

          // 1. Notify specific listeners (e.g., 'chat_message')
          if (subscribersRef.current[eventType]) {
            subscribersRef.current[eventType].forEach((callback) => callback(data));
          }

          // 2. Notify wildcard listeners (optional, good for debugging)
          if (subscribersRef.current['*']) {
            subscribersRef.current['*'].forEach((callback) => callback(data));
          }
      } catch (err) {
          console.error("Error parsing WS message:", err);
      }
    };

    return () => {
      ws.close();
    };
  }, [token]);

  const sendMessage = (data: any) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(data));
    } else {
      console.warn("Cannot send message: WebSocket is not open");
    }
  };

  const subscribe = (type: string, handler: MessageHandler) => {
    if (!subscribersRef.current[type]) {
      subscribersRef.current[type] = [];
    }
    subscribersRef.current[type].push(handler);

    // Return the Unsubscribe function
    return () => {
      subscribersRef.current[type] = subscribersRef.current[type].filter((h) => h !== handler);
    };
  };

  return (
    <WebSocketContext.Provider value={{ isConnected, sendMessage, subscribe }}>
      {children}
    </WebSocketContext.Provider>
  );
};

// Custom Hook for easy access
export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) throw new Error("useWebSocket must be used within WebSocketProvider");
  return context;
};