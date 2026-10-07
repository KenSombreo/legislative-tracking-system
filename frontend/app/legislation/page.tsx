"use client";

import LegislationListPage from "../../components/legislation/LegislationListPage";

export default function LegislationPage() {
  return <LegislationListPage title="All Legislation" endpoint="/legislation" newHref="/legislation/new" />;
}
