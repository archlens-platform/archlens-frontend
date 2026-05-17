"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const accepted = localStorage.getItem("cookie-consent");
    if (!accepted) setVisible(true);
  }, []);

  function accept() {
    localStorage.setItem("cookie-consent", "accepted");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border px-4 py-3 shadow-lg">
      <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
        <p className="text-sm text-muted-foreground">
          Usamos cookies essenciais para o funcionamento da plataforma. Ao
          continuar, você concorda com nossa{" "}
          <Link href="/privacy-policy" className="underline hover:text-foreground">
            Política de Privacidade
          </Link>{" "}
          em conformidade com a{" "}
          <span className="font-medium text-foreground">LGPD</span>.
        </p>
        <button
          onClick={accept}
          className="shrink-0 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Entendi e aceito
        </button>
      </div>
    </div>
  );
}
