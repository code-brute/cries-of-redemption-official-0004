/**
 * data-source.js — Cries Of Redemption
 *
 * Reads site content from Supabase and converts it into EXACTLY the same shape as
 * the local JSON files (band-data.json, videos-data.json, press-data.json,
 * blog-data.json), so player.js renders it without any other changes.
 *
 * Safety rules (the public site must never break):
 *  1. Any Supabase problem (not configured, kill switch off, network error, HTTP error,
 *     timeout, paused project, bad response) -> the local JSON file is used instead.
 *  2. An EMPTY table is treated as "no data" -> the local JSON is used for that section.
 *  3. Rows missing required values (e.g. a song without a title or audio file) are skipped.
 *  4. load() only rejects if BOTH Supabase and the local JSON file fail, which is the
 *     same situation in which the original fetch() code would have failed.
 */
(function () {
  'use strict';

  var TIMEOUT_MS = 2500;
  var lastSource = {};

  // ---------------------------------------------------------------- helpers
  function getConfig(ignoreKillSwitch) {
    var c = window.SUPABASE_CONFIG;
    if (!c || (c.enabled === false && !ignoreKillSwitch)) return null;
    var url = String(c.url || '').trim().replace(/\/+$/, '').replace(/\/rest\/v1$/i, '');
    var key = String(c.anonKey || '').trim();
    if (!/^https:\/\/\S+$/i.test(url) || !key) return null;
    return { url: url, key: key };
  }

  function text(v) {
    return v === null || v === undefined ? '' : String(v).trim();
  }

  function has(v) {
    return text(v) !== '';
  }

  function fetchJSON(url, options) {
    return fetch(url, options).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status + ' for ' + url);
      return res.json();
    });
  }

  function withTimeout(promise, ms, label) {
    var timer;
    var timeout = new Promise(function (_, reject) {
      timer = setTimeout(function () {
        reject(new Error(label + ' timed out after ' + ms + ' ms'));
      }, ms);
    });
    return Promise.race([promise, timeout]).then(
      function (v) { clearTimeout(timer); return v; },
      function (e) { clearTimeout(timer); throw e; }
    );
  }

  function selectRows(config, table, query) {
    var url = config.url + '/rest/v1/' + table + '?' +
      (query || 'select=*&order=sort_order.asc,id.asc');
    var request = fetchJSON(url, {
      headers: { apikey: config.key, Authorization: 'Bearer ' + config.key }
    });
    return withTimeout(request, TIMEOUT_MS, table).then(function (rows) {
      if (!Array.isArray(rows)) throw new Error(table + ': unexpected response');
      return rows.filter(function (r) { return r && typeof r === 'object'; });
    });
  }

  function orNull(promise) {
    return promise.catch(function () { return null; });
  }

  function paragraphs(content) {
    var list = Array.isArray(content) ? content : text(content).split(/\n\s*\n/);
    return list.map(text).filter(Boolean);
  }

  // ------------------------------------------------- Supabase -> JSON shapes
  // fetch(config)      -> raw rows from Supabase (may reject)
  // build(raw, local)  -> { data, detail } in the local JSON shape, or throws if unusable
  var sources = {
    'band-data.json': {
      fetch: function (config) {
        return Promise.all([
          orNull(selectRows(config, 'band_profile', 'select=*&order=id.asc&limit=1')),
          orNull(selectRows(config, 'albums')),
          orNull(selectRows(config, 'songs')),
          orNull(selectRows(config, 'photos'))
        ]);
      },
      build: function (raw, local) {
        var profile = raw[0] && raw[0][0];
        var album = raw[1] && raw[1][0];
        var out = local ? JSON.parse(JSON.stringify(local)) : {};
        var used = [];

        var localSongs = (local && Array.isArray(local.songs)) ? local.songs : [];
        var songs = (raw[2] || [])
          .filter(function (s) { return s.is_active !== false && has(s.title) && has(s.file_url); })
          .map(function (s, index) {
            var localMatch = localSongs.find(function (ls) {
              return ls && ls.title && ls.title.trim().toLowerCase() === String(s.title).trim().toLowerCase();
            }) || localSongs[index];
            return {
              title: text(s.title),
              duration: text(s.duration),
              file: text(s.file_url),
              artwork: text(s.artwork_url) || (localMatch && text(localMatch.artwork)) || '',
              lyrics: text(s.lyrics) || (localMatch && text(localMatch.lyrics)) || '',
              composers: text(s.composers) || (localMatch && text(localMatch.composers)) || '',
              collaborators: text(s.collaborators) || (localMatch && text(localMatch.collaborators)) || ''
            };
          });

        var photos = (raw[3] || [])
          .filter(function (p) { return has(p.image_url); })
          .map(function (p) { return text(p.image_url); });

        if (profile) {
          if (has(profile.band_name)) out.bandName = text(profile.band_name);
          if (has(profile.tagline)) out.tagline = text(profile.tagline);
          if (has(profile.location)) out.location = text(profile.location);
          if (has(profile.bio)) out.bio = text(profile.bio);
          if (has(profile.avatar_url)) out.avatar = text(profile.avatar_url);
          used.push('profile');
        }
        if (album && has(album.title)) {
          out.album = {
            title: text(album.title),
            subtitle: text(album.subtitle),
            cover: has(album.cover_url) ? text(album.cover_url) : ((out.album && out.album.cover) || '')
          };
          used.push('album');
        }
        if (songs.length) { out.songs = songs; used.push(songs.length + ' songs'); }
        if (photos.length) { out.photos = photos; used.push(photos.length + ' photos'); }

        if (!used.length) throw new Error('no usable rows');

        // Guarantee every field player.js reads exists.
        out.tagline = text(out.tagline);
        out.location = text(out.location);
        out.bio = text(out.bio);
        if (!out.album || !Array.isArray(out.songs) || !Array.isArray(out.photos)) {
          throw new Error('incomplete data and no local file to fill the gaps');
        }
        return { data: out, detail: used.join(', ') };
      }
    },

    'videos-data.json': {
      fetch: function (config) { return selectRows(config, 'videos'); },
      build: function (rows) {
        var list = rows
          .filter(function (v) { return has(v.youtube_id); })
          .map(function (v) { return { id: text(v.youtube_id), title: text(v.title) }; });
        if (!list.length) throw new Error('videos table is empty');
        return { data: list, detail: list.length + ' videos' };
      }
    },

    'press-data.json': {
      fetch: function (config) { return selectRows(config, 'press_articles'); },
      build: function (rows) {
        var list = rows
          .filter(function (p) { return has(p.headline) && has(p.publication); })
          .map(function (p) {
            return {
              publication: text(p.publication),
              writer: text(p.writer),
              date: text(p.date),
              headline: text(p.headline),
              url: text(p.url)
            };
          });
        if (!list.length) throw new Error('press_articles table is empty');
        return { data: list, detail: list.length + ' articles' };
      }
    },

    'blog-data.json': {
      fetch: function (config) { return selectRows(config, 'blog_posts'); },
      build: function (rows) {
        var list = rows
          .filter(function (b) { return has(b.title); })
          .map(function (b) {
            var post = { title: text(b.title), date: text(b.date), content: paragraphs(b.content) };
            if (has(b.image_url)) post.image = text(b.image_url);
            return post;
          })
          .filter(function (b) { return b.content.length > 0; });
        if (!list.length) throw new Error('blog_posts table is empty');
        return { data: list, detail: list.length + ' posts' };
      }
    }
  };

  // ------------------------------------------------------------- public API
  function load(file) {
    var localP = fetchJSON(file).then(
      function (data) { return { ok: true, data: data }; },
      function (error) { return { ok: false, error: error }; }
    );
    var config = getConfig(false);
    var source = sources[file];

    if (!config || !source) {
      return localP.then(function (local) {
        lastSource[file] = 'local';
        if (!local.ok) throw local.error;
        return local.data;
      });
    }

    // Start Supabase and the local file at the same time.
    var rawP = source.fetch(config).then(
      function (raw) { return { ok: true, raw: raw }; },
      function (error) { return { ok: false, error: error }; }
    );

    return Promise.all([localP, rawP]).then(function (results) {
      var local = results[0];
      var remote = results[1];
      try {
        if (!remote.ok) throw remote.error;
        var built = source.build(remote.raw, local.ok ? local.data : null);
        lastSource[file] = 'supabase';
        console.info('[CORData] ' + file + ': Supabase (' + built.detail + ')');
        return built.data;
      } catch (err) {
        lastSource[file] = 'local';
        console.info('[CORData] ' + file + ': local JSON (' + (err && err.message) + ')');
        if (!local.ok) throw local.error;
        return local.data;
      }
    });
  }

  window.CORData = {
    load: load,
    getConfig: getConfig,
    lastSource: lastSource
  };
})();

