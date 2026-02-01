import { createClient, User } from "@supabase/supabase-js";
import type { AuthData } from "../src/types/auth";

const client = createClient(
  "https://ennpjhprkvbykavcgaun.supabase.co",
  "sb_publishable_VFaZEZ1gQQrJ17UYbUVhBg_RWCCSkSM",
);

const { data: authData, error: authErr } = (await client.functions.invoke("node-auth", {
  headers: { "X-TYZ-NODE-TOKEN": "7ae0884c-d428-4043-a73c-5e4e4bd3dfaf" },
})) as { data: AuthData; error: any };

console.log(authData);
console.error(authErr);

const { data: sessionData, error: sessionErr } = await client.auth.setSession({
  access_token: authData.access_token,
  refresh_token: authData.refresh_token,
});

if (sessionErr) {
  console.error("Login error", sessionErr);
} else {
  console.log("Login success", sessionData.user);
}

const { data: userData } = await client.auth.getUser();
console.log("当前用户 ID:", userData.user?.id);

const { data: relayNodes, error } = await client.from("relay_nodes").select("id");

console.log(relayNodes);
console.log(error);

const dbChannel = client
  .channel("schema-db-changes")
  .on("postgres_changes", { schema: "public", event: "*" }, (payload) => console.log(payload))
  .subscribe();
