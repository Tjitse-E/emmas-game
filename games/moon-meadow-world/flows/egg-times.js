// The eggs' timings for level.flow.sh (docs/v4/2.3.md section 19.1, 2.3.2). An init script: it notes when each clip
// and effect file starts, when an egg panel opens and goes, when its stones wake and sleep, and each release of a
// touch. window.__eggTimes() gives, per egg panel (the hay rack left out), in ms:
//   panelToAwake  the panel opens to the first sum's stones awake
//   goalToAwake   the first goal clip (num-egg-) starts to those stones awake
//   dropToAwake   the right drop of sums 1 and 2 to the next sum's stones awake
//   between       the clips and effects that started in those gaps
//   total         the panel opens to the panel gone, and wait: the part of it the flow spent before each first drop
(() => {
  const now = () => Math.round(performance.now());
  const ev = [];
  const urls = new WeakMap();
  const read = Response.prototype.arrayBuffer;
  Response.prototype.arrayBuffer = function () {
    const url = this.url;
    return read.call(this).then((b) => (urls.set(b, url), b));
  };
  const decode = BaseAudioContext.prototype.decodeAudioData;
  BaseAudioContext.prototype.decodeAudioData = function (data, ok, bad) {
    const url = urls.get(data);
    const tag = (b) => {
      if (b && url) b.__clip = url.replace(/^.*\//, '').replace(/\.mp3(\?.*)?$/, '');
      return b;
    };
    const p = decode.call(this, data, ok && ((b) => ok(tag(b))), bad);
    return p && p.then ? p.then(tag) : p;
  };
  let panel = false;
  let awake = false;
  const look = () => {
    const p = !!document.querySelector('.egg-moment:not(.skin-hay)');
    if (p !== panel) ev.push({ t: now(), k: (panel = p) ? 'panel' : 'gone' });
    const a = p && !!document.querySelector('.egg-moment:not(.skin-hay) .stone-tray:not(.asleep)');
    if (a !== awake) ev.push({ t: now(), k: (awake = a) ? 'awake' : 'asleep' });
  };
  setInterval(look, 20);
  const start = AudioBufferSourceNode.prototype.start;
  AudioBufferSourceNode.prototype.start = function (...a) {
    const id = this.buffer && this.buffer.__clip;
    // The panel opens in the same task as its first line, so it is looked for first.
    look();
    if (id) ev.push({ t: now(), k: 'clip', id });
    return start.apply(this, a);
  };
  addEventListener('pointerup', () => panel && ev.push({ t: now(), k: 'up' }), true);

  window.__eggTimes = () => {
    const eggs = [];
    let e = null;
    for (const x of ev) {
      if (x.k === 'panel') eggs.push((e = { ev: [] }));
      if (e) e.ev.push(x);
      if (x.k === 'gone') e = null;
    }
    return eggs.map(({ ev: es }) => {
      const at = (k, from = 0, f = () => true) => {
        for (let i = from; i < es.length; i++) if (es[i].k === k && f(es[i])) return i;
        return -1;
      };
      const t = (i) => (i < 0 ? null : es[i].t);
      const p = 0;
      const goal = at('clip', p, (x) => /^num-egg-/.test(x.id));
      const awakes = es.map((x, i) => (x.k === 'awake' ? i : -1)).filter((i) => i >= 0);
      const sleeps = es.map((x, i) => (x.k === 'asleep' ? i : -1)).filter((i) => i >= 0);
      const lastUpBefore = (i) => {
        for (let j = i; j >= 0; j--) if (es[j].k === 'up') return j;
        return -1;
      };
      const dropToAwake = [];
      const between = [];
      for (const s of sleeps.slice(0, 2)) {
        const up = lastUpBefore(s);
        const next = awakes.find((i) => i > s) ?? -1;
        dropToAwake.push(up < 0 || next < 0 ? null : es[next].t - es[up].t);
        between.push(es.slice(up, next < 0 ? es.length : next).filter((x) => x.k === 'clip').map((x) => `${x.id}@${x.t - es[up].t}`));
      }
      const gone = at('gone');
      const wait = awakes.reduce((n, i) => {
        const up = at('up', i);
        return n + (up < 0 ? 0 : es[up].t - es[i].t);
      }, 0);
      return {
        panelToAwake: awakes.length ? es[awakes[0]].t - es[p].t : null,
        goalToAwake: awakes.length && goal >= 0 ? es[awakes[0]].t - es[goal].t : null,
        opening: es.slice(0, awakes[0] ?? es.length).filter((x) => x.k === 'clip').map((x) => `${x.id}@${x.t - es[p].t}`),
        dropToAwake,
        between,
        total: gone < 0 ? null : t(gone) - es[p].t,
        wait,
      };
    });
  };
})();
