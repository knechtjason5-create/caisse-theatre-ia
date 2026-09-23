# Caisse — Théâtre de l'IA

Application d'aide à la vente au comptoir du bar : sélection des boissons, panier,
encaissement divisible entre plusieurs personnes (chacune avec son propre mode de
paiement), et historique par soirée. Voir [`Plan_Mise_En_Ligne.html`](../Plan_Mise_En_Ligne.html)
à la racine du dossier pour le plan de mise en ligne complet.

## En ligne

**https://caisse-theatre-ia.vercel.app** — accessible depuis n'importe quel appareil
connecté à internet. Un code à 4 chiffres est demandé à l'arrivée sur le site avant
tout accès (voir `src/lib/pinGate.tsx`).

## Lancer le projet en local

1. Créer un projet sur [supabase.com](https://supabase.com) (gratuit), puis exécuter
   `supabase/schema.sql` dans l'éditeur SQL du projet (Project → SQL Editor → New query).
2. Copier `.env.local.example` vers `.env.local` et renseigner l'URL et la clé publique
   (« anon ») du projet Supabase (Project Settings → API).
3. Installer puis lancer :

```bash
npm install
npm run dev
```

Puis ouvrir [http://localhost:3000](http://localhost:3000).

## État actuel

- Vente, panier, encaissement (division + paiements multiples), soirées, carte
  éditable et historique fonctionnent.
- Les données sont stockées dans Supabase (Postgres + temps réel) : tous les
  appareils connectés au même projet voient les mêmes ventes en direct.
- Le suivi de stock n'est pas implémenté (retiré du périmètre).
- Un code à 4 chiffres protège l'ensemble de l'application : il est demandé une
  seule fois à l'arrivée sur le site, puis reste valable pour la session en cours
  sur cet appareil (`src/lib/pinGate.tsx`). Le code est vérifié côté serveur et la
  base refuse elle-même toute écriture sans lui (RLS + en-tête `x-caisse-code`,
  voir `supabase/schema.sql`) — pas seulement l'interface. Le code n'est stocké
  qu'en base (table `app_config`), pas dans le code source de l'app. Pour le
  changer : `update app_config set valeur = '….' where cle = 'code_acces';`
  dans l'éditeur SQL Supabase.

## Déploiement

Le site est déployé sur [Vercel](https://vercel.com) (gratuit), relié au dépôt
GitHub [`caisse-theatre-ia`](https://github.com/knechtjason5-create/caisse-theatre-ia)
(public — nécessaire pour l'offre gratuite de Vercel ; aucun secret n'y est commité,
les clés Supabase vivent uniquement dans les variables d'environnement Vercel/`.env.local`).
Chaque `git push` sur `main` redéploie automatiquement le site.

## Structure

- `supabase/schema.sql` — schéma de la base (tables, accès, temps réel)
- `src/lib/types.ts` — modèle de données (produit, soirée, vente, paiement)
- `src/lib/supabase.ts` — client Supabase
- `src/lib/store.ts` — état de l'application (zustand), synchronisé avec Supabase
- `src/lib/useSupabaseSync.ts` — chargement initial + écoute des changements en temps réel
- `src/lib/pinGate.tsx` — code à 4 chiffres demandé à l'entrée du site
- `src/components/` — écrans (Vente, Panier, Encaissement, Carte, Historique)
- `public/brand/` — logos de la charte graphique du Théâtre de l'IA
