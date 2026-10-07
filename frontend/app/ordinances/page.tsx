"use client";

import LegislationListPage from "../../components/legislation/LegislationListPage";
import { DocumentType } from "../../lib/config/legislationFields";

export default function OrdinancesPage() {
  return (
    <LegislationListPage
      title="Ordinances"
      endpoint="/legislation/ordinances"
      documentTypePreset={DocumentType.ORDINANCE}
      newHref="/legislation/new?type=ORDINANCE"
    />
  );
}
