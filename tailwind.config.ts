import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}", "./node_modules/streamdown/dist/*.js"],
  theme: { extend: {} },
  plugins: [],
};

export default config;
