import { redirect } from "next/navigation";

/** Would You Rather is temporarily disabled — keep route for old links. */
export default function WouldYouRatherPage() {
  redirect("/play");
}
