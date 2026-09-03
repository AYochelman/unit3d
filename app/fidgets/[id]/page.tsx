import { FIDGETS } from "@/lib/data";
import FidgetDetailClient from "./FidgetDetailClient";

export function generateStaticParams() {
  return FIDGETS.map((f) => ({ id: f.id }));
}

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const f = FIDGETS.find((x) => x.id === id);
  return {
    title: f ? `${f.name} · Unit 3D` : "פידג'ט · Unit 3D",
    description: f?.desc ?? "",
  };
}

export default async function FidgetDetailPage({ params }: Props) {
  const { id } = await params;
  return <FidgetDetailClient id={id} />;
}
