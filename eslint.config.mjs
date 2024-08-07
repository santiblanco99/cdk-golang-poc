import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import stylisticJs from "@stylistic/eslint-plugin-js";

export default [
  { files: ["**/*.{js,mjs,cjs,ts}"] },
  { languageOptions: { globals: globals.browser } },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  { plugins: { "@stylistic/js": stylisticJs } },
  {
    rules: {
      "no-multi-spaces": "error",
      "no-trailing-spaces": "error",
      "no-irregular-whitespace": "error",
      "no-multiple-empty-lines": ["error", { max: 1 }],
      "@stylistic/js/indent": ['error', 2],
    },
  },
];
