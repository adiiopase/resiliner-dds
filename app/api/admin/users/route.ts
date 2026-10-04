import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthenticatedUser } from "@/lib/supabaseServer";
import { getActiveSessionsMap } from "@/app/api/session/heartbeat/route";

export async function GET(req: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(req);

    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const isManager =
      user.app_metadata?.role === "manager" ||
      user.email === "adiiopase@gmail.com" ||
      user.email === "adiopa@yahoo.fr";

    if (!isManager) {
      return NextResponse.json(
        { error: "Accès refusé. Privilèges administrateur requis." },
        { status: 403 }
      );
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!serviceRoleKey || !supabaseUrl) {
      return NextResponse.json(
        { error: "Configuration serveur Supabase incomplète" },
        { status: 500 }
      );
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: usersData, error: usersError } =
      await adminClient.auth.admin.listUsers();

    if (usersError) {
      return NextResponse.json(
        { error: usersError.message },
        { status: 500 }
      );
    }

    // Get documents count and total size for each user
    const { data: documentsData } = await adminClient
      .from("documents")
      .select("user_id, size_bytes, created_at");

    // Get quotas
    const { data: quotasData } = await adminClient
      .from("user_quotas")
      .select("user_id, used_bytes, quota_limit_bytes");

    // Retrieve active sessions from server cache
    const sessionsMap = getActiveSessionsMap();
    const cutoff = Date.now() - 45000;
    const activeSessions = Array.from(sessionsMap.values()).filter(
      (s) => s.lastSeen >= cutoff
    );

    const users = usersData.users.map((u) => {
      const userDocs = documentsData?.filter((d) => d.user_id === u.id) || [];
      const totalBytes = userDocs.reduce(
        (sum, d) => sum + (d.size_bytes || 0),
        0
      );
      const quotaInfo = quotasData?.find((q) => q.user_id === u.id);
      const isOnline = activeSessions.some((s) => s.userId === u.id || s.email === u.email);

      return {
        id: u.id,
        email: u.email,
        role: u.app_metadata?.role || "user",
        confirmed_at: u.email_confirmed_at,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        document_count: userDocs.length,
        storage_bytes: totalBytes,
        storage_mb: Math.ceil(totalBytes / (1024 * 1024)),
        quota_limit_bytes: quotaInfo?.quota_limit_bytes || 2097152,
        is_online: isOnline,
      };
    });

    return NextResponse.json({
      admin: {
        id: user.id,
        email: user.email,
        role: "manager",
      },
      activeSessions,
      users,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur inattendue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
