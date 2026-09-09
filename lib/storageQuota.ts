import { supabase } from "./supabaseClient";

export const MAX_QUOTA = 2 * 1024 * 1024; // 2 Mo

export async function getUserStorageUsage(userId: string) {
    const { data: files, error } = await supabase.storage
        .from("documents")
        .list(userId, { limit: 100 });

    if (error) {
        console.error("Erreur listage fichiers :", error);
        return 0;
    }

    let total = 0;
    for (const file of files) {
        total += file.metadata?.size ?? 0;
    }

    return total; // bytes
}
