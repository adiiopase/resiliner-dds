import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    // Extract IP from headers
    const forwardedFor = req.headers.get("x-forwarded-for");
    const realIp = req.headers.get("x-real-ip");
    const cfIp = req.headers.get("cf-connecting-ip");

    let clientIp = cfIp || realIp || (forwardedFor ? forwardedFor.split(",")[0].trim() : "127.0.0.1");

    const isLocalhost =
      clientIp === "127.0.0.1" ||
      clientIp === "::1" ||
      clientIp.startsWith("192.168.") ||
      clientIp.startsWith("10.") ||
      clientIp.startsWith("172.16.");

    let geoData = {
      ip: clientIp,
      city: isLocalhost ? "Environnement Local" : "Paris",
      region: isLocalhost ? "Réseau Local" : "Île-de-France",
      country: isLocalhost ? "France (Dev)" : "France",
      country_code: "FR",
      flag: "🇫🇷",
      latitude: 48.8566,
      longitude: 2.3522,
      org: isLocalhost ? "DigitalDocs Localhost" : "Fournisseur Internet",
      isLocal: isLocalhost,
    };

    // If on local dev or valid public IP, try fetching public IP location
    try {
      const url = isLocalhost
        ? "https://ipwho.is/"
        : `https://ipwho.is/${clientIp}`;

      const res = await fetch(url, {
        headers: { "User-Agent": "DigitalDocs-Geolocation/1.0" },
        next: { revalidate: 3600 },
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.success !== false) {
          geoData = {
            ip: data.ip || clientIp,
            city: data.city || "Ville inconnue",
            region: data.region || data.region_code || "",
            country: data.country || "France",
            country_code: data.country_code || "FR",
            flag: data.flag?.emoji || "🌐",
            latitude: data.latitude || 48.8566,
            longitude: data.longitude || 2.3522,
            org: data.connection?.org || data.connection?.isp || "Réseau Internet",
            isLocal: isLocalhost,
          };
        }
      }
    } catch {
      // Fallback gracefully
    }

    return NextResponse.json(geoData);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Erreur géolocalisation";
    return NextResponse.json(
      {
        ip: "127.0.0.1",
        city: "France",
        region: "Europe",
        country: "France",
        country_code: "FR",
        flag: "🇫🇷",
        latitude: 48.8566,
        longitude: 2.3522,
        org: "DigitalDocs Solutions",
        isLocal: true,
        error: errorMsg,
      },
      { status: 200 }
    );
  }
}
