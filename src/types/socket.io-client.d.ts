// Type definitions for socket.io-client

declare module 'socket.io-client' {
  import type { EventEmitter } from 'events';
  
  export interface Socket extends EventEmitter {
    // Add any socket methods you're using
    on(event: string, fn: (...args: any[]) => void): this;
    off(event: string, fn?: (...args: any[]) => void): this;
    emit(event: string, ...args: any[]): this;
    disconnect(): this;
    connect(): this;
    id: string;
    connected: boolean;
    disconnected: boolean;
  }

  export interface ManagerOptions {
    // Add any options you're using
    withCredentials?: boolean;
    autoConnect?: boolean;
    reconnection?: boolean;
    reconnectionAttempts?: number;
    reconnectionDelay?: number;
    reconnectionDelayMax?: number;
    timeout?: number;
    transports?: string[];
    query?: Record<string, string>;
  }

  export interface SocketOptions extends ManagerOptions {
    // Socket-specific options
    path?: string;
  }

  // The main io function
  const io: {
    (uri?: string, opts?: SocketOptions): Socket;
    (opts: SocketOptions): Socket;
  };

  export default io;
}
