import { Shell } from "@/components/Shell";
import { ProjectsClient } from "./ProjectsClient";

export const metadata = { title: "Projects · Reference Studio" };

export default function ProjectsPage() {
  return (
    <Shell>
      <ProjectsClient />
    </Shell>
  );
}
