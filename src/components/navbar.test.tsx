import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Navbar } from "./navbar";

let mockUser: { username: string; role: string } | null = null;

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/lib/auth", () => ({
  getUser: () => mockUser,
  logout: vi.fn(),
}));

vi.mock("@/providers/signalr-provider", () => ({
  useSignalR: () => ({ connected: true }),
}));

vi.mock("next-themes", () => ({
  useTheme: () => ({ theme: "dark", setTheme: vi.fn() }),
}));

beforeEach(() => {
  mockUser = null;
});

describe("Navbar", () => {
  it("renders brand name", () => {
    render(<Navbar />);
    expect(screen.getByText("ArchLens")).toBeInTheDocument();
  });

  it("renders navigation links", () => {
    render(<Navbar />);
    expect(screen.getByText("Upload")).toBeInTheDocument();
    expect(screen.getByText("Analyses")).toBeInTheDocument();
    expect(screen.getByText("Compare")).toBeInTheDocument();
  });

  it("shows sign in when no user", () => {
    render(<Navbar />);
    expect(screen.getByText("Sign In")).toBeInTheDocument();
  });

  it("shows username and logout when logged in", () => {
    mockUser = { username: "testuser", role: "User" };
    render(<Navbar />);
    expect(screen.getByText("testuser")).toBeInTheDocument();
    expect(screen.getByText("Logout")).toBeInTheDocument();
  });

  it("shows Admin link for admin users", () => {
    mockUser = { username: "admin", role: "Admin" };
    render(<Navbar />);
    expect(screen.getByText("Admin")).toBeInTheDocument();
  });

  it("hides Admin link for non-admin users", () => {
    mockUser = { username: "user", role: "User" };
    render(<Navbar />);
    expect(screen.queryByText("Admin")).not.toBeInTheDocument();
  });

  it("shows online status when connected", () => {
    render(<Navbar />);
    expect(screen.getByText("Online")).toBeInTheDocument();
  });

  it("calls logout and clears user on logout click", async () => {
    const { logout } = await import("@/lib/auth");
    mockUser = { username: "testuser", role: "User" };
    render(<Navbar />);
    fireEvent.click(screen.getByText("Logout"));
    expect(logout).toHaveBeenCalled();
  });
});
