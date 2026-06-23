import { redirect } from "next/navigation";

/**
 * Root redirect: / → /platform
 */
export default function RootPage() {
  redirect("/platform");
}
