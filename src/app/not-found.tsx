import Link from "next/link";
import { buttonVariants } from "@/components/ui/button-variants";
import { FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
      <FileQuestion className="h-12 w-12 text-muted-foreground" />
      <h2 className="text-2xl font-semibold">Pagina nao encontrada</h2>
      <p className="text-muted-foreground">
        A pagina que voce procura nao existe ou foi removida.
      </p>
      <Link href="/" className={buttonVariants({ variant: "outline" })}>
        Voltar ao inicio
      </Link>
    </div>
  );
}
