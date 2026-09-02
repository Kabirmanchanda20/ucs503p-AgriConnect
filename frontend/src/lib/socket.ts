import { io, type Socket } from 'socket.io-client';
import { API_BASE_URL } from './env';
import { tokenStore } from './api/token-store';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(API_BASE_URL, {
      autoConnect: false,
      path: '/socket.io',
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
}

export function connectSocket(): Socket {
  const client = getSocket();
  const token = tokenStore.get();
  client.auth = { token };
  if (!client.connected) {
    client.connect();
  }
  return client;
}

export function disconnectSocket(): void {
  if (socket?.connected) {
    socket.disconnect();
  }
}

export function joinOrderRoom(
  orderId: string,
  onMessage: (message: unknown) => void,
  onTyping?: (payload: { orderId: string; userId: string }) => void,
): () => void {
  const client = connectSocket();

  const onNew = (message: unknown) => onMessage(message);
  const onTypingEvent = (payload: { orderId: string; userId: string }) => {
    onTyping?.(payload);
  };
  client.on('message:new', onNew);
  client.on('typing', onTypingEvent);

  client.emit('join:order', orderId, (result?: { ok: boolean }) => {
    if (!result?.ok) {
      client.emit('join:order', orderId);
    }
  });

  return () => {
    client.off('message:new', onNew);
    client.off('typing', onTypingEvent);
    client.emit('leave:order', orderId);
  };
}
