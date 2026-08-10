# Décisions métier ouvertes — SentraJet Premium

Points à trancher avant figement juridique / paramétrage production.

| ID | Sujet | Options / note | Statut |
|----|-------|----------------|--------|
| D-01 | Annulation **2 h – 4 h** | Non définie dans les supports. Ne pas inventer. Paramètre `cancellation_fee_2h_to_4h_percent` = `null` jusqu’à décision. | Ouvert |
| D-02 | Attente aéroport / retard de vol | Règle spécifique à définir (ex. gratuité liée au retard déclaré). | Ouvert |
| D-03 | Délai de réclamation | Nombre d’heures/jours après prestation. | Ouvert |
| D-04 | No-show — montant dû | % du trajet, forfait, ou équivalent annulation < 2 h. | Ouvert |
| D-05 | Chauffeur déjà arrivé — prestation due | Total / partiel / selon délai d’attente. | Ouvert |
| D-06 | Contrat propriétaire | Répartition assurance, carburant, pneus, réparations, taxes, immobilisation. | Ouvert |
| D-07 | Présentation 500 000 FCFA/mois | Toujours « à partir de / modalités contractuelles », jamais « rendement garanti ». | Validé (rédaction) |
| D-08 | Relève juridique CGV/CGP | Avocat / conseil avant publication site. | Ouvert |
| D-09 | Buffer anti-conflit dispatch | Défaut **90 min** (`conflict_buffer_minutes`). Affiner selon distance / type de mission. | Provisoire |
| D-10 | Remise compte client | **−10 %** sur tarifs client uniquement (pas partenaire). | Validé |
| D-11 | MAD matinée | **50 000 F ≤ 100 km**, puis **700 F/km** hors forfait. | Validé |
| D-12 | Client ne choisit pas véhicule/chauffeur | Affectation 100 % SentraJet après paiement. | Validé |
| D-13 | Inscription chauffeur ouverte | Fermée — flotte entreprise uniquement. | Validé |

Mettre à jour ce fichier dès qu’une décision est prise, puis synchroniser `business_rules` en base.
