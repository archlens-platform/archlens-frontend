import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { CookieBanner } from "./cookie-banner";

const mockStorage: Record<string, string> = {};

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

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

describe("CookieBanner", () => {
  it("shows banner when no consent stored", async () => {
    await act(async () => {
      render(<CookieBanner />);
    });
    expect(screen.getByText("Entendi e aceito")).toBeInTheDocument();
  });

  it("hides banner when consent already given", async () => {
    mockStorage["cookie-consent"] = "accepted";
    await act(async () => {
      render(<CookieBanner />);
    });
    expect(screen.queryByText("Entendi e aceito")).not.toBeInTheDocument();
  });

  it("hides banner and saves consent on click", async () => {
    await act(async () => {
      render(<CookieBanner />);
    });

    await act(async () => {
      fireEvent.click(screen.getByText("Entendi e aceito"));
    });

    expect(mockStorage["cookie-consent"]).toBe("accepted");
    expect(screen.queryByText("Entendi e aceito")).not.toBeInTheDocument();
  });

  it("contains link to privacy policy", async () => {
    await act(async () => {
      render(<CookieBanner />);
    });
    const link = screen.getByText("Política de Privacidade");
    expect(link).toBeInTheDocument();
    expect(link.closest("a")).toHaveAttribute("href", "/privacy-policy");
  });
});
