import { FlatCompat } from "@eslint/eslintrc";
import path from "node:path";
import { fileURLToPath } from "node:url";

const compat = new FlatCompat({ baseDirectory: path.dirname(fileURLToPath(import.meta.url)) });

const eslintConfig = [
  ...compat.extends("next/core-web-vitals"),
  {
    ignores: [".next/**", "node_modules/**", "db/migrations/**"],
  },
];

export default eslintConfig;
