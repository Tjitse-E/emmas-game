/*
 * EmmaAudio: the shared audio player for Emma's games.
 *
 * A classic script (no module). Load it with <script src="../../shared/audio.js"></script>.
 * Everything plays through Web Audio. There is no speechSynthesis and no HTMLAudio here.
 *
 *   EmmaAudio.init({base: 'audio/', phonics: '../../shared/audio/phonics/'})
 *   EmmaAudio.unlock()                  call inside the Play button's pointer handler (iOS)
 *   EmmaAudio.preload(ids)              -> Promise, fetch and decode game clips
 *   EmmaAudio.preloadSounds(graphemes)  -> Promise, fetch and decode letter sounds (all when omitted)
 *   EmmaAudio.say(id, {queue: false})   -> Promise, resolves when the clip ends or is stopped
 *   EmmaAudio.sayAll(ids)               -> Promise, plays in sequence
 *   EmmaAudio.sound(grapheme)           -> Promise, plays a letter sound once
 *   EmmaAudio.hold(grapheme)            -> {stop(), done}, holds a long sound until stop()
 *   EmmaAudio.sfx(name)                 -> Promise, synthesized effect, no files
 *   EmmaAudio.stop(), EmmaAudio.mute(bool), EmmaAudio.speaking, EmmaAudio.missing
 *   EmmaAudio.addPack(name, base, {fresh}), EmmaAudio.forget(ids), EmmaAudio.onMissing(fn),
 *   EmmaAudio.reportMissing(id)        (v3 additions, see shared/README.md)
 *
 * Every promise resolves, also when a clip is missing, stopped, or the audio context is still locked.
 */
(function () {
  'use strict';

  var AC = window.AudioContext || window.webkitAudioContext;
  var opts = { base: 'audio/', phonics: '../../shared/audio/phonics/' };
  var ctx = null;
  var master = null;
  var buffers = {};          // url -> Promise<AudioBuffer|null>
  var loops = new WeakMap(); // AudioBuffer -> {start, end} in seconds
  var indexPromise = null;   // Promise<{sounds: {...}}>
  var manifestPromise = null; // Promise<{clips: {...}}|null> for the game folder
  var pendingSpeech = 0;      // say() calls that have not resolved yet
  var muted = false;
  var missing = [];
  var missingListeners = []; // onMissing() callbacks, called once per new missing id
  var packs = [];            // addPack(): [{name, base, manifest: Promise}], searched in order
  var clipUrls = {};         // id -> url it was loaded from, for forget()

  var speechGen = 0;                 // bumped by stopSpeech(); queued lines of an older generation are skipped
  var speechChain = Promise.resolve();
  var speechVoices = [];             // playing speech voices
  var letterVoices = [];             // playing letter sounds and holds
  var sfxVoices = [];

  function warnMissing(id) {
    console.warn('[audio] missing ' + id);
    if (missing.indexOf(id) >= 0) return;
    missing.push(id);
    missingListeners.slice().forEach(function (fn) {
      try { fn(id); } catch (e) { /* a listener error must not break playback */ }
    });
  }

  function ensureContext() {
    if (ctx || !AC) return ctx;
    try {
      ctx = new AC({ latencyHint: 'interactive' });
    } catch (e) {
      ctx = new AC();
    }
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 1;
    master.connect(ctx.destination);
    return ctx;
  }

  function resumeIfNeeded() {
    if (ctx && ctx.state !== 'running' && ctx.state !== 'closed') {
      try { ctx.resume().catch(function () {}); } catch (e) { /* older Safari returns nothing */ }
    }
  }

  // iOS can suspend or interrupt the context (phone call, app switch). Any later tap resumes it.
  document.addEventListener('pointerdown', resumeIfNeeded, { capture: true, passive: true });
  document.addEventListener('touchend', resumeIfNeeded, { capture: true, passive: true });
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') resumeIfNeeded();
  });

  function decode(arrayBuffer) {
    return new Promise(function (resolve, reject) {
      var done = false;
      var ok = function (b) { if (!done) { done = true; resolve(b); } };
      var bad = function (e) { if (!done) { done = true; reject(e || new Error('decode failed')); } };
      try {
        var p = ctx.decodeAudioData(arrayBuffer, ok, bad);
        if (p && p.then) p.then(ok, bad);
      } catch (e) { bad(e); }
    });
  }

  function load(url) {
    if (buffers[url]) return buffers[url];
    ensureContext();
    if (!ctx) return Promise.resolve(null);
    buffers[url] = fetch(url).then(function (r) {
      if (!r.ok) return null;
      return r.arrayBuffer().then(decode);
    }).catch(function (e) {
      console.warn('[audio] cannot load ' + url + ': ' + (e && e.message ? e.message : e));
      return null;
    });
    return buffers[url];
  }

  function clipUrl(id) { return opts.base + id + '.mp3'; }

  // The game's manifest.json lists the clips that exist, so a missing clip is known without a 404.
  function gameManifest() {
    if (!manifestPromise) {
      manifestPromise = fetch(opts.base + 'manifest.json')
        .then(function (r) { return r.ok ? r.json() : null; })
        .catch(function () { return null; });
    }
    return manifestPromise;
  }

  function fetchManifest(url, fresh) {
    return fetch(url, fresh ? { cache: 'no-cache' } : undefined)
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; });
  }

  // With packs: the first pack whose manifest lists the id. Without packs: the v2 behaviour (one folder).
  function clipSource(id) {
    if (!packs.length) {
      return gameManifest().then(function (m) { return m && m.clips && !m.clips[id] ? null : clipUrl(id); });
    }
    var list = packs.slice();
    return Promise.all(list.map(function (p) { return p.manifest; })).then(function (ms) {
      for (var i = 0; i < list.length; i++) {
        var c = ms[i] && ms[i].clips && ms[i].clips[id];
        if (c) return list[i].base + (c.file || id + '.mp3');
      }
      return null;
    });
  }

  function loadClip(id) {
    return clipSource(id).then(function (url) {
      if (!url) return null;
      clipUrls[id] = url;
      return load(url);
    });
  }

  function tracked(p) {
    pendingSpeech++;
    var done = function () { pendingSpeech = Math.max(0, pendingSpeech - 1); };
    return p.then(done, done);
  }

  function phonicsIndex() {
    if (!indexPromise) {
      indexPromise = fetch(opts.phonics + 'index.json')
        .then(function (r) { return r.ok ? r.json() : { sounds: {} }; })
        .catch(function () { return { sounds: {} }; });
    }
    return indexPromise;
  }

  function soundEntry(grapheme) {
    return phonicsIndex().then(function (idx) { return (idx.sounds || {})[grapheme] || null; });
  }

  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  function removeFrom(list, item) {
    var i = list.indexOf(item);
    if (i >= 0) list.splice(i, 1);
  }

  /*
   * Play a buffer once. Returns a voice: {promise, stop(fadeSeconds)}.
   * The promise resolves on the natural end, on stop(), or by a safety timer (locked context).
   */
  function playBuffer(buffer, list, options) {
    options = options || {};
    var voice = {};
    var finished = false;
    var src = null;
    var gain = ctx.createGain();
    gain.connect(master);
    voice.promise = new Promise(function (resolve) {
      voice._resolve = resolve;
    });
    function finish() {
      if (finished) return;
      finished = true;
      removeFrom(list, voice);
      clearTimeout(voice._timer);
      setTimeout(function () { try { gain.disconnect(); } catch (e) { /* already gone */ } }, 120);
      voice._resolve();
    }
    voice.stop = function (fade) {
      if (finished) return;
      fade = fade == null ? 0.03 : fade;
      if (src) {
        var t = ctx.currentTime;
        try {
          gain.gain.cancelScheduledValues(t);
          gain.gain.setValueAtTime(gain.gain.value, t);
          gain.gain.linearRampToValueAtTime(0, t + fade);
          src.stop(t + fade + 0.01);
        } catch (e) { /* already stopped */ }
      }
      finish();
    };
    resumeIfNeeded();
    src = ctx.createBufferSource();
    src.buffer = buffer;
    if (options.loop) {
      src.loop = true;
      src.loopStart = options.loop.start;
      src.loopEnd = options.loop.end;
    }
    src.connect(gain);
    src.onended = finish;
    src.start();
    list.push(voice);
    if (!options.loop) {
      voice._timer = setTimeout(finish, buffer.duration * 1000 + 400);
    }
    return voice;
  }

  // ---------------------------------------------------------------- speech

  function stopSpeech() {
    speechGen++;
    speechVoices.slice().forEach(function (v) { v.stop(0.03); });
    speechChain = Promise.resolve();
  }

  function playSpeech(id, gen) {
    return loadClip(id).then(function (buffer) {
      if (gen !== speechGen) return;
      if (!buffer || !ctx) {
        warnMissing(id);
        return waitCancellable(300, gen);
      }
      return playBuffer(buffer, speechVoices).promise;
    });
  }

  function waitCancellable(ms, gen) {
    return new Promise(function (resolve) {
      var start = Date.now();
      (function tick() {
        if (gen !== speechGen || Date.now() - start >= ms) return resolve();
        setTimeout(tick, 25);
      })();
    });
  }

  function say(id, options) {
    options = options || {};
    if (options.queue) {
      var gen = speechGen;
      var p = speechChain.then(function () { return gen === speechGen ? playSpeech(id, gen) : null; });
      speechChain = p;
      return tracked(p);
    }
    stopSpeech();
    var g = speechGen;
    var q = playSpeech(id, g);
    speechChain = q;
    return tracked(q);
  }

  function sayAll(ids) {
    stopSpeech();
    var gen = speechGen;
    var p = (ids || []).reduce(function (chain, id) {
      return chain.then(function () { return gen === speechGen ? playSpeech(id, gen) : null; });
    }, Promise.resolve());
    speechChain = p;
    return tracked(p);
  }

  // ---------------------------------------------------------------- letter sounds

  function stopLetters(fade) {
    letterVoices.slice().forEach(function (v) { v.stop(fade == null ? 0.015 : fade); });
  }

  function soundBuffer(grapheme) {
    return soundEntry(grapheme).then(function (entry) {
      if (!entry) return { entry: null, buffer: null };
      return load(opts.phonics + entry.file).then(function (b) { return { entry: entry, buffer: b }; });
    });
  }

  function sound(grapheme, options) {
    options = options || {};
    return soundBuffer(grapheme).then(function (r) {
      if (!r.buffer || !ctx) {
        warnMissing(r.entry ? r.entry.id : 'snd-' + grapheme);
        return wait(300);
      }
      if (!options.overlap) stopLetters();
      return playBuffer(r.buffer, letterVoices).promise;
    });
  }

  /* Find a loop window in the steady middle of a long sound, cut at matching upward zero crossings. */
  function loopWindow(buffer) {
    if (loops.has(buffer)) return loops.get(buffer);
    var data = buffer.getChannelData(0);
    var sr = buffer.sampleRate;
    var hop = Math.round(sr * 0.01);
    var rms = [];
    var max = 0;
    for (var i = 0; i + hop <= data.length; i += hop) {
      var s = 0;
      for (var j = i; j < i + hop; j++) s += data[j] * data[j];
      s = Math.sqrt(s / hop);
      rms.push(s);
      if (s > max) max = s;
    }
    var first = -1, last = -1;
    for (var k = 0; k < rms.length; k++) {
      if (rms[k] >= max * 0.5) { if (first < 0) first = k; last = k; }
    }
    if (first < 0) { first = 0; last = rms.length - 1; }
    var len = last - first + 1;
    var a = (first + len * 0.25) * hop;
    var b = (first + len * 0.75) * hop;
    if (b - a < sr * 0.03) { a = first * hop; b = (last + 1) * hop; }

    function upCrossing(from, limit) {
      for (var n = Math.max(1, Math.floor(from)); n < limit && n < data.length; n++) {
        if (data[n - 1] < 0 && data[n] >= 0) return n;
      }
      return Math.floor(from);
    }
    var start = upCrossing(a, a + sr * 0.01);
    // Pick the end crossing whose next 3 ms look most like the start: no click, steady pitch.
    var win = Math.round(sr * 0.003);
    var best = Math.floor(b), bestScore = -Infinity;
    for (var m = Math.floor(b - sr * 0.008); m < b + sr * 0.008 && m + win < data.length; m++) {
      if (m <= start + win || !(data[m - 1] < 0 && data[m] >= 0)) continue;
      var dot = 0, e1 = 0, e2 = 0;
      for (var w = 0; w < win; w++) {
        dot += data[start + w] * data[m + w];
        e1 += data[start + w] * data[start + w];
        e2 += data[m + w] * data[m + w];
      }
      var score = dot / Math.sqrt(e1 * e2 + 1e-12);
      if (score > bestScore) { bestScore = score; best = m; }
    }
    var result = { start: start / sr, end: Math.max(best, start + win) / sr };
    loops.set(buffer, result);
    return result;
  }

  function hold(grapheme) {
    var stopped = false;
    var voice = null;
    var resolveDone;
    var handle = {
      done: new Promise(function (r) { resolveDone = r; }),
      stop: function () {
        if (stopped) return;
        stopped = true;
        if (voice) voice.stop(0.04);
        resolveDone();
      }
    };
    soundBuffer(grapheme).then(function (r) {
      if (stopped) return;
      if (!r.buffer || !ctx) {
        warnMissing(r.entry ? r.entry.id : 'snd-' + grapheme);
        return;
      }
      stopLetters();
      var sustain = !!(r.entry && r.entry.sustain);
      voice = playBuffer(r.buffer, letterVoices, sustain ? { loop: loopWindow(r.buffer) } : null);
      voice.promise.then(function () { if (!sustain) handle.stop(); });
    });
    return handle;
  }

  // ---------------------------------------------------------------- synthesized effects

  var noiseBuffer = null;
  function noise() {
    if (!noiseBuffer) {
      noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      var d = noiseBuffer.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    return noiseBuffer;
  }

  function sfxOut(voiceList, total) {
    var out = ctx.createGain();
    out.gain.value = 1;
    out.connect(master);
    var voice = { stop: null };
    var p = new Promise(function (resolve) {
      var t = setTimeout(end, total * 1000 + 60);
      function end() {
        clearTimeout(t);
        removeFrom(voiceList, voice);
        setTimeout(function () { try { out.disconnect(); } catch (e) { /* gone */ } }, 100);
        resolve();
      }
      voice.stop = function () {
        var now = ctx.currentTime;
        out.gain.cancelScheduledValues(now);
        out.gain.setValueAtTime(out.gain.value, now);
        out.gain.linearRampToValueAtTime(0, now + 0.03);
        end();
      };
    });
    voiceList.push(voice);
    return { out: out, promise: p };
  }

  function tone(out, type, f0, f1, t0, dur, peak, attack) {
    var o = ctx.createOscillator();
    var g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t0);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    attack = attack || 0.01;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(peak, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g);
    g.connect(out);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
    return o;
  }

  function hiss(out, filterType, f0, f1, q, t0, dur, peak) {
    var s = ctx.createBufferSource();
    s.buffer = noise();
    s.loop = true;
    var f = ctx.createBiquadFilter();
    f.type = filterType;
    f.Q.value = q;
    f.frequency.setValueAtTime(f0, t0);
    f.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(peak, t0 + Math.min(0.05, dur / 3));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f); f.connect(g); g.connect(out);
    s.start(t0, Math.random() * 0.5);
    s.stop(t0 + dur + 0.05);
  }

  var EFFECTS = {
    pop: function (o, t) { tone(o, 'sine', 700, 180, t, 0.12, 0.35, 0.004); return 0.15; },
    chime: function (o, t) {
      tone(o, 'sine', 1046.5, 0, t, 1.2, 0.22, 0.005);
      tone(o, 'sine', 1568, 0, t + 0.002, 0.9, 0.1, 0.005);
      tone(o, 'sine', 2093, 0, t + 0.004, 0.6, 0.05, 0.005);
      return 1.2;
    },
    sparkle: function (o, t) {
      var notes = [2093, 2637, 3136, 2349, 3520, 2794];
      for (var i = 0; i < notes.length; i++) tone(o, 'sine', notes[i], 0, t + i * 0.055, 0.35, 0.08, 0.004);
      return 0.65;
    },
    whoosh: function (o, t) { hiss(o, 'bandpass', 300, 2400, 1.2, t, 0.55, 0.35); return 0.6; },
    'soft-no': function (o, t) {
      tone(o, 'triangle', 392, 0, t, 0.22, 0.14, 0.02);
      tone(o, 'triangle', 330, 0, t + 0.2, 0.32, 0.14, 0.02);
      return 0.55;
    },
    fanfare: function (o, t) {
      var n = [523.25, 659.25, 783.99, 1046.5];
      for (var i = 0; i < 3; i++) tone(o, 'triangle', n[i], 0, t + i * 0.13, 0.25, 0.16, 0.01);
      tone(o, 'triangle', n[3], 0, t + 0.39, 0.8, 0.18, 0.01);
      tone(o, 'sine', n[3] * 2, 0, t + 0.39, 0.6, 0.05, 0.01);
      return 1.2;
    },
    splash: function (o, t) {
      hiss(o, 'lowpass', 3000, 300, 0.7, t, 0.5, 0.3);
      for (var i = 0; i < 4; i++) tone(o, 'sine', 500 + Math.random() * 500, 1200, t + 0.12 + i * 0.07, 0.08, 0.06, 0.003);
      return 0.6;
    },
    munch: function (o, t) {
      for (var i = 0; i < 3; i++) hiss(o, 'lowpass', 900, 300, 0.8, t + i * 0.16, 0.09, 0.4);
      return 0.5;
    },
    tick: function (o, t) { tone(o, 'sine', 1600, 1200, t, 0.04, 0.12, 0.002); return 0.06; },
    magic: function (o, t) {
      var osc = tone(o, 'sine', 400, 1600, t, 0.9, 0.12, 0.05);
      var lfo = ctx.createOscillator();
      var depth = ctx.createGain();
      lfo.frequency.value = 9;
      depth.gain.value = 18;
      lfo.connect(depth); depth.connect(osc.frequency);
      lfo.start(t); lfo.stop(t + 1);
      EFFECTS.sparkle(o, t + 0.5);
      return 1.2;
    },
    hatch: function (o, t) {
      hiss(o, 'highpass', 2500, 1800, 0.7, t, 0.05, 0.35);
      hiss(o, 'highpass', 2200, 1600, 0.7, t + 0.12, 0.06, 0.35);
      tone(o, 'sine', 600, 200, t + 0.3, 0.12, 0.3, 0.004);
      EFFECTS.sparkle(o, t + 0.4);
      return 1.05;
    }
  };

  function sfx(name) {
    ensureContext();
    if (!ctx) return Promise.resolve();
    var fx = EFFECTS[name];
    if (!fx) {
      console.warn('[audio] unknown sfx ' + name);
      return Promise.resolve();
    }
    resumeIfNeeded();
    var t = ctx.currentTime + 0.01;
    var holder = { out: ctx.createGain() };
    holder.out.connect(master);
    var total = fx(holder.out, t);
    var s = sfxOut(sfxVoices, total);
    holder.out.disconnect();
    holder.out.connect(s.out);
    return s.promise;
  }

  // ---------------------------------------------------------------- public API

  var EmmaAudio = {
    init: function (o) {
      o = o || {};
      if (o.base != null) opts.base = o.base;
      if (o.phonics != null) opts.phonics = o.phonics;
      manifestPromise = null;
      ensureContext();
      return EmmaAudio;
    },

    unlock: function () {
      ensureContext();
      if (!ctx) return Promise.resolve();
      try {
        if (navigator.audioSession) navigator.audioSession.type = 'playback'; // play even with the iPhone/iPad silent switch on
      } catch (e) { /* not supported */ }
      try {
        var b = ctx.createBuffer(1, 1, 22050);
        var s = ctx.createBufferSource();
        s.buffer = b;
        s.connect(ctx.destination);
        s.start(0);
      } catch (e) { /* ignore */ }
      var p;
      try { p = ctx.resume(); } catch (e) { p = null; }
      return Promise.resolve(p).catch(function () {});
    },

    preload: function (ids) {
      return Promise.all((ids || []).map(function (id) {
        return loadClip(id).then(function (b) { if (!b) warnMissing(id); return b ? null : id; });
      })).then(function (r) { return r.filter(Boolean); });
    },

    preloadSounds: function (graphemes) {
      return phonicsIndex().then(function (idx) {
        var list = graphemes || Object.keys(idx.sounds || {});
        return Promise.all(list.map(function (g) {
          return soundBuffer(g).then(function (r) {
            if (!r.buffer) { warnMissing(r.entry ? r.entry.id : 'snd-' + g); return g; }
            if (r.entry && r.entry.sustain) loopWindow(r.buffer);
            return null;
          });
        }));
      }).then(function (r) { return r.filter(Boolean); });
    },

    say: say,
    sayAll: sayAll,
    sound: sound,
    hold: hold,
    sfx: sfx,

    stop: function () {
      stopSpeech();
      stopLetters(0.03);
      sfxVoices.slice().forEach(function (v) { v.stop(); });
    },

    mute: function (on) {
      muted = on === undefined ? true : !!on;
      if (master) {
        var t = ctx.currentTime;
        master.gain.cancelScheduledValues(t);
        master.gain.setValueAtTime(master.gain.value, t);
        master.gain.linearRampToValueAtTime(muted ? 0 : 1, t + 0.05);
      }
      return muted;
    },

    // Additions beyond the contract, used by shared/review.html and shared/test.html.
    playUrl: function (url) {
      return load(url).then(function (b) {
        if (!b || !ctx) { warnMissing(url); return wait(300); }
        stopSpeech();
        return playBuffer(b, speechVoices).promise;
      });
    },
    has: function (id) {
      if (!packs.length) return gameManifest().then(function (m) { return !!(m && m.clips && m.clips[id]); });
      return clipSource(id).then(function (url) { return !!url; });
    },

    // Additions for v3 (Moon Meadow Home). v2 never calls them, so its behaviour is unchanged.
    addPack: function (name, base, o) {
      var entry = { name: name, base: base, manifest: fetchManifest(base + 'manifest.json', !!(o && o.fresh)) };
      for (var i = 0; i < packs.length; i++) {
        if (packs[i].name === name) { packs[i] = entry; return entry.manifest; }
      }
      packs.push(entry);
      return entry.manifest;
    },
    forget: function (ids) {
      (ids || []).forEach(function (id) {
        var url = clipUrls[id] || clipUrl(id);
        delete buffers[url];
        delete clipUrls[id];
      });
    },
    onMissing: function (fn) {
      missingListeners.push(fn);
      return function () { removeFrom(missingListeners, fn); };
    },
    reportMissing: warnMissing,
    phonicsIndex: phonicsIndex,

    missing: missing
  };

  // True from the moment say()/sayAll() is called until its promise resolves (loading included).
  Object.defineProperty(EmmaAudio, 'speaking', { get: function () { return pendingSpeech > 0 || speechVoices.length > 0; } });
  Object.defineProperty(EmmaAudio, 'muted', { get: function () { return muted; } });
  Object.defineProperty(EmmaAudio, 'context', { get: function () { return ctx; } });

  window.EmmaAudio = EmmaAudio;
})();
