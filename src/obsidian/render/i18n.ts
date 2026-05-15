/**
 * src-v2/obsidian/render/i18n.ts
 * Localised UI strings for rendered Obsidian notes.
 *
 * The language is detected from the post body (see shared/text.ts detectLanguage)
 * and from the page's declared lang attribute (document.documentElement.lang).
 * All keys fall back to English when a translation is missing.
 */

export interface NoteStrings {
  untitledPost: string;
  sectionPost: string;
  sectionSharedPost: string;
  sharedFrom: string;           // "Shared from {author}"
  sectionMedia: string;
  imageLabel: string;           // "Image" (numbered: "Image 1")
  videoLabel: string;           // "(video)"
  videoPosterAlt: string;       // alt text for video poster image
  sectionLinkPreviews: string;
  postedBy: string;             // "Posted by {author}"
  contextIn: string;            // "in {group}"
  contextOn: string;            // "on {page}"
  contextProfile: string;       // "profile:"
  linkLabel: string;            // link anchor text for permalink
  sectionComments: string;
  commentModeAll: string;
  commentModeOpOnly: string;
  commentModeOpAnswered: string;
  shownOf: (shown: number, total: number) => string; // "X of Y shown"
  noComments: string;
  noCommentsMatched: string;
  opBadge: string;              // "(OP)"
  commentImageAlt: string;      // alt text for comment photos
}

// ---------------------------------------------------------------------------
// English (base / fallback)
// ---------------------------------------------------------------------------
const EN: NoteStrings = {
  untitledPost: 'Untitled Post',
  sectionPost: 'Post',
  sectionSharedPost: 'Shared Post',
  sharedFrom: 'Shared from',
  sectionMedia: 'Media',
  imageLabel: 'Image',
  videoLabel: '(video)',
  videoPosterAlt: 'video poster',
  sectionLinkPreviews: 'Link Previews',
  postedBy: 'Posted by',
  contextIn: 'in',
  contextOn: 'on',
  contextProfile: 'profile:',
  linkLabel: 'link',
  sectionComments: 'Comments',
  commentModeAll: 'all',
  commentModeOpOnly: 'OP only',
  commentModeOpAnswered: 'OP-answered',
  shownOf: (s, t) => `${s} of ${t} shown`,
  noComments: 'No comments on this post.',
  noCommentsMatched: 'No comments matched this mode.',
  opBadge: '(OP)',
  commentImageAlt: 'comment image',
};

// ---------------------------------------------------------------------------
// Hebrew
// ---------------------------------------------------------------------------
const HE: NoteStrings = {
  untitledPost: 'פוסט ללא כותרת',
  sectionPost: 'פוסט',
  sectionSharedPost: 'פוסט משותף',
  sharedFrom: 'שותף מ',
  sectionMedia: 'מדיה',
  imageLabel: 'תמונה',
  videoLabel: '(וידאו)',
  videoPosterAlt: 'תמונת וידאו',
  sectionLinkPreviews: 'תצוגות קישור',
  postedBy: 'פורסם על ידי',
  contextIn: 'ב',
  contextOn: 'על',
  contextProfile: 'פרופיל:',
  linkLabel: 'קישור',
  sectionComments: 'תגובות',
  commentModeAll: 'הכל',
  commentModeOpOnly: 'מחבר בלבד',
  commentModeOpAnswered: 'נענו על ידי המחבר',
  shownOf: (s, t) => `${s} מתוך ${t} מוצגות`,
  noComments: 'אין תגובות בפוסט זה.',
  noCommentsMatched: 'אין תגובות המתאימות למצב זה.',
  opBadge: '(מחבר)',
  commentImageAlt: 'תמונה בתגובה',
};

// ---------------------------------------------------------------------------
// Arabic
// ---------------------------------------------------------------------------
const AR: NoteStrings = {
  untitledPost: 'منشور بدون عنوان',
  sectionPost: 'منشور',
  sectionSharedPost: 'منشور مشترك',
  sharedFrom: 'مشارك من',
  sectionMedia: 'وسائط',
  imageLabel: 'صورة',
  videoLabel: '(فيديو)',
  videoPosterAlt: 'صورة الفيديو',
  sectionLinkPreviews: 'معاينات الروابط',
  postedBy: 'نشر بواسطة',
  contextIn: 'في',
  contextOn: 'على',
  contextProfile: 'الملف الشخصي:',
  linkLabel: 'رابط',
  sectionComments: 'تعليقات',
  commentModeAll: 'الكل',
  commentModeOpOnly: 'المؤلف فقط',
  commentModeOpAnswered: 'أجاب عليها المؤلف',
  shownOf: (s, t) => `${s} من ${t} معروضة`,
  noComments: 'لا تعليقات على هذا المنشور.',
  noCommentsMatched: 'لا تعليقات تطابق هذا الوضع.',
  opBadge: '(المؤلف)',
  commentImageAlt: 'صورة تعليق',
};

// ---------------------------------------------------------------------------
// Russian
// ---------------------------------------------------------------------------
const RU: NoteStrings = {
  untitledPost: 'Пост без названия',
  sectionPost: 'Пост',
  sectionSharedPost: 'Репост',
  sharedFrom: 'Поделился от',
  sectionMedia: 'Медиа',
  imageLabel: 'Изображение',
  videoLabel: '(видео)',
  videoPosterAlt: 'обложка видео',
  sectionLinkPreviews: 'Предпросмотр ссылок',
  postedBy: 'Опубликовано',
  contextIn: 'в',
  contextOn: 'на',
  contextProfile: 'профиль:',
  linkLabel: 'ссылка',
  sectionComments: 'Комментарии',
  commentModeAll: 'все',
  commentModeOpOnly: 'только автор',
  commentModeOpAnswered: 'отвечено автором',
  shownOf: (s, t) => `${s} из ${t} показано`,
  noComments: 'Нет комментариев к этому посту.',
  noCommentsMatched: 'Нет комментариев, соответствующих этому режиму.',
  opBadge: '(автор)',
  commentImageAlt: 'изображение в комментарии',
};

// ---------------------------------------------------------------------------
// Ukrainian
// ---------------------------------------------------------------------------
const UK: NoteStrings = {
  untitledPost: 'Публікація без назви',
  sectionPost: 'Публікація',
  sectionSharedPost: 'Поширена публікація',
  sharedFrom: 'Поділився від',
  sectionMedia: 'Медіа',
  imageLabel: 'Зображення',
  videoLabel: '(відео)',
  videoPosterAlt: 'обкладинка відео',
  sectionLinkPreviews: 'Попередній перегляд посилань',
  postedBy: 'Опубліковано',
  contextIn: 'у',
  contextOn: 'на',
  contextProfile: 'профіль:',
  linkLabel: 'посилання',
  sectionComments: 'Коментарі',
  commentModeAll: 'усі',
  commentModeOpOnly: 'лише автор',
  commentModeOpAnswered: 'відповів автор',
  shownOf: (s, t) => `${s} з ${t} показано`,
  noComments: 'Немає коментарів до цієї публікації.',
  noCommentsMatched: 'Немає коментарів, які відповідають цьому режиму.',
  opBadge: '(автор)',
  commentImageAlt: 'зображення в коментарі',
};

// ---------------------------------------------------------------------------
// French
// ---------------------------------------------------------------------------
const FR: NoteStrings = {
  untitledPost: 'Publication sans titre',
  sectionPost: 'Publication',
  sectionSharedPost: 'Publication partagée',
  sharedFrom: 'Partagé de',
  sectionMedia: 'Médias',
  imageLabel: 'Image',
  videoLabel: '(vidéo)',
  videoPosterAlt: 'miniature vidéo',
  sectionLinkPreviews: 'Aperçus de liens',
  postedBy: 'Publié par',
  contextIn: 'dans',
  contextOn: 'sur',
  contextProfile: 'profil :',
  linkLabel: 'lien',
  sectionComments: 'Commentaires',
  commentModeAll: 'tous',
  commentModeOpOnly: 'auteur seulement',
  commentModeOpAnswered: 'répondu par l\'auteur',
  shownOf: (s, t) => `${s} sur ${t} affichés`,
  noComments: 'Aucun commentaire sur cette publication.',
  noCommentsMatched: 'Aucun commentaire ne correspond à ce mode.',
  opBadge: '(auteur)',
  commentImageAlt: 'image de commentaire',
};

// ---------------------------------------------------------------------------
// German
// ---------------------------------------------------------------------------
const DE: NoteStrings = {
  untitledPost: 'Beitrag ohne Titel',
  sectionPost: 'Beitrag',
  sectionSharedPost: 'Geteilter Beitrag',
  sharedFrom: 'Geteilt von',
  sectionMedia: 'Medien',
  imageLabel: 'Bild',
  videoLabel: '(Video)',
  videoPosterAlt: 'Video-Vorschaubild',
  sectionLinkPreviews: 'Link-Vorschauen',
  postedBy: 'Gepostet von',
  contextIn: 'in',
  contextOn: 'auf',
  contextProfile: 'Profil:',
  linkLabel: 'Link',
  sectionComments: 'Kommentare',
  commentModeAll: 'alle',
  commentModeOpOnly: 'nur Autor',
  commentModeOpAnswered: 'vom Autor beantwortet',
  shownOf: (s, t) => `${s} von ${t} angezeigt`,
  noComments: 'Keine Kommentare zu diesem Beitrag.',
  noCommentsMatched: 'Keine Kommentare entsprechen diesem Modus.',
  opBadge: '(Autor)',
  commentImageAlt: 'Kommentarbild',
};

// ---------------------------------------------------------------------------
// Spanish
// ---------------------------------------------------------------------------
const ES: NoteStrings = {
  untitledPost: 'Publicación sin título',
  sectionPost: 'Publicación',
  sectionSharedPost: 'Publicación compartida',
  sharedFrom: 'Compartido de',
  sectionMedia: 'Medios',
  imageLabel: 'Imagen',
  videoLabel: '(vídeo)',
  videoPosterAlt: 'miniatura de vídeo',
  sectionLinkPreviews: 'Vistas previas de enlaces',
  postedBy: 'Publicado por',
  contextIn: 'en',
  contextOn: 'en',
  contextProfile: 'perfil:',
  linkLabel: 'enlace',
  sectionComments: 'Comentarios',
  commentModeAll: 'todos',
  commentModeOpOnly: 'solo autor',
  commentModeOpAnswered: 'respondido por el autor',
  shownOf: (s, t) => `${s} de ${t} mostrados`,
  noComments: 'No hay comentarios en esta publicación.',
  noCommentsMatched: 'Ningún comentario coincide con este modo.',
  opBadge: '(autor)',
  commentImageAlt: 'imagen de comentario',
};

// ---------------------------------------------------------------------------
// Portuguese
// ---------------------------------------------------------------------------
const PT: NoteStrings = {
  untitledPost: 'Publicação sem título',
  sectionPost: 'Publicação',
  sectionSharedPost: 'Publicação compartilhada',
  sharedFrom: 'Compartilhado de',
  sectionMedia: 'Mídia',
  imageLabel: 'Imagem',
  videoLabel: '(vídeo)',
  videoPosterAlt: 'miniatura do vídeo',
  sectionLinkPreviews: 'Pré-visualizações de links',
  postedBy: 'Publicado por',
  contextIn: 'em',
  contextOn: 'em',
  contextProfile: 'perfil:',
  linkLabel: 'link',
  sectionComments: 'Comentários',
  commentModeAll: 'todos',
  commentModeOpOnly: 'somente autor',
  commentModeOpAnswered: 'respondido pelo autor',
  shownOf: (s, t) => `${s} de ${t} exibidos`,
  noComments: 'Nenhum comentário nesta publicação.',
  noCommentsMatched: 'Nenhum comentário corresponde a este modo.',
  opBadge: '(autor)',
  commentImageAlt: 'imagem do comentário',
};

// ---------------------------------------------------------------------------
// Italian
// ---------------------------------------------------------------------------
const IT: NoteStrings = {
  untitledPost: 'Post senza titolo',
  sectionPost: 'Post',
  sectionSharedPost: 'Post condiviso',
  sharedFrom: 'Condiviso da',
  sectionMedia: 'Media',
  imageLabel: 'Immagine',
  videoLabel: '(video)',
  videoPosterAlt: 'anteprima video',
  sectionLinkPreviews: 'Anteprime link',
  postedBy: 'Pubblicato da',
  contextIn: 'in',
  contextOn: 'su',
  contextProfile: 'profilo:',
  linkLabel: 'link',
  sectionComments: 'Commenti',
  commentModeAll: 'tutti',
  commentModeOpOnly: 'solo autore',
  commentModeOpAnswered: 'risposto dall\'autore',
  shownOf: (s, t) => `${s} di ${t} mostrati`,
  noComments: 'Nessun commento su questo post.',
  noCommentsMatched: 'Nessun commento corrisponde a questo modo.',
  opBadge: '(autore)',
  commentImageAlt: 'immagine commento',
};

// ---------------------------------------------------------------------------
// Dutch
// ---------------------------------------------------------------------------
const NL: NoteStrings = {
  untitledPost: 'Bericht zonder titel',
  sectionPost: 'Bericht',
  sectionSharedPost: 'Gedeeld bericht',
  sharedFrom: 'Gedeeld van',
  sectionMedia: 'Media',
  imageLabel: 'Afbeelding',
  videoLabel: '(video)',
  videoPosterAlt: 'videominiatuur',
  sectionLinkPreviews: 'Linkvoorbeelden',
  postedBy: 'Geplaatst door',
  contextIn: 'in',
  contextOn: 'op',
  contextProfile: 'profiel:',
  linkLabel: 'link',
  sectionComments: 'Reacties',
  commentModeAll: 'alle',
  commentModeOpOnly: 'alleen auteur',
  commentModeOpAnswered: 'beantwoord door auteur',
  shownOf: (s, t) => `${s} van ${t} weergegeven`,
  noComments: 'Geen reacties op dit bericht.',
  noCommentsMatched: 'Geen reacties komen overeen met deze modus.',
  opBadge: '(auteur)',
  commentImageAlt: 'reactie-afbeelding',
};

// ---------------------------------------------------------------------------
// Polish
// ---------------------------------------------------------------------------
const PL: NoteStrings = {
  untitledPost: 'Post bez tytułu',
  sectionPost: 'Post',
  sectionSharedPost: 'Udostępniony post',
  sharedFrom: 'Udostępniono od',
  sectionMedia: 'Media',
  imageLabel: 'Obraz',
  videoLabel: '(wideo)',
  videoPosterAlt: 'miniatura wideo',
  sectionLinkPreviews: 'Podglądy linków',
  postedBy: 'Opublikował',
  contextIn: 'w',
  contextOn: 'na',
  contextProfile: 'profil:',
  linkLabel: 'link',
  sectionComments: 'Komentarze',
  commentModeAll: 'wszystkie',
  commentModeOpOnly: 'tylko autor',
  commentModeOpAnswered: 'odpowiedział autor',
  shownOf: (s, t) => `${s} z ${t} wyświetlonych`,
  noComments: 'Brak komentarzy do tego posta.',
  noCommentsMatched: 'Żaden komentarz nie pasuje do tego trybu.',
  opBadge: '(autor)',
  commentImageAlt: 'obraz w komentarzu',
};

// ---------------------------------------------------------------------------
// Turkish
// ---------------------------------------------------------------------------
const TR: NoteStrings = {
  untitledPost: 'Başlıksız gönderi',
  sectionPost: 'Gönderi',
  sectionSharedPost: 'Paylaşılan gönderi',
  sharedFrom: 'Paylaşan',
  sectionMedia: 'Medya',
  imageLabel: 'Resim',
  videoLabel: '(video)',
  videoPosterAlt: 'video küçük resmi',
  sectionLinkPreviews: 'Bağlantı önizlemeleri',
  postedBy: 'Paylaşan',
  contextIn: 'içinde',
  contextOn: 'üzerinde',
  contextProfile: 'profil:',
  linkLabel: 'bağlantı',
  sectionComments: 'Yorumlar',
  commentModeAll: 'tümü',
  commentModeOpOnly: 'yalnızca yazar',
  commentModeOpAnswered: 'yazar yanıtladı',
  shownOf: (s, t) => `${t} içinde ${s} gösterildi`,
  noComments: 'Bu gönderide yorum yok.',
  noCommentsMatched: 'Bu modda eşleşen yorum yok.',
  opBadge: '(yazar)',
  commentImageAlt: 'yorum resmi',
};

// ---------------------------------------------------------------------------
// Greek
// ---------------------------------------------------------------------------
const EL: NoteStrings = {
  untitledPost: 'Ανώνυμη ανάρτηση',
  sectionPost: 'Ανάρτηση',
  sectionSharedPost: 'Κοινοποιημένη ανάρτηση',
  sharedFrom: 'Κοινοποιήθηκε από',
  sectionMedia: 'Μέσα',
  imageLabel: 'Εικόνα',
  videoLabel: '(βίντεο)',
  videoPosterAlt: 'μικρογραφία βίντεο',
  sectionLinkPreviews: 'Προεπισκοπήσεις συνδέσμων',
  postedBy: 'Αναρτήθηκε από',
  contextIn: 'σε',
  contextOn: 'σε',
  contextProfile: 'προφίλ:',
  linkLabel: 'σύνδεσμος',
  sectionComments: 'Σχόλια',
  commentModeAll: 'όλα',
  commentModeOpOnly: 'μόνο συγγραφέας',
  commentModeOpAnswered: 'απάντησε ο συγγραφέας',
  shownOf: (s, t) => `${s} από ${t} εμφανίζονται`,
  noComments: 'Δεν υπάρχουν σχόλια σε αυτή την ανάρτηση.',
  noCommentsMatched: 'Κανένα σχόλιο δεν ταιριάζει με αυτή τη λειτουργία.',
  opBadge: '(συγγραφέας)',
  commentImageAlt: 'εικόνα σχολίου',
};

// ---------------------------------------------------------------------------
// Swedish
// ---------------------------------------------------------------------------
const SV: NoteStrings = {
  untitledPost: 'Inlägg utan titel',
  sectionPost: 'Inlägg',
  sectionSharedPost: 'Delat inlägg',
  sharedFrom: 'Delat från',
  sectionMedia: 'Media',
  imageLabel: 'Bild',
  videoLabel: '(video)',
  videoPosterAlt: 'videominiatyr',
  sectionLinkPreviews: 'Länkförhandsvisningar',
  postedBy: 'Publicerat av',
  contextIn: 'i',
  contextOn: 'på',
  contextProfile: 'profil:',
  linkLabel: 'länk',
  sectionComments: 'Kommentarer',
  commentModeAll: 'alla',
  commentModeOpOnly: 'endast författare',
  commentModeOpAnswered: 'besvarad av författare',
  shownOf: (s, t) => `${s} av ${t} visas`,
  noComments: 'Inga kommentarer på det här inlägget.',
  noCommentsMatched: 'Inga kommentarer matchar det här läget.',
  opBadge: '(författare)',
  commentImageAlt: 'kommentarsbild',
};

// ---------------------------------------------------------------------------
// Danish
// ---------------------------------------------------------------------------
const DA: NoteStrings = {
  untitledPost: 'Indlæg uden titel',
  sectionPost: 'Indlæg',
  sectionSharedPost: 'Delt indlæg',
  sharedFrom: 'Delt fra',
  sectionMedia: 'Medier',
  imageLabel: 'Billede',
  videoLabel: '(video)',
  videoPosterAlt: 'videominiatyr',
  sectionLinkPreviews: 'Linkforhåndsvisninger',
  postedBy: 'Opslået af',
  contextIn: 'i',
  contextOn: 'på',
  contextProfile: 'profil:',
  linkLabel: 'link',
  sectionComments: 'Kommentarer',
  commentModeAll: 'alle',
  commentModeOpOnly: 'kun forfatter',
  commentModeOpAnswered: 'besvaret af forfatter',
  shownOf: (s, t) => `${s} af ${t} vist`,
  noComments: 'Ingen kommentarer til dette indlæg.',
  noCommentsMatched: 'Ingen kommentarer matchede denne tilstand.',
  opBadge: '(forfatter)',
  commentImageAlt: 'kommentarbillede',
};

// ---------------------------------------------------------------------------
// Norwegian
// ---------------------------------------------------------------------------
const NO: NoteStrings = {
  untitledPost: 'Innlegg uten tittel',
  sectionPost: 'Innlegg',
  sectionSharedPost: 'Delt innlegg',
  sharedFrom: 'Delt fra',
  sectionMedia: 'Medier',
  imageLabel: 'Bilde',
  videoLabel: '(video)',
  videoPosterAlt: 'videominiatyrbilde',
  sectionLinkPreviews: 'Forhåndsvisning av lenker',
  postedBy: 'Lagt ut av',
  contextIn: 'i',
  contextOn: 'på',
  contextProfile: 'profil:',
  linkLabel: 'lenke',
  sectionComments: 'Kommentarer',
  commentModeAll: 'alle',
  commentModeOpOnly: 'kun forfatter',
  commentModeOpAnswered: 'besvart av forfatter',
  shownOf: (s, t) => `${s} av ${t} vist`,
  noComments: 'Ingen kommentarer på dette innlegget.',
  noCommentsMatched: 'Ingen kommentarer matchet denne modusen.',
  opBadge: '(forfatter)',
  commentImageAlt: 'kommentarbilde',
};

// ---------------------------------------------------------------------------
// Finnish
// ---------------------------------------------------------------------------
const FI: NoteStrings = {
  untitledPost: 'Julkaisu ilman otsikkoa',
  sectionPost: 'Julkaisu',
  sectionSharedPost: 'Jaettu julkaisu',
  sharedFrom: 'Jaettu kohteesta',
  sectionMedia: 'Media',
  imageLabel: 'Kuva',
  videoLabel: '(video)',
  videoPosterAlt: 'videon esikatselukuva',
  sectionLinkPreviews: 'Linkkien esikatselut',
  postedBy: 'Julkaissut',
  contextIn: 'ryhmässä',
  contextOn: 'sivulla',
  contextProfile: 'profiili:',
  linkLabel: 'linkki',
  sectionComments: 'Kommentit',
  commentModeAll: 'kaikki',
  commentModeOpOnly: 'vain kirjoittaja',
  commentModeOpAnswered: 'kirjoittaja vastasi',
  shownOf: (s, t) => `${s}/${t} näytetty`,
  noComments: 'Tässä julkaisussa ei ole kommentteja.',
  noCommentsMatched: 'Mikään kommentti ei vastaa tätä tilaa.',
  opBadge: '(kirjoittaja)',
  commentImageAlt: 'kommenttikuva',
};

// ---------------------------------------------------------------------------
// Czech
// ---------------------------------------------------------------------------
const CS: NoteStrings = {
  untitledPost: 'Příspěvek bez názvu',
  sectionPost: 'Příspěvek',
  sectionSharedPost: 'Sdílený příspěvek',
  sharedFrom: 'Sdíleno od',
  sectionMedia: 'Média',
  imageLabel: 'Obrázek',
  videoLabel: '(video)',
  videoPosterAlt: 'náhled videa',
  sectionLinkPreviews: 'Náhledy odkazů',
  postedBy: 'Zveřejnil',
  contextIn: 'v',
  contextOn: 'na',
  contextProfile: 'profil:',
  linkLabel: 'odkaz',
  sectionComments: 'Komentáře',
  commentModeAll: 'vše',
  commentModeOpOnly: 'pouze autor',
  commentModeOpAnswered: 'odpověděl autor',
  shownOf: (s, t) => `${s} z ${t} zobrazeno`,
  noComments: 'Žádné komentáře k tomuto příspěvku.',
  noCommentsMatched: 'Žádné komentáře neodpovídají tomuto režimu.',
  opBadge: '(autor)',
  commentImageAlt: 'obrázek komentáře',
};

// ---------------------------------------------------------------------------
// Romanian
// ---------------------------------------------------------------------------
const RO: NoteStrings = {
  untitledPost: 'Postare fără titlu',
  sectionPost: 'Postare',
  sectionSharedPost: 'Postare distribuită',
  sharedFrom: 'Distribuit de la',
  sectionMedia: 'Media',
  imageLabel: 'Imagine',
  videoLabel: '(video)',
  videoPosterAlt: 'miniatură video',
  sectionLinkPreviews: 'Previzualizări linkuri',
  postedBy: 'Postat de',
  contextIn: 'în',
  contextOn: 'pe',
  contextProfile: 'profil:',
  linkLabel: 'link',
  sectionComments: 'Comentarii',
  commentModeAll: 'toate',
  commentModeOpOnly: 'doar autor',
  commentModeOpAnswered: 'răspuns de autor',
  shownOf: (s, t) => `${s} din ${t} afișate`,
  noComments: 'Niciun comentariu la această postare.',
  noCommentsMatched: 'Niciun comentariu nu corespunde acestui mod.',
  opBadge: '(autor)',
  commentImageAlt: 'imagine comentariu',
};

// ---------------------------------------------------------------------------
// Hungarian
// ---------------------------------------------------------------------------
const HU: NoteStrings = {
  untitledPost: 'Cím nélküli bejegyzés',
  sectionPost: 'Bejegyzés',
  sectionSharedPost: 'Megosztott bejegyzés',
  sharedFrom: 'Megosztva innen',
  sectionMedia: 'Média',
  imageLabel: 'Kép',
  videoLabel: '(videó)',
  videoPosterAlt: 'videó előnézet',
  sectionLinkPreviews: 'Link-előnézetek',
  postedBy: 'Közzétette',
  contextIn: 'itt',
  contextOn: 'ezen',
  contextProfile: 'profil:',
  linkLabel: 'link',
  sectionComments: 'Hozzászólások',
  commentModeAll: 'összes',
  commentModeOpOnly: 'csak szerző',
  commentModeOpAnswered: 'szerző válaszolt',
  shownOf: (s, t) => `${s}/${t} megjelenítve`,
  noComments: 'Nincsenek hozzászólások ehhez a bejegyzéshez.',
  noCommentsMatched: 'Nincs hozzászólás, amely megfelel ennek a módnak.',
  opBadge: '(szerző)',
  commentImageAlt: 'hozzászólás képe',
};

// ---------------------------------------------------------------------------
// Indonesian
// ---------------------------------------------------------------------------
const ID: NoteStrings = {
  untitledPost: 'Postingan tanpa judul',
  sectionPost: 'Postingan',
  sectionSharedPost: 'Postingan yang dibagikan',
  sharedFrom: 'Dibagikan dari',
  sectionMedia: 'Media',
  imageLabel: 'Gambar',
  videoLabel: '(video)',
  videoPosterAlt: 'thumbnail video',
  sectionLinkPreviews: 'Pratinjau tautan',
  postedBy: 'Diposting oleh',
  contextIn: 'di',
  contextOn: 'di',
  contextProfile: 'profil:',
  linkLabel: 'tautan',
  sectionComments: 'Komentar',
  commentModeAll: 'semua',
  commentModeOpOnly: 'hanya penulis',
  commentModeOpAnswered: 'dijawab penulis',
  shownOf: (s, t) => `${s} dari ${t} ditampilkan`,
  noComments: 'Tidak ada komentar pada postingan ini.',
  noCommentsMatched: 'Tidak ada komentar yang cocok dengan mode ini.',
  opBadge: '(penulis)',
  commentImageAlt: 'gambar komentar',
};

// ---------------------------------------------------------------------------
// Vietnamese
// ---------------------------------------------------------------------------
const VI: NoteStrings = {
  untitledPost: 'Bài đăng không có tiêu đề',
  sectionPost: 'Bài đăng',
  sectionSharedPost: 'Bài đăng được chia sẻ',
  sharedFrom: 'Chia sẻ từ',
  sectionMedia: 'Phương tiện',
  imageLabel: 'Hình ảnh',
  videoLabel: '(video)',
  videoPosterAlt: 'hình thu nhỏ video',
  sectionLinkPreviews: 'Xem trước liên kết',
  postedBy: 'Đăng bởi',
  contextIn: 'trong',
  contextOn: 'trên',
  contextProfile: 'hồ sơ:',
  linkLabel: 'liên kết',
  sectionComments: 'Bình luận',
  commentModeAll: 'tất cả',
  commentModeOpOnly: 'chỉ tác giả',
  commentModeOpAnswered: 'tác giả đã trả lời',
  shownOf: (s, t) => `Hiển thị ${s}/${t}`,
  noComments: 'Không có bình luận nào cho bài đăng này.',
  noCommentsMatched: 'Không có bình luận nào phù hợp với chế độ này.',
  opBadge: '(tác giả)',
  commentImageAlt: 'hình ảnh bình luận',
};

// ---------------------------------------------------------------------------
// Thai
// ---------------------------------------------------------------------------
const TH: NoteStrings = {
  untitledPost: 'โพสต์ไม่มีชื่อ',
  sectionPost: 'โพสต์',
  sectionSharedPost: 'โพสต์ที่แชร์',
  sharedFrom: 'แชร์จาก',
  sectionMedia: 'สื่อ',
  imageLabel: 'รูปภาพ',
  videoLabel: '(วิดีโอ)',
  videoPosterAlt: 'ภาพตัวอย่างวิดีโอ',
  sectionLinkPreviews: 'ตัวอย่างลิงก์',
  postedBy: 'โพสต์โดย',
  contextIn: 'ใน',
  contextOn: 'บน',
  contextProfile: 'โปรไฟล์:',
  linkLabel: 'ลิงก์',
  sectionComments: 'ความคิดเห็น',
  commentModeAll: 'ทั้งหมด',
  commentModeOpOnly: 'เฉพาะผู้เขียน',
  commentModeOpAnswered: 'ผู้เขียนตอบแล้ว',
  shownOf: (s, t) => `แสดง ${s} จาก ${t}`,
  noComments: 'ไม่มีความคิดเห็นในโพสต์นี้',
  noCommentsMatched: 'ไม่มีความคิดเห็นที่ตรงกับโหมดนี้',
  opBadge: '(ผู้เขียน)',
  commentImageAlt: 'รูปภาพความคิดเห็น',
};

// ---------------------------------------------------------------------------
// Japanese
// ---------------------------------------------------------------------------
const JA: NoteStrings = {
  untitledPost: 'タイトルなしの投稿',
  sectionPost: '投稿',
  sectionSharedPost: 'シェアされた投稿',
  sharedFrom: 'シェア元',
  sectionMedia: 'メディア',
  imageLabel: '画像',
  videoLabel: '（動画）',
  videoPosterAlt: '動画サムネイル',
  sectionLinkPreviews: 'リンクプレビュー',
  postedBy: '投稿者',
  contextIn: 'グループ:',
  contextOn: 'ページ:',
  contextProfile: 'プロフィール:',
  linkLabel: 'リンク',
  sectionComments: 'コメント',
  commentModeAll: 'すべて',
  commentModeOpOnly: '投稿者のみ',
  commentModeOpAnswered: '投稿者が回答済み',
  shownOf: (s, t) => `${t}件中${s}件表示`,
  noComments: 'この投稿にコメントはありません。',
  noCommentsMatched: 'このモードに一致するコメントはありません。',
  opBadge: '（投稿者）',
  commentImageAlt: 'コメント画像',
};

// ---------------------------------------------------------------------------
// Chinese (Simplified)
// ---------------------------------------------------------------------------
const ZH: NoteStrings = {
  untitledPost: '无标题帖子',
  sectionPost: '帖子',
  sectionSharedPost: '分享的帖子',
  sharedFrom: '分享自',
  sectionMedia: '媒体',
  imageLabel: '图片',
  videoLabel: '（视频）',
  videoPosterAlt: '视频封面',
  sectionLinkPreviews: '链接预览',
  postedBy: '发布者',
  contextIn: '群组：',
  contextOn: '主页：',
  contextProfile: '个人资料：',
  linkLabel: '链接',
  sectionComments: '评论',
  commentModeAll: '全部',
  commentModeOpOnly: '仅原帖作者',
  commentModeOpAnswered: '原帖作者已回复',
  shownOf: (s, t) => `显示 ${s}/${t}`,
  noComments: '此帖子没有评论。',
  noCommentsMatched: '没有与此模式匹配的评论。',
  opBadge: '（原帖作者）',
  commentImageAlt: '评论图片',
};

// ---------------------------------------------------------------------------
// Korean
// ---------------------------------------------------------------------------
const KO: NoteStrings = {
  untitledPost: '제목 없는 게시물',
  sectionPost: '게시물',
  sectionSharedPost: '공유된 게시물',
  sharedFrom: '공유 출처',
  sectionMedia: '미디어',
  imageLabel: '이미지',
  videoLabel: '(동영상)',
  videoPosterAlt: '동영상 썸네일',
  sectionLinkPreviews: '링크 미리보기',
  postedBy: '작성자',
  contextIn: '그룹:',
  contextOn: '페이지:',
  contextProfile: '프로필:',
  linkLabel: '링크',
  sectionComments: '댓글',
  commentModeAll: '전체',
  commentModeOpOnly: '작성자만',
  commentModeOpAnswered: '작성자가 답변함',
  shownOf: (s, t) => `${t}개 중 ${s}개 표시`,
  noComments: '이 게시물에 댓글이 없습니다.',
  noCommentsMatched: '이 모드에 일치하는 댓글이 없습니다.',
  opBadge: '(작성자)',
  commentImageAlt: '댓글 이미지',
};

// ---------------------------------------------------------------------------
// Hindi
// ---------------------------------------------------------------------------
const HI: NoteStrings = {
  untitledPost: 'शीर्षक रहित पोस्ट',
  sectionPost: 'पोस्ट',
  sectionSharedPost: 'साझा पोस्ट',
  sharedFrom: 'से साझा',
  sectionMedia: 'मीडिया',
  imageLabel: 'छवि',
  videoLabel: '(वीडियो)',
  videoPosterAlt: 'वीडियो थंबनेल',
  sectionLinkPreviews: 'लिंक पूर्वावलोकन',
  postedBy: 'द्वारा पोस्ट',
  contextIn: 'में',
  contextOn: 'पर',
  contextProfile: 'प्रोफ़ाइल:',
  linkLabel: 'लिंक',
  sectionComments: 'टिप्पणियाँ',
  commentModeAll: 'सभी',
  commentModeOpOnly: 'केवल लेखक',
  commentModeOpAnswered: 'लेखक ने उत्तर दिया',
  shownOf: (s, t) => `${t} में से ${s} दिखाए`,
  noComments: 'इस पोस्ट पर कोई टिप्पणी नहीं है।',
  noCommentsMatched: 'इस मोड से कोई टिप्पणी मेल नहीं खाती।',
  opBadge: '(लेखक)',
  commentImageAlt: 'टिप्पणी छवि',
};

// ---------------------------------------------------------------------------
// Lookup table
// ---------------------------------------------------------------------------
const TABLE: Record<string, NoteStrings> = {
  en: EN,
  he: HE,
  ar: AR,
  ru: RU,
  uk: UK,
  fr: FR,
  de: DE,
  es: ES,
  pt: PT,
  it: IT,
  nl: NL,
  pl: PL,
  tr: TR,
  el: EL,
  sv: SV,
  da: DA,
  no: NO,
  nb: NO, // Norwegian Bokmål
  nn: NO, // Norwegian Nynorsk
  fi: FI,
  cs: CS,
  ro: RO,
  hu: HU,
  id: ID,
  vi: VI,
  th: TH,
  ja: JA,
  zh: ZH,
  ko: KO,
  hi: HI,
};

/**
 * Get the localised string table for the given language code.
 * Falls back to English for any unsupported language.
 */
export function getStrings(lang?: string): NoteStrings {
  if (!lang) return EN;
  return TABLE[lang.toLowerCase().slice(0, 2)] ?? EN;
}
