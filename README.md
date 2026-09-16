# Caisse — Théâtre de l'IA

Application d'aide à la vente au comptoir du bar : sélection des boissons, panier,
encaissement divisible entre plusieurs personnes (chacune avec son propre mode de
paiement), et historique par soirée. Voir [`Plan_Mise_En_Ligne.html`](../Plan_Mise_En_Ligne.html)
à la racine du dossier pour le plan de mise en ligne complet.

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
- Un code à 4 chiffres (`src/lib/pin.ts`) protège les actions sensibles : accès à
  la carte, suppression d'une vente, clôture de soirée.

## Déploiement

Le site se déploie sur [Vercel](https://vercel.com), gratuit : connecter le dépôt
GitHub, puis renseigner les mêmes deux variables d'environnement que `.env.local`
dans les réglages du projet Vercel (Project Settings → Environment Variables).

## Structure

- `supabase/schema.sql` — schéma de la base (tables, accès, temps réel)
- `src/lib/types.ts` — modèle de données (produit, soirée, vente, paiement)
- `src/lib/supabase.ts` — client Supabase
- `src/lib/store.ts` — état de l'application (zustand), synchronisé avec Supabase
- `src/lib/useSupabaseSync.ts` — chargement initial + écoute des changements en temps réel
- `src/lib/pin.ts` — code à 4 chiffres pour les actions sensibles
- `src/components/` — écrans (Vente, Panier, Encaissement, Carte, Historique)
- `public/brand/` — logos de la charte graphique du Théâtre de l'IA
