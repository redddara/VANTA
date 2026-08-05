import { redirect } from "next/navigation";

/** Old points ledger route — the ladder lives at /admin/rep-tiers now. */
export default function AdminReputationRedirect() {
  redirect("/admin/rep-tiers");
}
