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