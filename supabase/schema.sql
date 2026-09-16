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
  montant_total numeric(10,2) not null default 0
);

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
-- utilisateur — la protection vient du lien de l'app (privé) et du code à 4 chiffres
-- côté application pour les actions sensibles (carte, suppression, clôture). On ouvre
-- donc la lecture/écriture de ces tables à la clé anon.
alter table produits enable row level security;
alter table soirees enable row level security;
alter table ventes enable row level security;
alter table lignes_vente enable row level security;
alter table paiements enable row level security;

create policy "acces app produits" on produits for all using (true) with check (true);
create policy "acces app soirees" on soirees for all using (true) with check (true);
create policy "acces app ventes" on ventes for all using (true) with check (true);
create policy "acces app lignes_vente" on lignes_vente for all using (true) with check (true);
create policy "acces app paiements" on paiements for all using (true) with check (true);

-- Temps réel : permet à l'app de recevoir les changements faits par les autres appareils.
alter publication supabase_realtime add table produits, soirees, ventes, lignes_vente, paiements;
