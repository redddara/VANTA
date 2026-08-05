import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Weekly quota" };

/** Weekly Quota lives inside Remit Tracker now. */
export default function RemitCompliancePage() {
  redirect("/remit/tracker");
}
