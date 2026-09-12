import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = [
  ...nextCoreWebVitals,
  { ignores: [".netlify/**", ".next/**", "tmp/**"] },
  {
    // Three older components set state inside effects (atlas-staff-pane,
    // lions-den-activation-checklist, micah-week-gallery). Rewriting them is
    // its own change; until then this stays visible as a warning, not a CI failure.
    rules: { "react-hooks/set-state-in-effect": "warn" },
  },
];

export default eslintConfig;
