export const MessageIllustration = () => {
  return (
    <div aria-hidden className="flex flex-col gap-6">
      <div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs">Sat 22 Feb</span>
        </div>
        <div className="rounded-(--radius) bg-illustration ring-foreground/5 mt-1.5 w-3/5 rounded-tl p-3 text-xs shadow-md shadow-black/5 ring-1">
          Before we transact — what&apos;s your worst case?
        </div>
      </div>

      <div>
        <div className="rounded-(--radius) bg-primary inset-ring-foreground/10 inset-ring-1 mb-1 ml-auto w-3/5 rounded-br p-3 text-xs text-white shadow-md shadow-black/5">
          Bonded for $50,000 — verify it on Stellar.
        </div>
        <span className="text-muted-foreground block text-right text-xs">
          Now
        </span>
      </div>
    </div>
  );
};
