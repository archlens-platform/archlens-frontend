"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Eye, LayoutDashboard, GitCompare, Upload, LogIn, LogOut, Shield, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./theme-toggle";
import { useSignalR } from "@/providers/signalr-provider";
import { getUser, logout } from "@/lib/auth";
import { Button } from "@/components/ui/button";

const publicLinks = [
  { href: "/", label: "Upload", icon: Upload },
];

const protectedLinks = [
  { href: "/analyses", label: "Analyses", icon: LayoutDashboard },
  { href: "/compare", label: "Compare", icon: GitCompare },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { connected } = useSignalR();
  const [user, setUser] = useState<{ username: string; role?: string } | null>(null);

  useEffect(() => {
    setUser(getUser());
  }, [pathname]);

  const handleLogout = () => {
    logout();
    setUser(null);
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 font-bold">
            <Eye className="h-5 w-5 text-primary" />
            <span className="dark-gradient-text">ArchLens</span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {[...publicLinks, ...protectedLinks].map(({ href, label, icon: Icon }) => {
              const isProtected = protectedLinks.some((l) => l.href === href);
              const target = isProtected && !user ? "/login" : href;
              return (
                <Link
                  key={href}
                  href={target}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    pathname === href
                      ? "bg-primary/10 text-primary dark:bg-primary/15"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              );
            })}
            {user?.role === "Admin" && (
              <Link
                href="/admin"
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  pathname === "/admin"
                    ? "bg-primary/10 text-primary dark:bg-primary/15"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Shield className="h-4 w-4" />
                Admin
              </Link>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                connected
                  ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]"
                  : "bg-red-500"
              )}
            />
            {connected ? "Online" : "Offline"}
          </div>
          <ThemeToggle />

          {user ? (
            <div className="flex items-center gap-2">
              <span className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex">
                <User className="h-3.5 w-3.5" />
                {user.username}
              </span>
              <Button variant="ghost" size="sm" onClick={handleLogout} className="h-8 cursor-pointer gap-1 text-xs">
                <LogOut className="h-3.5 w-3.5" />
                Logout
              </Button>
            </div>
          ) : (
            <Link href="/login">
              <Button
                size="sm"
                className="h-8 border border-primary/30 bg-primary/10 text-xs font-semibold text-primary hover:bg-primary/20 dark:shadow-[0_0_10px_rgba(0,212,255,0.15)]"
              >
                <LogIn className="mr-1 h-3.5 w-3.5" />
                Sign In
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
