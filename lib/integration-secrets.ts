import "server-only";
import { serviceClient } from "./server";
import { openSecret } from "./secret-crypto";
import { type IntegrationId } from "./integration-definitions";
export async function integrationSecrets(
  ids: IntegrationId[],
): Promise<Record<IntegrationId, string>> {
  const values = Object.fromEntries(
    ids.map((id) => [id, process.env[id] || ""]),
  ) as Record<IntegrationId, string>;
  const db = serviceClient();
  if (!db) return values;
  const { data, error } = await db
    .from("integration_secrets")
    .select("id,encrypted_value")
    .in("id", ids);
  if (error) {
    if (error.code === "42P01" || error.code === "PGRST205") return values;
    throw Error("INTEGRATIONS_UNAVAILABLE");
  }
  for (const row of data || []){
try{values[row.id as IntegrationId]=openSecret(row.id,row.encrypted_value,process.env.INTEGRATIONS_ENCRYPTION_KEY);}catch{values[row.id as IntegrationId]="";}
}
  return values;
}
