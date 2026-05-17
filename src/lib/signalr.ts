import * as signalR from "@microsoft/signalr";
import { getToken } from "@/lib/auth";

let connection: signalR.HubConnection | null = null;

export function getSignalRConnection(): signalR.HubConnection {
  if (connection) return connection;

  const hubUrl =
    process.env.NEXT_PUBLIC_NOTIFICATION_URL || "http://localhost:5150";

  connection = new signalR.HubConnectionBuilder()
    .withUrl(`${hubUrl}/hubs/analysis`, {
      accessTokenFactory: () => getToken() || "",
    })
    .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
    .configureLogging(signalR.LogLevel.Warning)
    .build();

  return connection;
}

export async function startConnection(): Promise<signalR.HubConnection> {
  const conn = getSignalRConnection();

  if (conn.state === signalR.HubConnectionState.Disconnected) {
    try {
      await conn.start();
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes("abort")) throw error;
    }
  }

  return conn;
}

export async function stopConnection(): Promise<void> {
  if (connection && connection.state !== signalR.HubConnectionState.Disconnected) {
    await connection.stop();
  }
}

export async function resetConnection(): Promise<void> {
  if (connection) {
    await stopConnection();
    connection = null;
  }
}
