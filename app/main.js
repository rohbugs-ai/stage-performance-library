import { registerSW } from 'virtual:pwa-register';

registerSW({ immediate: true });

let deferredPrompt;
let allSongs = [];
let categoryColors = {};

const colorPalette = [
  '#ff3b30', '#007aff', '#ffcc00', '#34c759', '#af52de', '#ff2d55',
  '#5ac8fa', '#ff9500', '#00c7be', '#e58606', '#5d69b1', '#52bca3',
  '#99c945', '#cc61b0', '#24796c', '#daa51b', '#2f8ac4', '#764e9f',
  '#ed645a', '#cc3a8e', '#a5aa99', '#8c510a', '#01665e', '#c51b7d'
];

function getColor(category) {
  return categoryColors[category] || '#8e8e93';
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById('searchInput').addEventListener('input', filterSongs);
  document.getElementById('categorySelect').addEventListener('change', filterSongs);
  
  document.getElementById('syncBtn').addEventListener('click', () => {
    document.getElementById('syncPrompt').classList.remove('hidden');
    document.getElementById('songList').classList.add('hidden');
    document.getElementById('statusMessage').classList.add('hidden');
  });

  document.getElementById('saveApiBtn').addEventListener('click', () => {
    const url = document.getElementById('apiUrlInput').value.trim();
    if (url) {
      localStorage.setItem('GAS_API_URL', url);
      syncData(url);
    }
  });

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    document.getElementById('installBtn').classList.remove('hidden');
  });

  document.getElementById('installBtn').addEventListener('click', async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        document.getElementById('installBtn').classList.add('hidden');
      }
      deferredPrompt = null;
    }
  });

  // iOS manual install prompt logic
  const isIos = () => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    return /iphone|ipad|ipod/.test(userAgent);
  };
  const isInStandaloneMode = () => ('standalone' in window.navigator) && (window.navigator.standalone);

  if (isIos() && !isInStandaloneMode()) {
    document.getElementById('iosInstallPrompt').classList.remove('hidden');
  }

  initApp();
});

function initApp() {
  const storedData = localStorage.getItem('songsData');
  const apiUrl = localStorage.getItem('GAS_API_URL');
  
  if (apiUrl) {
    document.getElementById('apiUrlInput').value = apiUrl;
  }
  
  if (storedData) {
    try {
      const data = JSON.parse(storedData);
      onDataLoaded(data);
    } catch (e) {
      document.getElementById('statusMessage').innerText = "Stored data corrupted. Please sync again.";
    }
  } else {
    document.getElementById('statusMessage').classList.remove('hidden');
    document.getElementById('syncPrompt').classList.remove('hidden');
  }
}

async function syncData(url) {
  document.getElementById('syncPrompt').classList.add('hidden');
  document.getElementById('loading').classList.remove('hidden');
  document.getElementById('statusMessage').classList.add('hidden');
  
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Network response was not ok");
    const data = await response.json();
    
    // Save to local storage for offline use
    localStorage.setItem('songsData', JSON.stringify(data));
    onDataLoaded(data);
  } catch (error) {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('statusMessage').classList.remove('hidden');
    document.getElementById('statusMessage').innerText = "Error syncing data. Are you online? Make sure the URL is correct.";
    console.error(error);
  }
}

function onDataLoaded(data) {
  allSongs = data;
  
  const categories = new Set();
  allSongs.forEach(song => {
    if (song.category) categories.add(song.category);
  });
  
  const select = document.getElementById('categorySelect');
  // Keep the 'All' option, remove others
  select.innerHTML = '<option value="All">All Categories</option>';
  
  let colorIndex = 0;
  Array.from(categories).sort().forEach(cat => {
    categoryColors[cat] = colorPalette[colorIndex % colorPalette.length];
    colorIndex++;

    const option = document.createElement('option');
    option.value = cat;
    option.innerText = cat;
    select.appendChild(option);
  });

  renderSongs(allSongs);
  document.getElementById('loading').classList.add('hidden');
  document.getElementById('songList').classList.remove('hidden');
  document.getElementById('statusMessage').classList.add('hidden');
}

function renderSongs(songsToRender) {
  const container = document.getElementById('songList');
  container.innerHTML = ''; 

  if (songsToRender.length === 0) {
    container.innerHTML = '<div style="text-align:center; padding:2rem; font-size:1.5rem;">No songs found.</div>';
    return;
  }

  songsToRender.forEach(song => {
    const card = document.createElement('div');
    card.className = 'song-card';
    card.style.borderLeftColor = getColor(song.category);

    const headerDiv = document.createElement('div');
    
    const catEl = document.createElement('div');
    catEl.className = 'song-category';
    catEl.innerText = song.category;
    headerDiv.appendChild(catEl);

    const titleEn = document.createElement('div');
    titleEn.className = 'song-title-en';
    titleEn.innerText = song.englishName;
    headerDiv.appendChild(titleEn);

    if (song.gujaratiName) {
      const titleGu = document.createElement('div');
      titleGu.className = 'song-title-gu';
      titleGu.innerText = song.gujaratiName;
      headerDiv.appendChild(titleGu);
    }
    
    card.appendChild(headerDiv);

    const detailsDiv = document.createElement('div');
    detailsDiv.className = 'song-details';
    
    if (song.lyrics) {
      const lyricsEl = document.createElement('div');
      lyricsEl.className = 'lyrics';
      lyricsEl.innerText = song.lyrics;
      detailsDiv.appendChild(lyricsEl);
    }

    if (song.youtubeLink) {
      const btn = document.createElement('a');
      btn.className = 'btn-karaoke';
      btn.href = song.youtubeLink;
      btn.target = '_blank';
      btn.rel = 'noopener noreferrer';
      btn.innerText = 'Start Karaoke';
      btn.style.backgroundColor = getColor(song.category);
      btn.addEventListener('click', (e) => e.stopPropagation());
      detailsDiv.appendChild(btn);
    }

    card.appendChild(detailsDiv);

    card.addEventListener('click', () => {
      card.classList.toggle('expanded');
      if (card.classList.contains('expanded')) {
         setTimeout(() => {
             card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
         }, 50);
      }
    });

    container.appendChild(card);
  });
}

function filterSongs() {
  const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
  const categoryFilter = document.getElementById('categorySelect').value;

  const filtered = allSongs.filter(song => {
    const matchesSearch = song.englishName.toLowerCase().includes(searchTerm);
    const matchesCategory = categoryFilter === 'All' || song.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  renderSongs(filtered);
}
