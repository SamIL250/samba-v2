import type { CSSProperties } from "react";

/** Soft pulse block used to mirror page layout while data loads. */
export function Skeleton({
  className = "",
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      aria-hidden
      style={style}
      className={`animate-pulse rounded-lg bg-[color:var(--samba-ink)]/[0.07] ${className}`}
    />
  );
}

function PageHeaderSkeleton({ wideTitle = false }: { wideTitle?: boolean }) {
  return (
    <div className="space-y-2">
      <Skeleton className="h-3 w-20 rounded-full" />
      <Skeleton className={`h-9 ${wideTitle ? "w-56" : "w-40"} rounded-xl`} />
      <Skeleton className="h-4 w-64 max-w-full rounded-md" />
    </div>
  );
}

export function HomeSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading home">
      <section className="samba-panel relative overflow-hidden px-6 py-10">
        <div className="absolute right-4 top-4 flex flex-col items-center gap-2 sm:right-6 sm:top-6">
          <Skeleton className="h-24 w-[4.75rem] rounded-[999px] sm:h-28 sm:w-[5.5rem]" />
          <Skeleton className="h-10 w-10 rounded-full" />
        </div>
        <div className="pr-[6.5rem] md:pr-36">
          <Skeleton className="h-3 w-16 rounded-full" />
          <Skeleton className="mt-3 h-12 w-48 max-w-full rounded-xl md:h-14 md:w-64" />
          <div className="mt-4 flex items-center gap-3">
            <div className="flex -space-x-3">
              <Skeleton className="h-12 w-12 rounded-full" />
              <Skeleton className="h-12 w-12 rounded-full" />
            </div>
            <Skeleton className="h-4 w-36 rounded-md" />
          </div>
        </div>
      </section>
      <section className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="samba-panel rounded-[1.5rem] p-6">
            <Skeleton className="h-7 w-24 rounded-lg" />
            <Skeleton className="mt-3 h-4 w-full rounded-md" />
            <Skeleton className="mt-2 h-4 w-[80%] rounded-md" />
          </div>
        ))}
      </section>
    </div>
  );
}

export function ChatHubSkeleton() {
  return (
    <div
      className="mx-auto w-full max-w-lg space-y-6"
      aria-busy="true"
      aria-label="Loading messages"
    >
      <PageHeaderSkeleton />
      <div className="flex items-center gap-3 rounded-[1.35rem] border border-[color:var(--samba-border)] bg-[color:var(--samba-elevated)] px-4 py-3.5">
        <Skeleton className="h-12 w-12 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-4 w-32 rounded-md" />
          <Skeleton className="h-3 w-48 max-w-full rounded-md" />
        </div>
      </div>
      <div className="space-y-3">
        <Skeleton className="h-3 w-28 rounded-full" />
        <div className="grid grid-cols-5 gap-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="aspect-square rounded-2xl" />
          ))}
        </div>
      </div>
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-2xl border border-[color:var(--samba-border)] bg-[color:var(--samba-elevated)] px-3 py-3"
          >
            <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-3.5 w-28 rounded-md" />
              <Skeleton className="h-3 w-40 max-w-full rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ChatThreadSkeleton() {
  return (
    <div
      className="fixed inset-0 z-10 flex flex-col overflow-hidden bg-[color:var(--samba-chat-chrome,#fff)]"
      aria-busy="true"
      aria-label="Loading chat"
    >
      <header className="flex shrink-0 items-center gap-3 border-b border-[color:var(--samba-border)] px-3 py-2.5 pt-[max(0.625rem,env(safe-area-inset-top))] sm:px-4">
        <Skeleton className="h-10 w-10 rounded-full" />
        <Skeleton className="h-9 w-9 rounded-full" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <Skeleton className="h-4 w-28 rounded-md" />
          <Skeleton className="h-3 w-20 rounded-md" />
        </div>
        <Skeleton className="h-10 w-10 rounded-full" />
      </header>
      <div className="min-h-0 flex-1 space-y-3 px-3 py-4 sm:px-4">
        <div className="flex justify-start">
          <Skeleton className="h-12 w-[55%] max-w-xs rounded-[1.15rem] rounded-bl-md" />
        </div>
        <div className="flex justify-end">
          <Skeleton className="h-16 w-[62%] max-w-sm rounded-[1.15rem] rounded-br-md" />
        </div>
        <div className="flex justify-start">
          <Skeleton className="h-10 w-[40%] max-w-xs rounded-[1.15rem] rounded-bl-md" />
        </div>
        <div className="flex justify-end">
          <Skeleton className="h-28 w-[58%] max-w-sm rounded-[1.15rem]" />
        </div>
        <div className="flex justify-start">
          <Skeleton className="h-14 w-[48%] max-w-xs rounded-[1.15rem] rounded-bl-md" />
        </div>
      </div>
      <div className="shrink-0 border-t border-[color:var(--samba-border)] px-3 py-2.5 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <div className="flex items-end gap-2">
          <Skeleton className="h-11 w-11 shrink-0 rounded-full" />
          <Skeleton className="h-11 min-h-[2.75rem] flex-1 rounded-[1rem]" />
          <Skeleton className="h-11 w-11 shrink-0 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function MomentsSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading moments">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-3 w-20 rounded-full" />
          <Skeleton className="h-9 w-36 rounded-xl" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-28 rounded-full" />
          <Skeleton className="h-10 w-28 rounded-full" />
        </div>
      </div>
      <div className="grid auto-rows-[7.5rem] grid-cols-2 gap-2 sm:auto-rows-[9rem] sm:grid-cols-4 sm:gap-3">
        <Skeleton className="col-span-2 row-span-2 rounded-2xl" />
        <Skeleton className="col-span-1 row-span-1 rounded-2xl" />
        <Skeleton className="col-span-1 row-span-2 rounded-2xl" />
        <Skeleton className="col-span-1 row-span-1 rounded-2xl" />
        <Skeleton className="col-span-2 row-span-1 rounded-2xl" />
        <Skeleton className="col-span-1 row-span-1 rounded-2xl" />
      </div>
    </div>
  );
}

export function WallSkeleton() {
  return (
    <div
      className="mx-auto max-w-lg space-y-5 pb-4"
      aria-busy="true"
      aria-label="Loading wall"
    >
      <div className="flex items-start gap-3 px-1">
        <Skeleton className="mt-0.5 h-10 w-10 shrink-0 rounded-full md:hidden" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="mx-auto h-3 w-24 rounded-full sm:mx-0" />
          <Skeleton className="mx-auto h-9 w-56 max-w-full rounded-xl sm:mx-0" />
        </div>
      </div>
      <div className="space-y-6">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="overflow-hidden rounded-[1.35rem] border border-[color:var(--samba-border)] bg-[color:var(--samba-elevated)]"
          >
            <div className="flex items-center gap-3 px-4 py-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-28 rounded-md" />
                <Skeleton className="h-3 w-16 rounded-md" />
              </div>
            </div>
            <Skeleton className="h-64 w-full rounded-none" />
            <div className="space-y-2 px-4 py-3">
              <div className="flex gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-8 w-8 rounded-full" />
              </div>
              <Skeleton className="h-3 w-24 rounded-md" />
              <Skeleton className="h-3 w-full rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CoupleSkeleton() {
  return (
    <div
      className="mx-auto max-w-xl space-y-5"
      aria-busy="true"
      aria-label="Loading couple profile"
    >
      <div className="flex items-start gap-3 md:hidden">
        <Skeleton className="mt-0.5 h-10 w-10 shrink-0 rounded-full" />
        <div className="min-w-0 space-y-2">
          <Skeleton className="h-3 w-16 rounded-full" />
          <Skeleton className="h-8 w-48 rounded-xl" />
        </div>
      </div>
      <div className="hidden space-y-2 md:block">
        <Skeleton className="h-3 w-16 rounded-full" />
        <Skeleton className="h-9 w-56 rounded-xl" />
        <Skeleton className="h-4 w-72 max-w-full rounded-md" />
      </div>
      <div className="samba-panel space-y-5 p-5 sm:p-6">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-3.5 w-28 rounded-md" />
            <Skeleton className="h-12 w-full rounded-[1rem]" />
          </div>
        ))}
        <div className="space-y-2">
          <Skeleton className="h-3.5 w-16 rounded-md" />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3.5 w-28 rounded-md" />
          <div className="grid grid-cols-3 gap-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        </div>
        <Skeleton className="h-12 w-full rounded-full" />
      </div>
    </div>
  );
}

export function PlaySkeleton() {
  return (
    <div
      className="mx-auto max-w-2xl space-y-6"
      aria-busy="true"
      aria-label="Loading games"
    >
      <PageHeaderSkeleton wideTitle />
      <div className="samba-panel space-y-3 p-6">
        <Skeleton className="h-3 w-24 rounded-full" />
        <Skeleton className="h-7 w-44 rounded-lg" />
        <Skeleton className="h-4 w-full max-w-md rounded-md" />
      </div>
    </div>
  );
}

export function TruthOrDareSkeleton() {
  return (
    <div
      className="mx-auto max-w-2xl space-y-6"
      aria-busy="true"
      aria-label="Loading Truth or Dare"
    >
      <div className="space-y-3">
        <Skeleton className="h-4 w-16 rounded-md" />
        <Skeleton className="h-3 w-14 rounded-full" />
        <Skeleton className="h-9 w-48 rounded-xl" />
        <Skeleton className="h-4 w-72 max-w-full rounded-md" />
      </div>
      <div className="samba-panel space-y-4 p-5 md:p-6">
        <Skeleton className="h-4 w-40 rounded-md" />
        <Skeleton className="h-12 w-full rounded-full" />
      </div>
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="samba-panel space-y-2 p-4">
            <Skeleton className="h-3 w-24 rounded-full" />
            <Skeleton className="h-4 w-full rounded-md" />
            <Skeleton className="h-3 w-28 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function AppShellSkeleton() {
  return (
    <div
      className="flex min-h-screen flex-col bg-[var(--samba-gradient,#FAF9F6)]"
      aria-busy="true"
      aria-label="Loading your space"
    >
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4">
        <Skeleton className="h-9 w-9 rounded-full" />
        <div className="hidden items-center gap-2 md:flex">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-9 w-16 rounded-full" />
          ))}
        </div>
        <Skeleton className="h-9 w-9 rounded-full" />
      </div>
      <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        <HomeSkeleton />
      </div>
    </div>
  );
}

export function OnboardingSkeleton() {
  return (
    <div
      className="flex min-h-screen items-center justify-center bg-[color:var(--samba-elevated)] px-4 py-12"
      aria-busy="true"
      aria-label="Loading"
    >
      <div className="w-full max-w-md space-y-5">
        <Skeleton className="h-12 w-12 rounded-2xl" />
        <Skeleton className="h-9 w-48 rounded-xl" />
        <Skeleton className="h-4 w-full rounded-md" />
        <div className="flex gap-2">
          <Skeleton className="h-10 flex-1 rounded-full" />
          <Skeleton className="h-10 flex-1 rounded-full" />
        </div>
        <Skeleton className="h-12 w-full rounded-[1rem]" />
        <Skeleton className="h-12 w-full rounded-[1rem]" />
        <div className="grid grid-cols-4 gap-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-12 w-full rounded-full" />
      </div>
    </div>
  );
}

export function InviteSkeleton() {
  return (
    <div
      className="flex min-h-screen items-center justify-center bg-[color:var(--samba-elevated)] px-4 py-12"
      aria-busy="true"
      aria-label="Checking invite"
    >
      <div className="w-full max-w-md space-y-4 p-8">
        <Skeleton className="h-12 w-12 rounded-2xl" />
        <Skeleton className="mt-2 h-9 w-56 max-w-full rounded-xl" />
        <Skeleton className="h-4 w-full rounded-md" />
        <Skeleton className="h-4 w-[80%] rounded-md" />
        <Skeleton className="mt-4 h-12 w-full rounded-[1rem]" />
        <Skeleton className="h-12 w-full rounded-full" />
      </div>
    </div>
  );
}
