import { redirect } from "next/navigation";

/** Merged into Log Remit — one place to log for yourself or (staff) others. */
export default function SubmitRemitRedirect() {
  redirect("/remit/mine");
}
