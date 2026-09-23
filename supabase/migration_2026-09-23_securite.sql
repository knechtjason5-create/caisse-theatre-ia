-- Migration sécurité du 23/09/2026 — à exécuter dans Supabase : SQL Editor → New query.
-- Prérequis : Authentication → Sign In / Providers → activer « Allow anonymous sign-ins ».
--
-- ÉTAPE A — compatible avec la version actuellement en ligne : à lancer AVANT le déploiement.
-- ÉTAPE B — verrouillage final : à lancer APRÈS le déploiement de la nouvelle version.

-- =====================================================================================
-- ÉTAPE A
-- =====================================================================================

-- Montants et quantités jamais négatifs (bloqué par la base, pas seulement l'interface).
alter table produits     add constraint produits_prix_positif          check (prix >= 0);
alter table ventes       add constraint ventes_montant_total_positif   check (montant_total >= 0);
alter table lignes_vente add constraint lignes_vente_prix_positif      check (prix_applique >= 0);
alter table lignes_vente add constraint lignes_vente_quantite_positive check (quantite > 0);
alter table paiements    add constraint paiements_montant_positif      check (montant >= 0);

-- Sessions (anonymes Supabase) déverrouillées par le code à 4 chiffres.
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

-- Nouvelles règles d'accès (lecture, écriture, temps réel) pour les sessions déverrouillées.
-- Elles s'ajoutent aux anciennes jusqu'à l'étape B, donc l'ancienne version reste fonctionnelle.
create policy "acces autorise produits"     on produits     for all to authenticated using (est_autorise()) with check (est_autorise());
create policy "acces autorise soirees"      on soirees      for all to authenticated using (est_autorise()) with check (est_autorise());
create policy "acces autorise ventes"       on ventes       for all to authenticated using (est_autorise()) with check (est_autorise());
create policy "acces autorise lignes_vente" on lignes_vente for all to authenticated using (est_autorise()) with check (est_autorise());
create policy "acces autorise paiements"    on paiements    for all to authenticated using (est_autorise()) with check (est_autorise());

-- =====================================================================================
-- ÉTAPE B — après déploiement. Remplacer ____ par le NOUVEAU code à 4 chiffres.
-- =====================================================================================

-- update app_config set valeur = '____' where cle = 'code_acces';
--
-- drop policy "lecture produits" on produits;
-- drop policy "ecriture produits" on produits;
-- drop policy "modification produits" on produits;
-- drop policy "suppression produits" on produits;
-- drop policy "lecture soirees" on soirees;
-- drop policy "ecriture soirees" on soirees;
-- drop policy "modification soirees" on soirees;
-- drop policy "suppression soirees" on soirees;
-- drop policy "lecture ventes" on ventes;
-- drop policy "ecriture ventes" on ventes;
-- drop policy "modification ventes" on ventes;
-- drop policy "suppression ventes" on ventes;
-- drop policy "lecture lignes_vente" on lignes_vente;
-- drop policy "ecriture lignes_vente" on lignes_vente;
-- drop policy "modification lignes_vente" on lignes_vente;
-- drop policy "suppression lignes_vente" on lignes_vente;
-- drop policy "lecture paiements" on paiements;
-- drop policy "ecriture paiements" on paiements;
-- drop policy "modification paiements" on paiements;
-- drop policy "suppression paiements" on paiements;
--
-- drop function if exists verifier_code_acces(text);
-- drop function if exists code_acces_valide();
--
-- -- Les anciennes sessions déverrouillées sont conservées ; pour forcer tout le monde à
-- -- ressaisir le nouveau code : delete from appareils_autorises;
