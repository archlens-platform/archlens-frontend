import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  getToken: () => "test-token",
}));

const mockConnection = {
  state: "Disconnected",
  start: vi.fn().mockResolvedValue(undefined),
  stop: vi.fn().mockResolvedValue(undefined),
};

vi.mock("@microsoft/signalr", () => {
  class MockHubConnectionBuilder {
    withUrl() { return this; }
    withAutomaticReconnect() { return this; }
    configureLogging() { return this; }
    build() { return mockConnection; }
  }

  return {
    HubConnectionState: {
      Disconnected: "Disconnected",
      Connected: "Connected",
    },
    HubConnectionBuilder: MockHubConnectionBuilder,
    LogLevel: { Warning: 3 },
  };
});

beforeEach(() => {
  vi.clearAllMocks();
  mockConnection.state = "Disconnected";
  vi.resetModules();
});

describe("signalr", () => {
  it("getSignalRConnection creates connection", async () => {
    const { getSignalRConnection } = await import("./signalr");
    const conn = getSignalRConnection();
    expect(conn).toBeDefined();
  });

  it("getSignalRConnection returns same instance", async () => {
    const { getSignalRConnection } = await import("./signalr");
    const a = getSignalRConnection();
    const b = getSignalRConnection();
    expect(a).toBe(b);
  });

  it("startConnection starts when disconnected", async () => {
    const { startConnection } = await import("./signalr");
    await startConnection();
    expect(mockConnection.start).toHaveBeenCalled();
  });

  it("startConnection handles start failure gracefully", async () => {
    mockConnection.start.mockRejectedValueOnce(new Error("fail"));
    const { startConnection } = await import("./signalr");
    const conn = await startConnection();
    expect(conn).toBeDefined();
  });

  it("startConnection rethrows abort errors", async () => {
    mockConnection.start.mockRejectedValueOnce(new Error("The connection was abort"));
    const { startConnection } = await import("./signalr");
    await expect(startConnection()).rejects.toThrow("abort");
  });

  it("stopConnection stops when connected", async () => {
    mockConnection.state = "Connected";
    const { getSignalRConnection, stopConnection } = await import("./signalr");
    getSignalRConnection();
    await stopConnection();
    expect(mockConnection.stop).toHaveBeenCalled();
  });

  it("stopConnection does nothing when already disconnected", async () => {
    const { stopConnection } = await import("./signalr");
    await stopConnection();
    expect(mockConnection.stop).not.toHaveBeenCalled();
  });

  it("resetConnection stops and clears connection", async () => {
    mockConnection.state = "Connected";
    const { getSignalRConnection, resetConnection } = await import("./signalr");
    getSignalRConnection();
    await resetConnection();
    expect(mockConnection.stop).toHaveBeenCalled();
  });
});
