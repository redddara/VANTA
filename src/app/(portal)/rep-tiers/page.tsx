import { redirect } from "next/navigation";

/** Ladder removed — reputation is set per member. */
export default function RepTiersRedirect() {
  redirect("/dashboard");
}
