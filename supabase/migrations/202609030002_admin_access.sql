-- Rôle d'administration conservé dans les claims privés Supabase.
-- Exécuter cette commande en remplaçant l'adresse par celle du gestionnaire.
-- Elle doit être exécutée par le propriétaire du projet dans le SQL Editor.
-- update auth.users
-- set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"manager"}'::jsonb
-- where email = 'gestionnaire@example.com';

-- Après modification de app_metadata, le gestionnaire doit se déconnecter puis se reconnecter
-- pour recevoir un nouveau JWT contenant le rôle manager.
