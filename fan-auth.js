/**
 * fan-auth.js — Cries Of Redemption
 *
 * Handles:
 *  1. Fan Subscription to Mailing List (via 'subscribers' table).
 *  2. Passwordless Magic Link Authentication (via Supabase Auth signInWithOtp).
 *  3. Custom Fan Playlist ("My Playlist") with Supabase sync and local fallback.
 *  4. Dedicated Fan Playlist Drawer with direct Plyr playback integration.
 */
(function () {
  'use strict';

  // State
  var client = null;
  var currentUser = null;
  var fanPlaylist = []; // Array of song titles

  function initClient() {
    var c = window.SUPABASE_CONFIG;
    if (!c || !c.url || !c.anonKey || !window.supabase) return null;
    try {
      return window.supabase.createClient(c.url, c.anonKey);
    } catch (e) {
      console.warn('[fan-auth] Could not initialize Supabase client:', e);
      return null;
    }
  }

  // ---------------------------------------------------------------- Notifications
  function showNotice(message, isError) {
    var toast = document.getElementById('fan-auth-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'fan-auth-toast';
      toast.className = 'fan-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.className = 'fan-toast is-visible' + (isError ? ' is-error' : ' is-success');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(function () {
      toast.className = 'fan-toast';
    }, 6000);
  }

  // ---------------------------------------------------------------- Storage Helpers
  function getLocalPlaylist(userId) {
    try {
      var raw = localStorage.getItem('cor_playlist_' + (userId || 'guest'));
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function setLocalPlaylist(userId, list) {
    try {
      localStorage.setItem('cor_playlist_' + (userId || 'guest'), JSON.stringify(list));
    } catch (e) {}
  }

  // ---------------------------------------------------------------- Playlist Sync
  async function loadUserPlaylist(user) {
    if (!user) {
      fanPlaylist = [];
      updatePlaylistUI();
      return;
    }

    var localList = getLocalPlaylist(user.id);
    fanPlaylist = localList;

    if (client) {
      try {
        var res = await client
          .from('user_playlists')
          .select('song_titles')
          .eq('user_id', user.id)
          .maybeSingle();

        if (res.data && Array.isArray(res.data.song_titles)) {
          fanPlaylist = res.data.song_titles;
          setLocalPlaylist(user.id, fanPlaylist);
        } else if (localList.length > 0) {
          // If remote empty but local has items, save to remote
          await saveUserPlaylist(user, localList);
        }
      } catch (e) {
        console.info('[fan-auth] Using local playlist fallback:', e.message);
      }
    }

    updatePlaylistUI();
  }

  async function saveUserPlaylist(user, list) {
    fanPlaylist = list;
    if (user) setLocalPlaylist(user.id, list);

    if (client && user) {
      try {
        await client.from('user_playlists').upsert({
          user_id: user.id,
          name: 'My Playlist',
          song_titles: list,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id,name' });
      } catch (e) {
        console.warn('[fan-auth] Remote playlist sync failed:', e.message);
      }
    }

    updatePlaylistUI();
  }

  function toggleSongInPlaylist(songTitle) {
    if (!currentUser) {
      showNotice('Please subscribe with your email to create and save your own playlist!', false);
      var input = document.getElementById('subscribe-email');
      if (input) input.focus();
      return;
    }

    var index = fanPlaylist.indexOf(songTitle);
    var updated = fanPlaylist.slice();
    if (index > -1) {
      updated.splice(index, 1);
      showNotice('Removed "' + songTitle + '" from your playlist.');
    } else {
      updated.push(songTitle);
      showNotice('Added "' + songTitle + '" to your playlist!');
    }

    saveUserPlaylist(currentUser, updated);
  }

  // ---------------------------------------------------------------- UI Updates
  function updatePlaylistUI() {
    var countEl = document.getElementById('playlist-count');
    if (countEl) countEl.textContent = fanPlaylist.length;

    // Update icons on tracklist
    document.querySelectorAll('.song-row').forEach(function (row) {
      var titleEl = row.querySelector('.song-title');
      if (!titleEl) return;
      var title = titleEl.textContent.trim();
      var btn = row.querySelector('.song-playlist-btn');
      if (btn) {
        var isIn = fanPlaylist.indexOf(title) > -1;
        btn.innerHTML = isIn
          ? '<i class="fa-solid fa-bookmark has-text-danger"></i>'
          : '<i class="fa-regular fa-bookmark"></i>';
        btn.title = isIn ? 'Remove from My Playlist' : 'Add to My Playlist';
        btn.setAttribute('aria-label', btn.title);
      }
    });

    renderPlaylistDrawerContent();
  }

  function injectPlaylistButtonsToTracklist() {
    var rows = document.querySelectorAll('.song-row');
    rows.forEach(function (row) {
      if (row.querySelector('.song-playlist-btn')) return;

      var infoBtn = row.querySelector('.song-info-btn');
      var container = infoBtn ? infoBtn.parentElement : null;
      if (!container) return;

      var titleEl = row.querySelector('.song-title');
      var title = titleEl ? titleEl.textContent.trim() : '';

      var btn = document.createElement('button');
      btn.className = 'song-playlist-btn';
      btn.type = 'button';
      var isIn = fanPlaylist.indexOf(title) > -1;
      btn.innerHTML = isIn
        ? '<i class="fa-solid fa-bookmark has-text-danger"></i>'
        : '<i class="fa-regular fa-bookmark"></i>';
      btn.title = isIn ? 'Remove from My Playlist' : 'Add to My Playlist';
      btn.setAttribute('aria-label', btn.title);

      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        toggleSongInPlaylist(title);
      });

      // Insert right before the song duration / info button
      container.insertBefore(btn, infoBtn);
    });
  }

  function setAuthState(user) {
    currentUser = user;
    var subForm = document.getElementById('subscribe-form');
    var fanBar = document.getElementById('fan-logged-in-bar');
    var greeting = document.getElementById('fan-greeting');

    if (user) {
      if (subForm) subForm.classList.add('is-hidden');
      if (fanBar) fanBar.classList.remove('is-hidden');
      if (greeting) {
        var name = (user.email || '').split('@')[0];
        greeting.textContent = 'Fan: ' + name;
        greeting.title = user.email || '';
      }
    } else {
      if (subForm) subForm.classList.remove('is-hidden');
      if (fanBar) fanBar.classList.add('is-hidden');
    }

    loadUserPlaylist(user);
    injectPlaylistButtonsToTracklist();
  }

  // ---------------------------------------------------------------- Drawer Modal
  function openPlaylistDrawer() {
    var drawer = document.getElementById('fan-playlist-drawer');
    if (drawer) {
      drawer.classList.add('is-active');
      document.body.style.overflow = 'hidden';
      renderPlaylistDrawerContent();
    }
  }

  function closePlaylistDrawer() {
    var drawer = document.getElementById('fan-playlist-drawer');
    if (drawer) {
      drawer.classList.remove('is-active');
      document.body.style.overflow = '';
    }
  }

  function renderPlaylistDrawerContent() {
    var listContainer = document.getElementById('fan-playlist-items');
    if (!listContainer) return;

    if (!fanPlaylist || fanPlaylist.length === 0) {
      listContainer.innerHTML = [
        '<div class="has-text-centered py-6">',
        '  <i class="fa-solid fa-music is-size-1 has-text-grey-dark mb-3"></i>',
        '  <p class="has-text-grey-light is-size-6 mb-2">Your playlist is currently empty.</p>',
        '  <p class="has-text-grey is-size-7">Click the bookmark icon <i class="fa-regular fa-bookmark"></i> on any song in the tracklist to build your custom collection!</p>',
        '</div>'
      ].join('');
      return;
    }

    listContainer.innerHTML = '';
    fanPlaylist.forEach(function (songTitle, idx) {
      var item = document.createElement('div');
      item.className = 'box has-background-black-ter custom-border p-3 mb-2 is-flex is-align-items-center is-justify-content-space-between';
      item.innerHTML = [
        '<div class="is-flex is-align-items-center" style="gap: 12px; overflow: hidden;">',
        '  <span class="has-text-grey is-size-7">' + (idx + 1) + '</span>',
        '  <span class="has-text-white is-size-6 has-text-weight-medium text-truncate">' + songTitle + '</span>',
        '</div>',
        '<div class="is-flex is-align-items-center" style="gap: 8px; flex-shrink: 0;">',
        '  <button class="button is-small is-dark custom-border btn-play-fan-song" title="Play track">',
        '    <i class="fa-solid fa-play"></i>',
        '  </button>',
        '  <button class="button is-small is-text has-text-grey btn-remove-fan-song" title="Remove track">',
        '    <i class="fa-solid fa-trash-can"></i>',
        '  </button>',
        '</div>'
      ].join('');

      item.querySelector('.btn-play-fan-song').addEventListener('click', function () {
        playTrackByTitle(songTitle);
        closePlaylistDrawer();
      });

      item.querySelector('.btn-remove-fan-song').addEventListener('click', function () {
        toggleSongInPlaylist(songTitle);
      });

      listContainer.appendChild(item);
    });
  }

  function playTrackByTitle(title) {
    var allRows = document.querySelectorAll('.song-row');
    for (var i = 0; i < allRows.length; i++) {
      var row = allRows[i];
      var titleEl = row.querySelector('.song-title');
      if (titleEl && titleEl.textContent.trim().toLowerCase() === title.trim().toLowerCase()) {
        row.click();
        return;
      }
    }
  }

  function playAllPlaylist() {
    if (!fanPlaylist || fanPlaylist.length === 0) return;
    playTrackByTitle(fanPlaylist[0]);
    closePlaylistDrawer();
  }

  // ---------------------------------------------------------------- Subscribe Submit
  async function handleSubscribeSubmit(e) {
    e.preventDefault();
    var emailInput = document.getElementById('subscribe-email');
    var btn = document.getElementById('subscribe-btn');
    if (!emailInput) return;

    var email = (emailInput.value || '').trim();
    if (!email || !email.includes('@')) {
      showNotice('Please enter a valid email address.', true);
      return;
    }

    if (!client) {
      showNotice('Subscription service is temporarily unreachable. Please try again shortly.', true);
      return;
    }

    var origText = btn ? btn.innerHTML : 'Subscribe';
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    }

    try {
      // 1. Insert into subscribers table (mailing list)
      try {
        await client.from('subscribers').insert([{ email: email, source: 'navbar_subscribe' }]);
      } catch (subErr) {
        // Table might not exist yet or email already subscribed; proceed to magic link
        console.info('[fan-auth] Subscribers table note:', subErr.message);
      }

      // 2. Send Magic Link / OTP via Supabase Auth
      var redirectUrl = window.location.origin + window.location.pathname;
      var authRes = await client.auth.signInWithOtp({
        email: email,
        options: {
          emailRedirectTo: redirectUrl
        }
      });

      if (authRes.error) {
        throw authRes.error;
      }

      emailInput.value = '';
      showNotice('Magic link sent to ' + email + '! Check your inbox to sign in and save your personal playlist.', false);
    } catch (err) {
      console.error('[fan-auth] Subscribe error:', err);
      showNotice(err.message || 'Could not send magic link. Please check your email and try again.', true);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = origText;
      }
    }
  }

  // ---------------------------------------------------------------- Initialize
  function setup() {
    client = initClient();

    // Form submit listener
    var form = document.getElementById('subscribe-form');
    if (form) form.addEventListener('submit', handleSubscribeSubmit);

    // Sign out listener
    var signoutBtn = document.getElementById('fan-signout-btn');
    if (signoutBtn) {
      signoutBtn.addEventListener('click', async function () {
        if (client) await client.auth.signOut();
        setAuthState(null);
        showNotice('Signed out successfully.');
      });
    }

    // Playlist Drawer open/close
    var openBtn = document.getElementById('btn-open-playlist');
    if (openBtn) openBtn.addEventListener('click', openPlaylistDrawer);

    var closeBtn = document.getElementById('fan-playlist-close');
    if (closeBtn) closeBtn.addEventListener('click', closePlaylistDrawer);

    var drawerOverlay = document.getElementById('fan-playlist-drawer');
    if (drawerOverlay) {
      drawerOverlay.addEventListener('click', function (e) {
        if (e.target === drawerOverlay) closePlaylistDrawer();
      });
    }

    var playAllBtn = document.getElementById('btn-play-all-playlist');
    if (playAllBtn) playAllBtn.addEventListener('click', playAllPlaylist);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && drawerOverlay && drawerOverlay.classList.contains('is-active')) {
        closePlaylistDrawer();
      }
    });

    // Observer to re-inject playlist bookmark icons whenever songs are loaded/rendered
    var songList = document.getElementById('song-list');
    if (songList && window.MutationObserver) {
      var observer = new MutationObserver(function () {
        injectPlaylistButtonsToTracklist();
        updatePlaylistUI();
      });
      observer.observe(songList, { childList: true });
    }

    // Auth state detection
    if (client) {
      client.auth.getSession().then(function (res) {
        var session = res.data && res.data.session;
        setAuthState(session ? session.user : null);
      });

      client.auth.onAuthStateChange(function (event, session) {
        setAuthState(session ? session.user : null);
        if (event === 'SIGNED_IN') {
          showNotice('Welcome back! Your personal playlist is ready.', false);
        }
      });
    } else {
      setAuthState(null);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setup);
  } else {
    setup();
  }
})();
