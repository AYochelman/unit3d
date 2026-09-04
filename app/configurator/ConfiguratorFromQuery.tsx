"use client";
import { useSearchParams } from "next/navigation";
import ConfiguratorClient from "./ConfiguratorClient";
import { CONFIG_PRODUCT_BY_ID } from "@/lib/products";
import type { ConfigProductId } from "@/lib/types";

/** Reads ?product=<id> so listings can deep-link into the configurator. */
export default function ConfiguratorFromQuery() {
  const params = useSearchParams();
  const raw = params?.get("product") ?? "";
  const product = (raw in CONFIG_PRODUCT_BY_ID ? raw : undefined) as ConfigProductId | undefined;
  return <ConfiguratorClient key={product ?? "default"} initialProduct={product} />;
}
