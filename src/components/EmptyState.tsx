export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-6 py-16 text-center">
      <div className="mb-4 h-16 w-16 rounded-full border border-[color:var(--samba-border)] bg-[color:var(--samba-accent)]/20" />
      <h2 className="font-[family-name:var(--font-display)] font-bold tracking-tight text-2xl text-[color:var(--samba-ink)]">
        {title}
      </h2>
      <p className="mt-2 text-[color:var(--samba-muted)]">{body}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
