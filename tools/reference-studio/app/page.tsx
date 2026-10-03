import { Shell } from "@/components/Shell";
import { LibraryClient } from "./LibraryClient";

export const metadata = { title: "Library · Reference Studio" };

export default function LibraryPage() {
  return (
    <Shell>
      <LibraryClient />
    </Shell>
  );
}
