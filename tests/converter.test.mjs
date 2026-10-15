import test from 'node:test';
import assert from 'node:assert/strict';
import { convertDText } from '../js/converter.js';
const cv = (s, options) => convertDText(s, options);
const output = (s, options) => cv(s, options).code;
const hasWarning = (s, code) => cv(s).warnings.some(w => w.code === code);

test('empty input returns empty output', () => {
  assert.equal(output(''), '');
  assert.equal(cv('').statistics.outputLines, 0);
});
test('normal text, paragraphs, CRLF are preserved', () =>
  assert.equal(output('First\r\n\r\nSecond'), 'First\n\nSecond'));
test('direct Gelbooru bold/italic/strikethrough remain unchanged', () =>
  assert.equal(output('[b]A[/b] [I]B[/I] [s]C[/s]'), '[b]A[/b] [I]B[/I] [s]C[/s]'));
test('headers are compact by default', () =>
  assert.equal(output('h4#intro. Appearance\n\nh5. Clothes\nh6. Hat'), '[b]Appearance[/b]\n\n[b]Clothes[/b]\n[b]Hat[/b]'));
test('optional headings preserve supported Gelbooru levels', () =>
  assert.equal(output('h4. A\nh5. B\nh6. C', {headings:'preserve'}), '[h4]A[/h4]\n[h5]B[/h5]\n[b]C[/b]'));
test('wiki links normalize names without changing case', () =>
  assert.equal(output('[[Nijisanji matching outfit]] [[Boo_(Mario)]] [[one  two]]'),
    '[[Nijisanji_matching_outfit]] [[Boo_(Mario)]] [[one_two]]'));
test('pipe links: empty label and custom label', () =>
  assert.equal(output('[[Boo_(Mario)|]] [[boo_(mario)|rude ghost]]'),
    '[[Boo_(Mario)]] rude ghost ([[boo_(mario)]])'));
test('wiki anchors are stripped, custom label retained', () =>
  assert.equal(output('[[Some tag#Example|example]]'), 'example ([[Some_tag]])'));
test('a Danbooru tag search with several tags stays several tags', () =>
  assert.equal(output('{{kantai_collection comic}} {{red_hair blue_eyes|Search}}'),
    '{{kantai_collection comic}} Search ({{red_hair blue_eyes}})'));
test('nested lists keep their exact levels and links', () => {
  assert.equal(output('* [[One tag]]\n** [[Second tag]]\n*** [[Third tag]]'),
    '* [[One_tag]]\n** [[Second_tag]]\n*** [[Third_tag]]');
});
test('optional bullet/arrow list style shows depths without relying on HTML whitespace', () =>
  assert.equal(output('* A\n** B\n*** C', { lists:'bullets' }), '• A\n↳ B\n↳↳ C'));
test('literal asterisk in ordinary prose stays as-is', () =>
  assert.equal(output('2 * 3\n*not-a-list'), '2 * 3\n*not-a-list'));
test('Danbooru post embeds are not mistaken for Gelbooru IDs', () => {
  assert.equal(output('* !post #5755771: [[Nijisanji matching outfit]]'),
    '* [[Nijisanji_matching_outfit]] — https://danbooru.donmai.us/posts/5755771');
  assert.ok(hasWarning('!post #5755771', 'media'));
});
test('asset embeds keep the original media URL', () =>
  assert.equal(output('!asset #25931715'), 'https://danbooru.donmai.us/media_assets/25931715'));
test('all Danbooru TOC anchor-only entries are removed intentionally', () => {
  const src = '[expand=Table of Contents]\n* "Shared":#dtext-shared\n[/expand]\n\nh4#shared. Shared';
  assert.equal(output(src), '[b]Shared[/b]');
  assert.ok(hasWarning(src, 'toc'));
});
test('non-TOC expanded section keeps title and its content', () =>
  assert.equal(output('[expand=Other stuff]\n* [[Foo bar]]\n[/expand]'), '[b]Other stuff[/b]\n\n* [[Foo_bar]]'));
test('unnamed expanded section keeps body', () =>
  assert.equal(output('A\n[expand]hello[/expand]\nB'), 'A\n\nhello\n\nB'));
test('notes preserve all text', () =>
  assert.equal(output('h6. Age\n[tn](alternate age)[/tn]'), '[b]Age[/b]\n(alternate age)'));
test('spoiler(s) becomes the Gelbooru spoiler tag', () =>
  assert.equal(output('[spoilers]secret[/spoilers] [spoiler]other[/spoiler]'), '[spoiler]secret[/spoiler] [spoiler]other[/spoiler]'));
test('DText URLs with labels are preserved as textual URLs', () =>
  assert.equal(output('"Danbooru":[https://danbooru.donmai.us]'), 'Danbooru (https://danbooru.donmai.us)'));
test('Markdown links work', () =>
  assert.equal(output('[Docs](https://example.com/docs)'), 'Docs (https://example.com/docs)'));
test('HTML links work', () =>
  assert.equal(output('<a href="https://example.com">Docs</a>'), 'Docs (https://example.com)'));
test('HTML inline formatting converts to Gelbooru tags', () =>
  assert.equal(output('<strong>Hey</strong> and <em>you</em>'), '[b]Hey[/b] and [i]you[/i]'));
test('DText tables render as readable text rows', () => {
  const src = '[table]\n[tr][th]Name[/th][th]Type[/th][/tr]\n[tr][td][[Cat girl]][/td][td]character[/td][/tr]\n[/table]';
  assert.equal(output(src), '[b]Name[/b] | [b]Type[/b]\n[[Cat_girl]] | character');
});
test('literal code/nodtext blocks protect source markup', () =>
  assert.equal(output('[code][[some tag]] h4. heading[/code]\n[[real tag]]'),
    '[[some tag]] h4. heading\n[[real_tag]]'));
test('Danbooru forum and post text references are fully qualified', () =>
  assert.equal(output('See post #123 or topic #12'), 'See https://danbooru.donmai.us/posts/123 or https://danbooru.donmai.us/forum_topics/12'));
test('no tag lookups, and unknown text is not discarded', () =>
  assert.equal(output('[[a nonexistent tag]]\nSpecial :heart: & <unknown>'),
    '[[a_nonexistent_tag]]\nSpecial :heart: & <unknown>'));
test('source and output statistics are correct', () => {
  const result = cv('h4. Title\n* [[Red Ribbon]]\n** [[Hair ribbon]]');
  assert.equal(result.statistics.headings, 1);
  assert.equal(result.statistics.wikiLinks, 2);
  assert.equal(result.statistics.listItems, 2);
  assert.equal(result.statistics.sourceLines, 3);
});
