// Create-section backdrop: model names from the catalog fading in and out at scattered
// positions — a sense of ModelMatch scanning the field of models to match you to one.
// Mono cyan (model-id treatment), low-contrast, with a vignette over the top so the
// foreground copy stays legible. Decorative → aria-hidden. The fade loop is the
// `modelFloat` keyframe in index.css.
const MODELS = [
  { name: "Claude Sonnet 4.5", top: "16%", left: "9%", dur: 7.5, delay: 0 },
  { name: "Amazon Nova Lite", top: "24%", left: "70%", dur: 8.5, delay: 1.4 },
  { name: "Claude Haiku 4.5", top: "68%", left: "13%", dur: 6.5, delay: 0.7 },
  { name: "Gemini 2.5 Flash", top: "76%", left: "64%", dur: 8, delay: 2.3 },
  { name: "GPT-5", top: "40%", left: "82%", dur: 6, delay: 3.1 },
  { name: "Amazon Nova 2 Lite", top: "32%", left: "20%", dur: 9, delay: 1.1 },
  { name: "DeepSWE-32B", top: "60%", left: "80%", dur: 7, delay: 2.7 },
  { name: "Claude Haiku 4.5", top: "84%", left: "30%", dur: 7.5, delay: 4 },
  { name: "Gemini 2.5 Flash", top: "12%", left: "44%", dur: 8, delay: 3.6 },
];

export function ModelNamesBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {MODELS.map((m, i) => (
        <span
          key={i}
          style={{
            top: m.top,
            left: m.left,
            animation: `modelFloat ${m.dur}s ease-in-out ${m.delay}s infinite`,
          }}
          className="absolute whitespace-nowrap font-mono text-sm text-signal opacity-0 lg:text-base"
        >
          {m.name}
        </span>
      ))}
      {/* vignette so the centre copy stays legible over the names */}
      <div className="absolute inset-0 bg-canvas/45" />
    </div>
  );
}
