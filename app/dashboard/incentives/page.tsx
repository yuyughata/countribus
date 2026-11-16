import { redirect } from "next/navigation";

// Staff incentives now live inside Team management (/dashboard/permissions).
export default function IncentivesRedirect() {
  redirect("/dashboard/permissions");
}
