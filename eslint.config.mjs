import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = [
  ...nextCoreWebVitals,
  { ignores: [".netlify/**", ".next/**", "tmp/**"] },
];

export default eslintConfig;
