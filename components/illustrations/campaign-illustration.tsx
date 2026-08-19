export const CampaignIllustration = () => (
  <div aria-hidden className="relative z-10 w-full text-xs">
    <div className="mb-6 flex gap-2">
      <span className="size-2.5 rounded-full border" />
      <span className="size-2.5 rounded-full border" />
      <span className="size-2.5 rounded-full border" />
    </div>

    <div>
      <div className="mb-0.5 text-base font-medium">Bond</div>
      <div className="mb-4 flex gap-2 text-sm">
        <span>checkout-agent</span>
        <span className="text-muted-foreground">agnt…7f3a</span>
      </div>

      <div className="@sm:grid-cols-2 mb-4 grid gap-2">
        <div className="bg-illustration ring-border-illustration flex gap-2 rounded-md p-2 shadow-md shadow-black/5 ring-1">
          <div className="bg-primary w-1 rounded-full"></div>

          <div>
            <div className="text-sm font-medium">Worst Case</div>
            <div className="text-muted-foreground line-clamp-1">
              $50,000 pre-funded
            </div>
          </div>
        </div>
        <div className="bg-illustration ring-border-illustration flex gap-2 rounded-md p-2 shadow-md shadow-black/5 ring-1">
          <div className="bg-primary w-1 rounded-full"></div>

          <div>
            <div className="text-sm font-medium">Status</div>
            <div className="text-muted-foreground line-clamp-1">
              Active · verified on Stellar
            </div>
          </div>
        </div>
      </div>

      <p className="text-muted-foreground">
        Staked by 12{" "}
        <span className="text-foreground font-medium">
          independent auditors
        </span>
        .
      </p>
    </div>
  </div>
);
