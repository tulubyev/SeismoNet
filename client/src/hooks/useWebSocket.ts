import { useState, useEffect, useRef, useCallback } from 'react';
import { WebSocketMessageType, WebSocketMessage } from '@shared/schema';

type MessageHandler = (payload: any) => void;

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const handlersRef = useRef<Map<WebSocketMessageType, MessageHandler[]>>(new Map());
  
  // Connect to the WebSocket server
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;
    
    socket.onopen = () => {
      console.log('WebSocket connection established');
      setIsConnected(true);
      setError(null);
    };
    
    socket.onclose = () => {
      console.log('WebSocket connection closed');
      setIsConnected(false);
    };
    
    socket.onerror = (event) => {
      console.error('WebSocket error:', event);
      setError('WebSocket connection error');
    };
    
    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as WebSocketMessage;
        
        // Get all handlers for this message type
        const handlers = handlersRef.current.get(message.type) || [];
        
        // Call each handler with the message payload
        handlers.forEach(handler => handler(message.payload));
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
    
    // Clean up on unmount
    return () => {
      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
        socket.close();
      }
    };
  }, []);
  
  // Send a message to the WebSocket server
  const sendMessage = useCallback((type: WebSocketMessageType, payload: any) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type, payload }));
    } else {
      console.error('WebSocket is not connected');
    }
  }, []);
  
  // Register a handler for a specific message type
  const onMessage = useCallback((type: WebSocketMessageType, handler: MessageHandler) => {
    const handlers = handlersRef.current.get(type) || [];
    handlers.push(handler);
    handlersRef.current.set(type, handlers);
    
    // Return a function to unregister the handler
    return () => {
      const handlers = handlersRef.current.get(type) || [];
      handlersRef.current.set(
        type,
        handlers.filter(h => h !== handler)
      );
    };
  }, []);
  
  return { isConnected, error, sendMessage, onMessage };
}
