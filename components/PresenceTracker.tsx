"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

export type GeoLocation = {
  ip: string;
  city: string;
  region: string;
  country: string;
  country_code: string;
  flag: string;
  latitude: number;
  longitude: number;
  org: string;
  isLocal?: boolean;
};

export type ConnectedUserPresence = {
  user_id: string;
  email: string;
  role: string;
  connectedAt: string;
  device: string;
  location: GeoLocation;
  last_seen?: string;
};

declare global {
  interface Window {
    __dds_presence_map?: Record<string, ConnectedUserPresence>;
  }
}

export default function PresenceTracker() {
  useEffect(() => {
    let isMounted = true;
    let heartbeatTimer: NodeJS.Timeout | null = null;
    let presenceChannel: ReturnType<typeof supabase.channel> | null = null;

    async function initPresence() {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData?.session?.user;
        const token = sessionData?.session?.access_token;

        if (!user || !isMounted) return;

        // Session start time (persists during the tab/session)
        let connectedAt = "";
        try {
          connectedAt = sessionStorage.getItem("dds_session_connected_at") || "";
          if (!connectedAt) {
            connectedAt = new Date().toISOString();
            sessionStorage.setItem("dds_session_connected_at", connectedAt);
          }
        } catch {
          connectedAt = new Date().toISOString();
        }

        // Detect device / browser
        const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : "";
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
        const deviceType = isMobile ? "📱 Mobile" : "💻 Ordinateur";

        let browserName = "Navigateur Web";
        if (userAgent.includes("Chrome")) browserName = "Google Chrome";
        else if (userAgent.includes("Safari")) browserName = "Safari";
        else if (userAgent.includes("Firefox")) browserName = "Firefox";
        else if (userAgent.includes("Edg")) browserName = "Microsoft Edge";

        // Fetch location details
        let location: GeoLocation = {
          ip: "127.0.0.1",
          city: "Paris",
          region: "Île-de-France",
          country: "France",
          country_code: "FR",
          flag: "🇫🇷",
          latitude: 48.8566,
          longitude: 2.3522,
          org: "DigitalDocs Solutions",
        };

        try {
          const cachedGeo = sessionStorage.getItem("dds_session_geo");
          if (cachedGeo) {
            location = JSON.parse(cachedGeo);
          } else {
            const geoRes = await fetch("/api/session/geo");
            if (geoRes.ok) {
              const geoData = await geoRes.json();
              if (geoData && !geoData.error) {
                location = geoData;
                sessionStorage.setItem("dds_session_geo", JSON.stringify(geoData));
              }
            }
          }
        } catch {
          // Keep default location
        }

        const isManager =
          user.app_metadata?.role === "manager" ||
          user.email === "adiiopase@gmail.com" ||
          user.email === "adiopa@yahoo.fr";

        // 1. Send Server Heartbeat
        async function sendHeartbeat() {
          if (!isMounted) return;
          try {
            const currentSession = await supabase.auth.getSession();
            const currentToken = currentSession.data.session?.access_token || token;

            await fetch("/api/session/heartbeat", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...(currentToken ? { Authorization: `Bearer ${currentToken}` } : {}),
              },
              body: JSON.stringify({
                connectedAt,
                device: `${deviceType} (${browserName})`,
                location,
              }),
            });
          } catch {
            // Silently ignore network errors
          }
        }

        // Send immediately
        void sendHeartbeat();

        // Repeat every 10 seconds
        heartbeatTimer = setInterval(() => {
          void sendHeartbeat();
        }, 10000);

        // Also send on tab focus
        const onFocus = () => void sendHeartbeat();
        window.addEventListener("focus", onFocus);

        // 2. Realtime WebSocket Channel
        const channelName = "dds-presence-room";
        const existing = supabase.getChannels().find((c) => c.topic === `realtime:${channelName}`);
        if (existing) {
          await supabase.removeChannel(existing);
        }

        presenceChannel = supabase.channel(channelName, {
          config: {
            presence: {
              key: user.id,
            },
          },
        });

        function broadcastState() {
          if (!presenceChannel || !isMounted) return;
          const state = presenceChannel.presenceState<ConnectedUserPresence>() || {};
          const newMap: Record<string, ConnectedUserPresence> = {};

          Object.keys(state).forEach((key) => {
            const presences = state[key];
            if (presences && presences.length > 0) {
              const p = presences[0];
              if (p && (p.user_id || p.email)) {
                newMap[p.user_id || key] = p;
              }
            }
          });

          if (typeof window !== "undefined") {
            window.__dds_presence_map = newMap;
            window.dispatchEvent(
              new CustomEvent("dds-presence-changed", { detail: newMap })
            );
          }
        }

        presenceChannel
          .on("presence", { event: "sync" }, broadcastState)
          .on("presence", { event: "join" }, broadcastState)
          .on("presence", { event: "leave" }, broadcastState);

        presenceChannel.subscribe(async (status) => {
          if (status === "SUBSCRIBED" && isMounted) {
            await presenceChannel?.track({
              user_id: user.id,
              email: user.email || "",
              role: isManager ? "manager" : "user",
              connectedAt,
              device: `${deviceType} (${browserName})`,
              location,
              last_seen: new Date().toISOString(),
            });
            broadcastState();
          }
        });
      } catch (err) {
        console.error("Erreur PresenceTracker :", err);
      }
    }

    void initPresence();

    return () => {
      isMounted = false;
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      if (presenceChannel) {
        void presenceChannel.untrack();
        void supabase.removeChannel(presenceChannel);
      }
    };
  }, []);

  return null;
}
