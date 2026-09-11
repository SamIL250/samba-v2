export function EmptyState({
  title,
  body,
  action,
  illustration,
  illustrationAlt = "",
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
  illustration?: string;
  illustrationAlt?: string;
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-6 py-16 text-center">
      {illustration ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={illustration}
          alt={illustrationAlt}
          className="mb-5 h-40 w-40 object-contain sm:h-48 sm:w-48"
        />
      ) : (
        <div className="mb-4 h-16 w-16 rounded-full border border-[color:var(--samba-border)] bg-[color:var(--samba-accent)]/20" />
      )}
      <h2 className="font-[family-name:var(--font-display)] font-bold tracking-tight text-2xl text-[color:var(--samba-ink)]">
        {title}
      </h2>
      <p className="mt-2 text-[color:var(--samba-muted)]">{body}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
