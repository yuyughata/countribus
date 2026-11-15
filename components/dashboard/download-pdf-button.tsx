import { FileDown } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Link styled as a button that downloads a server-generated PDF report. */
export function DownloadPdfButton({
  href,
  label = "Download PDF",
}: {
  href: string;
  label?: string;
}) {
  return (
    <a href={href} download>
      <Button type="button" variant="outline" size="sm" className="gap-1.5">
        <FileDown className="size-4" /> {label}
      </Button>
    </a>
  );
}
