# Resiliner DDS Android

Application Android native développée en Kotlin, avec affichage complet de la page d'accueil vitrine DDS, tableau de bord synthétique pour l'utilisateur simple, connexion Supabase et double vérification PIN réservée aux administrateurs.

## Fonctionnalités
- **Page d'Accueil Vitrine (`HomeActivity`)** : Présentation complète avec rubriques identiques au site web `digitds.cloud` (Services, Produits, Tarifs 0,10 €/Mo, À propos, Le problème, Notre solution, Secteurs Industrie/Commerce/Administration).
- **Tableau de Bord Synthétique (`DashboardActivity`)** :
  - En-tête sécurisé avec email et déconnexion.
  - Résumé du stockage souverain et accès aux forfaits & licences.
  - Module Documents (Scanner mobile, Studio OCR, Mes documents, Téléversement, Coffre Cloud).
  - Module Services & Commandes (Catalogue produits, Bons de commande, Demande de devis, API souveraine).
- **Administration Sécurisée** : Rubriques réservées aux administrateurs avec double validation par PIN.

## Prérequis
- Android Studio
- Android SDK (API 34)
- JDK 17 ou JDK 21 LTS

## Compilation & Test
1. Ouvrir le dossier `android-app` dans Android Studio ou compiler en ligne de commande :
   ```bash
   cd android-app
   .\gradlew.bat assembleDebug
   ```
2. L'APK est généré dans `app/build/outputs/apk/debug/app-debug.apk`.
3. Les fonctions de scan et d'OCR s'appuient sur les routes Next.js configurées par `mobileApiBaseUrl` (par défaut `http://10.0.2.2:3000` en local, ou `https://digitds.cloud` en production).

