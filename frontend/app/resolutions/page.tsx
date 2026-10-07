"use client";

import LegislationListPage from "../../components/legislation/LegislationListPage";
import { DocumentType } from "../../lib/config/legislationFields";

export default function ResolutionsPage() {
  return (
    <LegislationListPage
      title="Resolutions"
      endpoint="/legislation/resolutions"
      documentTypePreset={DocumentType.RESOLUTION}
      newHref="/legislation/new?type=RESOLUTION"
    />
  );
}
