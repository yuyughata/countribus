import Link from "next/link";
import { FileSignature } from "lucide-react";

/** Persistent band shown to operators whose current Partner Agreement is unsigned. */
export function AgreementBanner({ version }: { version: number }) {
  return (
    <div className="border-warning/40 bg-warning-soft text-warning flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b px-4 py-2.5 text-sm sm:px-5">
      <FileSignature className="size-4 shrink-0" />
      <span className="font-medium">
        Action needed: the Countribus Partner Agreement (v{version}) is awaiting your signature.
      </span>
      <Link
        href="/dashboard/agreement"
        className="text-warning ml-auto shrink-0 font-semibold underline underline-offset-2 hover:no-underline"
      >
        Review &amp; sign
      </Link>
    </div>
  );
}
