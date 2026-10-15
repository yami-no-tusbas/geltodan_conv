# Booru Wiki Converter

A tiny, fully static **Danbooru DText → Gelbooru Wiki** converter. Suitable for GitHub Pages and tablets/phones. The interface is available in English and French.

## Use

1. Open a Danbooru wiki edit page, and copy the DText source.
2. On the converter website, tap **Paste** (or manually paste into the left field).
3. Review the automatically converted Gelbooru markup; tap **Copy**.
4. Paste it into a Gelbooru wiki edit page and make any necessary editorial adjustments.

No login, server, database, API calls, tag checks, or uploads. The pasted text stays in the browser. Your browser may ask permission to *read* the clipboard; if denied, manual paste still works. Clipboard access requires HTTPS (provided by GitHub Pages), or localhost for local testing.

## Supported conversions

- Wiki links `[[a tag]]` → `[[a_tag]]`; `[[tag|label]]` → `label ([[tag]])`.
- Danbooru `h4.`, `h5.`, `h6.` headings → compact bold headings by default, or compatible Gelbooru heading tags where available.
- DText lists (including nested `*`, `**`, `***`) → textual lists; optional bullet/arrow markers.
- Bold, italic, strikethrough, spoilers, quotes; ordinary text and paragraphs.
- Collapsible blocks expanded into visible text; anchor-only tables of contents omitted with a notice.
- Danbooru `!post #id` and `!asset #id` image embeds → **Danbooru URLs**, never reused as Gelbooru IDs.
- Selected link formats and simple DText tables converted to readable text.
- Unsupported formatting is simplified conservatively, with conversion notes.

**Not included:** No checks for tag existence, aliases, ratings or post matches; no attempts to translate Danbooru post IDs to Gelbooru post IDs. Conversion does not ensure compliance with Gelbooru editorial guidelines. Some rare or nested DText constructs may still require manual edits.

## Deploy on GitHub Pages

1. Create a new public repository (for example `booru-wiki-converter`).
2. Upload **the contents of this directory** to the repository root (keep `index.html` at root).
3. Go to **Settings → Pages → Build and deployment → Deploy from a branch**.
4. Select branch `main`, folder `/ (root)`, then **Save**.
5. The website URL will be `https://YOUR-USERNAME.github.io/REPOSITORY-NAME/`.

The site needs no build step, dependencies, external fonts or third-party scripts.

## Test locally

Because the UI uses ES modules, it should be served via HTTP rather than opened as a `file://` document:

```bash
python -m http.server 8000
# Visit http://localhost:8000
```

Run the self-contained Node.js tests with:

```bash
node --test
```

## Licensing

MIT license (see `LICENSE`). No Danbooru/Gelbooru code or content is bundled.
