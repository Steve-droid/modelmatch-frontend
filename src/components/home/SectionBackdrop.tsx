// Shared treatment for the home sections' decorative backdrops, so all three look
// uniform: a centred, dimmed, blurred motif with a vignette over it that keeps the
// foreground copy legible. Each section passes its own on-brand SVG (cyan line-art).
// `maxW` / `blurClass` / `opacityClass` let a section tune presence — e.g. the animated
// pipeline runs wider + crisper so its flow is readable. Decorative → aria-hidden.
export function SectionBackdrop({
  children,
  maxW = "max-w-5xl lg:max-w-6xl 2xl:max-w-7xl",
  blurClass = "blur-[2px]",
  opacityClass = "opacity-[0.22]",
}: {
  children: React.ReactNode;
  maxW?: string;
  blurClass?: string;
  opacityClass?: string;
}) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
      <div className={`h-full w-full ${opacityClass} ${blurClass} ${maxW}`}>{children}</div>
      <div className="absolute inset-0 bg-canvas/55" />
    </div>
  );
}
