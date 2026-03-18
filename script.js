const els = {
  searchInput: document.getElementById('searchInput'),
  searchBtn: document.getElementById('searchBtn'),
  results: document.getElementById('results'),
  nowPlaying: document.getElementById('nowPlaying'),
  audio: document.getElementById('audio'),
  playBtn: document.getElementById('playBtn'),
  prevBtn: document.getElementById('prevBtn'),
  nextBtn: document.getElementById('nextBtn'),
  progress: document.getElementById('progress'),
  curTime: document.getElementById('curTime'),
  durTime: document.getElementById('durTime'),
  volume: document.getElementById('volume'),
  queueList: document.getElementById('queueList'),
  favList: document.getElementById('favList'),
  tabQueue: document.getElementById('tabQueue'),
  tabFav: document.getElementById('tabFav'),
  themeBtn: document.getElementById('themeBtn')
};

let state = {
  results: [],
  queue: [],
  favs: JSON.parse(localStorage.getItem('musicflow_favs') || '[]'),
  currentIndex: -1,
  playing: false
};

const saveFavs = () => localStorage.setItem('musicflow_favs', JSON.stringify(state.favs));
const fmt = (s) => `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;

function renderTrackItem(t, idx, from='results') {
  return `
    <div class="item">
      <img src="${t.artworkUrl100 || ''}" alt="${t.trackName}" />
      <div>
        <h4>${t.trackName}</h4>
        <p>${t.artistName} • ${t.collectionName || 'Single'}</p>
      </div>
      <div class="actions">
        ${from==='results' ? `<button class="mini" onclick="addToQueue(${idx})">+Queue</button>` : ''}
        ${from==='queue' ? `<button class="mini" onclick="playFromQueue(${idx})">▶</button>` : ''}
        <button class="mini" onclick="toggleFav(${t.trackId})">❤</button>
      </div>
    </div>`;
}

function renderResults() {
  els.results.innerHTML = state.results.length
    ? state.results.map((t, i) => renderTrackItem(t, i, 'results')).join('')
    : `<p style="color:var(--muted)">Chưa có dữ liệu. Hãy tìm bài hát.</p>`;
}

function renderQueue() {
  els.queueList.innerHTML = state.queue.length
    ? state.queue.map((t, i) => renderTrackItem(t, i, 'queue')).join('')
    : `<p style="color:var(--muted)">Queue trống.</p>`;
}

function renderFavs() {
  els.favList.innerHTML = state.favs.length
    ? state.favs.map((t) => renderTrackItem(t, 0, 'fav')).join('')
    : `<p style="color:var(--muted)">Chưa có bài yêu thích.</p>`;
}

function renderNowPlaying(track) {
  if (!track) {
    els.nowPlaying.classList.add('empty');
    els.nowPlaying.innerHTML = 'Chưa chọn bài nào';
    return;
  }
  els.nowPlaying.classList.remove('empty');
  els.nowPlaying.innerHTML = `
    <div class="now-meta">
      <img src="${track.artworkUrl100 || ''}" alt="${track.trackName}" />
      <div>
        <h3 style="margin:0">${track.trackName}</h3>
        <p style="margin:4px 0;color:var(--muted)">${track.artistName}</p>
        <small style="color:var(--muted)">${track.collectionName || ''}</small>
      </div>
    </div>`;
}

async function searchMusic() {
  const q = els.searchInput.value.trim();
  if (!q) return;
  els.results.innerHTML = '<p style="color:var(--muted)">Đang tìm...</p>';
  try {
    const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=song&limit=25`);
    const data = await res.json();
    state.results = data.results.filter(x => x.previewUrl);
    renderResults();
  } catch {
    els.results.innerHTML = '<p style="color:#fda4af">Lỗi tải dữ liệu. Thử lại nhé.</p>';
  }
}

function addToQueue(i) {
  state.queue.push(state.results[i]);
  renderQueue();
}

function playFromQueue(i) {
  const track = state.queue[i];
  if (!track) return;
  state.currentIndex = i;
  els.audio.src = track.previewUrl;
  els.audio.play();
  state.playing = true;
  els.playBtn.textContent = '⏸';
  renderNowPlaying(track);
}

function togglePlay() {
  if (!els.audio.src && state.queue.length) playFromQueue(0);
  if (!els.audio.src) return;
  if (els.audio.paused) { els.audio.play(); state.playing = true; els.playBtn.textContent='⏸'; }
  else { els.audio.pause(); state.playing = false; els.playBtn.textContent='▶'; }
}

function prevTrack(){
  if(!state.queue.length) return;
  state.currentIndex = (state.currentIndex - 1 + state.queue.length) % state.queue.length;
  playFromQueue(state.currentIndex);
}
function nextTrack(){
  if(!state.queue.length) return;
  state.currentIndex = (state.currentIndex + 1) % state.queue.length;
  playFromQueue(state.currentIndex);
}

function toggleFav(trackId) {
  const source = [...state.results, ...state.queue];
  const track = source.find(t => t.trackId === trackId);
  if (!track) return;
  const idx = state.favs.findIndex(t => t.trackId === trackId);
  if (idx >= 0) state.favs.splice(idx, 1);
  else state.favs.unshift(track);
  saveFavs();
  renderFavs();
}

function setTab(tab='queue'){
  const isQueue = tab==='queue';
  els.queueList.classList.toggle('hidden', !isQueue);
  els.favList.classList.toggle('hidden', isQueue);
  els.tabQueue.classList.toggle('active', isQueue);
  els.tabFav.classList.toggle('active', !isQueue);
}

els.audio.addEventListener('timeupdate', () => {
  els.progress.value = Math.min(30, els.audio.currentTime || 0);
  els.curTime.textContent = fmt(els.audio.currentTime || 0);
});
els.audio.addEventListener('ended', nextTrack);
els.progress.addEventListener('input', () => { els.audio.currentTime = Number(els.progress.value); });
els.volume.addEventListener('input', () => { els.audio.volume = Number(els.volume.value); });

els.searchBtn.onclick = searchMusic;
els.searchInput.addEventListener('keydown', e => e.key==='Enter' && searchMusic());
els.playBtn.onclick = togglePlay;
els.prevBtn.onclick = prevTrack;
els.nextBtn.onclick = nextTrack;
els.tabQueue.onclick = () => setTab('queue');
els.tabFav.onclick = () => setTab('fav');
els.themeBtn.onclick = () => document.body.classList.toggle('light');

window.addToQueue = addToQueue;
window.playFromQueue = playFromQueue;
window.toggleFav = toggleFav;

els.audio.volume = 0.9;
renderResults(); renderQueue(); renderFavs(); setTab('queue');
