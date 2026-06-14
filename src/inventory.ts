import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "./config.js";
import { log } from "./logger.js";

let client: SupabaseClient | null = null;
function db(): SupabaseClient | null {
  if (config.inventoryDb.url && config.inventoryDb.key && !client) {
    client = createClient(config.inventoryDb.url, config.inventoryDb.key);
  }
  return client;
}

export interface AvailabilitySummary {
  term: string;
  branches: { branch_name: string; sku_count: number; sample: string[] }[];
  anyStock: boolean;
}

/**
 * Soft availability lookup against the read-only `view_branch_availability` view.
 * Returns per-branch SKU counts + a few sample product names. Intentionally NEVER
 * returns exact unit counts to the caller (data can be stale) — see guardrails.
 * Degrades gracefully (null) if the inventory DB isn't configured.
 */
export async function checkAvailability(term: string, branchCode?: string): Promise<AvailabilitySummary | null> {
  const sb = db();
  if (!sb) { log.warn("inventory not configured; skipping availability lookup"); return null; }

  const safe = term.replace(/[%,]/g, " ").trim().slice(0, 60);
  let q = sb.from("view_branch_availability")
    .select("branch_name, product_name")
    .or(`product_name.ilike.%${safe}%,category.ilike.%${safe}%`)
    .limit(300);
  if (branchCode) q = q.eq("location_code", branchCode);

  const { data, error } = await q;
  if (error) { log.error("inventory query failed", error.message); return null; }

  const byBranch = new Map<string, string[]>();
  for (const row of data ?? []) {
    const list = byBranch.get(row.branch_name) ?? [];
    if (list.length < 3) list.push(row.product_name);
    byBranch.set(row.branch_name, list);
  }
  const branches = [...byBranch.entries()]
    .map(([branch_name, sample]) => ({ branch_name, sku_count: (data ?? []).filter((r) => r.branch_name === branch_name).length, sample }))
    .sort((a, b) => b.sku_count - a.sku_count);

  return { term: safe, branches, anyStock: branches.length > 0 };
}
