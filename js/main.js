import { convertDText } from './converter.js?v=1.1.0';

const $ = id => document.getElementById(id);
const elements = {
  language: $('language'), source: $('source'), result: $('result'),
  paste: $('paste'), clear: $('clear'), copy: $('copy'),
  headingStyle: $('heading-style'), listStyle: $('list-style'),
  sourceCount: $('source-count'), resultCount: $('result-count'),
  status: $('status'), warnings: $('warnings'),
  warningsList: $('warnings-list'), warningsCount: $('warnings-count'),
};
const translations = {
  en: {
    subtitle: 'Danbooru DText → Gelbooru wiki markup', language: 'Language',
    intro: 'Paste your Danbooru wiki source, then copy the converted Gelbooru version. Everything happens on your device: no account, uploads, or tag lookups.',
    headingLabel: 'Headings', headingCompact: 'Compact (bold)', headingLarge: 'Gelbooru heading tags',
    listLabel: 'Lists', listStars: 'Asterisks (*, **, ***)', listBullets: 'Bullets and arrows',
    sourceTitle: 'Danbooru source', sourceDescription: "Copy from Danbooru’s wiki editor.",
    resultTitle: 'Gelbooru result', resultDescription: 'Replace InsertPostID with real Gelbooru post IDs before publishing.',
    paste: 'Paste', clear: 'Clear', copy: 'Copy',
    pasteTitle: 'Paste from clipboard', clearTitle: 'Clear both fields', copyTitle: 'Copy the full converted wiki',
    sourcePlaceholder: 'Paste Danbooru DText here…', resultPlaceholder: 'The converted wiki will appear here…',
    warningsTitle: 'Conversion notes',
    footer: 'Syntax conversion only. Tags are never checked against Gelbooru’s database. Review the result before publishing, especially image references and complex DText.',
    openSource: 'Static and open-source friendly; works on GitHub Pages.',
    lines: 'lines', chars: 'chars', copied: 'Copied!', pasted: 'Pasted!',
    pasteFailed: 'Clipboard access blocked: tap the source field and paste manually.',
    copyFailed: 'Could not copy automatically: select the result text and copy manually.',
    warningsUnit: 'adaptations',
  },
  fr: {
    subtitle: 'Danbooru DText → syntaxe wiki Gelbooru', language: 'Langue',
    intro: 'Collez le code source d’un wiki Danbooru, puis copiez sa version Gelbooru. Tout reste dans votre navigateur : aucun compte, envoi de données ou contrôle des tags.',
    headingLabel: 'Titres', headingCompact: 'Compact (gras)', headingLarge: 'Balises de titre Gelbooru',
    listLabel: 'Listes', listStars: 'Astérisques (*, **, ***)', listBullets: 'Puces et flèches',
    sourceTitle: 'Source Danbooru', sourceDescription: 'Copiez depuis l’éditeur wiki Danbooru.',
    resultTitle: 'Résultat Gelbooru', resultDescription: 'Remplacez InsertPostID par les vrais IDs Gelbooru avant publication.',
    paste: 'Coller', clear: 'Effacer', copy: 'Copier',
    pasteTitle: 'Coller depuis le presse-papiers', clearTitle: 'Effacer les deux champs', copyTitle: 'Copier tout le wiki converti',
    sourcePlaceholder: 'Collez le DText Danbooru ici…', resultPlaceholder: 'Le wiki converti apparaîtra ici…',
    warningsTitle: 'Notes de conversion',
    footer: 'Conversion de syntaxe uniquement. Aucune vérification des tags sur Gelbooru. Relisez avant publication, particulièrement les références aux images et les syntaxes DText complexes.',
    openSource: 'Site statique adapté à GitHub Pages.',
    lines: 'lignes', chars: 'caractères', copied: 'Copié !', pasted: 'Collé !',
    pasteFailed: 'Accès au presse-papiers bloqué : touchez le champ source et collez manuellement.',
    copyFailed: 'Copie automatique impossible : sélectionnez le résultat pour le copier manuellement.',
    warningsUnit: 'adaptations',
  },
};
const warningTranslations = {
  fr: {
    literal: 'Les blocs de code / texte littéral ont été conservés sans mise en forme.',
    toc: 'Sommaire Danbooru retiré : ses ancres ne fonctionneraient pas sur Gelbooru.',
    expand: 'Blocs repliables transformés en texte visible.',
    tables: 'Tableaux convertis en lignes de texte ; la disposition des cellules fusionnées peut être perdue.',
    media: 'Références aux images Danbooru remplacées par [post]InsertPostID[/post] : choisissez un ID de post Gelbooru.',
    'unsupported-style': 'Soulignement et styles de notes simplifiés en texte ordinaire.',
    anchors: 'Ancres et liens internes à des sections supprimés ou simplifiés.',
    annotations: 'Notes Danbooru conservées en texte ordinaire.',
    labels: 'Libellés personnalisés des liens wiki déplacés dans le texte.',
    'external-labels': 'Liens externes avec libellé remplacés par un texte suivi de son URL.',
    'search-labels': 'Libellés personnalisés des recherches de tags simplifiés.',
    'danbooru-ids': 'Références numériques Danbooru transformées en URL complètes.',
  }
};
let language = (navigator.language || 'en').toLowerCase().startsWith('fr') ? 'fr' : 'en';
let latestWarnings = [];
let pending = null;
function tr(key) { return translations[language][key] ?? key; }
function countLabel(s) {
  const lines = s.length ? s.split('\n').length : 0;
  return `${lines.toLocaleString(language)} ${tr('lines')} · ${s.length.toLocaleString(language)} ${tr('chars')}`;
}
function setStatus(value) {
  elements.status.textContent = value;
}
function renderWarnings() {
  elements.warningsList.replaceChildren();
  elements.warnings.hidden = latestWarnings.length === 0;
  elements.warningsCount.textContent = latestWarnings.length ? `(${latestWarnings.reduce((a, w) => a + w.count, 0)} ${tr('warningsUnit')})` : '';
  for (const w of latestWarnings) {
    const li = document.createElement('li');
    li.textContent = `${warningTranslations[language]?.[w.code] || w.message} (${w.count})`;
    elements.warningsList.append(li);
  }
}
function convert() {
  clearTimeout(pending);
  pending = null;
  const result = convertDText(elements.source.value, {
    headings: elements.headingStyle.value,
    lists: elements.listStyle.value,
  });
  elements.result.value = result.code;
  latestWarnings = result.warnings;
  elements.copy.disabled = !result.code;
  elements.sourceCount.textContent = countLabel(elements.source.value);
  elements.resultCount.textContent = countLabel(result.code);
  renderWarnings();
}
function scheduleConversion() {
  clearTimeout(pending);
  setStatus('');
  pending = setTimeout(convert, 110);
}
function setLanguage(value) {
  language = value === 'fr' ? 'fr' : 'en';
  document.documentElement.lang = language;
  elements.language.value = language;
  for (const elem of document.querySelectorAll('[data-i18n]')) elem.textContent = tr(elem.dataset.i18n);
  for (const elem of document.querySelectorAll('[data-i18n-title]')) elem.title = tr(elem.dataset.i18nTitle);
  for (const elem of document.querySelectorAll('[data-i18n-placeholder]')) elem.placeholder = tr(elem.dataset.i18nPlaceholder);
  elements.sourceCount.textContent = countLabel(elements.source.value);
  elements.resultCount.textContent = countLabel(elements.result.value);
  renderWarnings();
}
async function pasteFromClipboard() {
  try {
    if (!navigator.clipboard?.readText) throw new Error('Clipboard API unavailable');
    const source = await navigator.clipboard.readText();
    elements.source.value = source;
    convert();
    setStatus(tr('pasted'));
  } catch {
    setStatus(tr('pasteFailed'));
    elements.source.focus();
  }
}
async function copyToClipboard() {
  // Finish any pending conversion so the copy action always gets fresh output.
  if (pending !== null) convert();
  try {
    if (!navigator.clipboard?.writeText) throw new Error('Clipboard API unavailable');
    await navigator.clipboard.writeText(elements.result.value);
    setStatus(tr('copied'));
  } catch {
    setStatus(tr('copyFailed'));
    elements.result.focus();
    elements.result.select();
  }
}
elements.paste.addEventListener('click', pasteFromClipboard);
elements.copy.addEventListener('click', copyToClipboard);
elements.clear.addEventListener('click', () => {
  elements.source.value = '';
  elements.result.value = '';
  setStatus('');
  convert();
  elements.source.focus();
});
elements.source.addEventListener('input', scheduleConversion);
elements.headingStyle.addEventListener('change', convert);
elements.listStyle.addEventListener('change', convert);
elements.language.addEventListener('change', () => setLanguage(elements.language.value));
setLanguage(language);
convert();
