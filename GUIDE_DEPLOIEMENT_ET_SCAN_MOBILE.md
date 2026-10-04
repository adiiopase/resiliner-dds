# 📘 GUIDE COMPLET DE DÉPLOIEMENT & NUMÉRISATION MOBILE (DIGITALDOCS SOLUTIONS)

Ce document détaille le fonctionnement, les tests en local et la procédure complète pour mettre en ligne le site web et le **Studio de Scan Intelligent** chez votre hébergeur.

---

## 📑 Sommaire
1. [Fonctionnement du Studio de Scan & Détection du Terminal](#1-fonctionnement-du-studio-de-scan--détection-du-terminal)
2. [Pourquoi `localhost` n'est pas accessible depuis le Mobile & Solutions Locales](#2-pourquoi-localhost-nest-pas-accessible-depuis-le-mobile--solutions-locales)
3. [Peut-on utiliser l'Adresse IP pour contrôler le Smartphone de l'utilisateur ?](#3-peut-on-utiliser-ladresse-ip-pour-contrôler-le-smartphone-de-lutilisateur-)
4. [Architecture Recommandée : Synchronisation par Session & HTTPS](#4-architecture-recommandée--synchronisation-par-session--https)
5. [Dispositif de Protection du Code Source, Anti-Copie & Anti-Débogage](#5-dispositif-de-protection-du-code-source-anti-copie--anti-débogage)
6. [Procédure de Mise en Ligne chez l'Hébergeur (Vercel, VPS, OVH, etc.)](#6-procédure-de-mise-en-ligne-chez-lhébergeur-vercel-vps-ovh-etc)
7. [Variables d'Environnement de Production & Stripe](#7-variables-denvironnement-de-production--stripe)
8. [Checklist Finale avant Ouverture aux Clients](#8-checklist-finale-avant-ouverture-aux-clients)

---

## 1. Fonctionnement du Studio de Scan & Détection du Terminal

Le Studio de Scan DigitalDocs (`/documents/scan`) intègre une **détection matérielle automatique** de l'appareil utilisé par l'utilisateur connecté :

- **Sur Ordinateur (PC / Mac / Laptop)** :
  - Le système détecte l'environnement de bureau.
  - Seuls les boutons et commandes propres à l'ordinateur s'affichent :
    - 💻 **Scanner avec la Webcam PC** (capteur vidéo haute résolution avec détection de stabilité).
    - 📁 **Importer image(s) PC** (sélection multiple de fichiers locaux).
  - Les boutons relatifs au mobile sont entièrement retirés pour une interface épurée.

- **Sur Smartphone / Tablette (iOS / Android)** :
  - Le système détecte l'environnement mobile et tactile.
  - Seuls les boutons et commandes propres au mobile s'affichent :
    - 📱 **Scanner avec Smartphone** (déclenche directement la caméra arrière grand angle `environment`).
    - 📁 **Importer image(s) mobile** (galerie photo / fichiers du smartphone).
  - Les boutons de l'ordinateur sont masqués.

- **Règles métier souveraines appliquées** :
  - **Quantités strictement entières** : Les volumes sont toujours en nombres entiers de Mo (1 Mo, 2 Mo, etc., jamais de décimales), calculés à `0,10 € TTC / Mo entier`.
  - **Couleurs réelles par défaut** : 100% de fidélité colorimétrique dès la capture.
  - **Incrustation HD** : Prévisualisation avec zoom 100% à 300% et rotation 90°.
  - **Règlement sécurisé** : Choix exclusif entre *Paiement direct par Carte (Stripe)* et *Licence mensuelle/annuelle vérifiée*.

---

## 2. Pourquoi `localhost` n'est pas accessible depuis le Mobile & Solutions Locales

### A. L'origine du problème
- `localhost` (ou `127.0.0.1`) signifie **"cette machine elle-même"**.
- Lorsque vous tapez `http://localhost:3000` dans le navigateur de votre smartphone, celui-ci cherche un serveur qui tournerait sur le téléphone lui-même, et non sur votre PC.

### B. La contrainte de sécurité des navigateurs (WebRTC / Caméra)
- Les navigateurs modernes (Google Chrome, Apple Safari iOS, Firefox) imposent une règle de sécurité stricte : **l'accès à la caméra (`navigator.mediaDevices.getUserMedia`) est UNIQUEMENT autorisé sur une connexion HTTPS sécurisée**, ou sur `localhost`.
- Si vous vous connectez en simple `http://192.168.x.x:3000` sur votre mobile, le navigateur peut bloquer l'accès à la caméra pour des raisons de sécurité.

### C. Comment tester sur Smartphone en local dès maintenant (2 Méthodes simples) :

#### Option 1 : Tunnel HTTPS instantané et gratuit (Recommandée)
Dans un terminal de votre PC (avec le projet en cours d'exécution sur le port 3000), lancez :
```bash
npx localtunnel --port 3000
```
ou avec Cloudflare :
```bash
npx cloudflared tunnel --url http://localhost:3000
```
- Vous obtiendrez une URL sécurisée HTTPS publique (ex : `https://digitaldocs-test.loca.lt`).
- Ouvrez cette URL sur votre smartphone : vous aurez **accès complet à la caméra arrière**, au scan en direct et à la détection mobile !

#### Option 2 : Même réseau WiFi (IP locale du PC)
1. Ouvrez PowerShell sur votre PC et tapez `ipconfig`.
2. Repérez votre **Adresse IPv4** (ex: `192.168.1.45`).
3. Sur votre smartphone (connecté au même WiFi), ouvrez `http://192.168.1.45:3000`.

---

## 3. Peut-on utiliser l'Adresse IP pour contrôler le Smartphone de l'utilisateur ?

### ❌ Pourquoi l'adresse IP brute d'un smartphone ne peut PAS être utilisée pour le piloter à distance :
1. **Adresses IP dynamiques & Partagées (CGNAT)** :
   - Les opérateurs mobiles (Orange, SFR, Bouygues, Free, etc.) n'attribuent pas d'adresse IP publique dédiée aux smartphones.
   - Des milliers de smartphones partagent la même adresse IP de sortie via le Carrier-Grade NAT (CGNAT).
2. **Pare-feux stricts des réseaux 4G/5G et WiFi** :
   - Les connexions entrantes directes vers un smartphone sont systématiquement bloquées par les réseaux mobiles pour protéger les terminaux contre les cyberattaques.
   - Un serveur distant ne peut donc pas "pinger" ou "commander" directement l'IP d'un smartphone.

---

## 4. Architecture Recommandée : Synchronisation par Session & HTTPS

Pour permettre à un utilisateur connecté de piloter ou d'interagir depuis n'importe quel smartphone sans contrainte de réseau, la méthode standard et éprouvée repose sur :

### 1. La Session Utilisateur Authentifiée (Souverain & Sécurisé)
- L'utilisateur se connecte sur son compte (via son e-mail/mot de passe ou token de session sécurisé).
- L'application sait quel utilisateur est connecté, qu'il soit sur PC ou sur Mobile.

### 2. Le Protocole HTTPS chez l'Hébergeur
- Une fois déployé sur votre nom de domaine (ex: `https://app.digitaldocs.fr`), l'ensemble des échanges est chiffré par certificat SSL (TLS 1.3).
- La caméra du smartphone est débloquée et reconnue nativement par iOS Safari et Android Chrome.

### 3. La Synchronisation Temps Réel (Supabase Realtime / WebSockets)
- Si vous souhaitez qu'une photo prise sur le smartphone s'affiche instantanément sur l'écran du PC sans recharger la page, Supabase Realtime (déjà configuré dans le projet) diffuse l'événement à la session connectée en moins de 100 millisecondes.

---

## 5. Dispositif de Protection du Code Source, Anti-Copie & Anti-Débogage

Pour protéger votre travail, vos algorithmes et la propriété intellectuelle de **DigitalDocs Solutions**, un dispositif de sécurité à 3 niveaux a été intégré :

### Niveau 1 : Masquage & Minification Complète des Codes Sources (Next.js)
- **Désactivation totale des Source Maps en production** (`productionBrowserSourceMaps: false`) : Aucun fichier source (`.tsx`, `.ts`, `.js` originaux) n'est transmis au navigateur. Seuls des fichiers compilés, minifiés et obfusqués en binaire machine sont délivrés.
- **Suppression des signatures logicielles** (`poweredByHeader: false`) : Le serveur ne divulgue pas les versions de framework aux robots et scanners d'attaques.
- **Séparation Serveur / Client** : Les clés API secrètes (Stripe Secret Key, Supabase Service Role), les accès SQL et la logique de facturation s'exécutent **strictement sur le serveur**, jamais dans le navigateur du client.

### Niveau 2 : Bouclier Navigateur (`SecurityGuard.tsx`)
- **Désactivation du Clic Droit** (`contextmenu`) : Empêche l'ouverture du menu d'inspection et le clic droit sur toute l'application (sauf dans les champs de saisie pour taper son texte).
- **Blocage des Raccourcis Clavier d'Inspection** :
  - `F12` (Outils Développeur) : Bloqué.
  - `Ctrl + Shift + I` / `Cmd + Option + I` (Inspecter l'élément) : Bloqué.
  - `Ctrl + Shift + J` / `Cmd + Option + J` (Ouvrir la console) : Bloqué.
  - `Ctrl + Shift + C` (Sélecteur de code HTML) : Bloqué.
  - `Ctrl + U` / `Cmd + Option + U` (Afficher la source de la page) : Bloqué.
  - `Ctrl + S` (Aspiration / Enregistrement de la page) : Bloqué.
- **Anti-Débogueur Actif (Anti-Reverse Engineering)** : Vérification de la boucle de timing d'exécution en temps réel. Si un utilisateur force l'ouverture d'un débogueur, le système neutralise le contexte et affiche un avertissement de sécurité.
- **Console Protégée en Production** : Désactivation des logs verbeux (`console.log`, `console.debug`) pour éviter toute fuite de variables mémoire ou de jetons.
- **Protection Anti-Sélection** (`user-select: none`) : Bloque le surlignage et l'aspiration massive de textes.

### Niveau 3 : En-têtes HTTP de Sécurité Souveraine (Anti-Virus, Anti-Injection, Anti-XSS)
Configurés dans `next.config.ts` :
- **Content-Security-Policy (CSP)** : Bloque l'exécution de scripts tiers non autorisés et protège contre les virus, malwares et contaminations par injection (XSS).
- **X-Frame-Options: SAMEORIGIN** : Protège contre le Clickjacking (détournement de clics).
- **X-Content-Type-Options: nosniff** : Empêche le navigateur d'exécuter des fichiers masqués (MIME sniffing).
- **Strict-Transport-Security (HSTS)** : Impose le chiffrement SSL/HTTPS maximal.

---

## 6. Procédure de Mise en Ligne chez l'Hébergeur (Vercel, VPS, OVH, etc.)

### Option A : Déploiement Cloud Recommandé (Vercel / Supabase) — Le plus rapide
1. **Création du dépôt Git** (GitHub ou GitLab privé).
2. **Liaison avec Vercel** :
   - Rendez-vous sur [vercel.com](https://vercel.com).
   - Cliquez sur **"Add New Project"** et sélectionnez votre dépôt `resiliner-dds`.
   - Vercel détecte automatiquement le framework **Next.js**.
3. **Configuration des Variables d'Environnement** :
   - Renseignez les variables listées dans la [Section 6](#6-variables-denvironnement-de-production--stripe).
4. **Attribution de votre Nom de Domaine** :
   - Dans le tableau de bord Vercel > **Settings > Domains**.
   - Ajoutez votre domaine personnalisé (ex: `scan.votredomaine.fr` ou `www.votredomaine.fr`).
   - Configurez les enregistrements DNS (CNAME / A) chez votre registrar (OVH, Hostinger, Gandi, etc.).
   - Le certificat SSL (HTTPS) est généré **automatiquement et gratuitement**.

---

### Option B : Déploiement sur Serveur Dédié / VPS (Ubuntu, Debian, OVH, DigitalOcean)
1. **Pré-requis serveur** :
   ```bash
   sudo apt update && sudo apt install -y nodejs npm nginx certbot python3-certbot-nginx
   sudo npm install -g pm2
   ```
2. **Clonage et Build du projet** :
   ```bash
   git clone <URL_DU_REPO> /var/www/resiliner-dds
   cd /var/www/resiliner-dds
   npm install
   npm run build
   ```
3. **Lancement en tâche de fond avec PM2** :
   ```bash
   pm2 start npm --name "digitaldocs" -- start
   pm2 save
   pm2 startup
   ```
4. **Configuration NGINX (Reverse Proxy)** :
   Créez le fichier `/etc/nginx/sites-available/digitaldocs` :
   ```nginx
   server {
       server_name votredomaine.fr www.votredomaine.fr;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```
   Activez le site et relancez NGINX :
   ```bash
   sudo ln -s /etc/nginx/sites-available/digitaldocs /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```
5. **Génération du Certificat SSL HTTPS Gratuit (Certbot)** :
   ```bash
   sudo certbot --nginx -d votredomaine.fr -d www.votredomaine.fr
   ```

---

## 6. Variables d'Environnement de Production & Stripe

Dans le fichier `.env.production` de votre hébergeur, configurez :

```env
# URL Publique du site (HTTPS obligatoire en production)
NEXT_PUBLIC_BASE_URL=https://votredomaine.fr

# Base de Données & Authentification Supabase
NEXT_PUBLIC_SUPABASE_URL=https://rkpjjwapbjommuhphscx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_tL_O5hLyhYcfzXlmuPzWFQ_rAsWDIzb
SUPABASE_SERVICE_ROLE_KEY=votre_cle_secrete_service_role

# Paiements Réels Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

> **Conseil Stripe pour la production** :
> Dans votre tableau de bord Stripe > **Développeurs > Webhooks** :
> Ajoutez un endpoint pointant vers : `https://votredomaine.fr/api/stripe/webhook` avec l'événement `checkout.session.completed`.

---

## 7. Checklist Finale avant Ouverture aux Clients

- [x] **Terminal Ordinateur** : Seuls les boutons *Scanner avec Webcam PC* et *Importer image(s) PC* s'affichent.
- [x] **Terminal Mobile** : Seuls les boutons *Scanner avec Smartphone* et *Importer image(s) mobile* s'affichent.
- [x] **Contrôle Caméra** : Fonction de libération forcée et cascade de résolutions pour éviter l'erreur "Caméra introuvable".
- [x] **Quantités Entières** : Volumes strictement arrondis aux Mo entiers supérieurs (0 décimale), tarification à `0,10 € TTC / Mo entier`.
- [x] **Couleurs Réelles** : Préservation fidèle des couleurs d'origine par défaut.
- [x] **Incrustation HD** : Zoom haute précision (100% à 300%) et rotation 90°.
- [x] **Paiement Stripe** : Sessions Stripe Checkout actives et redirection fluide.
- [x] **Facturation Validée** : Factures enregistrées avec mention `Validée par l'administrateur & Confirmée client` consultables dans `/billing`.
- [x] **HTTPS Actif** : Certificat SSL en place garantissant l'accès immédiat à la caméra sur smartphone.
