/**
 * Danbooru DText -> conservative Gelbooru wiki syntax converter.
 * No network activity and no tag validation. All input is untrusted plain text.
 * @license MIT
 */

const DANBOORU_BASE = 'https://danbooru.donmai.us';

const cleanTag = (name) => name.trim().replace(/\s+/gu, '_');

/** @typedef {{code:string, warnings:Array<{code:string,count:number,message:string}>, statistics:Object}} ConversionResult */

/**
 * @param {string} input Raw DText copied from a Danbooru wiki edit page
 * @param {{headings?: 'compact'|'preserve', lists?: 'stars'|'bullets'}} options
 * @returns {ConversionResult}
 */
export function convertDText(input, options = {}) {
  const headings = options.headings === 'preserve' ? 'preserve' : 'compact';
  const lists = options.lists === 'bullets' ? 'bullets' : 'stars';
  const counts = new Map();
  const warn = (code, message, amount = 1) => {
    const old = counts.get(code);
    counts.set(code, { code, message, count: (old?.count ?? 0) + amount });
  };
  const stats = {
    sourceLines: 0,
    outputLines: 0,
    wikiLinks: 0,
    headings: 0,
    listItems: 0,
    imageReferences: 0,
  };
  if (typeof input !== 'string' || !input.length) {
    return { code: '', warnings: [], statistics: stats };
  }

  let text = input.replace(/\r\n?/g, '\n');
  stats.sourceLines = text.split('\n').length;

  // Temporarily protect literal code so its markup is not parsed as wiki syntax.
  const literal = [];
  const tokenFor = (raw) => {
    const key = `\uE000BF${literal.length}Z\uE001`;
    literal.push([key, raw]);
    return key;
  };
  text = text.replace(/\[(code|nodtext)\]([\s\S]*?)\[\/\1\]/gi, (_full, _tag, content) => {
    warn('literal', 'Code / literal DText blocks were kept as plain text.');
    return tokenFor(content);
  });

  // A Danbooru TOC consists of navigation anchors that don't work on Gelbooru.
  // It is redundant after headings are converted and is removed deliberately.
  text = text.replace(/\[expand=([^\]\n]+)\]([\s\S]*?)\[\/expand\]/gi, (_full, title, body) => {
    if (/^(?:table of contents|contents|sommaire)$/i.test(title.trim()) &&
      /#dtext-|\[\[[^\]]+#/i.test(body)) {
      warn('toc', 'The Danbooru table of contents was removed (its anchors would not work).');
      return '';
    }
    warn('expand', 'Collapsible sections were expanded into normal text.');
    return `\n[b]${title.trim()}[/b]\n\n${body.trim()}\n`;
  });
  text = text.replace(/\[expand\]([\s\S]*?)\[\/expand\]/gi, (_full, body) => {
    warn('expand', 'Collapsible sections were expanded into normal text.');
    return `\n${body}\n`;
  });
  // Any remaining named (nested) expand blocks lose only the unsupported wrappers.
  text = text.replace(/\[expand(?:=[^\]\n]*)?\]|\[\/expand\]/gi, () => {
    warn('expand', 'Collapsible sections were expanded into normal text.');
    return '';
  });

  // Convert DText tables to readable text rows, not unsupported Gelbooru tables.
  text = text.replace(/\[table(?:\s[^\]]*)?\]([\s\S]*?)\[\/table\]/gi, (_full, body) => {
    const rows = [...body.matchAll(/\[tr(?:\s[^\]]*)?\]([\s\S]*?)\[\/tr\]/gi)];
    warn('tables', 'Tables were flattened into readable text rows; merged-cell layout may be lost.');
    if (!rows.length) {
      return body.replace(/\[\/?(?:thead|tbody|colgroup|col|tr|th|td)[^\]]*\]/gi, ' ').replace(/\n{3,}/g, '\n\n');
    }
    return '\n' + rows.map(([, row]) => {
      const cells = [...row.matchAll(/\[(th|td)(?:\s[^\]]*)?\]([\s\S]*?)\[\/\1\]/gi)];
      if (!cells.length) return row.trim();
      return cells.map(([, type, content]) => {
        let s = content.replace(/\s*\n\s*/g, ' ').trim();
        return type.toLowerCase() === 'th' ? `[b]${s}[/b]` : s;
      }).join(' | ');
    }).join('\n') + '\n';
  });

  // Links to Danbooru media are NOT Gelbooru post IDs. Retain a working URL.
  text = text.replace(/!\s*(post|asset)\s+#(\d+)(?:\s*:\s*([^\n]+))?/gi,
    (_full, kind, id, caption) => {
      stats.imageReferences++;
      warn('media', 'Danbooru image embeds were replaced by links to the original media.');
      const url = `${DANBOORU_BASE}/${kind.toLowerCase() === 'post' ? 'posts' : 'media_assets'}/${id}`;
      return caption?.trim() ? `${caption.trim()} — ${url}` : url;
    });

  // HTML-style DText tags explicitly documented by Danbooru.
  const formatting = { b: 'b', strong: 'b', i: 'i', em: 'i', s: 's', strike: 's' };
  text = text.replace(/<\/?(?:b|strong|i|em|s|strike)>/gi, tag => {
    const match = /^<(\/)?([a-z]+)>$/i.exec(tag);
    return `[${match[1] ? '/' : ''}${formatting[match[2].toLowerCase()]}]`;
  });
  text = text.replace(/<a\s+href=["'](https?:\/\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
    (_full, url, label) => `${label} (${url})`);
  text = text.replace(/<br\s*\/?\s*>/gi, '\n');
  text = text.replace(/<hr\s*\/?\s*>/gi, '\n----------------\n');
  text = text.replace(/<\/?(?:u|tn)>/gi, tag => {
    warn('unsupported-style', 'Underline and small-note styling were reduced to plain text.');
    return '';
  });

  // Headers with optional Danbooru anchors. Their #anchor has no Gelbooru match.
  text = text.replace(/^[ \t]*h([456])(?:#([^\.\s]+))?\.[ \t]*(.*?)[ \t]*$/gmi,
    (_full, depth, anchor, title) => {
      stats.headings++;
      if (anchor) warn('anchors', 'Danbooru heading anchors were removed.');
      const level = Number(depth);
      if (headings === 'preserve' && level <= 5) return `[h${level}]${title}[/h${level}]`;
      return `[b]${title}[/b]`;
    });

  // Only Gelbooru formatting shown in the official guide is emitted.
  text = text.replace(/\[(?:spoilers)\]/gi, '[spoiler]')
    .replace(/\[\/(?:spoilers)\]/gi, '[/spoiler]');
  text = text.replace(/\[tn\]([\s\S]*?)\[\/tn\]/gi, (_full, note) => {
    warn('annotations', 'Danbooru translator notes were preserved as normal text.');
    return note;
  });
  text = text.replace(/\[u\]([\s\S]*?)\[\/u\]/gi, (_full, note) => {
    warn('unsupported-style', 'Underline and small-note styling were reduced to plain text.');
    return note;
  });
  text = text.replace(/\[hr\]/gi, '\n----------------\n');
  text = text.replace(/\[br\]/gi, '\n');

  // Danbooru inline links: custom labels and omitted qualifiers are not
  // supported in Gelbooru's [[tag]] syntax.
  text = text.replace(/\[\[([^\]\n]+)\]\]/g, (_full, inner) => {
    let pipeAt = inner.indexOf('|');
    const rawName = pipeAt === -1 ? inner : inner.slice(0, pipeAt);
    const label = pipeAt === -1 ? null : inner.slice(pipeAt + 1).trim();
    const hashIndex = rawName.indexOf('#');
    if (hashIndex !== -1) warn('anchors', 'Danbooru wiki section anchors were removed.');
    const name = cleanTag(hashIndex === -1 ? rawName : rawName.slice(0, hashIndex));
    if (!name) return _full;
    stats.wikiLinks++;
    const link = `[[${name}]]`;
    if (label === null || label.length === 0) return link;
    warn('labels', 'Custom wiki link labels were moved into plain text.');
    return `${label} (${link})`;
  });

  // DText labeled URLs become auto-linked bare URLs, with their label preserved.
  const labeledURL = (label, url) => {
    const cleanedURL = url.trim();
    const cleanedLabel = label.trim();
    warn('external-labels', 'External link labels were converted to text plus a URL.');
    return !cleanedLabel || cleanedLabel === cleanedURL ? cleanedURL : `${cleanedLabel} (${cleanedURL})`;
  };
  text = text.replace(/"([^"\n]+)":\[(https?:\/\/[^\]\n]+)\]/gi,
    (_full, label, url) => labeledURL(label, url));
  text = text.replace(/\[([^\]\n]+)\]\((https?:\/\/[^)\n]+)\)/gi,
    (_full, label, url) => labeledURL(label, url));
  text = text.replace(/\[(https?:\/\/[^\]\n]+)\]\(([^)\n]+)\)/gi,
    (_full, url, label) => labeledURL(label, url));
  text = text.replace(/\[url=(https?:\/\/[^\]\n]+)\]([\s\S]*?)\[\/url\]/gi,
    (_full, url, label) => labeledURL(label, url));
  text = text.replace(/\[url\](https?:\/\/[^\[]+?)\[\/url\]/gi, '$1');
  text = text.replace(/<((?:https?):\/\/[^>\n]+)>/gi, '$1');
  text = text.replace(/"([^"\n]+)":\[#(?:dtext-)?[^\]\n]+\]/gi, (_full, label) => {
    warn('anchors', 'Internal section links were converted to plain text.');
    return label;
  });
  text = text.replace(/\[([^\]\n]+)\]\(#[^)\n]+\)/gi, (_full, label) => {
    warn('anchors', 'Internal section links were converted to plain text.');
    return label;
  });
  text = text.replace(/"([^"\n]+)":#(?:dtext-)?\S+/gi, (_full, label) => {
    warn('anchors', 'Internal section links were converted to plain text.');
    return label;
  });

  // Danbooru supports {{search|custom label}}, Gelbooru doesn't support '|'.
  // A search can contain *multiple tags*, so NEVER replace all its spaces
  // with underscores; that would silently change the query's meaning.
  text = text.replace(/\{\{([^{}\n]+)\}\}/g, (full, inner) => {
    const i = inner.indexOf('|');
    if (i < 0) return full;
    const q = inner.slice(0, i).trim();
    const label = inner.slice(i + 1).trim();
    warn('search-labels', 'Custom tag-search labels were converted to plain text.');
    return label ? `${label} ({{${q}}})` : `{{${q}}}`;
  });

  // Inline Danbooru ID references. Only convert recognized identifiers.
  const idRefs = {
    post: 'posts', asset: 'media_assets', topic: 'forum_topics',
    forum: 'forum_posts', comment: 'comments', pool: 'pools',
    wiki: 'wiki_pages', user: 'users', favgroup: 'favorite_groups',
  };
  text = text.replace(/\b(post|asset|topic|forum|comment|pool|wiki|user|favgroup)\s+#(\d+)\b/gi,
    (_full, type, id) => {
      warn('danbooru-ids', 'Danbooru numeric references were converted to absolute links.');
      return `${DANBOORU_BASE}/${idRefs[type.toLowerCase()]}/${id}`;
    });

  // Convert DText list levels but keep literal '*' for Gelbooru. A Gelbooru
  // wiki renders these as visible text rather than HTML <ul>/<li> elements.
  text = text.split('\n').map(line => {
    const match = /^(\s*)(\*+)[ \t]+(.*)$/.exec(line);
    if (!match) return line;
    const depth = match[2].length;
    stats.listItems++;
    if (lists === 'stars') return `${'*'.repeat(depth)} ${match[3]}`;
    const marker = depth === 1 ? '•' : '↳'.repeat(Math.min(depth - 1, 8));
    return `${marker} ${match[3]}`;
  }).join('\n');

  // Preserve protected literal regions after all parsing. No HTML rendering.
  for (const [token, raw] of literal) {
    text = text.replace(token, raw);
  }

  // Normalize accidental excess whitespace without trimming meaningful
  // indentation and single line breaks.
  text = text.replace(/[ \t]+$/gm, '').replace(/\n{4,}/g, '\n\n\n').trim();
  stats.outputLines = text ? text.split('\n').length : 0;
  return { code: text, warnings: [...counts.values()], statistics: stats };
}

export default convertDText;
