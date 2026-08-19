import { LogoIcon } from "@/components/logo";
import { ShieldCheck } from "lucide-react";

export const CreditCardIllustration = () => (
  <div aria-hidden className="grid h-full grid-cols-6 gap-px">
    <div className="*:p-2! grid grid-rows-3 gap-y-px">
      <div data-grid-content />
      <div data-grid-content />
      <div data-grid-content />
    </div>
    <div className="col-span-4 grid grid-rows-[1fr_auto_1fr] gap-y-px">
      <div data-grid-content />

      <div data-grid-content className="h-fit! p-2! relative">
        <Card />
      </div>

      <div className="grid grid-cols-3 gap-x-px">
        <div
          data-grid-content
          className="p-4! flex items-center justify-center"
        >
          <span className="text-muted-foreground font-mono text-xs uppercase">
            Claim filed
          </span>
        </div>
        <div
          data-grid-content
          className="p-4! flex items-center justify-center"
        >
          <span className="text-muted-foreground font-mono text-xs uppercase">
            Bond drawn
          </span>
        </div>
        <div
          data-grid-content
          className="p-4! flex items-center justify-center"
        >
          <span className="font-mono text-xs uppercase text-emerald-600 dark:text-emerald-400">
            Paid on-chain
          </span>
        </div>
      </div>
    </div>
    <div className="*:p-2! grid grid-rows-3 gap-y-px">
      <div data-grid-content />
      <div data-grid-content />
      <div data-grid-content />
    </div>
  </div>
);

const Card = () => {
  return (
    <div className="ring-foreground/15 bg-card relative z-10 flex aspect-video w-full flex-col justify-between overflow-hidden rounded-2xl border border-transparent px-6 py-5 shadow-2xl shadow-emerald-950/15 ring-1">
      <div className="flex items-center justify-between">
        <LogoIcon />
        <ShieldCheck className="size-5 fill-emerald-200 stroke-emerald-900" />
      </div>

      <div className="flex justify-between">
        <div className="space-y-0.5 *:block">
          <span className="text-muted-foreground text-xs">checkout-agent</span>
          <span className="font-mono text-sm font-medium">
            BND-7F3A 9C21 04D8
          </span>
        </div>
        <div className="space-y-0.5 *:block">
          <span className="text-muted-foreground text-xs">Coverage</span>
          <span className="font-mono text-sm font-medium">$50,000</span>
        </div>
      </div>
    </div>
  );
};
