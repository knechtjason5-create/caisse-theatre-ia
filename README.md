# Caisse — Théâtre de l'IA

Application d'aide à la vente au comptoir du bar : sélection des boissons, panier,
encaissement divisible entre plusieurs personnes (chacune avec son propre mode de
paiement), et historique par soirée. Voir [`Plans/Plan_Mise_En_Ligne.html`](../Plans/Plan_Mise_En_Ligne.html)
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
  sur cet appareil (`src/lib/pinGate.tsx`). Chaque appareil ouvre une session
  anonyme Supabase que le code déverrouille côté base (fonction `deverrouiller`,
  5 essais par quart d'heure) : sans code, la base ne renvoie ni n'accepte rien,
  en lecture, en écriture comme en temps réel (RLS, voir `supabase/schema.sql`).
  Les connexions anonymes doivent être activées dans Supabase (Authentication →
  Sign In / Providers → « Allow anonymous sign-ins »). Le code n'est stocké
  qu'en base (table `app_config`), jamais dans le dépôt. Pour le changer :
  `update app_config set valeur = '….' where cle = 'code_acces';` dans l'éditeur
  SQL Supabase (puis `delete from appareils_autorises;` pour forcer tous les
  appareils à ressaisir le nouveau code).
- Prix, quantités et montants négatifs sont refusés par l'interface et par la base.
- Confirmations (clôture, suppression d'une vente ou d'une boisson) : fenêtre interne
  `src/lib/confirmation.tsx`, jamais `window.confirm()` — certains navigateurs embarqués
  le bloquent et renvoient toujours « non ».
- Animations et gestes : rideau de scène après la saisie du code et à l'ouverture/clôture d'une soirée (récap
  animé à la clôture), bille qui vole vers le panier, maintien du « + » (ajouts accélérés), glisser
  vers la gauche pour retirer/supprimer, balayage entre onglets, paliers de recette
  (100/250/500 €), note quand une vente arrive d'un autre appareil, verrou du code à
  pastilles (validation au 4ᵉ chiffre), squelette de chargement, vibrations Android.
  Toutes les animations sont en CSS dans `src/app/globals.css` (≤ 300 ms pour les
  interactions) et respectent « réduire les animations » du système. Les zones qui
  gèrent elles-mêmes le glissement sont marquées `data-no-swipe` / `data-glissable`.
- En-têtes de sécurité HTTP (CSP, anti-iframe…) définis dans `next.config.ts`.

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
- `src/lib/confirmation.tsx` — fenêtre de confirmation interne (`useConfirmer`)
- `src/lib/vol.ts`, `src/lib/haptique.ts`, `src/lib/anim.ts` — bille vers le panier, vibrations, cascades
- `src/components/` — écrans (Vente, Panier, Encaissement, Carte, Historique) et effets
  (`Rideau`, `RecapSoiree`, `JalonRecette`, `NotifVenteDistante`, `Glissable`,
  `SelecteurMode`, `ChiffreRoulant`, `MontantAnime`)
- `public/brand/` — logos de la charte graphique du Théâtre de l'IA
