/** @type {import('tailwindcss').Config} */
// ModelMatch "DevOps Command Center" theme: dark by default, near-black canvas,
// soft elevated panels, semantic status accents (green=banked / amber=unrated /
// red=quality-risk / cyan=model·CI). Monospace for money, tokens, ids.
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#0a0b0d", // near-black background
        panel: "#141619", // elevated card surface
        "panel-2": "#1b1e23", // a slightly lighter inset (used sparingly, no nested cards)
        border: "#262a31",
        muted: "#8b929e", // secondary text
        faint: "#5b626d", // tertiary / axis text
        banked: "#22c55e", // green  — banked savings / passing quality
        unrated: "#f59e0b", // amber  — unrated / pending review
        risk: "#ef4444", // red    — quality risk / failed gate
        signal: "#5b93a8", // muted steel-cyan — model / CI / infra signals
        accent: "#6366f1", // indigo — primary brand action
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
};
