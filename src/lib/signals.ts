export type SoftSignalKind =
  | "hug"
  | "miss_you"
  | "thinking"
  | "kiss"
  | "proud";

export const SOFT_SIGNALS: {
  kind: SoftSignalKind;
  label: string;
  blurb: string;
  /** System-voiced line shown on the live overlay */
  message: string;
  phrase: string;
  illustration: string;
}[] = [
  {
    kind: "hug",
    label: "Hug",
    blurb: "Wrap them up",
    message: "A warm hug",
    phrase: "a hug",
    illustration: "/brand/signals/signal-hug.png",
  },
  {
    kind: "miss_you",
    label: "Miss you",
    blurb: "Soft ache",
    message: "You’re missed",
    phrase: "a miss-you",
    illustration: "/brand/signals/signal-miss-you.png",
  },
  {
    kind: "thinking",
    label: "Thinking",
    blurb: "On your mind",
    message: "Thinking of you",
    phrase: "a thinking-of-you",
    illustration: "/brand/signals/signal-thinking.png",
  },
  {
    kind: "kiss",
    label: "Kiss",
    blurb: "A little peck",
    message: "A soft kiss",
    phrase: "a kiss",
    illustration: "/brand/signals/signal-kiss.png",
  },
  {
    kind: "proud",
    label: "Proud",
    blurb: "Cheer them on",
    message: "Someone’s proud of you",
    phrase: "a proud-of-you",
    illustration: "/brand/signals/signal-proud.png",
  },
];

export function signalMeta(kind: SoftSignalKind) {
  return (
    SOFT_SIGNALS.find((s) => s.kind === kind) ?? SOFT_SIGNALS[0]!
  );
}
