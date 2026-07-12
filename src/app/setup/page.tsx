import { redirect } from "next/navigation";

export default function SetupPage() {
  redirect("/demo?phase=bootstrap");
}
