// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// import { createClient } from "@supabase/supabase-js";

Deno.serve(async (req) => {
  try {
    const nodeToken = req.headers.get("X-TYZ-NODE-TOKEN");
    if (!nodeToken) {
      return new Response(JSON.stringify({ error: "Missing token" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
    const supabasePublic = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_ANON_KEY"));

    // TODO: Change the table_name to your table
    const { data: nodeData, error: nodeErr } = await supabaseAdmin
      .from("relay_nodes")
      .select("*")
      .eq("token", nodeToken)
      .single();

    if (nodeErr || !nodeData) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    const userEmail = `node-${nodeToken}@tyz-node.local`;
    const tmpPassword = nodeToken;

    let finalUserId: string;

    if (nodeData.shadow_user_id) {
      finalUserId = nodeData.shadow_user_id;
    } else {
      // 新建用户并写入nodes表
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: userEmail,
        password: tmpPassword,
        email_confirm: true, // 自动确认邮箱
        user_metadata: {
          source: "relay_node",
          token: nodeToken,
        },
      });

      if (createError) {
        return new Response(JSON.stringify({ error: `Create shadow user failed: ${createError}` }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }

      // 写入nodes表
      finalUserId = newUser.user.id;
      await supabaseAdmin.from("relay_nodes").update({ shadow_user_id: finalUserId }).eq("token", nodeToken);
    }

    // 检查用户邮箱是否符合格式
    const { data: existUser, error: existErr } = await supabaseAdmin.auth.admin.getUserById(finalUserId);
    if (existErr) {
      return new Response(JSON.stringify({ error: "Reteive user err" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (existUser.user.email !== userEmail) {
      await supabaseAdmin.auth.admin.updateUserById(finalUserId, { email: userEmail });
    }

    // 登录返回jwt token
    const { data: signInData, error: signInError } = await supabasePublic.auth.signInWithPassword({
      email: userEmail,
      password: tmpPassword,
    });
    if (signInError) {
      return new Response(JSON.stringify({ error: "Sign in error" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        access_token: signInData.session.access_token,
        refresh_token: signInData.session.refresh_token,
        user: { id: signInData.user.id, email: signInData.user.email, metadata: signInData.user.user_metadata },
      }),
      {
        headers: { "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (err) {
    return new Response(JSON.stringify({ message: err }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
