import { redirect } from "next/navigation";

// Sidequests are now a normal division — creating one goes through the
// standard new-project flow with the division preselected. Kept as a
// redirect so old links/bookmarks still work.
export default function NewSidequestPage() {
  redirect("/games/new?division=SIDEQUESTS");
}
