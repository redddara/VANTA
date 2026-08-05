import { redirect } from "next/navigation";

/** Old routes — reputation is set one member at a time. */
export default function AdminReputationRedirect() {
  redirect("/reputation/new");
}
