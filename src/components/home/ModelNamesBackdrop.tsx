// Ambient names live only in dedicated bands above/below the auth copy. Clipping
// each band and padding the copy guarantees a clear zone at every viewport size;
// font loading and text wrapping cannot place a name beside the product message.
const GROUPS = {
  above: [
    { name: "Claude Sonnet 4.5", dur: 7.5, delay: 0 },
    { name: "Amazon Nova Lite", dur: 8.5, delay: 1.4 },
    { name: "Gemini 2.5 Flash", dur: 8, delay: 3.6 },
    { name: "Amazon Nova 2 Lite", dur: 9, delay: 1.1 },
  ],
  below: [
    { name: "Claude Haiku 4.5", dur: 6.5, delay: 0.7 },
    { name: "Gemini 2.5 Flash", dur: 8, delay: 2.3 },
    { name: "DeepSWE-32B", dur: 7, delay: 2.7 },
    { name: "GPT-5", dur: 6, delay: 3.1 },
  ],
};

export function ModelNamesBackdrop({ position }: { position: keyof typeof GROUPS }) {
  return (
    <div aria-hidden className={`auth-ambient auth-ambient-${position}`}>
      {GROUPS[position].map((model, i) => (
        <span key={model.name}
          style={{
            animation: `modelFloat ${model.dur}s ease-in-out ${model.delay}s infinite`,
            justifySelf: i % 2 ? "end" : "start",
          }}
          className="model-name whitespace-nowrap font-mono text-xs text-signal opacity-0 lg:text-sm">
          {model.name}
        </span>
      ))}
    </div>
  );
}
