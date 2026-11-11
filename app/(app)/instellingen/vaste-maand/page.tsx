import type { Metadata } from "next";
import { FixedPicker } from "@/components/fixed/fixed-picker";
import { PageHeader } from "@/components/ui/page-header";
import { loadFixedMonthPage } from "@/lib/insights/fixed-month-page";

export const metadata: Metadata = { title: "Je vaste maand" };

export default async function VasteMaandPage() {
  const data = await loadFixedMonthPage();
  return (
    <div className="flex flex-1 flex-col">
      <PageHeader title="Je vaste maand" backHref="/instellingen" />
      <p className="px-5 pb-4 text-[15px] leading-5 text-text-muted">
        Tik aan wat elke maand terugkomt. Daarmee rekent de app uit wat je deze maand nog over hebt. De lijst komt uit je
        vorige maand ({data.periodText}).
      </p>
      <FixedPicker {...data} next="/instellingen" saveLabel="Opslaan" />
    </div>
  );
}
