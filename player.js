// Loads site data from Supabase (via data-source.js) and falls back to the local JSON file.
// If data-source.js is missing, this behaves exactly like the original fetch(file).then(res => res.json()).
function loadSiteData(file) {
  if (window.CORData && typeof window.CORData.load === 'function') {
    return window.CORData.load(file);
  }
  return fetch(file).then(res => res.json());
}

loadSiteData('band-data.json')
  .then(data => {
    // Populate Bio & Header Text
    document.getElementById('band-tagline').textContent = data.tagline;
    document.getElementById('band-location').textContent = data.location;
    document.getElementById('band-bio').textContent = data.bio;

    // Populate Albums (Supporting multiple albums & tracklist filtering)
    const albumGrid = document.getElementById('album-grid');
    const albumsList = (data.albums && data.albums.length > 0) ? data.albums : (data.album ? [data.album] : []);
    let currentSelectedAlbumId = null;

    function filterSongsByAlbum(albumId) {
      currentSelectedAlbumId = albumId;
      const songRows = document.querySelectorAll('.song-row');
      let visibleCount = 0;

      data.songs.forEach((song, idx) => {
        const row = songRows[idx];
        if (!row) return;
        const songAlbum = song.album_id || 1;
        const matches = !albumId || Number(songAlbum) === Number(albumId);
        if (matches) {
          row.style.display = 'flex';
          visibleCount++;
        } else {
          row.style.display = 'none';
        }
      });

      if (albumGrid) {
        albumGrid.querySelectorAll('.album-box-card').forEach(card => {
          if (card.dataset.albumId && Number(card.dataset.albumId) === Number(albumId)) {
            card.classList.add('is-active-album');
          } else {
            card.classList.remove('is-active-album');
          }
        });
      }

      let banner = document.getElementById('album-filter-banner');
      if (albumId) {
        const albumObj = albumsList.find(a => Number(a.id || 1) === Number(albumId));
        const albumTitle = albumObj ? albumObj.title : 'Selected Album';
        if (!banner) {
          banner = document.createElement('div');
          banner.id = 'album-filter-banner';
          banner.className = 'box has-background-black-bis custom-border is-flex is-justify-content-space-between is-align-items-center mb-4 py-2 px-3';
          const songListEl = document.getElementById('song-list');
          if (songListEl) songListEl.parentNode.insertBefore(banner, songListEl);
        }
        banner.innerHTML = [
          '<span class="is-size-7 has-text-grey-light">Showing album: <strong class="has-text-white">' + albumTitle + '</strong> (' + visibleCount + ' tracks)</span>',
          '<button id="btn-clear-album-filter" class="button is-small is-dark custom-border" style="font-size:0.75rem;">Show All Tracks</button>'
        ].join('');
        banner.style.display = 'flex';
        document.getElementById('btn-clear-album-filter').addEventListener('click', () => filterSongsByAlbum(null));
      } else if (banner) {
        banner.style.display = 'none';
      }
    }

    if (albumGrid && albumsList.length > 0) {
      albumGrid.innerHTML = '';
      albumsList.forEach((album, aIdx) => {
        const col = document.createElement('div');
        col.className = albumsList.length === 1 ? 'column is-12' : 'column is-half-tablet is-one-third-desktop';
        const albId = album.id || (aIdx + 1);
        col.innerHTML = [
          '<div class="box is-flex is-align-items-center has-background-black-bis custom-border album-box-card h-100" data-album-id="' + albId + '" title="Click to view album tracks" style="gap: 16px;">',
          '  <figure class="image is-96x96 m-0" style="flex-shrink: 0;">',
          '    <img',
          '      src="' + (album.cover || album.cover_url || 'assets/images/album-cover.jpg') + '"',
          '      alt="' + album.title + '"',
          '      class="is-rounded"',
          '      style="object-fit: cover; width: 96px; height: 96px;"',
          '    />',
          '  </figure>',
          '  <div>',
          '    <div class="title is-6 mb-1 has-text-white">' + album.title + '</div>',
          '    <div class="subtitle is-7 has-text-grey mb-1">' + (album.subtitle || '') + '</div>',
          album.year ? '    <span class="tag is-dark is-small custom-border">' + album.year + '</span>' : '',
          '  </div>',
          '</div>'
        ].filter(Boolean).join('\n');

        const card = col.querySelector('.album-box-card');
        card.addEventListener('click', () => {
          if (currentSelectedAlbumId === Number(albId)) {
            filterSongsByAlbum(null);
          } else {
            filterSongsByAlbum(Number(albId));
            const songListEl = document.getElementById('song-list');
            if (songListEl) songListEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        });

        albumGrid.appendChild(col);
      });
    } else if (data.album) {
      const coverEl = document.getElementById('album-cover');
      const titleEl = document.getElementById('album-title');
      const subEl = document.getElementById('album-subtitle');
      if (coverEl) coverEl.src = data.album.cover || 'assets/images/album-cover.jpg';
      if (titleEl) titleEl.textContent = data.album.title || '';
      if (subEl) subEl.textContent = data.album.subtitle || '';
    }

    // Populate Photos
    const photoContainer = document.getElementById('photo-grid');
    data.photos.forEach(src => {
      const img = document.createElement('img');
      img.src = src;
      img.className = 'photo-thumb';
      photoContainer.appendChild(img);
    });

    // Populate Songs & Audio Player
    const songContainer = document.getElementById('song-list');
    const audio = document.getElementById('audio-player');
    const nowPlaying = document.getElementById('now-playing-title');

    // Drawer elements & Song Details logic
    let currentActiveSong = (data.songs && data.songs[0]) || null;
    const drawer = document.getElementById('song-details-drawer');
    const drawerCloseBtn = document.getElementById('song-details-close');
    const drawerArtwork = document.getElementById('drawer-artwork');
    const drawerTitle = document.getElementById('drawer-title');
    const drawerComposers = document.getElementById('drawer-composers');
    const drawerCollaborators = document.getElementById('drawer-collaborators');
    const drawerLyrics = document.getElementById('drawer-lyrics');

    function openSongDetails(song) {
      if (!song || !drawer) return;
      if (drawerArtwork) {
        drawerArtwork.src = song.artwork || (data.album && data.album.cover) || 'assets/images/album-cover.jpg';
      }
      if (drawerTitle) {
        drawerTitle.textContent = song.title;
      }
      if (drawerComposers) {
        drawerComposers.textContent = song.composers || 'Ed Silva';
      }
      if (drawerCollaborators) {
        drawerCollaborators.textContent = song.collaborators || '—';
      }
      if (drawerLyrics) {
        drawerLyrics.textContent = song.lyrics || 'Lyrics currently unavailable for this track.';
      }
      drawer.classList.add('is-active');
      document.body.style.overflow = 'hidden';
    }

    function closeSongDetails() {
      if (!drawer) return;
      drawer.classList.remove('is-active');
      document.body.style.overflow = '';
    }

    if (drawerCloseBtn) {
      drawerCloseBtn.addEventListener('click', closeSongDetails);
    }
    if (drawer) {
      drawer.addEventListener('click', (e) => {
        if (e.target === drawer) closeSongDetails();
      });
    }
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && drawer && drawer.classList.contains('is-active')) {
        closeSongDetails();
      }
    });

    const playerBarInfoBtn = document.getElementById('btn-current-song-info');
    if (playerBarInfoBtn) {
      playerBarInfoBtn.addEventListener('click', () => {
        if (currentActiveSong) {
          openSongDetails(currentActiveSong);
        } else if (data.songs && data.songs.length > 0) {
          openSongDetails(data.songs[0]);
        }
      });
    }

    data.songs.forEach((song, index) => {
      const row = document.createElement('div');
      row.className = 'song-row';
      
      row.innerHTML = [
        '<div class="song-info">',
        '  <div class="track-index-container">',
        '    <span class="track-number">' + (index + 1) + '</span>',
        '    <i class="fa-solid fa-play play-icon"></i>',
        '  </div>',
        '  <span class="song-title">' + song.title + '</span>',
        '</div>',
        '<div class="is-flex is-align-items-center" style="gap: 12px;">',
        '  <button class="song-info-btn" title="View credits & lyrics" aria-label="View credits and lyrics for ' + song.title + '">',
        '    <i class="fa-solid fa-file-lines"></i>',
        '  </button>',
        '  <span class="song-duration">' + song.duration + '</span>',
        '</div>'
      ].join('');

      const infoBtn = row.querySelector('.song-info-btn');
      if (infoBtn) {
        infoBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          openSongDetails(song);
        });
      }

      row.addEventListener('click', () => {
        currentActiveSong = song;
        document.querySelectorAll('.song-row').forEach(r => r.classList.remove('active'));
        row.classList.add('active');
        nowPlaying.textContent = 'Playing: ' + song.title;
        if (window.plyrPlayer) {
          window.plyrPlayer.source = {
            type: 'audio',
            title: song.title,
            sources: [{ src: song.file }]
          };
          window.plyrPlayer.play();
        } else {
          audio.src = song.file;
          audio.play();
        }
      });

      songContainer.appendChild(row);
    });
    })
  .catch(err => console.error("Error loading band data:", err));

/* // --- Single Page App Navigation Logic ---
const navLinks = document.querySelectorAll('.nav-trigger');
const views = document.querySelectorAll('.view-section');

navLinks.forEach(link => {
  link.addEventListener('click', function(e) {
    // Prevent the default HTML anchor jump which causes the overlap
    e.preventDefault(); 
    
    // 1. Hide all views
    views.forEach(view => view.classList.add('is-hidden'));
    
    // 2. Find and show the target view
    const targetId = this.getAttribute('href').substring(1);
    const targetView = document.getElementById(targetId);
    if (targetView) {
      targetView.classList.remove('is-hidden');
    }
    
    // 3. Reset scroll position cleanly to the top
    window.scrollTo(0, 0);
  });
}); */

// --- Single Page App Navigation Logic ---
const navLinks = document.querySelectorAll('.nav-trigger');
const views = document.querySelectorAll('.view-section');

// 1. Create a reusable function to swap the views
function switchView(targetId) {
  views.forEach(view => view.classList.add('is-hidden'));
  const targetView = document.getElementById(targetId);
  if (targetView) {
    targetView.classList.remove('is-hidden');
  }
  window.scrollTo(0, 0);
}

// 2. Handle Navigation Clicks
navLinks.forEach(link => {
  link.addEventListener('click', function(e) {
    e.preventDefault(); 
    
    const targetHref = this.getAttribute('href');
    const targetId = targetHref.substring(1);
    
    // Push the new #hash to the URL bar silently
    history.pushState(null, null, targetHref);
    
    switchView(targetId);
  });
});

// 3. Handle Initial Page Load (Direct Links)
// If a fan clicks a shared link like criesofredemptionmusic.com/#press, this catches it
window.addEventListener('DOMContentLoaded', () => {
  if (window.location.hash) {
    const targetId = window.location.hash.substring(1);
    switchView(targetId);
  }
});

/* fetch('press-data.json')
  .then(res => res.json())
  .then(pressArticles => {
    const pressContainer = document.getElementById('press-list');
    
    pressArticles.forEach(article => {
      const pressLink = document.createElement('a');
      pressLink.href = article.url;
      pressLink.target = "_blank";
      pressLink.className = 'box has-background-black-bis custom-border press-article';
      
      // Safely check if a writer exists so we don't print "By undefined"
      const authorText = article.writer ? `By ${article.writer} &bull; ` : '';
      
      // We swapped the hierarchy here: Publication is now the main title, headline is smaller
      pressLink.innerHTML = `
        <h3 class="title is-4 has-text-white mb-2">${article.publication}</h3>
        <p class="is-size-6 has-text-grey-light is-italic mb-3">"${article.headline}"</p>
        <p class="is-size-7 has-text-grey mb-2">${authorText}${article.date}</p>
        <p class="is-size-7 has-text-white-ter mt-2">Read article <i class="fa-solid fa-arrow-right is-size-7 ml-1"></i></p>
      `;
      
      pressContainer.appendChild(pressLink);
    });
  })
  .catch(err => console.error("Error loading press data:", err)); */

  loadSiteData('press-data.json')
  .then(pressArticles => {
    const pressContainer = document.getElementById('press-list');
    
    pressArticles.forEach(article => {
      const pressWrapper = document.createElement('div');
      
      // Formats the writer nicely, but won't break if a writer isn't listed
      const authorText = article.writer ? ` (${article.writer})` : '';
      
      pressWrapper.innerHTML = `
        <div class="press-quote-card">
          <div class="press-quote-text">"${article.headline}"</div>
          <div class="press-attribution">
            &mdash; <span class="press-pub-name">${article.publication}</span> ${authorText} 
            <span class="mx-2">|</span> 
            <a href="${article.url}" target="_blank" class="press-link-text">Read the Full Article &rarr;</a>
          </div>
        </div>
      `;
      
      pressContainer.appendChild(pressWrapper);
    });
  })
  .catch(err => console.error("Error loading press data:", err));

  loadSiteData('videos-data.json')
  .then(videos => {
    const videoContainer = document.getElementById('video-grid');
    
        videos.forEach(video => {
      const col = document.createElement('div');
      col.className = 'column is-one-third-desktop is-half-tablet is-full-mobile';
      
      // Clean video ID (strip query params if present for thumbnail lookup)
      const rawId = (video.id || '').split('?')[0];
      const thumbUrl = `https://img.youtube.com/vi/${rawId}/hqdefault.jpg`;
      
      col.innerHTML = `
        <figure class="image is-16by9 custom-border video-facade-card" title="Click to play ${video.title}">
          <img src="${thumbUrl}" alt="${video.title}" class="video-thumb-img" loading="lazy" />
          <div class="video-play-overlay">
            <div class="video-play-btn"><i class="fa-solid fa-play"></i></div>
          </div>
          <div class="video-title-bar">${video.title}</div>
        </figure>
      `;

      // On user click: swap to the real YouTube iframe
      const card = col.querySelector('.video-facade-card');
      card.addEventListener('click', () => {
        card.innerHTML = `
          <iframe class="has-ratio" src="https://www.youtube.com/embed/${video.id}&autoplay=1" title="${video.title}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
        `;
      });
      
      videoContainer.appendChild(col);
    });
  })
  .catch(err => console.error("Error loading video data:", err));

  // --- Mobile Hamburger Menu Logic ---
const burger = document.querySelector('.navbar-burger');
const navMenu = document.getElementById('mainNav');

if (burger && navMenu) {
  burger.addEventListener('click', () => {
    burger.classList.toggle('is-active');
    navMenu.classList.toggle('is-active');
  });
}

// Close the mobile menu when a navigation link is clicked
document.querySelectorAll('.nav-trigger').forEach(link => {
  link.addEventListener('click', () => {
    if (navMenu.classList.contains('is-active')) {
      burger.classList.remove('is-active');
      navMenu.classList.remove('is-active');
    }
  });
});

loadSiteData('blog-data.json')
  .then(posts => {
    const blogContainer = document.getElementById('blog-list');
    
    posts.forEach(post => {
      const article = document.createElement('article');
      article.className = 'blog-article';
      
      // Safely load an image only if the JSON includes one
      const imgHTML = post.image ? `<img src="${post.image}" alt="${post.title}" class="blog-image">` : '';
      
      // Convert the array of strings into a series of <p> tags
      const paragraphsHTML = post.content.map(paragraph => `<p>${paragraph}</p>`).join('');
      
      article.innerHTML = `
        <h3 class="blog-header">${post.title}</h3>
        <div class="blog-date">${post.date}</div>
        ${imgHTML}
        <div class="blog-body">
          ${paragraphsHTML}
        </div>
      `;
      
      blogContainer.appendChild(article);
    });
  })
  .catch(err => console.error("Error loading blog data:", err));