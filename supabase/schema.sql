-- Caisse Théâtre de l'IA — schéma de base pour la mise en ligne (Supabase / Postgres).
-- À exécuter une fois dans Supabase : Project → SQL Editor → New query → coller → Run.

create table if not exists produits (
  id text primary key,
  nom text not null,
  categorie text not null check (categorie in ('Bières', 'Vins', 'Softs')),
  prix numeric(10,2) not null default 0 constraint produits_prix_positif check (prix >= 0),
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
  montant_total numeric(10,2) not null default 0 constraint ventes_montant_total_positif check (montant_total >= 0)
);

-- Migration (base déjà créée avant l'ajout de la modification des ventes) :
-- alter table ventes add column if not exists modifiee_le bigint;

create table if not exists lignes_vente (
  id text primary key,
  vente_id text not null references ventes(id) on delete cascade,
  produit_id text not null,
  nom text not null,
  quantite integer not null constraint lignes_vente_quantite_positive check (quantite > 0),
  prix_applique numeric(10,2) not null constraint lignes_vente_prix_positif check (prix_applique >= 0)
);

create table if not exists paiements (
  id text primary key,
  vente_id text not null references ventes(id) on delete cascade,
  mode text not null check (mode in ('CB', 'Espèces')),
  montant numeric(10,2) not null constraint paiements_montant_positif check (montant >= 0)
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

-- Accès : l'app se connecte avec la clé publique ("anon") de Supabase, visible dans le code
-- envoyé au navigateur. Chaque appareil ouvre une session anonyme Supabase
-- (Authentication → Sign In / Providers → « Allow anonymous sign-ins » doit être activé),
-- puis saisit le code à 4 chiffres : la fonction deverrouiller() le vérifie côté base et
-- inscrit la session dans appareils_autorises. Toutes les règles RLS (lecture, écriture et
-- temps réel) exigent une session inscrite — sans code, la clé publique ne donne accès à rien.

-- Table de config interne : jamais exposée via l'API (aucune policy dessus = RLS bloque tout
-- accès direct), seules les fonctions SECURITY DEFINER ci-dessous la lisent.
create table if not exists app_config (
  cle text primary key,
  valeur text not null
);
alter table app_config enable row level security;
-- À exécuter une fois, en remplaçant ____ par le code choisi (ne jamais le committer) :
-- insert into app_config (cle, valeur) values ('code_acces', '____');
-- Pour le changer ensuite : update app_config set valeur = '____' where cle = 'code_acces';

-- Sessions déverrouillées par le code.
create table if not exists appareils_autorises (
  uid uuid primary key references auth.users(id) on delete cascade,
  autorise_le timestamptz not null default now()
);
alter table appareils_autorises enable row level security;

-- Échecs de saisie du code, par session : 5 essais max par tranche de 15 minutes.
create table if not exists tentatives_code (
  uid uuid primary key references auth.users(id) on delete cascade,
  echecs integer not null default 0,
  dernier_echec timestamptz not null default now()
);
alter table tentatives_code enable row level security;

create or replace function est_autorise()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from appareils_autorises where uid = auth.uid());
$$;

create or replace function deverrouiller(code_saisi text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  t tentatives_code%rowtype;
begin
  if auth.uid() is null then
    return false;
  end if;

  select * into t from tentatives_code where uid = auth.uid();
  if found and t.echecs >= 5 and t.dernier_echec > now() - interval '15 minutes' then
    return false;
  end if;

  if exists (select 1 from app_config where cle = 'code_acces' and valeur = code_saisi) then
    insert into appareils_autorises (uid) values (auth.uid()) on conflict (uid) do nothing;
    delete from tentatives_code where uid = auth.uid();
    return true;
  end if;

  insert into tentatives_code (uid, echecs, dernier_echec) values (auth.uid(), 1, now())
  on conflict (uid) do update set
    echecs = case when tentatives_code.dernier_echec > now() - interval '15 minutes'
                  then tentatives_code.echecs + 1 else 1 end,
    dernier_echec = now();
  return false;
end;
$$;

revoke execute on function est_autorise() from public, anon;
revoke execute on function deverrouiller(text) from public, anon;
grant execute on function est_autorise() to authenticated;
grant execute on function deverrouiller(text) to authenticated;

alter table produits enable row level security;
alter table soirees enable row level security;
alter table ventes enable row level security;
alter table lignes_vente enable row level security;
alter table paiements enable row level security;

create policy "acces autorise produits"     on produits     for all to authenticated using (est_autorise()) with check (est_autorise());
create policy "acces autorise soirees"      on soirees      for all to authenticated using (est_autorise()) with check (est_autorise());
create policy "acces autorise ventes"       on ventes       for all to authenticated using (est_autorise()) with check (est_autorise());
create policy "acces autorise lignes_vente" on lignes_vente for all to authenticated using (est_autorise()) with check (est_autorise());
create policy "acces autorise paiements"    on paiements    for all to authenticated using (est_autorise()) with check (est_autorise());

-- Temps réel : permet à l'app de recevoir les changements faits par les autres appareils.
alter publication supabase_realtime add table produits, soirees, ventes, lignes_vente, paiements;
