import { redirect } from "next/navigation";

/** Ladder editor removed — use Set Reputation for each member. */
export default function AdminRepTiersRedirect() {
  redirect("/reputation/new");
}
