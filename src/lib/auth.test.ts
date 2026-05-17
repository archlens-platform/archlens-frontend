import { describe, it, expect, beforeEach, vi } from "vitest";
import { getToken, getUser, setAuth, logout, isAuthenticated } from "./auth";

const mockStorage: Record<string, string> = {};

beforeEach(() => {
  Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);

  vi.stubGlobal("localStorage", {
    getItem: (key: string) => mockStorage[key] ?? null,
    setItem: (key: string, value: string) => {
      mockStorage[key] = value;
    },
    removeItem: (key: string) => {
      delete mockStorage[key];
    },
  });
});

describe("getToken", () => {
  it("returns null when no token is stored", () => {
    expect(getToken()).toBeNull();
  });

  it("returns stored token", () => {
    mockStorage["archlens_token"] = "abc123";
    expect(getToken()).toBe("abc123");
  });
});

describe("setAuth / getUser", () => {
  it("stores and retrieves user data", () => {
    setAuth("tok", "admin", "Admin", 60);
    expect(getToken()).toBe("tok");

    const user = getUser();
    expect(user).not.toBeNull();
    expect(user?.username).toBe("admin");
    expect(user?.role).toBe("Admin");
  });

  it("returns null for expired user", () => {
    setAuth("tok", "admin", "Admin", -1);
    expect(getUser()).toBeNull();
  });

  it("returns null for invalid JSON in storage (SyntaxError)", () => {
    mockStorage["archlens_user"] = "not-json";
    expect(getUser()).toBeNull();
  });

  it("re-throws non-SyntaxError from JSON.parse", () => {
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => {
        if (key === "archlens_user") {
          throw new TypeError("unexpected error");
        }
        return null;
      },
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
    expect(() => getUser()).toThrow(TypeError);
  });
});

describe("logout", () => {
  it("clears token and user", () => {
    setAuth("tok", "admin", "Admin", 60);
    logout();
    expect(getToken()).toBeNull();
    expect(getUser()).toBeNull();
  });
});

describe("isAuthenticated", () => {
  it("returns false when no user", () => {
    expect(isAuthenticated()).toBe(false);
  });

  it("returns true when valid user exists", () => {
    setAuth("tok", "admin", "Admin", 60);
    expect(isAuthenticated()).toBe(true);
  });

  it("returns false when user is expired", () => {
    setAuth("tok", "admin", "Admin", -1);
    expect(isAuthenticated()).toBe(false);
  });
});

describe("SSR (no window)", () => {
  const origWindow = globalThis.window;

  beforeEach(() => {
    vi.stubGlobal("window", undefined);
  });

  afterEach(() => {
    vi.stubGlobal("window", origWindow);
  });

  it("getToken returns null when window is undefined", () => {
    expect(getToken()).toBeNull();
  });

  it("getUser returns null when window is undefined", () => {
    expect(getUser()).toBeNull();
  });
});
