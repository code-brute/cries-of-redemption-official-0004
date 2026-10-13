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

fetch('press-data.json')
  .then(res => res.json())
  .then(pressArticles => {
    const pressContainer = document.getElementById('press-list');
    
    pressArticles.forEach(article => {
      const pressLink = document.createElement('a');
      pressLink.href = article.url;
      pressLink.target = "_blank";
      pressLink.className = 'box has-background-black-bis custom-border press-article';
      
      pressLink.innerHTML = `
        <p class="is-size-7 has-text-grey mb-1">${article.publication} &bull; ${article.date}</p>
        <h3 class="title is-5 has-text-white mb-2">${article.headline}</h3>
        <p class="is-size-6 has-text-grey-light">Read article <i class="fa-solid fa-arrow-right is-size-7 ml-1"></i></p>
      `;
      
      pressContainer.appendChild(pressLink);
    });
  })
  .catch(err => console.error("Error loading press data:", err));