# Le glossaire

Les mots des cuisines professionnelles, et ce qui leur répond dans le simulateur. La dernière colonne dit le nom
dans le code quand il existe déjà, ou « — » quand le mot attend une étape de la
[feuille de route](feuille-de-route.md).

## La brigade

La brigade de cuisine est l'organisation hiérarchique attribuée à Escoffier : chaque cuisinier tient une
**partie** (un poste), sous un chef ([Wikipedia, *Kitchen brigade*][wiki-brigade] ; [Escoffier][escoffier]).

| Terme | Ce que c'est | Dans le simulateur |
|---|---|---|
| **Chef de cuisine** | dirige la brigade, compose la carte, tient le service | — (l'ordonnanceur en tient le rôle) |
| **Second** (sous-chef) | remplace le chef, tient souvent l'annonce | — |
| **Chef de partie** | tient un poste : garde-manger (le froid), saucier, poissonnier, rôtisseur, entremétier (légumes, garnitures), pâtissier | les rôles des robots (`setup.roles` : `coupe`, `cuisson`, `salade`, `passe`) |
| **Commis** | aide un chef de partie : mise en place, cuisson, nettoyage ; un ou deux par partie ([lesiteduchef][siteduchef]) | — |
| **Tournant** | remplace les chefs de partie absents, passe d'un poste à l'autre | le robot sans rôle, qui fait des plats entiers |
| **Plongeur** (la plonge) | lave la batterie et la vaisselle | — (étape 4, « plus tard ») |
| **Aboyeur** (*expo*, *expediter*) | entre la salle et la cuisine pendant le service : il annonce les bons, fait marcher les plats, les réclame, contrôle avant l'envoi ; souvent le chef ou le second ([lesiteduchef][siteduchef]) | le rôle `passe` en est l'ébauche : il ne fait que servir ce qui est prêt |

Les sources ne s'accordent pas toutes : Wikipedia fait prendre les commandes de la salle à l'aboyeur, qui les
distribue aux postes ; une autre source le confond avec le serveur, ce qui est une erreur (l'aboyeur est en
cuisine).

## Le service

| Terme | Ce que c'est | Dans le simulateur |
|---|---|---|
| **Le bon** (*ticket*) | la commande d'une table, écrite par la salle, affichée ou imprimée en cuisine | une commande (`upcoming`, `arrival`, `deadline`) |
| **Annoncer**, « **ça marche** » | l'aboyeur lit le bon à voix haute ; les parties répondent pour dire qu'elles l'ont entendu | la commande devient visible à son `arrival` |
| **Faire marcher** (*fire*) | lancer la préparation d'un plat, au bon moment pour qu'il sorte avec les autres de la table | — : un plat se lance dès qu'un cuisinier le prend |
| **Réclamer** | l'aboyeur demande l'envoi d'un plat dont la table attend | — |
| **J'envoie**, « **envoyez** » | le plat est dressé, il part au passe | `servedAt` |
| **Le passe** (*pass*, *window*) | le comptoir chaud où les plats attendent les serveurs | `S` dans les plans |
| **Mourir au passe** (*dying on the pass*) | un plat resté trop longtemps au passe, qui n'est plus servable ([WebstaurantStore][webstaurant]) | — ; la soupe qui brûle sur le fourneau (`burnt`) en est l'analogue |
| **Au total** (*all day*) | la quantité d'un plat sur tous les bons ouverts : trois bons de deux burgers, « six all day » ([hcareers][hcareers]) | — : utile aux robots en avance (`docs/modele.md`, « La suite » 3) |
| **À la volée** (*on the fly*) | un plat à faire tout de suite, le plus souvent un plat refait ou oublié ([hcareers][hcareers]) | la commande d'une soupe brûlée, remise à « open » |
| **86**, **rupture** | un plat ou un produit épuisé, retiré de la carte ce soir | — : une caisse vide (étape 1) |
| **Chaud devant**, **derrière** (*behind*, *corner*) | on prévient quand on passe derrière quelqu'un, avec du chaud ou un couteau, ou avant un angle mort ([hcareers][hcareers]) | les chemins réservés : personne ne se croise |
| **Le coup de feu** | le moment d'activité intense du service ([France Compétences][fc-coup]) | le pic de bons ouverts (à compter, [indicateurs.md](indicateurs.md)) |
| **Le couvert** | un client servi ; on compte les couverts d'un service | — : une commande vaut un couvert aujourd'hui |

## Avant et autour du service

| Terme | Ce que c'est | Dans le simulateur |
|---|---|---|
| **La mise en place** | tout ce qui est préparé et rangé au poste avant de cuisiner | — : les comptoirs (`_`) tiennent des oignons coupés, mais seulement pour une commande |
| **La fiche technique** | le document d'un plat : ses phases avec temps et températures, ses denrées, son coût par portion ([nomadeducation][nomad-fiche]) | `RECIPES` dans `src/kitchens.js` : `cut`, `cook` |
| **L'ordonnancement** | le tableau des phases d'une production, avec leurs durées et leur ordre ([nomadeducation][nomad-fiche]) | ce que décident les règles et la recherche |
| **Le rétroplanning** | partir de l'heure d'envoi et remonter les étapes | — (étape 2, le traiteur) |
| **Le rendement** | de la quantité achetée à la quantité utilisable : 100 g de champignons crus font 40 g cuits ([Easilys][easilys]) | — |
| **FIFO**, **FEFO** | rotation des stocks par ordre d'arrivée, ou par date limite ; FIFO par défaut, FEFO pour les produits dont la durée varie d'un lot à l'autre ([Transact][fefo]) | — |
| **DLC**, **DDM** | date limite de consommation (la sécurité) ; date de durabilité minimale, l'ancienne DLUO (la qualité) ([Shippingbo][dlc]) | — |

## Les liaisons et la température

| Terme | Ce que c'est | Dans le simulateur |
|---|---|---|
| **Liaison directe** | produit et servi sur place, tout de suite | la cuisine actuelle |
| **Liaison chaude** | produit, gardé à **63 °C au moins** jusqu'au service ou à la livraison ([Ardennes][ardennes]) | — (étape 2) |
| **Liaison froide** | produit en cuisine centrale, refroidi, gardé entre 0 et +3 °C, remis en température sur le lieu de service (cuisine satellite) ([ac-versailles][versailles]) | — (étape 2) |
| **Refroidissement rapide** | de +63 °C à +10 °C à cœur en **moins de 2 h** (arrêté du 21/12/2009, annexe IV) ([ac-strasbourg][strasbourg]) | — |
| **Remise en température** | pas plus d'**1 h** entre +10 °C et la température de service, 63 °C au moins ([ac-strasbourg][strasbourg]) | — |
| **HACCP**, **PMS** | l'analyse des dangers et ses points critiques ; le plan de maîtrise sanitaire qui les met par écrit | — |
| **Les 14 allergènes** | la liste de l'annexe II du règlement INCO (UE 1169/2011) ; en restauration, l'information est écrite et accessible sans que le client la demande ([Keobiz][keobiz] ; [UMIH][umih]) | — (« plus tard ») |

Les seuils de température sont cohérents d'une source à l'autre, mais aucune n'est le texte officiel : avant
d'en faire une règle du simulateur, les relire sur Légifrance.

## La livraison

| Terme | Ce que c'est | Dans le simulateur |
|---|---|---|
| **Dark kitchen** (*ghost kitchen*, *cloud kitchen*) | une cuisine sans salle, qui ne sert qu'en livraison, souvent plusieurs enseignes sous un toit | — (étape 3) |
| **Le coursier** (*rider*, *driver*) | vient chercher la commande à une heure estimée par la plateforme | — |
| **L'ETA** | l'heure estimée d'arrivée du coursier, calculée sur un temps de préparation supposé ([Syrve][syrve]) | — |
| **Le KDS** | l'écran de cuisine qui remplace les bons imprimés ; il affiche chaque commande avec son temps de préparation, sa priorité, son heure limite, et mesure le temps de chaque bon ([Toast][toast-kds] ; [LS Central][ls-kds]) | la liste des commandes de la page, avec leur âge et leur barre de patience |

[wiki-brigade]: https://en.wikipedia.org/wiki/Kitchen_brigade
[escoffier]: https://www.escoffier.edu/blog/culinary-pastry-careers/different-types-of-chef-jobs-in-the-brigade-de-cuisine/
[siteduchef]: https://lesiteduchef.yo.fr/assets/files/Le-personneltenueetcomportement.pdf
[webstaurant]: https://www.webstaurantstore.com/article/511/kitchen-slang-phrases.html
[hcareers]: https://www.hcareers.com/article/career-advice/food-service-slang-20-insider-kitchen-terms
[fc-coup]: https://certifpro.francecompetences.fr/api/fiches/refActivity/23946/450222
[nomad-fiche]: https://www.nomadeducation.fr/revisions/cap-cuisine-lbcb0b32/les-documents-de-production-et-l-approche-economiq-cycfed34
[easilys]: https://help.mapal-os.com/fr/easilys-fr/produits-1/mercuriales-1/garer-les-taux-de-rendement-des-ressources-alimentaires/
[fefo]: https://www.transact-tech.com/resources/blog/fifo-vs-fefo-multi-location-rotation
[dlc]: https://www.shippingbo.com/en/supply-chain-en/dlc-dluo-ddm-difference-the-guide-to-managing-your-perishable-stocks/
[ardennes]: https://www.ardennes.gouv.fr/index.php/contenu/telechargement/5032/43989/file/Restauration_collective.pdf
[versailles]: https://www.hotellerie-restauration.ac-versailles.fr/IMG/pdf/Les_liaisons_chaude_et_froides-_F_Cecconi.pdf
[strasbourg]: https://pedagogie.ac-strasbourg.fr/fileadmin/pedagogie/ecogestionpro/filieres_et_ressources/hotellerie_restauration/PMS_-_PRP/guide_PMS/2._BONNES_PRATIQUES_DE_FABRICATION/2.12_REFROIDISSEMENT_RAPIDE.pdf
[keobiz]: https://www.keobiz.fr/fiches-pratiques/ouvrir-restaurant-hotel/cote-restaurant-les-affichages-obligatoires-allergenes/
[umih]: https://www.umih.fr/assets/files/site/ressources/guides/Guide__Allergenes_Umih.pdf
[syrve]: https://www.syrve.com/en-gb/blog/dark-kitchen-tech
[toast-kds]: https://support.toasttab.com/en/article/Kitchen-Reports-Overview?lang=en_US
[ls-kds]: https://help.lscentral.lsretail.com/Content/LS-Hospitality/Kitchen-Display-System/KDS-Performance-Station.htm
