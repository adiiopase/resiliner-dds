import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabaseServer";

export type ActiveSession = {
  userId: string;
  email: string;
  role: string;
  connectedAt: string;
  lastSeen: number; // timestamp in ms
  device: string;
  location: {
    ip: string;
    city: string;
    region: string;
    country: string;
    flag: string;
    latitude: number;
    longitude: number;
    org: string;
  };
};

// Global in-memory storage for active sessions on the server
// Persists across requests within the server runtime
declare global {
  // eslint-disable-next-line no-var
  var __dds_active_sessions: Map<string, ActiveSession> | undefined;
}

if (!global.__dds_active_sessions) {
  global.__dds_active_sessions = new Map<string, ActiveSession>();
}

export function getActiveSessionsMap(): Map<string, ActiveSession> {
  if (!global.__dds_active_sessions) {
    global.__dds_active_sessions = new Map<string, ActiveSession>();
  }
  return global.__dds_active_sessions;
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const sessions = getActiveSessionsMap();

    const isManager =
      user.app_metadata?.role === "manager" ||
      user.email === "adiiopase@gmail.com" ||
      user.email === "adiopa@yahoo.fr";

    const existing = sessions.get(user.id);
    const connectedAt =
      body.connectedAt ||
      existing?.connectedAt ||
      new Date().toISOString();

    const session: ActiveSession = {
      userId: user.id,
      email: user.email || "",
      role: isManager ? "manager" : "user",
      connectedAt,
      lastSeen: Date.now(),
      device: body.device || "💻 Ordinateur",
      location: body.location || {
        ip: "127.0.0.1",
        city: "France",
        region: "Europe",
        country: "France",
        flag: "🇫🇷",
        latitude: 48.8566,
        longitude: 2.3522,
        org: "DigitalDocs Network",
      },
    };

    sessions.set(user.id, session);

    // Clean up stale sessions older than 45 seconds
    const cutoff = Date.now() - 45000;
    for (const [id, s] of sessions.entries()) {
      if (s.lastSeen < cutoff) {
        sessions.delete(id);
      }
    }

    return NextResponse.json({ success: true, activeCount: sessions.size });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erreur heartbeat";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
