import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md items-center">
      <EmptyState
        icon={<Compass size={28} />}
        title="Deze pagina bestaat niet"
        description="Misschien is de link verouderd. Ga terug naar het overzicht."
        action={<ButtonLink href="/">Naar het overzicht</ButtonLink>}
      />
    </div>
  );
}
