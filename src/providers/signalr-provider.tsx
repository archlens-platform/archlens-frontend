"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import type { HubConnection } from "@microsoft/signalr";
import { HubConnectionState } from "@microsoft/signalr";
import { startConnection, stopConnection, getSignalRConnection, resetConnection } from "@/lib/signalr";
import { isAuthenticated } from "@/lib/auth";
import type { StatusChangedPayload } from "@/types";

interface SignalRContextValue {
  connected: boolean;
  onStatusChanged: (cb: (payload: StatusChangedPayload) => void) => () => void;
}

const SignalRContext = createContext<SignalRContextValue>({
  connected: false,
  onStatusChanged: () => () => {},
});

export function useSignalR() {
  return useContext(SignalRContext);
}

export function SignalRProvider({ children }: { children: ReactNode }) {
  const [connected, setConnected] = useState(false);
  const connRef = useRef<HubConnection | null>(null);
  const connectedRef = useRef(false);
  const pathname = usePathname();
  const authed = isAuthenticated();

  useEffect(() => {
    if (!authed) {
      if (connRef.current?.state === HubConnectionState.Connected) {
        void stopConnection();
        void resetConnection();
        connRef.current = null;
        connectedRef.current = false;
      }
      setConnected(false);
      return;
    }

    if (connectedRef.current && connRef.current?.state === HubConnectionState.Connected) {
      return;
    }

    const conn = getSignalRConnection();
    connRef.current = conn;

    conn.onreconnected(() => setConnected(true));
    conn.onreconnecting(() => setConnected(false));
    conn.onclose(() => {
      setConnected(false);
      connectedRef.current = false;
    });

    startConnection()
      .then((c) => {
        if (c.state === HubConnectionState.Connected) {
          setConnected(true);
          connectedRef.current = true;
        }
      })
      .catch(() => {
        setConnected(false);
      });
  }, [authed, pathname]);

  const onStatusChanged = useCallback(
    (cb: (payload: StatusChangedPayload) => void) => {
      const conn = connRef.current;
      if (!conn) return () => {};

      conn.on("StatusChanged", cb);
      return () => conn.off("StatusChanged", cb);
    },
    []
  );

  return (
    <SignalRContext.Provider value={{ connected, onStatusChanged }}>
      {children}
    </SignalRContext.Provider>
  );
}
