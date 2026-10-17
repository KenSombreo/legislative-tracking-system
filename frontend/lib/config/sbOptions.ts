// Fixed pick-lists for the legislation forms. Edit these when the SB composition changes.

export const SB_MEMBERS = [
  "Hon. Ruel M. Barba",
  "Hon. Alex C. Lim",
  "Hon. Rodolfo C. Cuares",
  "Hon. Victor L. Chua, Jr.",
  "Hon. John Wilben C. Chua",
  "Hon. Thelma E. Comabig",
  "Hon. Restituto E. Handayan",
  "Hon. Eduardo I. Cero",
  "Hon. Manuel B. Uy-Oco, Jr.",
  "Hon. Rechel A. Niepes",
];

export const SB_COMMITTEES = [
  "Committee on Rules and Privileges and Accountability of Public Officials, Good Governance and Public Ethics and Ordinances and Legal Matters",
  "Committee on Finance, Budget and Appropriations and Ways and Means",
  "Committee on Youth and Sports Development",
  "Committee on Tourism & Natural Resources and Environmental Protection",
  "Committee on Police Matters, Public Safety and Security and Human Rights & Climate Change and Disaster",
  "Committee on Public Works, Infrastructure and Special Projects",
  "Committee on Transportation",
  "Committee on Science, Information, Communication Technology and Innovation",
  "Committee on Market, Slaughter and Water Services",
  "Committee on Barangay Affairs",
  "Committee on Trade, Commerce and Industry, Cooperative",
  "Committee on Agriculture and Fisheries",
  "Committee on Women and Family and Social Welfare",
  "Committee on Health and Sanitation",
  "Committee on Education, Culture and the Arts",
  "Committee on Senior Citizen and Person with Disability (PWD)",
  "Committee on Labor and Employment",
];

// PDP pillars, by pillar and focus area. An ordinance is tagged with one of the items.
// TODO: add pillars II and III.
const PDP_PILLAR_TREE: { pillar: string; areas: { area: string; items: string[] }[] }[] = [
  {
    pillar: "I. Human Capital Development",
    areas: [
      {
        area: "1. Education-Focused Ordinances",
        items: ["Local Scholarship", "Alternative Learning System (ALS) Support", "Early Childhood Care and Development (ECCD)"],
      },
      {
        area: "2. Skills Training and Livelihood Ordinances",
        items: ["Skills Development and Livelihood Training Center", "Youth Employability", "Local Internship Program"],
      },
      {
        area: "3. Health-Focused Ordinances",
        items: ["Healthcare (UHC-Local Implementation)", "Nutrition Improvement", "Mental Health and Wellness"],
      },
    ],
  },
  {
    pillar: "IV. Climate & Disaster Resilience",
    areas: [
      {
        area: "1. Climate Change Adaptation and Mitigation",
        items: [
          "Local Climate Change Action Plan (LCCAP) Adoption",
          "Green Building and Climate-Smart Infrastructure",
          "Urban Greening and Tree-Planting",
        ],
      },
      {
        area: "2. Disaster Risk Reduction and Emergency Preparedness",
        items: [
          "Local Disaster Risk Reduction and Management (LDRRM) Institutionalization",
          "Community-Based Early Warning System",
          "Evacuation Center and Safe Shelter Standards",
        ],
      },
      {
        area: "3. Environmental Protection and Risk Reduction",
        items: ["Solid Waste Management and Plastic Regulation", "Watershed and Coastal Management", "Climate Resilient Agriculture"],
      },
    ],
  },
  {
    pillar: "V. Good Governance & Social Protection",
    areas: [
      {
        area: "1. Good Governance, Transparency, and Accountability",
        items: [
          "Full Disclosure and Transparency",
          "Citizens' Charter and Anti-Red Tape",
          "Participatory Governance and Local Special Bodies (LSB) Strengthening",
        ],
      },
      {
        area: "2. Social Protection and Inclusion",
        items: [
          "Socialized Housing and Informal Settler Support",
          // Local Sectoral Support: a separate ordinance for each priority sector.
          "Local Sectoral Support: Persons with Disability (PWDs)",
          "Local Sectoral Support: Senior Citizens",
          "Local Sectoral Support: Solo Parents and Women",
          "Local Sectoral Support: Children",
          "Local Social Protection Program",
        ],
      },
      {
        area: "3. Institutional Integrity and Service Delivery",
        items: [
          "Local Performance and Accountability Review",
          "Integrity and Ethics in Public Service",
          "Barangay Good Governance Incentives",
        ],
      },
    ],
  },
];

// For <optgroup>s in the pick-list.
export const PDP_PILLAR_GROUPS = PDP_PILLAR_TREE.flatMap((p) =>
  p.areas.map((a) => ({ label: `${p.pillar} — ${a.area}`, options: a.items }))
);

export const PDP_PILLARS = PDP_PILLAR_GROUPS.flatMap((g) => g.options);
