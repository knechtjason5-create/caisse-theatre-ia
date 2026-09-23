-- Caisse Théâtre de l'IA — schéma de base pour la mise en ligne (Supabase / Postgres).
-- À exécuter une fois dans Supabase : Project → SQL Editor → New query → coller → Run.

create table if not exists produits (
  id text primary key,
  nom text not null,
  categorie text not null check (categorie in ('Bières', 'Vins', 'Softs')),
  prix numeric(10,2) not null default 0,
  visible boolean not null default true
);

create table if not exists soirees (
  id text primary key,
  nom text not null,
  ouverte_le bigint not null,
  cloturee_le bigint
);

create table if not exists ventes (
  id text primary key,
  soiree_id text not null references soirees(id) on delete cascade,
  horodatage bigint not null,
  modifiee_le bigint,
  montant_total numeric(10,2) not null default 0
);

-- Migration (base déjà créée avant l'ajout de la modification des ventes) :
-- alter table ventes add column if not exists modifiee_le bigint;

create table if not exists lignes_vente (
  id text primary key,
  vente_id text not null references ventes(id) on delete cascade,
  produit_id text not null,
  nom text not null,
  quantite integer not null,
  prix_applique numeric(10,2) not null
);

create table if not exists paiements (
  id text primary key,
  vente_id text not null references ventes(id) on delete cascade,
  mode text not null check (mode in ('CB', 'Espèces')),
  montant numeric(10,2) not null
);

-- Produits de départ (repris de src/lib/seed.ts) — à ignorer si déjà présents.
insert into produits (id, nom, categorie, prix, visible) values
  ('biere-demi', 'Demi', 'Bières', 3.5, true),
  ('biere-pinte', 'Pinte', 'Bières', 7, true),
  ('vin-chardonnay', 'Chardonnay', 'Vins', 6, true),
  ('vin-coeur-de-pinot', 'Coeur de Pinot', 'Vins', 6, true),
  ('soft-jus', 'Jus', 'Softs', 3.5, true),
  ('soft-eau-gazeuse', 'Eau gazeuse', 'Softs', 3.5, true),
  ('soft-soda', 'Soda', 'Softs', 3.5, true)
on conflict (id) do nothing;

-- Accès : l'app se connecte avec la clé publique ("anon") de Supabase, sans compte
-- utilisateur. La lecture reste ouverte à cette clé (aucune donnée sensible n'y transite
-- en dehors du bar), mais toute écriture (insert/update/delete) exige le code à 4 chiffres,
-- envoyé par le client dans l'en-tête HTTP "x-caisse-code" et vérifié côté base (RLS) —
-- pas seulement côté interface. Sans cette protection, la clé anon (visible dans le code
-- source de l'app) suffirait à n'importe qui pour écrire/supprimer directement en base.

-- Table de config interne : jamais exposée en lecture via l'API (aucune policy dessus =
-- RLS bloque tout accès direct), seules les fonctions SECURITY DEFINER ci-dessous la lisent.
create table if not exists app_config (
  cle text primary key,
  valeur text not null
);
insert into app_config (cle, valeur) values ('code_acces', '1234')
  on conflict (cle) do nothing;
alter table app_config enable row level security;

-- Vérifie le code saisi par le client (utilisé par l'appli pour déverrouiller l'interface),
-- sans jamais exposer le code stocké.
create or replace function verifier_code_acces(code_saisi text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from app_config where cle = 'code_acces' and valeur = code_saisi
  );
$$;
grant execute on function verifier_code_acces(text) to anon;

-- Utilisée dans les policies d'écriture ci-dessous : vérifie l'en-tête x-caisse-code
-- envoyé par le client sur chaque requête d'écriture.
create or replace function code_acces_valide()
returns boolean
language sql
security definer
set search_path = public
as $$
  select coalesce(
    (current_setting('request.headers', true)::json ->> 'x-caisse-code')
      = (select valeur from app_config where cle = 'code_acces'),
    false
  );
$$;
grant execute on function code_acces_valide() to anon;

alter table produits enable row level security;
alter table soirees enable row level security;
alter table ventes enable row level security;
alter table lignes_vente enable row level security;
alter table paiements enable row level security;

create policy "lecture produits" on produits for select using (true);
create policy "ecriture produits" on produits for insert with check (code_acces_valide());
create policy "modification produits" on produits for update using (code_acces_valide()) with check (code_acces_valide());
create policy "suppression produits" on produits for delete using (code_acces_valide());

create policy "lecture soirees" on soirees for select using (true);
create policy "ecriture soirees" on soirees for insert with check (code_acces_valide());
create policy "modification soirees" on soirees for update using (code_acces_valide()) with check (code_acces_valide());
create policy "suppression soirees" on soirees for delete using (code_acces_valide());

create policy "lecture ventes" on ventes for select using (true);
create policy "ecriture ventes" on ventes for insert with check (code_acces_valide());
create policy "modification ventes" on ventes for update using (code_acces_valide()) with check (code_acces_valide());
create policy "suppression ventes" on ventes for delete using (code_acces_valide());

create policy "lecture lignes_vente" on lignes_vente for select using (true);
create policy "ecriture lignes_vente" on lignes_vente for insert with check (code_acces_valide());
create policy "modification lignes_vente" on lignes_vente for update using (code_acces_valide()) with check (code_acces_valide());
create policy "suppression lignes_vente" on lignes_vente for delete using (code_acces_valide());

create policy "lecture paiements" on paiements for select using (true);
create policy "ecriture paiements" on paiements for insert with check (code_acces_valide());
create policy "modification paiements" on paiements for update using (code_acces_valide()) with check (code_acces_valide());
create policy "suppression paiements" on paiements for delete using (code_acces_valide());

-- Temps réel : permet à l'app de recevoir les changements faits par les autres appareils.
alter publication supabase_realtime add table produits, soirees, ventes, lignes_vente, paiements;
