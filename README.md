# 💗 Notre petit univers

Un cadeau numérique interactif : un vrai puzzle à résoudre à deux, puis une surprise remplie de mots doux, d'une lettre, d'un compteur d'amour, d'un bouton câlin et d'une galerie de polaroïds.

Site 100 % statique (HTML / CSS / JS), sans serveur, compatible GitHub Pages.

## 1. Personnaliser

**Tout se modifie dans `config.js`** (prénoms, date, lettre, messages, légendes, difficultés, fichiers…).
Dans les textes, `{her}` = son prénom et `{me}` = ton prénom.

| À changer | Où |
|---|---|
| Son prénom / le tien | `herName`, `myName` |
| Date de début de la relation | `startDate` (format `2024-02-14T20:00:00`) |
| Texte de la lettre | `texts.letter.text` |
| Petits mots doux (cœurs) | `texts.rain.messages` |
| Messages du câlin | `texts.hug.messages` |
| Messages pendant le puzzle | `texts.puzzleMessages` |
| Légendes et photos | `gallery.photos` |
| Image du puzzle | `puzzle.image` |
| Musique | `music.file` et `music.title` |
| Difficultés | `puzzle.difficulties` (colonnes, lignes, part de pièces retournées) |

## 2. Ajouter tes images

Dépose les fichiers dans `assets/images/` :

- `puzzle.webp` (ou `puzzle.jpg` / `.png`) : l'illustration du puzzle. Ton illustration est déjà fournie en `puzzle.webp`. Mets une image de bonne qualité (1400 px de large ou plus, ratio quelconque, il est conservé).
- `photo1.jpg`, `photo2.jpg`, `photo3.jpg`, `photo4.jpg` : les photos de la galerie.

Pour ajouter ou retirer une photo, modifie la liste `gallery.photos` dans `config.js`. Une photo introuvable affiche un joli cadre « Ta photo ici ♡ » : supprime simplement les lignes inutilisées.

## 3. Ajouter ta musique

Dépose ton fichier dans `assets/audio/` sous le nom `musique.mp3` (ou change `music.file` dans `config.js`). La musique ne démarre **jamais** toute seule : elle se lance avec le bouton ♪ en haut à droite.

Les petits sons (pièce posée, surprise, enveloppe, cœurs) sont générés automatiquement. Pour utiliser tes propres sons, renseigne `sfx.files` dans `config.js` (par ex. `place: "assets/audio/effects/place.mp3"`).

## 4. Tester sur ton ordinateur

Tu peux double-cliquer sur `index.html`. Pour un test plus fidèle, lance un petit serveur dans le dossier :

```powershell
python -m http.server 8000
```

puis ouvre http://localhost:8000.

## 5. Publier sur GitHub Pages

1. Crée un compte sur https://github.com, puis un nouveau dépôt (par ex. `notre-univers`).
2. Sur la page du dépôt, clique sur **Add file → Upload files** et glisse tout le contenu du dossier `notre-univers` (`index.html`, `style.css`, `script.js`, `config.js`, `js/`, `assets/`, `.nojekyll`).
3. Clique sur **Commit changes**.
4. Va dans **Settings → Pages**. Dans « Build and deployment », choisis **Deploy from a branch**, la branche `main` et le dossier `/ (root)`, puis **Save**.
5. Au bout d'une minute, ton site est en ligne à l'adresse `https://TON-PSEUDO.github.io/notre-univers/`. Envoie-lui ce lien.

Pour modifier le site plus tard, remplace le fichier concerné sur GitHub : le site se met à jour tout seul.

## 6. Comment jouer

- **Déplacer** une pièce : glisser-déposer (souris ou doigt).
- **Tourner** : double-tape / double-clic, clic droit, touche `R` (ou `E`, et `Q` dans l'autre sens), boutons ↺ ↻ quand une pièce est sélectionnée, ou un second doigt qui tape pendant qu'on déplace une pièce.
- **Zoomer** : pincer, molette, ou boutons + / −. Glisser le fond pour se déplacer.
- Une pièce n'est verrouillée que si sa position **et** son orientation sont justes.
- La progression est sauvegardée automatiquement (localStorage) : on peut fermer la page et reprendre plus tard.

## 7. À savoir

- La surprise n'existe pas dans la page avant la fin du puzzle : elle est construite par le JavaScript seulement après vérification que toutes les pièces sont correctement placées. Comme tout site statique, ce verrou protège contre une visite par erreur, pas contre quelqu'un qui lirait le code source.
- Respect du système : si le téléphone demande de réduire les animations, elles sont désactivées au départ. Un bouton ⚙ permet de les couper ou de couper les sons à tout moment.
- Les polices (Quicksand, Fraunces, Caveat) sont incluses dans `assets/fonts/`, le site fonctionne donc hors ligne.
