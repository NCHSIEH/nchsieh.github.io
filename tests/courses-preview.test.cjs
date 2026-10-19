const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const vm = require('node:vm');

// Small DOM double for the element/event APIs used by course cards.
class Element {
  constructor(tag) {
    this.tagName = tag;
    this.nodeType = 1;
    this.children = [];
    this.attributes = {};
    this.events = {};
    this.hidden = false;
    this.className = '';
    this.classList = { toggle: (name, force) => {
      const classes = new Set(this.className.split(' ').filter(Boolean));
      const enabled = force ?? !classes.has(name);
      if (enabled) classes.add(name); else classes.delete(name);
      this.className = [...classes].join(' ');
      return enabled;
    } };
  }
  set textContent(text) { this.children = []; this.text = String(text); }
  get textContent() { return (this.text || '') + this.children.map(c => c.textContent ?? String(c)).join(''); }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  addEventListener(name, fn) { this.events[name] = fn; }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.text = ''; this.children = children; }
  click() { this.events.click?.(); }
}

function descendants(node, predicate) {
  return [node, ...(node.children || []).flatMap(c => descendants(c, predicate))].filter(predicate);
}
const byClass = name => node => (node.className || '').split(' ').includes(name);
function source(file) {
  return readFileSync(join(__dirname, '..', 'assets', 'js', file), 'utf8')
    .replace(/^import[\s\S]*?;\s*$/gm, '')
    .replace(/^export /gm, '');
}
function courseContext(user = null, allowed = false) {
  let detailCalls = 0;
  const context = vm.createContext({
    document: {
      createElement: tag => new Element(tag),
      createTextNode: text => ({ nodeType: 3, textContent: String(text) }),
      createDocumentFragment: () => new Element('fragment')
    },
    identity: { user, status: user ? 'approved' : null },
    DEFAULT_MATERIALS_DISPLAY: 'scroll', MATERIALS_ROOT: 'assets/courses/',
    loadCourseDetail: async () => {
      detailCalls++;
      return { allowed, materials: [{ unit: '完整講義', path: 'private.pdf' }], assignments: [] };
    },
    friendlyError: String
  });
  vm.runInContext(source('ui.js').split('/* ---------- 主題 ---------- */')[0], context);
  vm.runInContext(source('courses.js'), context);
  return { context, detailCalls: () => detailCalls };
}

for (const summary of ['', '短摘要', '長'.repeat(150)]) {
  test(`guest expands and collapses names with summary length ${summary.length}`, () => {
    const { context, detailCalls } = courseContext();
    const titles = Array.from({ length: 7 }, (_, i) => `講義 ${i + 1}`);
    const card = context.buildCard({ id: 'course', summaryZh: summary, materialPreview: titles });
    const preview = descendants(card, byClass('materials-preview'))[0];
    const button = descendants(card, byClass('summary-toggle'))[0];
    assert.equal(preview.hidden, true);
    assert.equal(button.textContent, '顯示更多');
    button.click();
    assert.equal(preview.hidden, false);
    assert.equal(button.attributes['aria-expanded'], 'true');
    assert.deepEqual(descendants(preview, byClass('file-name')).map(n => n.textContent), titles.slice(0, 5));
    assert.equal(descendants(card, n => n.tagName === 'a').length, 0);
    assert.equal(detailCalls(), 0, 'guest must not request protected material records');
    button.click();
    assert.equal(preview.hidden, true);
    assert.equal(button.attributes['aria-expanded'], 'false');
  });
}

test('empty, short, and missing previews have the correct state', () => {
  const { context } = courseContext();
  assert.match(context.buildMaterialsPreview({ materialPreview: [] }).textContent, /尚未上傳/);
  assert.match(context.buildMaterialsPreview({}).textContent, /尚未更新/);
  const preview = context.buildMaterialsPreview({ materialPreview: ['一', '二'] });
  assert.equal(descendants(preview, byClass('file-name')).length, 2);
});

test('approved users retain material links; denied users receive none', async () => {
  for (const allowed of [true, false]) {
    const { context } = courseContext({ uid: 'student' }, allowed);
    const slot = new Element('div');
    await context.renderDetail({ id: 'course' }, slot);
    const links = descendants(slot, n => n.tagName === 'a');
    assert.equal(links.length, allowed ? 1 : 0);
    if (allowed) assert.equal(links[0].attributes.href, 'assets/courses/private.pdf');
  }
});

test('public synchronization publishes only five names, follows current order, and handles deletion', async () => {
  let stored = {};
  const writes = [];
  const context = vm.createContext({
    db: {}, doc: () => 'course',
    getDoc: async () => ({ exists: () => true, data: () => stored }),
    updateDoc: async (_, payload) => {
      stored = JSON.parse(JSON.stringify(payload));
      writes.push(stored);
    }
  });
  const data = source('data.js');
  vm.runInContext(data.slice(data.indexOf('async function syncMaterialPreview('), data.indexOf('async function saveAssignment(')), context);
  const materials = Array.from({ length: 7 }, (_, i) => ({
    unit: `單元 ${i}`, name: `檔案 ${i}`, path: `https://example.com/private-${i}.pdf`, size: '1 MB'
  }));
  materials[0].unit = 'null';
  await context.syncMaterialPreview('course', materials);
  assert.deepEqual(stored, { materialPreview: ['檔案 0', '單元 1', '單元 2', '單元 3', '單元 4'] });
  await context.syncMaterialPreview('course', materials);
  assert.equal(writes.length, 1, 'unchanged preview does not cause another write');
  await context.syncMaterialPreview('course', materials.slice().reverse());
  assert.equal(stored.materialPreview[0], '單元 6');
  await context.syncMaterialPreview('course', []);
  assert.deepEqual(stored, { materialPreview: [] });
});
