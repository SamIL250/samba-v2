"use client";

export function CelebrationCard({
  kind,
  title,
  body,
  illustration,
}: {
  kind: "anniversary" | "birthday";
  title: string;
  body: string;
  illustration: string;
}) {
  return (
    <section
      className={`samba-panel relative overflow-hidden px-5 py-6 sm:px-6 ${
        kind === "anniversary"
          ? "border-[color:var(--samba-accent)]"
          : "border-[color:var(--samba-border)]"
      }`}
    >
      <div
        aria-hidden
        className="absolute -right-8 -top-8 h-36 w-36 rounded-full bg-[color:var(--samba-glow)]/50 blur-2xl"
      />
      <div className="relative flex flex-col items-center gap-4 text-center sm:flex-row sm:items-center sm:text-left">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={illustration}
          alt=""
          className="h-28 w-28 shrink-0 object-contain sm:h-32 sm:w-32"
        />
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[color:var(--samba-accent)]">
            {kind === "anniversary" ? "Anniversary" : "Birthday"}
          </p>
          <h2 className="mt-1 font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight sm:text-3xl">
            {title}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[color:var(--samba-ink)]/65">
            {body}
          </p>
        </div>
      </div>
    </section>
  );
}
