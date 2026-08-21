import Link from "next/link";
import { FileQuestion } from "lucide-react";

export default function CertificateNotFound() {
  return (
    <div className="mx-auto w-full max-w-xl px-4 py-24 text-center sm:px-6">
      <div className="bg-muted/60 mx-auto grid size-11 place-items-center rounded-full">
        <FileQuestion aria-hidden className="text-muted-foreground size-5" />
      </div>
      <h1 className="text-foreground mt-4 text-2xl font-semibold">
        No such certificate
      </h1>
      <p className="text-muted-foreground mt-2 text-balance">
        Nothing has been issued under that id. It may never have existed, or the
        link may be mistyped.
      </p>
      <Link
        href="/app"
        className="text-primary mt-5 inline-block text-sm font-medium hover:underline"
      >
        Back to the marketplace
      </Link>
    </div>
  );
}
