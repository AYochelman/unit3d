import { Shell } from "@/components/Shell";
import { SettingsClient } from "./SettingsClient";

export const metadata = { title: "Settings · Reference Studio" };

export default function SettingsPage() {
  return (
    <Shell>
      <SettingsClient />
    </Shell>
  );
}
