/** Pull a human message out of Convex / generic thrown errors. */
export function cleanErrorMessage(err: unknown, fallback: string): string {
  const raw =
    err instanceof Error
      ? err.message
      : typeof err === "string"
        ? err
        : fallback;

  const uncaught = raw.match(/Uncaught Error:\s*(.+?)(?:\s+at\s|\s*$)/i);
  if (uncaught?.[1]) return uncaught[1].trim();

  const server = raw.match(/Server Error\s+(.+?)(?:\s+at\s|\s*$)/i);
  if (server?.[1]) {
    return server[1].replace(/^Uncaught Error:\s*/i, "").trim();
  }

  if (raw.includes("[CONVEX")) {
    const after = raw.split("\n").find((line) => /Error:/i.test(line));
    if (after) {
      return after.replace(/^.*Error:\s*/i, "").replace(/\s+at\s.*$/i, "").trim();
    }
  }

  return raw.length > 120 ? fallback : raw || fallback;
}

export type FieldKey = "name" | "code" | "label" | "theme" | "form";

export function mapOnboardingError(
  err: unknown,
  mode: "create" | "join",
): { field: FieldKey; message: string } {
  const message = cleanErrorMessage(
    err,
    mode === "create" ? "Could not create your couple" : "Could not join",
  );
  const lower = message.toLowerCase();

  if (
    lower.includes("invite") ||
    lower.includes("code") ||
    lower.includes("expired") ||
    lower.includes("already used") ||
    lower.includes("invalid")
  ) {
    return { field: "code", message };
  }
  if (lower.includes("name") || lower.includes("too short")) {
    return { field: "name", message };
  }
  if (lower.includes("label") || lower.includes("already belong")) {
    return {
      field: lower.includes("already belong") ? "form" : "label",
      message: lower.includes("already belong")
        ? "You already belong to a couple"
        : message,
    };
  }
  if (lower.includes("full") || lower.includes("own invite")) {
    return { field: "code", message };
  }

  return { field: mode === "join" ? "code" : "form", message };
}
