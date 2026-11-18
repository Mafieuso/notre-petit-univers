/* ============================================================
   💗 CONFIG — tout ce que tu peux personnaliser est ICI.
   Tu n'as normalement besoin de modifier QUE ce fichier.
   Dans les textes : {her} = son prénom, {me} = ton prénom.
   ============================================================ */
window.CONFIG = {
  herName: "mon petit cœur",     // Son surnom ou prénom (ex. "Léa")
  myName: "ton amoureux",        // Ton prénom (ex. "Thomas")
  startDate: "2026-10-12T00:00:00", // Début de votre relation (AAAA-MM-JJTHH:MM:SS)

  /* ---------- PUZZLE ---------- */
  puzzle: {
    image: "assets/images/puzzle.webp",         // L'illustration du puzzle (.jpg, .png ou .webp)
    imageFallbacks: [                            // Essayées si la première est introuvable
      "assets/images/puzzle.jpg",
      "assets/images/puzzle.jpeg",
      "assets/images/puzzle.png"
    ],
    defaultDifficulty: "hard",
    previewSeconds: 4,                           // Durée de l'aperçu de l'image
    difficulties: [
      { id: "easy",   label: "Facile",    cols: 6,  rows: 6,  rotated: 0.30, desc: "36 pièces · pour se détendre" },
      { id: "hard",   label: "Difficile", cols: 8,  rows: 8,  rotated: 0.55, desc: "64 pièces · le bon défi" },
      { id: "expert", label: "Expert",    cols: 10, rows: 10, rotated: 0.80, desc: "100 pièces · courage, mon petit cœur" }
    ]
  },

  /* ---------- MUSIQUE ---------- */
  music: {
    file: "assets/audio/musique.mp3",
    title: "Notre musique ♡"
  },

  /* ---------- SONS (optionnel) ----------
     Par défaut, de petits sons doux sont générés automatiquement.
     Pour utiliser tes propres fichiers, indique-les ici
     (ex. place: "assets/audio/effects/place.mp3"). */
  sfx: {
    files: { place: "", unlock: "", envelope: "", heart: "", win: "" }
  },

  /* ---------- GALERIE ---------- */
  gallery: {
    photos: [
      { src: "assets/images/photo1.png", caption: "Nous deux, tout simplement." },
      { src: "assets/images/photo2.png", caption: "Ce petit rire que j'aime tant." },
      { src: "assets/images/photo3.png", caption: "Un de mes souvenirs préférés." },
      { src: "assets/images/photo4.png", caption: "Toujours collés, comme ces deux-là." }
    ]
  },

  /* ---------- TEXTES ---------- */
  texts: {
    pageTitle: "Notre petit univers ♡",

    intro: {
      kicker: "Pour {her}",
      title: "J'ai quelque chose à te faire découvrir... ♡",
      subtitle: "Un petit moment à deux, quelques pièces à assembler, et beaucoup d'amour à découvrir.",
      button: "Commencer notre petit jeu ♡",
      buttonDone: "Retrouver ma surprise ♡"
    },

    setup: {
      title: "Choisissez votre défi",
      subtitle: "À deux, c'est toujours plus joli.",
      start: "Lancer le puzzle",
      resume: "Reprendre ({done}/{total})",
      back: "Accueil",
      howto: [
        "Glisse les pièces pour les déplacer.",
        "Double-tape, clic droit ou touche R pour les tourner.",
        "Pince ou molette pour zoomer, glisse le fond pour te déplacer.",
        "Deux pièces voisines bien orientées s'emboîtent et se déplacent ensemble.",
        "Une pièce ne se verrouille que bien placée ET bien orientée."
      ]
    },

    hud: {
      pieces: "pièces",
      time: "Temps",
      left: "Restantes",
      errors: "Essais ratés",
      pause: "Pause",
      reference: "Voir l'image",
      zoomIn: "Zoom +",
      zoomOut: "Zoom −",
      fit: "Vue d'ensemble",
      restart: "Recommencer",
      rotateLeft: "Tourner à gauche",
      rotateRight: "Tourner à droite"
    },

    game: {
      pauseTitle: "Pause ♡",
      pauseText: "Le puzzle se repose un instant, comme nous.",
      resume: "Reprendre",
      restartTitle: "Tout recommencer ?",
      restartText: "Votre progression actuelle sera effacée et vous pourrez choisir une nouvelle difficulté.",
      restartYes: "Oui, recommencer",
      restartNo: "Non, continuer",
      refHint: "Touche pour fermer"
    },

    puzzleMessages: [
      "Chaque pièce de plus nous rapproche de notre surprise. ♡",
      "Même quand c'est compliqué, j'aime avancer avec toi.",
      "Tu es la seule pièce que je ne veux jamais perdre.",
      "On va y arriver ensemble, mon petit cœur.",
      "Chaque détail compte, exactement comme toi.",
      "Je pourrais passer des heures à construire quelque chose avec toi."
    ],

    whispers: [
      "Tu sais que je pense à toi, là, maintenant ? ♡",
      "Petit rappel : tu es incroyable.",
      "Respire, souris, tu es adorable.",
      "Je suis fier de nous.",
      "Un bisou virtuel est en route... 💋",
      "Ton sourire est ma chose préférée."
    ],

    finale: {
      title: "Bravo, mon petit cœur ♡",
      message: "Tu vois ? Même les plus jolies choses prennent du temps à construire. Et moi, je veux continuer à construire la plus belle histoire avec toi. ♡",
      stats: "Terminé en {time} · {errors} essai(s) raté(s)",
      button: "Découvrir ma surprise ❤️"
    },

    rain: {
      kicker: "Pour toi",
      title: "Une pluie de petits mots doux",
      hint: "Touche un cœur pour lire son message en grand.",
      found: "mots découverts",
      allFound: "Tu les as tous trouvés... mais il y en a des milliers d'autres dans mon cœur. ♡",
      next: "Continuer",
      messages: [
        "Tu es ma personne préférée.",
        "Ton sourire est mon endroit préféré.",
        "Je suis tellement heureux de t'avoir dans ma vie.",
        "Tu rends mes journées plus belles.",
        "Je choisirais encore et toujours toi.",
        "Tu es mon plus beau hasard.",
        "Je t'aime plus que les mots ne peuvent le dire.",
        "Mon endroit préféré, c'est près de toi.",
        "Merci d'être toi.",
        "Avec toi, même les journées ordinaires deviennent spéciales."
      ]
    },

    letter: {
      kicker: "Pour toi",
      title: "Une lettre rien que pour toi",
      hint: "Touche l'enveloppe pour l'ouvrir.",
      envelopeTo: "Pour {her}",
      skip: "Touche la lettre pour tout lire d'un coup",
      close: "Fermer la lettre",
      signature: "— {me}",
      text: `Mon petit cœur,

Si tu lis cette lettre, c'est que nous avons réussi à terminer notre petit puzzle.

Tu sais, j'aurais pu simplement te dire que je t'aime, mais j'avais envie de créer quelque chose de spécial pour toi.

Chaque petite pièce représente un petit moment, un souvenir, un sourire, une partie de notre histoire.

Je ne sais pas exactement ce que l'avenir nous réserve, mais je sais que j'ai envie de continuer à construire plein de souvenirs avec toi.

Merci pour tous les moments que tu m'offres, pour la personne que tu es et pour tout ce que tu représentes à mes yeux.

Je t'aime énormément. ❤️`
    },

    counter: {
      kicker: "En direct",
      title: "Le compteur de notre amour",
      subtitle: "Ensemble depuis",
      days: "jours",
      hours: "heures",
      minutes: "minutes",
      seconds: "secondes",
      note: "Chaque seconde passée avec toi est une seconde que je ne regrette pas. ♡",
      future: "Notre histoire commence bientôt ♡"
    },

    hug: {
      kicker: "Quand tu veux",
      title: "Le bouton magique",
      button: "J'ai besoin d'un câlin ♡",
      again: "Encore un ♡",
      close: "Merci ♡",
      messages: [
        "Même à distance, je t'envoie le plus gros câlin du monde. Imagine mes bras autour de toi. ❤️",
        "Ferme les yeux. Là. Mes bras autour de toi, et rien d'autre ne compte.",
        "Un câlin livré en 0 seconde, avec tout mon amour dedans. ♡",
        "Je te serre fort, très fort, aussi longtemps que tu en as besoin.",
        "Cache-toi dans mes bras, tout va bien. Je suis là. ❤️"
      ]
    },

    gallery: {
      kicker: "Souvenirs",
      title: "Notre petite galerie",
      hint: "Touche une photo pour la voir en grand.",
      placeholder: "Ta photo ici ♡",
      close: "Fermer",
      prev: "Précédente",
      next: "Suivante"
    },

    outro: {
      title: "Je t'aime, {her}.",
      text: "Le puzzle n'était que le début. La plus belle histoire, c'est celle qu'on écrit tous les jours, ensemble.",
      top: "Revenir au début ↑"
    },

    music: {
      missing: "Ajoute ta musique dans assets/audio/",
      play: "Lecture",
      pause: "Pause",
      volume: "Volume"
    },

    settings: {
      title: "Réglages",
      sound: "Effets sonores",
      anim: "Animations"
    }
  }
};
