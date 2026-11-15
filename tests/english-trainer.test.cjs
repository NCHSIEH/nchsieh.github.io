const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = name => fs.readFileSync(path.join(__dirname, '../en/js', name + '.js'), 'utf8');

function classList() {
  const classes = new Set();
  return {
    contains: name => classes.has(name),
    toggle(name, force) {
      const active = force ?? !classes.has(name);
      if (active) classes.add(name); else classes.delete(name);
      return active;
    }
  };
}

function trainer({ theme = null, blockedStorage = false, reducedMotion = false, cardHeight = 220 } = {}) {
  const frames = [], timers = [], utterances = [], scrolls = [];
  const cards = Array.from({ length: 8 }, (_, i) => ({
    dataset: { index: String(i) }, classList: classList(), attributes: {},
    setAttribute(name, value) { this.attributes[name] = value; },
    removeAttribute(name) { delete this.attributes[name]; },
    getBoundingClientRect: () => ({ top: 500 + i * 240, height: cardHeight })
  }));
  const elements = {
    trainerView: { style: {}, querySelector: selector => cards[Number(selector.match(/data-index="(\d+)"/)[1])] },
    playMainBtn: {}, loopModeBtn: { classList: classList() }, speedCycleBtn: {},
    statMinutes: {}, statSaved: {}, statStreak: {}
  };
  const storage = new Map(theme === null ? [] : [['earflow_theme_v1', theme]]);
  const document = {
    body: { classList: classList() }, addEventListener() {},
    getElementById: id => elements[id] || null,
    querySelectorAll: selector => selector === '.sentence-card' ? cards : [],
    querySelector: selector => ({ getBoundingClientRect: () => selector === '.top-nav' ? { bottom: 120 } : { top: 700 } })
  };
  const context = vm.createContext({
    document,
    window: {
      innerHeight: 800, scrollY: 100,
      matchMedia: () => ({ matches: reducedMotion }), scrollTo: value => scrolls.push(value),
      speechSynthesis: { cancel() {}, speak: utterance => utterances.push(utterance) }
    },
    localStorage: {
      getItem(key) { if (blockedStorage) throw Error('unavailable'); return storage.get(key) ?? null; },
      setItem(key, value) { if (blockedStorage) throw Error('unavailable'); storage.set(key, value); }
    },
    SpeechSynthesisUtterance: function(text) { this.text = text; },
    requestAnimationFrame: fn => frames.push(fn),
    setTimeout: (fn, ms) => { const timer = { fn, ms }; timers.push(timer); return timer; },
    clearTimeout: timer => { timer.cancelled = true; }, console
  });
  vm.runInContext(source('data'), context);
  vm.runInContext(source('analyzer'), context);
  vm.runInContext(source('app').replace('  document.addEventListener("DOMContentLoaded", init);',
    '  window.testTrainer = { state, initTheme, toggleTheme, playLineAt, startPlaybackSequence, stopPlayback, followActiveSentence };'), context);
  const api = context.window.testTrainer;
  api.state.units = context.window.EARFLOW_DEFAULT_UNITS;
  return {
    api, context, document, cards, storage, frames, timers, utterances, scrolls,
    flushFrames() { while (frames.length) frames.shift()(); },
    nextTimer() { let timer; do { timer = timers.shift(); } while (timer?.cancelled); assert.ok(timer, 'expected pending playback'); timer.fn(); }
  };
}

test('light is the default; explicit dark persists; unavailable storage is supported', () => {
  for (const options of [{}, { theme: 'light' }, { theme: 'invalid' }, { blockedStorage: true }]) {
    const t = trainer(options);
    t.api.initTheme();
    assert.ok(t.document.body.classList.contains('theme-light'));
  }
  const t = trainer({ theme: 'dark' });
  t.api.initTheme();
  assert.equal(t.document.body.classList.contains('theme-light'), false);
  t.api.toggleTheme();
  assert.equal(t.storage.get('earflow_theme_v1'), 'light');
});

test('playback follows the selected sentence even when speech onstart is omitted', () => {
  const t = trainer();
  t.api.playLineAt(5);
  t.flushFrames();
  assert.equal(t.cards[5].attributes['aria-current'], 'true');
  assert.equal(t.cards[0].attributes['aria-current'], undefined);
  assert.equal(t.utterances[0].text, t.api.state.units[0].lines[5].en);
  // Usable viewport: 136..684. Center a 220px card at y=300.
  assert.equal(t.scrolls[0].top, 1500);
  assert.equal(t.scrolls[0].behavior, 'smooth');
});

test('speech retains the original voices, rates and pitch and reads the English sentence', () => {
  const t = trainer();
  const voices = [{ voiceURI: 'original-a', lang: 'en-US' }, { voiceURI: 'original-b', lang: 'en-US' }];
  t.api.state.availableVoices = voices;
  t.api.playLineAt(0);
  assert.equal(t.utterances[0].voice, voices[0]);
  assert.equal(t.utterances[0].rate, 1);
  assert.equal(t.utterances[0].pitch, 1.03);
  assert.equal(t.utterances[0].text, t.api.state.units[0].lines[0].en);
  assert.notEqual(t.utterances[0].text, t.api.state.units[0].lines[0].ear);
  t.api.playLineAt(1, 0.72);
  assert.equal(t.utterances[1].voice, voices[1]);
  assert.equal(t.utterances[1].rate, 0.72);
  assert.equal(t.utterances[1].pitch, 0.94);
});

test('tall phone cards align below the nav and reduced motion scrolls instantly', () => {
  const t = trainer({ reducedMotion: true, cardHeight: 900 });
  t.api.playLineAt(1);
  t.flushFrames();
  assert.equal(t.scrolls[0].top, 704);
  assert.equal(t.scrolls[0].behavior, 'instant');
});

test('cancelled speech cannot scroll or advance a newer playback session', () => {
  const t = trainer();
  t.api.startPlaybackSequence(0);
  const oldSpeech = t.utterances[0];
  t.api.stopPlayback();
  t.flushFrames();
  oldSpeech.onend();
  t.flushFrames();
  assert.equal(t.scrolls.length, 0);
  assert.equal(t.utterances.length, 1);
  assert.equal(t.timers.length, 0);
});

test('unit playback advances to each sentence and wraps after the final sentence', () => {
  const t = trainer();
  t.api.startPlaybackSequence(6);
  t.utterances.at(-1).onend(); t.nextTimer();
  assert.equal(t.api.state.activeLineIndex, 7);
  t.utterances.at(-1).onend(); t.nextTimer();
  assert.equal(t.api.state.activeLineIndex, 0);
  t.flushFrames();
  assert.equal(t.cards[0].attributes['aria-current'], 'true');
});

test('sentence loop repeats the selected sentence; AB loop visits only selected sentences', () => {
  const t = trainer();
  t.api.state.loopMode = 'sentence';
  t.api.startPlaybackSequence(4);
  t.utterances.at(-1).onend(); t.nextTimer();
  assert.equal(t.api.state.activeLineIndex, 4);
  t.api.stopPlayback();
  t.api.state.loopMode = 'unit';
  t.api.state.abSelection = new Set([1, 5]);
  t.api.startPlaybackSequence(1);
  t.utterances.at(-1).onend(); t.nextTimer();
  assert.equal(t.api.state.activeLineIndex, 5);
  t.utterances.at(-1).onend(); t.nextTimer();
  assert.equal(t.api.state.activeLineIndex, 1);
});

test('three-speed practice keeps the same sentence until all three readings finish', () => {
  const t = trainer();
  t.api.state.loopMode = 'trispeed';
  t.api.startPlaybackSequence(2);
  t.utterances.at(-1).onend(); t.nextTimer();
  assert.equal(t.utterances.at(-1).rate, 0.75);
  assert.equal(t.api.state.activeLineIndex, 2);
  t.utterances.at(-1).onend(); t.nextTimer();
  assert.equal(t.utterances.at(-1).rate, 1);
  assert.equal(t.api.state.activeLineIndex, 2);
  t.utterances.at(-1).onend(); t.nextTimer();
  assert.equal(t.api.state.activeLineIndex, 3);
});

test('all 32 original-depth lessons have bilingual text and usable cloze targets', () => {
  const { context } = trainer();
  const units = context.window.EARFLOW_DEFAULT_UNITS;
  assert.equal(units.length, 32);
  assert.equal(new Set(units.map(u => u.id)).size, 32);
  for (const u of units) {
    assert.equal(u.lines.length, 8, u.id);
    for (const line of u.lines) {
      assert.ok(line.en && line.zh && line.ear && line.chunks.length, u.id);
      assert.ok(!/\b(gonna|wanna|gotta|whatcha)\b/i.test(line.en), line.en);
      for (const phrase of line.cloze) assert.ok(line.en.toLowerCase().includes(phrase.toLowerCase()), `${u.id}: ${phrase}`);
    }
  }
  assert.ok(units[0].lines[0].en.includes('the rest of the team to dial in'));
  assert.ok(units.find(u => u.id === 'acad-02').lines.some(l => l.en.includes('propensity score matching')));
});

test('review imports and all quick templates use the updated standard English', () => {
  const { context } = trainer();
  const analyzer = context.window.EarFlowAnalyzer;
  const sources = context.window.EARFLOW_PRECURATED_SOURCES;
  assert.equal(sources.length, 12);
  for (const s of sources) {
    const unit = analyzer.buildUnitFromPrecuratedSource(s);
    assert.equal(unit.lines.length, 8);
    assert.ok(unit.lines.every(l => l.en && l.zh && l.ear));
  }
  for (const key of ['meeting_brainstorm', 'clinic', 'hotel', 'uber']) {
    assert.equal(analyzer.buildScenarioUnit(key).lines.length, 8);
  }
  const extracted = analyzer.sliceTextIntoMicroUnits('1\n00:00:01,000 --> 00:00:03,000\nCould you help me? | 可以幫我嗎？', 'SRT');
  assert.equal(extracted[0].lines[0].en, 'Could you help me?');
  assert.ok(extracted[0].lines[0].chunks.some(c => c.orig === 'Could you'));
});
