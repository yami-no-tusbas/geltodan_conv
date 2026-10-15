# Booru Wiki Converter

Version **1.2.0**. A tiny, fully static **Danbooru DText → Gelbooru Wiki** converter. Suitable for GitHub Pages and tablets/phones. The interface is available in English and French.

## Use

1. Open a Danbooru wiki edit page, and copy the DText source.
2. On the converter website, tap **Paste** (or manually paste into the left field).
3. Switch the result between **Code View** (editable BBCode) and **Edit** (visual editing). Make your corrections, then tap **Copy**.
4. Paste your finished text into the Gelbooru wiki editor.

No login, server, database, API calls, tag checks, or uploads. The pasted text stays in the browser. Your browser may ask permission to *read* the clipboard; if denied, manual paste still works. Clipboard access requires HTTPS (provided by GitHub Pages), or localhost for local testing.

## Visual editor (v1.2.0)

- **Code View** is an editable textarea containing exactly the Gelbooru BBCode that the Copy button uses.
- **Edit** displays headings, bold/italic/strike, hierarchical lists, editable wiki/search/post/forum tokens, inline quotes and spoilers where safely representable. Tap a link or post badge to edit its underlying target / ID.
- The visual toolbar provides formatting, a heading, list levels, wiki links, post references, quote, spoiler, and undo/redo. It can be used on tablets with touch controls.
- **Independent draft**: conversion settings and typing into the Danbooru source never rewrite the Gelbooru result. Pasting a new Danbooru source requests confirmation before replacing modified output. The **Convert source** button explicitly regenerates output, also with confirmation if modified.
- **Copy** always copies the current (possibly manually edited) Gelbooru BBCode. The Danbooru input never changes when editing Gelbooru output.
- Unknown / malformed / multiline markup is kept as literal text in the visual editor so it can be reviewed and edited in Code View, not guessed or silently deleted.
- The browser's ordinary clipboard rules apply. No persistent storage of wiki content is performed; save the finished output in Gelbooru before leaving the page.

**Known limitations:** The visual editor is deliberately conservative; it is not a full implementation of Gelbooru's renderer. Advanced nested / multiline markup may be displayed as literal BBCode. Editing long text across line breaks with a phone's virtual keyboard can vary by browser. Always check Code View before publishing.

## Supported conversions

- Wiki links `[[a tag]]` → `[[a_tag]]`; `[[tag|label]]` → `label ([[tag]])`.
- Danbooru `h4.`, `h5.`, `h6.` headings → compact bold headings by default, or compatible Gelbooru heading tags where available.
- DText lists (including nested `*`, `**`, `***`) → textual lists; optional bullet/arrow markers.
- Bold, italic, strikethrough, spoilers, quotes; ordinary text and paragraphs.
- Collapsible blocks expanded into visible text; anchor-only tables of contents omitted with a notice.
- Danbooru `!post #id`, `!asset #id`, standalone post references and direct Danbooru post/asset URLs → **`[post]InsertPostID[/post]`**, to fill with a suitable Gelbooru post ID. Captions are preserved.
- External Danbooru post links inside **External links**, **Sources**, or **References** sections are retained as citations; other external source URLs remain untouched.
- Selected link formats and simple DText tables converted to readable text.
- Unsupported formatting is simplified conservatively, with conversion notes.

**Not included:** No checks for tag existence, aliases, ratings or post matches; no attempts to translate Danbooru post IDs to Gelbooru post IDs. **Replace all `InsertPostID` placeholders with real Gelbooru post IDs before publishing.** Conversion does not ensure compliance with Gelbooru editorial guidelines. Some rare or nested DText constructs may still require manual edits.

## Deploy on GitHub Pages

1. Create a new public repository (for example `booru-wiki-converter`).
2. Upload **the contents of this directory** to the repository root (keep `index.html` at root).
3. Go to **Settings → Pages → Build and deployment → Deploy from a branch**.
4. Select branch `main`, folder `/ (root)`, then **Save**.
5. The website URL will be `https://YOUR-USERNAME.github.io/REPOSITORY-NAME/`.

The site needs no build step, dependencies, external fonts or third-party scripts.

To use a **single local HTML file**, download `booru-wiki-converter-v1.2-standalone.html` from the release. It includes the entire style and scripts, and can be opened directly from disk. Build it yourself with `python tools/build_standalone.py`. Clipboard read requires HTTPS or localhost and may not be available from local files; manual pasting is always possible.

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

MIT license (see `LICENSE`). No Danbooru/Gelbooru application code is bundled; test fixtures contain short wiki text excerpts used for regression tests.

## Wiki link normalization verification

Gelbooru requires underscores inside wiki links (but **not** in regular prose):

```text
Danbooru:  [[formal clothes]] [[Black cross tie]]
Gelbooru:  [[formal_clothes]] [[Black_cross_tie]]
```

The automated regression fixture is `tests/fixtures/cross-tie.dtext`.
If your deployed page behaves differently, check the `v1.2.0` indicator at
the bottom, update the repository files, and reload the page.

## Image handling (v1.1.0+)

Images embedded using Danbooru `!post` / `!asset` are not portable to Gelbooru. The converter emits `[post]InsertPostID[/post]` instead of a misleading Danbooru URL or invalid cross-site ID. The user finds a suitable Gelbooru post, pastes its numeric ID, and publishes. External sources are preserved. Regression tests include the Blue Archive Subaru sample.
