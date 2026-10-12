import { redirect } from "next/navigation";

// The phone "More" tab was replaced by the ☰ menu; old links land on the dashboard home.
export default function MorePage() {
  redirect("/dashboard");
}
