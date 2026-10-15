/**
 * Conservative Gelbooru BBCode visual editor (no HTML injection or network).
 * The source of truth is always BBCode. Only known Gelbooru tokens are rendered;
 * unrecognized syntax is left visible as literal text and is never evaluated.
 * @license MIT
 */
const FORMAT_TAGS = new Set(['b', 'i', 's', 'spoiler', 'quote']);
const INLINE_TOKEN = /\[\[([^\]\n]+)\]\]|\{\{([^{}\n]+)\}\}|\[(post|forum)\]([^\[\]\n]*)\[\/\3\]|\[(\/?)(b|i|s|spoiler|quote)\]/gi;

function elem(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}
function addText(container, text) {
  if (text) container.append(document.createTextNode(text));
}
function createToken(raw, kind, value) {
  const label = kind === 'post' ? `Post · ${value || 'InsertPostID'}`
    : kind === 'forum' ? `Forum · ${value}`
    : kind === 'search' ? `Search · ${value.replace(/_/g, ' ')}`
    : value.replace(/_/g, ' ');
  const span = elem('span', `wiki-token token-${kind}`, label);
  span.dataset.wikiToken = raw;
  span.dataset.tokenKind = kind;
  span.setAttribute('contenteditable', 'false');
  span.setAttribute('title', raw);
  span.setAttribute('role', 'button');
  span.setAttribute('tabindex', '0');
  return span;
}

/** Parse basic inline BBCode while retaining unknown tokens as literal text. */
export function renderInline(parent, source) {
  let current = parent;
  const stack = [];
  let offset = 0;
  INLINE_TOKEN.lastIndex = 0;
  for (const match of source.matchAll(INLINE_TOKEN)) {
    addText(current, source.slice(offset, match.index));
    offset = match.index + match[0].length;
    if (match[1] !== undefined) {
      current.append(createToken(match[0], 'wiki', match[1]));
    } else if (match[2] !== undefined) {
      current.append(createToken(match[0], 'search', match[2]));
    } else if (match[3] !== undefined) {
      current.append(createToken(match[0], match[3].toLowerCase(), match[4]));
    } else {
      const closing = match[5] === '/';
      const name = match[6].toLowerCase();
      if (!FORMAT_TAGS.has(name)) {
        addText(current, match[0]);
      } else if (!closing) {
        // Only style complete spans. Multiline or malformed BBCode is shown
        // literally, so the visual editor cannot invent a missing close tag.
        const tail = source.slice(offset);
        if (!new RegExp(`\\[\\/${name}\\]`, 'i').test(tail)) {
          addText(current, match[0]);
          continue;
        }
        const tag = {b:'strong', i:'em', s:'s', spoiler:'span', quote:'span'}[name];
        const wrapper = elem(tag, name === 'spoiler' ? 'wiki-spoiler' : name === 'quote' ? 'wiki-quote' : '');
        wrapper.dataset.bbTag = name;
        current.append(wrapper);
        stack.push({name, node:wrapper, parent:current});
        current = wrapper;
      } else if (stack.length && stack[stack.length - 1].name === name) {
        current = stack.pop().parent;
      } else {
        // Unbalanced closing marker is text, not discarded.
        addText(current, match[0]);
      }
    }
  }
  addText(current, source.slice(offset));
}
function parseLine(raw) {
  const heading = /^\[h([1-5])\]([\s\S]*)\[\/h\1\]$/i.exec(raw);
  if (heading) return {type:'heading', level:Number(heading[1]), text:heading[2]};
  const stars = /^(\*+) (.*)$/.exec(raw);
  if (stars) return {type:'list', level:stars[1].length, text:stars[2]};
  const bullet = /^(•|↳+) (.*)$/.exec(raw);
  if (bullet) return {type:'bullet', level:bullet[1] === '•' ? 1 : bullet[1].length+1, text:bullet[2]};
  return {type:'plain',level:0,text:raw};
}
function applyLineClass(line, type, level) {
  line.className = `wiki-line wiki-line-${type}`;
  line.dataset.lineType = type;
  line.dataset.lineLevel = String(level);
  line.style.setProperty('--depth', String(Math.min(Math.max(level-1,0),8)));
}
export function renderVisual(editor, code) {
  const fragment = document.createDocumentFragment();
  const lines = code ? code.replace(/\r\n?/g, '\n').split('\n') : [''];
  for (const raw of lines) {
    const {type,level,text} = parseLine(raw);
    const line = elem('div', 'wiki-line');
    applyLineClass(line,type,level);
    if (text) renderInline(line, text);
    else line.append(elem('br'));
    // Protect exact original code whenever the row is visually untouched;
    // unknown and multiline tags thus survive edits elsewhere in the document.
    line.dataset.originalSource = raw;
    line.dataset.initialCode = serializeLine(line);
    fragment.append(line);
  }
  editor.replaceChildren(fragment);
}

// Serialize only safe, explicitly supported visual structures; do not use innerHTML.
function inlineCode(node) {
  if (node.nodeType === 3) return node.nodeValue || '';
  if (node.nodeType !== 1) return '';
  const el = /** @type {HTMLElement} */ (node);
  if (el.dataset.wikiToken !== undefined) return el.dataset.wikiToken;
  if (el.tagName === 'BR') return '\n';
  let children = [...el.childNodes].map(inlineCode).join('');
  const tag = el.dataset.bbTag || (el.tagName === 'B' || el.tagName === 'STRONG' ? 'b' : el.tagName === 'I' || el.tagName === 'EM' ? 'i' : el.tagName === 'S' || el.tagName === 'STRIKE' || el.tagName === 'DEL' ? 's' : null);
  if (tag && FORMAT_TAGS.has(tag) && children) return `[${tag}]${children}[/${tag}]`;
  if (el.tagName === 'SPAN' && !tag) {
    const style = el.getAttribute('style') || '';
    if (/font-weight:\s*(bold|[6-9]00)/i.test(style)) children = `[b]${children}[/b]`;
    if (/font-style:\s*italic/i.test(style)) children = `[i]${children}[/i]`;
    if (/text-decoration[^:]*:\s*line-through/i.test(style)) children = `[s]${children}[/s]`;
  }
  return children;
}
function serializeLine(line) {
  let code = [...line.childNodes].map(inlineCode).join('');
  // A placeholder BR in an empty editable div is not an actual line break.
  if (code === '\n') code = '';
  const type = line.dataset?.lineType;
  const level = Math.max(1, Math.min(Number(line.dataset?.lineLevel) || 1, 32));
  if (type === 'heading') return `[h${Math.min(level,5)}]${code}[/h${Math.min(level,5)}]`;
  if (type === 'list') return `${'*'.repeat(level)} ${code}`;
  if (type === 'bullet') return `${level===1?'•':'↳'.repeat(level-1)} ${code}`;
  return code;
}
export function serializeVisual(editor) {
  const rows = [];
  for (const child of editor.childNodes) {
    if (child.nodeType === 3) {
      const value = child.nodeValue || '';
      if (value) rows.push(value);
    } else if (child.nodeType === 1) {
      const el = /** @type {HTMLElement} */ (child);
      if (el.tagName === 'BR') rows.push('');
      else if (el.classList.contains('wiki-line')) {
        const value = serializeLine(el);
        rows.push(el.dataset.initialCode === value ? el.dataset.originalSource : value);
      }
      else if (el.tagName === 'DIV' || el.tagName === 'P') rows.push([...el.childNodes].map(inlineCode).join(''));
      else if (rows.length) rows[rows.length-1] += inlineCode(el);
      else rows.push(inlineCode(el));
    }
  }
  return rows.join('\n');
}

/** Add/replace a token at the user's current selection. */
export function insertWikiToken(editor, raw) {
  editor.focus();
  const sel = window.getSelection();
  if (!sel?.rangeCount) return false;
  const range = sel.getRangeAt(0);
  if (!editor.contains(range.commonAncestorContainer)) return false;
  const kind = raw.startsWith('[[') ? 'wiki' : raw.startsWith('{{') ? 'search' : raw.startsWith('[forum]') ? 'forum' : 'post';
  const value = kind === 'wiki' || kind === 'search' ? raw.slice(2,-2) : raw.replace(/^\[[^\]]+\]|\[\/[^\]]+\]$/g,'');
  const token = createToken(raw,kind,value);
  range.deleteContents();
  range.insertNode(token);
  range.setStartAfter(token);range.collapse(true);
  sel.removeAllRanges();sel.addRange(range);
  return true;
}
export function replaceWikiToken(token, value) {
  const kind = token.dataset.tokenKind;
  const newValue = String(value || '').trim();
  if (!newValue || /[\[\]\n\r]/.test(newValue)) return false;
  const raw = kind === 'wiki' ? `[[${newValue.replace(/\s+/g,'_')}]]` :
    kind === 'search' ? `{{${newValue}}}` :
    kind === 'forum' ? `[forum]${newValue}[/forum]` : `[post]${newValue}[/post]`;
  if (kind === 'post' || kind === 'forum') {
    if (newValue !== 'InsertPostID' && !/^\d+$/.test(newValue)) return false;
  }
  const replacement = createToken(raw,kind,newValue);
  token.replaceWith(replacement);
  return true;
}
export function setLineFormat(editor, kind, level = 1, range = null) {
  const sel = window.getSelection();
  const currentRange = range || (sel?.rangeCount ? sel.getRangeAt(0) : null);
  if (!currentRange || !editor.contains(currentRange.commonAncestorContainer)) return false;
  let changed = false;
  const lines = [...editor.querySelectorAll('.wiki-line')].filter(el => {
    try { return currentRange.intersectsNode(el); } catch { return false; }
  });
  for (const line of lines) {
    const now = line.dataset.lineType;
    const next = kind === now && Number(line.dataset.lineLevel) === level ? 'plain' : kind;
    applyLineClass(line,next,next==='plain'?0:level);
    changed = true;
  }
  return changed;
}

// Native Enter creates new lines. Convert new DIVs to wiki-line and preserve
// list nesting when possible, without reparsing while the caret is active.
export function normalizeVisualStructure(editor) {
  for (const child of [...editor.children]) {
    if (child.tagName === 'DIV' && !child.classList.contains('wiki-line')) {
      applyLineClass(child,'plain',0);
    }
  }
}
