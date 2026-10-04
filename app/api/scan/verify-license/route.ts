import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { user, client: supabase } = await getAuthenticatedUser(req);

    if (!user || !supabase) {
      return NextResponse.json(
        { valid: false, error: "Utilisateur non connecté", message: "Veuillez vous connecter pour vérifier votre licence." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const licenseNumberInput = (body.licenseNumber || "").trim();

    if (!licenseNumberInput) {
      return NextResponse.json(
        { valid: false, error: "Numéro manquant", message: "Veuillez renseigner un numéro de licence." },
        { status: 400 }
      );
    }

    // 1. Check in user_licenses table by license_number or ID for this user or global license registry
    const { data: matchedLicenses, error: dbErr } = await supabase
      .from("user_licenses")
      .select("*")
      .or(`license_number.ilike.${licenseNumberInput},id.eq.${licenseNumberInput.length === 36 ? licenseNumberInput : '00000000-0000-0000-0000-000000000000'}`)
      .order("created_at", { ascending: false });

    if (dbErr) {
      console.warn("Erreur requête licence:", dbErr.message);
    }

    let foundLicense = matchedLicenses && matchedLicenses.length > 0 ? matchedLicenses[0] : null;

    // 2. If not found in DB but matches recognizable demo/test formats, auto-register it for the user
    if (!foundLicense) {
      const upperKey = licenseNumberInput.toUpperCase();
      if (
        upperKey.startsWith("LIC-") ||
        upperKey.startsWith("DDS-") ||
        upperKey.includes("PRO") ||
        upperKey.includes("ANNU") ||
        upperKey.includes("MENSUEL") ||
        upperKey.includes("TEST")
      ) {
        const isYearly = upperKey.includes("ANNU") || upperKey.includes("YEAR") || upperKey.includes("ENT");
        const days = isYearly ? 365 : 30;
        const validUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
        const planName = isYearly ? "Licence Annuelle Entreprise (Scan & Stockage Illimité)" : "Licence Mensuelle Pro (Scan & Stockage)";
        const quotaBytes = isYearly ? 1073741824 : 52428800; // 1 Go vs 50 Mo

        const { data: createdLic } = await supabase
          .from("user_licenses")
          .insert({
            user_id: user.id,
            license_number: upperKey,
            license_type: isYearly ? "yearly" : "monthly",
            plan_name: planName,
            valid_until: validUntil,
            storage_quota_bytes: quotaBytes,
            status: "active",
          })
          .select()
          .single();

        if (createdLic) {
          foundLicense = createdLic;
        }
      }
    }

    if (!foundLicense) {
      return NextResponse.json(
        {
          valid: false,
          error: "Licence introuvable",
          message: `Le numéro de licence "${licenseNumberInput}" n'existe pas ou n'est pas rattaché à votre compte.`,
        },
        { status: 404 }
      );
    }

    // 3. Verify validity duration and status
    const now = new Date();
    const validUntilDate = new Date(foundLicense.valid_until);

    if (foundLicense.status !== "active" || validUntilDate.getTime() <= now.getTime()) {
      return NextResponse.json(
        {
          valid: false,
          error: "Licence expirée",
          message: `Cette licence (${foundLicense.plan_name}) a expiré le ${validUntilDate.toLocaleDateString("fr-FR")}.`,
          license: {
            id: foundLicense.id,
            license_number: foundLicense.license_number || foundLicense.id,
            plan_name: foundLicense.plan_name,
            status: "expired",
            valid_until: foundLicense.valid_until,
          },
        },
        { status: 400 }
      );
    }

    // Calculate remaining days
    const diffMs = validUntilDate.getTime() - now.getTime();
    const remainingDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    return NextResponse.json({
      valid: true,
      message: "Licence valide et vérifiée avec succès.",
      license: {
        id: foundLicense.id,
        license_number: foundLicense.license_number || foundLicense.id,
        plan_name: foundLicense.plan_name,
        license_type: foundLicense.license_type, // 'monthly' or 'yearly'
        valid_until: foundLicense.valid_until,
        valid_until_formatted: validUntilDate.toLocaleDateString("fr-FR", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        }),
        remaining_days: remainingDays,
        storage_quota_mb: Math.round(foundLicense.storage_quota_bytes / (1024 * 1024)),
        status: "active",
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erreur serveur";
    return NextResponse.json({ valid: false, error: "Erreur serveur", message: msg }, { status: 500 });
  }
}
