"use client";

import LegislationListPage from "../../components/legislation/LegislationListPage";
import { DocumentType } from "../../lib/config/legislationFields";

export default function AppropriationOrdinancesPage() {
  return (
    <LegislationListPage
      title="Appropriation Ordinances"
      endpoint="/legislation/appropriation-ordinances"
      documentTypePreset={DocumentType.APPROPRIATION_ORDINANCE}
      newHref="/legislation/new?type=APPROPRIATION_ORDINANCE"
    />
  );
}
