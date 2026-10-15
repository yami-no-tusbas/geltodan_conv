import { convertDText } from './converter.js?v=1.2.0';
import { renderVisual, serializeVisual, insertWikiToken, replaceWikiToken, setLineFormat, normalizeVisualStructure } from './editor.js?v=1.2.0';

const $ = id => document.getElementById(id);
const el = {
  language:$('language'),source:$('source'), result:$('result'), visual:$('visual-editor'),
  paste:$('paste'), clear:$('clear'),convert:$('convert'),copy:$('copy'),
  headingStyle:$('heading-style'),listStyle:$('list-style'),
  sourceCount:$('source-count'),resultCount:$('result-count'),
  status:$('status'),sourceNotice:$('source-notice'),draftLabel:$('draft-label'),
  warnings:$('warnings'),warningsList:$('warnings-list'),warningsCount:$('warnings-count'),
  modeCode:$('mode-code'),modeEdit:$('mode-edit'),toolbar:$('visual-toolbar'),editorHelp:$('editor-help'),
};
const translations={
 en:{subtitle:'Danbooru DText → Gelbooru wiki markup',language:'Language',intro:'Paste a Danbooru wiki, adjust the Gelbooru result in Code View or Edit, then copy. No account, uploads or tag lookups.',
 headingLabel:'Headings',headingCompact:'Compact (bold)',headingLarge:'Gelbooru heading tags',listLabel:'Lists',listStars:'Asterisks (*, **, ***)',listBullets:'Bullets and arrows',
 sourceTitle:'Danbooru source',sourceDescription:"Copy from Danbooru’s wiki editor.",resultTitle:'Gelbooru result',resultDescription:'Your independent draft: edit freely, then copy to Gelbooru.',
 paste:'Paste',clear:'Clear',copy:'Copy',convert:'Convert source',codeView:'Code View',editView:'Edit',editorHelp:'Tap a wiki link or post reference to edit its target. Unknown markup remains literal. Check Code View before publishing.',
 pasteTitle:'Paste from clipboard',clearTitle:'Clear both fields',copyTitle:'Copy your current Gelbooru draft',sourcePlaceholder:'Paste Danbooru DText here…',resultPlaceholder:'Your Gelbooru wiki draft appears here…',
 warningsTitle:'Conversion notes',footer:'Formatting only: no tag verification or media searches. Your edited Gelbooru draft is never replaced silently. Review before publishing.',openSource:'Static, private and GitHub Pages compatible.',
 lines:'lines',chars:'chars',copied:'Copied!',pasted:'Pasted!',pasteFailed:'Clipboard access denied: paste manually into the source field.',copyFailed:'Automatic copy unavailable: select and copy in Code View.',warningsUnit:'adaptations',
 sourceChanged:'Source changed — click Convert to replace the result.',dirty:'Edited draft',clean:'Converted draft',confirmReplace:'Replace your edited Gelbooru draft with a new conversion? This cannot be undone.',confirmClear:'Clear the source and the edited Gelbooru draft?',nothingToConvert:'Paste a Danbooru source first.',
 toolHeading:'Heading H3',toolList:'Toggle list',toolIndent:'Increase list depth',toolOutdent:'Decrease list depth',toolWiki:'Insert wiki link',toolPost:'Insert post reference',toolSpoiler:'Spoiler',toolQuote:'Quote',undo:'Undo',redo:'Redo',
 promptWiki:'Gelbooru wiki tag (spaces become underscores):',promptPost:'Gelbooru post ID (or InsertPostID):',promptToken:'Edit link or reference:',invalidToken:'Invalid ID or wiki link.',editUnavailable:'Switch to Edit first.'},
 fr:{subtitle:'Danbooru DText → syntaxe wiki Gelbooru',language:'Langue',intro:'Collez un wiki Danbooru, retouchez le résultat Gelbooru dans Code View ou Edit, puis copiez. Aucun compte, envoi de données ou contrôle des tags.',
 headingLabel:'Titres',headingCompact:'Compact (gras)',headingLarge:'Balises de titre Gelbooru',listLabel:'Listes',listStars:'Astérisques (*, **, ***)',listBullets:'Puces et flèches',
 sourceTitle:'Source Danbooru',sourceDescription:'Copiez depuis l’éditeur wiki Danbooru.',resultTitle:'Résultat Gelbooru',resultDescription:'Brouillon indépendant : modifiez-le, puis copiez dans Gelbooru.',
 paste:'Coller',clear:'Effacer',copy:'Copier',convert:'Convertir la source',codeView:'Code View',editView:'Édition',editorHelp:'Touchez un lien wiki ou une référence de post pour modifier sa cible. Les syntaxes inconnues restent du texte. Vérifiez Code View avant publication.',
 pasteTitle:'Coller depuis le presse-papiers',clearTitle:'Effacer les deux champs',copyTitle:'Copier le brouillon Gelbooru actuel',sourcePlaceholder:'Collez le DText Danbooru ici…',resultPlaceholder:'Votre brouillon Gelbooru apparaîtra ici…',
 warningsTitle:'Notes de conversion',footer:'Mise en forme uniquement : ni vérification des tags ni recherche de médias. Le brouillon édité n’est jamais remplacé sans avertissement. Relisez avant publication.',openSource:'Statique, privé et compatible GitHub Pages.',
 lines:'lignes',chars:'caractères',copied:'Copié !',pasted:'Collé !',pasteFailed:'Accès au presse-papiers refusé : collez manuellement dans le champ source.',copyFailed:'Copie automatique impossible : sélectionnez le texte dans Code View.',warningsUnit:'adaptations',
 sourceChanged:'Source modifiée — cliquez sur Convertir pour remplacer le résultat.',dirty:'Brouillon modifié',clean:'Brouillon converti',confirmReplace:'Remplacer vos retouches Gelbooru par une nouvelle conversion ? Cette opération est irréversible.',confirmClear:'Effacer la source et le brouillon Gelbooru modifié ?',nothingToConvert:'Collez une source Danbooru.',
 toolHeading:'Titre H3',toolList:'Activer une liste',toolIndent:'Augmenter la profondeur',toolOutdent:'Réduire la profondeur',toolWiki:'Insérer un lien wiki',toolPost:'Insérer un lien de post',toolSpoiler:'Spoiler',toolQuote:'Citation',undo:'Annuler',redo:'Rétablir',
 promptWiki:'Tag wiki Gelbooru (espaces transformés en underscores) :',promptPost:'ID du post Gelbooru (ou InsertPostID) :',promptToken:'Modifier le lien ou la référence :',invalidToken:'ID ou lien wiki incorrect.',editUnavailable:'Passez en mode Édition.'}
};
const warningTranslations={fr:{literal:'Blocs de code DText conservés comme texte.',toc:'Sommaire à ancres Danbooru supprimé.',expand:'Blocs repliables dépliés en texte.',tables:'Tableaux transformés en lignes de texte.',media:'Images Danbooru remplacées par des références [post]InsertPostID[/post].','unsupported-style':'Styles non disponibles simplifiés.',anchors:'Ancres internes retirées.',annotations:'Notes préservées en texte.',labels:'Libellés personnalisés préservés hors des liens.','external-labels':'Liens URL simplifiés en texte + URL.','search-labels':'Libellés de recherches simplifiés.','danbooru-ids':'Identifiants Danbooru transformés en URL.'}};
let language=(navigator.language||'en').toLowerCase().startsWith('fr')?'fr':'en';
let draft='',baseline='',lastConvertedSource='',mode='code',latestWarnings=[];
let history=[''],historyPos=0,sourceChanged=false,savedRange=null;
const tr=k=>translations[language][k]??k;
const countLabel=s=>`${s?(s.split('\n').length).toLocaleString(language):0} ${tr('lines')} · ${s.length.toLocaleString(language)} ${tr('chars')}`;
const setStatus=s=>{el.status.textContent=s};
const modified=()=>draft!==baseline;
function showDraftInfo(){el.draftLabel.textContent=draft?(modified()?tr('dirty'):tr('clean')):'';el.draftLabel.classList.toggle('modified',modified());el.copy.disabled=!draft;el.resultCount.textContent=countLabel(draft);}
function showSourceInfo(){el.sourceCount.textContent=countLabel(el.source.value);el.sourceNotice.textContent=sourceChanged?tr('sourceChanged'):'';}
function renderWarnings(){el.warningsList.replaceChildren();el.warnings.hidden=!latestWarnings.length;el.warningsCount.textContent=latestWarnings.length?`(${latestWarnings.reduce((n,x)=>n+x.count,0)} ${tr('warningsUnit')})`:'';for(const w of latestWarnings){const item=document.createElement('li');item.textContent=`${warningTranslations[language]?.[w.code]||w.message} (${w.count})`;el.warningsList.append(item);}}
function saveDraft(value, resetHistory=false){draft=value;el.result.value=draft;if(resetHistory){history=[draft];historyPos=0;}else if(draft!==history[historyPos]){history=history.slice(0,historyPos+1);history.push(draft);if(history.length>60)history.shift();historyPos=history.length-1;}showDraftInfo();}
function applyHistory(direction){const next=historyPos+direction;if(next<0||next>=history.length)return;historyPos=next;draft=history[historyPos];el.result.value=draft;if(mode==='edit')renderVisual(el.visual,draft);showDraftInfo();}
function switchMode(next){if(next===mode)return;if(mode==='edit'){const now=serializeVisual(el.visual);if(now!==draft)saveDraft(now);}mode=next;el.result.hidden=mode!=='code';el.visual.hidden=mode!=='edit';el.toolbar.hidden=mode!=='edit';el.editorHelp.hidden=mode!=='edit';el.modeCode.classList.toggle('is-selected',mode==='code');el.modeEdit.classList.toggle('is-selected',mode==='edit');el.modeCode.setAttribute('aria-pressed',String(mode==='code'));el.modeEdit.setAttribute('aria-pressed',String(mode==='edit'));if(mode==='edit')renderVisual(el.visual,draft);savedRange=null;}
function conversion(ask=true){const input=el.source.value;if(!input.trim()){setStatus(tr('nothingToConvert'));return false;}if(ask&&modified()&&!window.confirm(tr('confirmReplace')))return false;const result=convertDText(input,{headings:el.headingStyle.value,lists:el.listStyle.value});baseline=result.code;lastConvertedSource=input;sourceChanged=false;latestWarnings=result.warnings;saveDraft(result.code,true);if(mode==='edit')renderVisual(el.visual,draft);showSourceInfo();renderWarnings();setStatus('');return true;}
async function pasteFromClipboard(){try{if(!navigator.clipboard?.readText)throw Error('No Clipboard API');const text=await navigator.clipboard.readText();if(modified()&&!window.confirm(tr('confirmReplace')))return;el.source.value=text;sourceChanged=true;showSourceInfo();if(conversion(false))setStatus(tr('pasted'));}catch{setStatus(tr('pasteFailed'));el.source.focus();}}
async function copyToClipboard(){if(mode==='edit'){const now=serializeVisual(el.visual);if(now!==draft)saveDraft(now);}try{if(!navigator.clipboard?.writeText)throw Error('No Clipboard API');await navigator.clipboard.writeText(draft);setStatus(tr('copied'));}catch{switchMode('code');el.result.focus();el.result.select();setStatus(tr('copyFailed'));}}
function setLanguage(lang){language=lang==='fr'?'fr':'en';document.documentElement.lang=language;el.language.value=language;for(const e of document.querySelectorAll('[data-i18n]'))e.textContent=tr(e.dataset.i18n);for(const e of document.querySelectorAll('[data-i18n-title]'))e.title=tr(e.dataset.i18nTitle);for(const e of document.querySelectorAll('[data-i18n-placeholder]'))e.placeholder=tr(e.dataset.i18nPlaceholder);showSourceInfo();showDraftInfo();renderWarnings();}
// Keep selection when a toolbar button receives focus.
document.addEventListener('selectionchange',()=>{const s=window.getSelection();if(s?.rangeCount&&el.visual.contains(s.anchorNode))savedRange=s.getRangeAt(0).cloneRange();});
function restoreSelection(){el.visual.focus();const selection=window.getSelection();if(savedRange&&el.visual.contains(savedRange.commonAncestorContainer)){selection.removeAllRanges();selection.addRange(savedRange);return true;}if(!selection.rangeCount||!el.visual.contains(selection.anchorNode)){const range=document.createRange();const line=el.visual.lastElementChild||el.visual;range.selectNodeContents(line);range.collapse(false);selection.removeAllRanges();selection.addRange(range);}return true;}
function visualSync(){normalizeVisualStructure(el.visual);const text=serializeVisual(el.visual);if(text!==draft)saveDraft(text);setStatus('');}
function wrapSelection(tag){const sel=window.getSelection();if(!sel?.rangeCount)return;const range=sel.getRangeAt(0);if(!el.visual.contains(range.commonAncestorContainer))return;const node=document.createElement('span');node.dataset.bbTag=tag;node.className=tag==='spoiler'?'wiki-spoiler':'wiki-quote';try{const content=range.extractContents();node.append(content);range.insertNode(node);range.selectNodeContents(node);sel.removeAllRanges();sel.addRange(range);}catch{setStatus(tr('invalidToken'));}}
function executeAction(action){if(action==='undo'||action==='redo'){applyHistory(action==='undo'?-1:1);return;}if(mode!=='edit'){setStatus(tr('editUnavailable'));return;}restoreSelection();const sel=window.getSelection();const selection=sel?.rangeCount?sel.getRangeAt(0):null;
  if(['bold','italic','strike'].includes(action)){
    document.execCommand(action==='strike'?'strikeThrough':action,false,null);
  } else if(action==='heading'||action==='list'||action==='indent'||action==='outdent'){
    const line=sel?.anchorNode?.parentElement?.closest('.wiki-line');
    const level=Number(line?.dataset.lineLevel||0);
    if(action==='heading')setLineFormat(el.visual,'heading',3,selection);
    if(action==='list')setLineFormat(el.visual,'list',Math.max(level,1),selection);
    if(action==='indent')setLineFormat(el.visual,'list',Math.min(level+1,12),selection);
    if(action==='outdent')setLineFormat(el.visual,'list',Math.max(level-1,1),selection);
  } else if(action==='wiki'||action==='post'){
    const name=window.prompt(action==='wiki'?tr('promptWiki'):tr('promptPost'),action==='wiki'?'':'InsertPostID');
    if(name===null)return;
    const value=name.trim();
    if(!value||/[\[\]\r\n]/.test(value)||(action==='post'&&value!=='InsertPostID'&&!/^\d+$/.test(value))){setStatus(tr('invalidToken'));return;}
    const raw=action==='wiki'?`[[${value.replace(/\s+/g,'_')}]]`:`[post]${value}[/post]`;
    if(!insertWikiToken(el.visual,raw)){setStatus(tr('invalidToken'));return;}
  } else if(action==='spoiler'||action==='quote'){
    wrapSelection(action);
  }
  visualSync();
}
el.modeCode.addEventListener('click',()=>switchMode('code'));
el.modeEdit.addEventListener('click',()=>switchMode('edit'));
el.language.addEventListener('change',()=>setLanguage(el.language.value));
el.paste.addEventListener('click',pasteFromClipboard);
el.copy.addEventListener('click',copyToClipboard);
el.convert.addEventListener('click',()=>conversion());
el.clear.addEventListener('click',()=>{if(modified()&&!window.confirm(tr('confirmClear')))return;el.source.value='';baseline='';lastConvertedSource='';latestWarnings=[];sourceChanged=false;saveDraft('',true);if(mode==='edit')renderVisual(el.visual,'');showSourceInfo();renderWarnings();setStatus('');el.source.focus();});
el.source.addEventListener('input',event=>{sourceChanged=el.source.value!==lastConvertedSource;showSourceInfo();setStatus('');if(event.inputType==='insertFromPaste'&&el.source.value.trim())conversion();});
for(const item of [el.headingStyle,el.listStyle])item.addEventListener('change',()=>{if(el.source.value!==lastConvertedSource)sourceChanged=true;showSourceInfo();});
el.result.addEventListener('input',()=>{saveDraft(el.result.value);setStatus('');});
el.visual.addEventListener('input',visualSync);
el.visual.addEventListener('paste',event=>{const t=event.clipboardData?.getData('text/plain');if(t===undefined)return;event.preventDefault();document.execCommand('insertText',false,t);visualSync();});
el.visual.addEventListener('click',event=>{
  const token=event.target.closest?.('[data-wiki-token]');if(!token)return;
  const kind=token.dataset.tokenKind;
  const raw=token.dataset.wikiToken;
  const original=kind==='wiki'||kind==='search'?raw.slice(2,-2):raw.replace(/^\[[^\]]+\]|\[\/[^\]]+\]$/g,'');
  const entered=window.prompt(tr('promptToken'),original);
  if(entered===null)return;
  if(!replaceWikiToken(token,entered)){setStatus(tr('invalidToken'));return;}visualSync();
});
el.visual.addEventListener('keydown',event=>{
  if((event.ctrlKey||event.metaKey)&&!event.altKey&&event.key.toLowerCase()==='z'){
    event.preventDefault();applyHistory(event.shiftKey?1:-1);
  }else if((event.ctrlKey||event.metaKey)&&!event.altKey&&event.key.toLowerCase()==='y'){
    event.preventDefault();applyHistory(1);
  }else if((event.key==='Enter')&&!event.shiftKey){
    // Default contenteditable split may inherit list attributes. Retain level.
    setTimeout(()=>{normalizeVisualStructure(el.visual);visualSync();},0);
  }
});
el.toolbar.addEventListener('pointerdown',event=>{if(event.target.closest('button'))event.preventDefault();});
el.toolbar.addEventListener('click',event=>{const btn=event.target.closest('button[data-action]');if(btn)executeAction(btn.dataset.action);});
setLanguage(language);showSourceInfo();showDraftInfo();
