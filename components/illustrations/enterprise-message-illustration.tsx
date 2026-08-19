import { DocumentIllustation } from "@/components/illustrations/document-illustration";

export const EnterpriseMessageIllustration = () => (
  <div aria-hidden className="grid h-full grid-cols-6 gap-px">
    <div className="*:p-2! grid grid-rows-3 gap-y-px">
      <div data-grid-content />
      <div data-grid-content />
      <div data-grid-content />
    </div>

    <div className="col-span-4 grid grid-rows-3 gap-y-px">
      <div data-grid-content className="flex items-center justify-center gap-2">
        <DocumentIllustation />
        <DocumentIllustation />
        <DocumentIllustation />
      </div>

      <div data-grid-content className="p-4! flex flex-col justify-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs">Risk desk</span>
          </div>

          <div className="rounded-(--radius) bg-illustration ring-foreground/5 mt-1.5 w-4/5 rounded-tl p-3 text-xs shadow-md shadow-black/5 ring-1">
            Can we let this vendor&apos;s agent touch payouts?
          </div>
        </div>
      </div>

      <div data-grid-content className="p-4! flex flex-col justify-center">
        <div>
          <div className="rounded-(--radius) bg-primary inset-ring-foreground/10 inset-ring-1 mb-1 ml-auto w-4/5 rounded-br p-3 text-xs text-white shadow-md shadow-black/5">
            Yes — bonded for $250k, attested by three auditors.
          </div>
          <span className="text-muted-foreground block text-right text-xs">
            Now
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
