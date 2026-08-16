# Audit opérationnel — comptes client et super administrateur

Date : 16 août 2026  
Périmètre : parcours authentifiés, gestion des accès, réservation, exploitation et pilotage.

## Synthèse

Les défauts bloquants trouvés pendant l’audit ont été corrigés :

- menu profil et déconnexion accessibles sur ordinateur et mobile ;
- redirection explicite après déconnexion ;
- profil client et administrateur unifiés (identité, téléphone, mot de passe) ;
- création, liste et suppression des comptes réservées au super administrateur ;
- synchronisation automatique `auth.users` → `profiles` + `user_roles` ;
- réparation du profil client historique manquant ;
- formulaire interne client/partenaire/admin aligné sur l’autocomplétion GPS de `/reserver` ;
- distance routière calculée à partir des coordonnées, jamais d’un texte libre ;
- nouvelle grille de mise à disposition appliquée dans le moteur et en base.

Le principal risque restant n’est plus un blocage technique ponctuel : c’est la dispersion des
opérations entre trop d’écrans proches (`Demandes`, `Réservations`, `CRM`, `Dispatch`) sans file de
travail unique ni responsable explicite.

## Compte client

| Module | État | Constat | Décision recommandée |
|---|---|---|---|
| Accueil `/compte` | Fonctionnel | Résumé et prochaines réservations. Les erreurs étaient auparavant transformées en liste vide. | États chargement/erreur ajoutés. Garder uniquement prochaine action, réservation à venir et CTA. |
| Nouvelle réservation | Fonctionnel | `/compte/reserver` redirige vers le parcours public complet. | Conserver une seule source de vérité : `/reserver`. |
| Réservations | Fonctionnel partiel | Liste, statut, chauffeur et montant disponibles. Pas de filtre, facture, annulation encadrée ni accès direct à l’assistance. | Ajouter détail d’une réservation, contact support et documents ; ne pas multiplier les écrans. |
| Profil | Corrigé | Le profil historique du client n’existait pas en base et ne pouvait pas être enregistré. | Profil réparé, sauvegarde et changement de mot de passe ajoutés. |
| Déconnexion | Corrigé | L’avatar n’était pas interactif et la déconnexion ne forçait pas la sortie de l’espace protégé. | Menu avatar commun + redirection `/connexion`. |
| Demandes | Obsolète | Redirection vers les réservations. | Supprimer le lien et, après période de compatibilité, la route. |
| Locations | Obsolète | Ancien flux marketplace redirigé vers `/reserver`. | Même traitement : aucune duplication fonctionnelle. |

### Parcours client minimal cible

1. Accueil : « Réserver », prochain trajet, action requise.
2. Réservation : adresse GPS, prestation, date, passagers, prix/devis, confirmation.
3. Mes trajets : statut et détail.
4. Profil : identité, sécurité, déconnexion.

Tout autre besoin doit être rattaché à une réservation ou au profil, pas devenir un nouveau menu.

## Super administration

| Module | État | Constat | Simplification recommandée |
|---|---|---|---|
| Tableau de bord | Fonctionnel | Montre volumes, disponibilité et CA estimé. | Le transformer en file « À faire maintenant » : demandes sans responsable, devis en retard, dispatch à réaliser. |
| Demandes | Fonctionnel | Pipeline et changements de statut opérationnels. | Fusionner visuellement avec Réservations sous une vue Opérations filtrable. |
| Réservations | Fonctionnel | Liste et création interne. Le formulaire utilisait auparavant du texte libre incompatible avec l’API distance. | GPS unifié corrigé. Garder cette page comme registre, pas comme seconde file de traitement. |
| Dispatch | Fonctionnel | Affectation chauffeur/véhicule et détection des éléments en attente. | Ajouter responsable, heure limite et motifs de blocage. |
| CRM | Fonctionnel partiel | Activités, suivis et demandes sont présents. | Construire une fiche 360 par client/partenaire au lieu de tableaux indépendants. |
| Chauffeurs | Fonctionnel partiel | Répertoire et statut. | Ajouter filtres disponibilité/conformité et accès au détail ; éviter les cartes décoratives. |
| Partenaires | Fonctionnel | Prospection, certification et contrats. | Afficher une étape courante, un propriétaire du dossier et une prochaine action obligatoire. |
| Propriétaires | Fonctionnel partiel | Suivi flotte/propriétaires. | Rattacher contrats, véhicules et alertes documentaires à une fiche unique. |
| Clients | Lecture seule | Cartes avec coordonnées, sans recherche ni fiche détaillée. | Ajouter recherche et lien vers la fiche CRM ; ne pas créer un second CRM. |
| Utilisateurs | Corrigé | Création/listage/suppression et attribution du rôle. Était inaccessible sur mobile et dépendait d’un secret Vercel local. | Accès mobile ajouté ; backend Edge sécurisé ajouté comme solution de continuité. |
| Véhicules | Fonctionnel partiel | Répertoire de flotte. | Prioriser conformité, disponibilité et affectation ; masquer les champs secondaires par défaut. |
| Tarification | Lecture structurée | Présente les grilles, mais ne constitue pas encore un éditeur complet. | Édition versionnée avec date d’effet, validation direction et historique. |
| Règles métier | Fonctionnel | Paramètres techniques modifiables. | Regrouper par domaine et afficher impact, valeur active, auteur et date. |
| Rapports | Indicatif | Le « CA » additionne des estimations, pas des paiements encaissés. | Renommer « volume estimé » tant que le rapprochement paiements/factures n’est pas la source. |
| Paramètres | Lecture seule | Valeurs d’identité codées en dur, matrice d’accès descriptive. | Soit rendre modifiable avec contrôle, soit retirer du menu pour éviter une fausse fonctionnalité. |
| Profil admin | Ajouté | Aucun profil administrateur dédié auparavant. | Identité, sécurité, utilisateurs et déconnexion regroupés. |
| Trajets | Obsolète | Ancien flux marketplace redirigé. | Retirer du modèle mental et supprimer après compatibilité. |

## Gestion des rôles

La création de comptes est une opération de super administration. Les autres employés ne doivent
voir que leurs outils métier. La navigation masque désormais « Utilisateurs » aux non-super-admin,
mais la cible doit être une matrice d’autorisations serveur par action :

- `super_admin` : comptes, rôles, règles, tarification et toutes opérations ;
- `manager` : supervision et validation, sans gestion des super administrateurs ;
- `commercial` : CRM, clients, partenaires et devis ;
- `ops` : demandes, réservations et dispatch ;
- `finance` : paiements, factures et rapports financiers ;
- `fleet_manager` : chauffeurs, propriétaires et véhicules ;
- `rh` : dossiers employés, sans accès automatique aux prix internes ;
- `driver`, `partner`, `provider`, `client` : espace dédié uniquement.

## Sécurité Supabase à planifier

Le contrôle automatique après migration ne signale pas de nouvelle faille liée aux profils ou aux
tarifs. Il conserve toutefois des alertes historiques à traiter séparément :

- déplacer `has_role` et `has_any_role` hors du schéma API exposé tout en conservant leur usage RLS ;
- vérifier les contrôles internes de `list_crm_staff` et `write_audit_log` avant de réduire leurs droits ;
- conserver `submit_booking_demande` public uniquement parce que la réservation anonyme est voulue,
  avec validation stricte de chaque entrée et limitation de débit côté API ;
- activer la protection Supabase contre les mots de passe compromis ;
- décider explicitement si `region_distances` doit être lisible ou rester strictement serveur.

Références : [linter fonctions SECURITY DEFINER](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable) et [protection des mots de passe](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

## Principe managérial

Une interface ne doit pas compter sur la motivation individuelle d’un employé. Elle doit rendre le
bon comportement plus simple que l’inaction :

1. une file de travail unique par rôle ;
2. un responsable obligatoire pour chaque dossier ;
3. une échéance et une prochaine action visibles ;
4. des alertes sur les exceptions, pas sur chaque événement ;
5. aucun indicateur sans action possible ;
6. historique automatique des décisions ;
7. droits minimaux et séparation des tâches sensibles ;
8. mesure des délais réels : prise en charge, devis, paiement, dispatch, clôture.

## Priorités suivantes

### P0 — terminé dans cette révision

- authentification, profils, déconnexion et comptes ;
- géolocalisation homogène ;
- grille MAD corrigée et synchronisée ;
- tests API de création, connexion, profil et suppression.

### P1 — prochaine consolidation

- vue Opérations unique fusionnant Demandes + Réservations + Dispatch ;
- recherche globale et fiche client 360 ;
- permissions serveur détaillées par rôle et action ;
- états de chargement/erreur uniformes sur tous les modules admin ;
- séparation stricte entre estimations, devis, paiements et chiffre d’affaires encaissé.

### P2 — industrialisation

- pagination et filtres serveur ;
- journal d’audit complet ;
- notifications par responsabilité et échéance ;
- exports financiers et opérationnels ;
- suppression définitive des routes marketplace obsolètes.
