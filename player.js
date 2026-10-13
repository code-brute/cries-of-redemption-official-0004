fetch('band-data.json')
  .then(res => res.json())
  .then(data => {
    // Populate Bio & Header Text
    document.getElementById('band-tagline').textContent = data.tagline;
    document.getElementById('band-location').textContent = data.location;
    document.getElementById('band-bio').textContent = data.bio;

    // Populate Album
    document.getElementById('album-cover').src = data.album.cover;
    document.getElementById('album-title').textContent = data.album.title;
    document.getElementById('album-subtitle').textContent = data.album.subtitle;

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

    data.songs.forEach((song, index) => {
      const row = document.createElement('div');
      row.className = 'song-row';
      
      row.innerHTML = `
        <div class="song-info">
          <div class="track-index-container">
            <span class="track-number">${index + 1}</span>
            <i class="fa-solid fa-play play-icon"></i>
          </div>
          <span class="song-title">${song.title}</span>
        </div>
        <span class="song-duration">${song.duration}</span>
      `;

      row.addEventListener('click', () => {
        document.querySelectorAll('.song-row').forEach(r => r.classList.remove('active'));
        row.classList.add('active');
        audio.src = song.file;
        nowPlaying.textContent = `Playing: ${song.title}`;
        audio.play();
      });

      songContainer.appendChild(row);
    });
  })
  .catch(err => console.error("Error loading band data:", err));

// --- Single Page App Navigation Logic ---
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

  fetch('press-data.json')
  .then(res => res.json())
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

  fetch('videos-data.json')
  .then(res => res.json())
  .then(videos => {
    const videoContainer = document.getElementById('video-grid');
    
    videos.forEach(video => {
      // Create a column that takes up half the screen on desktop, full width on mobile
      const col = document.createElement('div');
      col.className = 'column is-one-third-desktop is-half-tablet is-full-mobile'; 
      
      // We inject the YouTube ID directly into the embed URL. 
      // loading="lazy" is critical here so the page doesn't slow down.
      col.innerHTML = `
        <figure class="image is-16by9 custom-border">
          <iframe class="has-ratio" src="https://www.youtube.com/embed/${video.id}" title="${video.title}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe>
        </figure>
      `;
      
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