import { Compass } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center">
      <EmptyState
        icon={<Compass size={28} strokeWidth={1.75} />}
        title="Deze pagina is zoek"
        description="Misschien is de link oud of klopt er een letter niet."
        action={
          <ButtonLink href="/" size="lg">
            Naar de app
          </ButtonLink>
        }
      />
    </main>
  );
}
