import { IconCamera } from "@tabler/icons-react";

import { PageHeader } from "@/components/waste/PageHeader";
import { ReportWizard } from "@/components/waste/ReportWizard";

export function meta() {
  return [{ title: "Report Garbage · WasteWise AI" }];
}

export default function ReportRoute() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Report Garbage"
        description="Take a photo or upload an image of the dumped waste."
        icon={IconCamera}
      />
      <ReportWizard />
    </div>
  );
}
