"use client";
import { useSearchParams } from "next/navigation";
import ConfiguratorClient from "./ConfiguratorClient";
import { CONFIG_PRODUCT_BY_ID } from "@/lib/products";
import type { ConfigProductId } from "@/lib/types";

/** Reads ?product=<id> so listings can deep-link into the configurator. */
export default function ConfiguratorFromQuery() {
  const params = useSearchParams();
  const raw = params?.get("product") ?? "";
  // Object.hasOwn, not `in`: `in` is also true for inherited keys like
  // "constructor" and "__proto__", which would pass a non-product through.
  const product = (Object.hasOwn(CONFIG_PRODUCT_BY_ID, raw) ? raw : undefined) as ConfigProductId | undefined;
  // ?from=<catalogue id> — which shelf product sent the customer here.
  const from = params?.get("item") || params?.get("from") || undefined;
  return <ConfiguratorClient key={`${product ?? "default"}:${from ?? ""}`} initialProduct={product} fromItem={from} />;
}
