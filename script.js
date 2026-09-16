(function(){

/* =====================================================================
   STATE
   ===================================================================== */
const state = {
  db: null,
  assets: null,
  capsChecked: false,
  listings: [],          // cached array of {id, ...fields}
  unsub: null,
  stagedImages: [],      // {tmpId, id, url, uploading, error}
  lastSearchQuery: '',
  searchResults: null,
  listingsFilter: 'all',
};

const CATEGORIES = [
  'Smartphones & Tablets',
  'Laptops',
  'Desktops & PCs',
  'Computer Parts & Components',
  'TVs & Monitors',
  'Gaming Consoles',
  'Other Electronics'
];

const CONDITIONS = [
  { value:'like-new', label:'Like New' },
  { value:'good',     label:'Good' },
  { value:'fair',     label:'Fair' },
  { value:'parts',    label:'For Parts / Not Working' },
];

/* This app is a framework without a concrete backend. To integrate API, 
replace `searchListings` with a real call to the matching API used*/

async function saveListingToBackend(listing){
  if (state.db){
    const ref = await state.db.collection('listings').add(listing);
    return { id: ref.id, ...listing };
  }
  // Local-only fallback so the framework still works if the realtime
  // store isn't available in this view (e.g. read-only access).
  const id = 'local-' + Date.now().toString(36) + Math.random().toString(36).slice(2,7);
  const doc = { id, ...listing };
  state.listings.unshift(doc);
  return doc;
}

function searchListings(query){
  // PLACEHOLDER MATCHING — replace with a real search/recommendation API.
  // For now this just keyword-matches against listings already loaded
  // on this page, so the buyer flow is demonstrable end to end.
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const terms = q.split(/\s+/).filter(Boolean);
  return state.listings.filter(l => {
    const hay = [l.productName, l.productType, l.description, conditionLabel(l.condition)]
      .join(' ').toLowerCase();
    return terms.some(t => hay.includes(t));
  });
}

async function uploadImageFile(file){
  if (state.assets){
    const result = await state.assets.upload(file, { type: file.type || undefined });
    return { id: result.id, url: result.url };
  }
  // Local-only fallback: preview the photo for this session even though
  // it won't be persisted anywhere (assets capability unavailable here).
  const url = URL.createObjectURL(file);
  return { id: 'local-img-' + Date.now().toString(36) + Math.random().toString(36).slice(2,6), url };
}

function subscribeListings(){
  if (!state.db) { renderView(); return; }
  state.unsub = state.db.collection('listings').orderBy('createdAt','desc').limit(200).onSnapshot(
    (snap) => {
      state.listings = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      renderView();
    },
    (err) => {
      console.error('listings subscription error', err);
      renderView();
    }
  );
}

async function initCapabilities(){
  if (window.claude && typeof window.claude.use === 'function'){
    try { state.db = await window.claude.use('db'); } catch(e){ state.db = null; }
    try { state.assets = await window.claude.use('assets'); } catch(e){ state.assets = null; }
  } else {
    state.db = null; state.assets = null;
  }
  state.capsChecked = true;
  renderModeBanner();
  subscribeListings();
}

/* =====================================================================
   HELPERS
   ===================================================================== */
function escapeHtml(str){
  return String(str == null ? '' : str).replace(/[&<>"']/g, (c) => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
  }[c]));
}
function conditionLabel(v){
  const c = CONDITIONS.find(c => c.value === v);
  return c ? c.label : '';
}
function formatPrice(n){
  const num = Number(n);
  if (isNaN(num)) return '';
  return '₹' + num.toLocaleString(undefined, { maximumFractionDigits:0 });
}
function timeAgo(ts){
  if (!ts) return '';
  const diff = Math.max(0, Date.now() - ts);
  const m = Math.floor(diff/60000);
  if (m < 1) return 'just now';
  if (m < 60) return m + 'm ago';
  const h = Math.floor(m/60);
  if (h < 24) return h + 'h ago';
  const d = Math.floor(h/24);
  if (d < 30) return d + 'd ago';
  return new Date(ts).toLocaleDateString();
}
function resolveImageUrl(img){
  if (!img) return null;
  // Real uploaded assets: always rebuild the URL from the durable id so
  // it resolves correctly for every viewer, on every load.
  if (img.id && !String(img.id).startsWith('local-img-')) return '/_blob/' + img.id;
  // Local-only fallback images (no assets capability available) have no
  // durable id to rebuild from, so fall back to the session preview URL.
  return img.url || null;
}
function firstImageUrl(listing){
  return resolveImageUrl(listing.images && listing.images[0]);
}
function imageUrlAt(listing, i){
  return resolveImageUrl(listing.images && listing.images[i]);
}

//ROUTING: 

function currentRoute(){
  const h = (location.hash || '').replace('#','');
  return ['buy','sell','listings'].includes(h) ? h : 'buy';
}
function renderView(){
  const route = currentRoute();
  document.querySelectorAll('#mainnav a').forEach(a => {
    if (a.dataset.route === route) a.setAttribute('aria-current','page');
    else a.removeAttribute('aria-current');
  });
  const root = document.getElementById('view-root');
  if (route === 'buy') root.innerHTML = viewBuy();
  else if (route === 'sell') root.innerHTML = viewSell();
  else root.innerHTML = viewListings();

  if (route === 'buy') wireBuyView();
  else if (route === 'sell') wireSellView();
  else wireListingsView();
}
window.addEventListener('hashchange', renderView);

function renderModeBanner(){
  const slot = document.getElementById('mode-banner-slot');
  if (!state.capsChecked) { slot.innerHTML = ''; return; }
  if (state.db && state.assets) { slot.innerHTML = ''; return; }
  slot.innerHTML = `
    <div class="mode-banner"><div class="wrap">
      Local preview mode — listings created here stay in this browser tab only.
      Open this page as a published artifact with storage enabled to make listings persist and sync for every visitor.
    </div></div>`;
}

/* =====================================================================
   VIEW: BUY
   ===================================================================== */
function viewBuy(){
  return `
    <section class="hero wrap">
      <h1>Find your next device, not a headache.</h1>
      <p class="hero-sub">Tested, graded phones, laptops, parts and more from real sellers near you.</p>
      <form id="search-form" class="search-box">
        <textarea id="search-input" rows="1" placeholder="What are you InTheMarket for...?">${escapeHtml(state.lastSearchQuery)}</textarea>
        <button type="submit" class="send-btn" aria-label="Search listings">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M4 12h14M13 6l6 6-6 6" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
      </form>
      <p class="search-hint">Try <button type="button" data-example="iPhone 13 under ₹60000">"iPhone 13 under ₹60000"</button> or <button type="button" data-example="gaming laptop 16GB RAM">"gaming laptop, 16GB RAM"</button></p>
    </section>
    <section id="search-results" class="wrap">${renderSearchResults()}</section>
  `;
}

function renderSearchResults(){
  if (state.searchResults === null) return '';
  const q = escapeHtml(state.lastSearchQuery);
  if (!state.searchResults.length){
    return `
      <div class="empty-state">
        <h3>No matches for "${q}" yet</h3>
        <p>Nothing in the marketplace fits that search right now. Try a broader term, or check back soon.</p>
        <a class="btn btn-ghost" href="#listings">Browse all listings</a>
      </div>`;
  }
  return `
    <p class="results-head"><strong>${state.searchResults.length}</strong> result${state.searchResults.length===1?'':'s'} for "${q}" <span style="opacity:.7">— keyword preview match; connect a real search API for full matching.</span></p>
    <div class="listing-grid">${state.searchResults.map(renderListingCard).join('')}</div>
  `;
}

function wireBuyView(){
  const form = document.getElementById('search-form');
  const input = document.getElementById('search-input');
  const autoGrow = () => { input.style.height = 'auto'; input.style.height = Math.min(160, input.scrollHeight) + 'px'; };
  autoGrow();
  input.addEventListener('input', autoGrow);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey){
      e.preventDefault();
      form.requestSubmit();
    }
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    state.lastSearchQuery = input.value;
    state.searchResults = searchListings(input.value);
    document.getElementById('search-results').innerHTML = renderSearchResults();
    wireListingCardClicks(document.getElementById('search-results'));
  });
  document.querySelectorAll('[data-example]').forEach(btn => {
    btn.addEventListener('click', () => {
      input.value = btn.dataset.example;
      autoGrow();
      form.requestSubmit();
    });
  });
  wireListingCardClicks(document.getElementById('search-results'));
}

/* =====================================================================
   VIEW: ALL LISTINGS
   ===================================================================== */
function viewListings(){
  const items = state.listingsFilter === 'all'
    ? state.listings
    : state.listings.filter(l => l.productType === state.listingsFilter);

  return `
    <div class="wrap">
      <div class="page-head">
        <h1>All Listings</h1>
      </div>
      <div class="filter-row">
        <select id="type-filter">
          <option value="all">All categories</option>
          ${CATEGORIES.map(c => `<option value="${escapeHtml(c)}" ${state.listingsFilter===c?'selected':''}>${escapeHtml(c)}</option>`).join('')}
        </select>
        <span class="count">${state.capsChecked ? (items.length + ' listing' + (items.length===1?'':'s')) : 'Loading…'}</span>
      </div>
      ${!state.capsChecked ? '<p style="color:var(--text-muted)">Loading listings…</p>' :
        (items.length ? `<div class="listing-grid">${items.map(renderListingCard).join('')}</div>` : `
        <div class="empty-state">
          <h3>No listings yet</h3>
          <p>Nothing's been listed in this category. Be the first to sell something.</p>
          <a class="btn btn-primary" href="#sell">Create a listing</a>
        </div>`)}
    </div>
  `;
}

function wireListingsView(){
  const sel = document.getElementById('type-filter');
  if (sel){
    sel.addEventListener('change', () => {
      state.listingsFilter = sel.value;
      renderView();
    });
  }
  wireListingCardClicks(document.getElementById('view-root'));
}

function renderListingCard(l){
  const img = firstImageUrl(l);
  return `
    <button class="listing-card" data-id="${escapeHtml(l.id)}" type="button">
      <div class="thumb-wrap">
        ${img ? `<img src="${escapeHtml(img)}" alt="">` : `<div class="no-photo">No photo</div>`}
      </div>
      <div class="body">
        <div class="top-row">
          <h3>${escapeHtml(l.productName || 'Untitled item')}</h3>
        </div>
        <div class="meta-row">
          <span class="tag">${escapeHtml(l.productType || '')}</span>
          ${l.condition ? `<span class="badge" data-grade="${escapeHtml(l.condition)}">${escapeHtml(conditionLabel(l.condition))}</span>` : ''}
        </div>
        <p class="desc-snip">${escapeHtml(l.description || '')}</p>
        <div class="bottom-row">
          <span class="price">${l.price !== undefined && l.price !== '' ? formatPrice(l.price) : ''}</span>
          <span class="time-ago">${timeAgo(l.createdAt)}</span>
        </div>
      </div>
    </button>
  `;
}

function wireListingCardClicks(scopeEl){
  if (!scopeEl) return;
  scopeEl.querySelectorAll('.listing-card').forEach(card => {
    card.addEventListener('click', () => {
      const listing = state.listings.find(l => l.id === card.dataset.id) ||
                       (state.searchResults || []).find(l => l.id === card.dataset.id);
      if (listing) openModal(listing);
    });
  });
}

/* =====================================================================
   MODAL
   ===================================================================== */
let modalState = { listing:null, index:0, lastFocus:null };

function openModal(listing){
  modalState = { listing, index:0, lastFocus: document.activeElement };
  renderModal();
  const modal = document.getElementById('modal');
  modal.hidden = false;
  document.getElementById('modal-close').focus();
  document.addEventListener('keydown', onModalKeydown);
}
function closeModal(){
  document.getElementById('modal').hidden = true;
  document.removeEventListener('keydown', onModalKeydown);
  if (modalState.lastFocus) modalState.lastFocus.focus();
}
function onModalKeydown(e){
  if (e.key === 'Escape') closeModal();
  if (e.key === 'ArrowRight') stepModal(1);
  if (e.key === 'ArrowLeft') stepModal(-1);
}
function stepModal(dir){
  const l = modalState.listing;
  const n = (l.images || []).length;
  if (n < 2) return;
  modalState.index = (modalState.index + dir + n) % n;
  renderModal();
}
function renderModal(){
  const l = modalState.listing;
  const images = l.images || [];
  const gal = document.getElementById('modal-gallery');
  const url = imageUrlAt(l, modalState.index);
  gal.innerHTML = `
    ${url ? `<img src="${escapeHtml(url)}" alt="">` : `<div class="no-photo">No photo</div>`}
    ${images.length > 1 ? `
      <button class="gallery-nav gallery-prev" id="gal-prev" aria-label="Previous photo">‹</button>
      <button class="gallery-nav gallery-next" id="gal-next" aria-label="Next photo">›</button>
      <div class="gallery-dots">${images.map((_,i)=>`<span class="${i===modalState.index?'active':''}"></span>`).join('')}</div>
    ` : ''}
  `;
  document.getElementById('modal-title').textContent = l.productName || 'Untitled item';
  document.getElementById('modal-meta').innerHTML = `
    <span class="tag">${escapeHtml(l.productType || '')}</span>
    ${l.condition ? `<span class="badge" data-grade="${escapeHtml(l.condition)}">${escapeHtml(conditionLabel(l.condition))}</span>` : ''}
    ${l.price !== undefined && l.price !== '' ? `<span class="price">${formatPrice(l.price)}</span>` : ''}
  `;
  document.getElementById('modal-desc').textContent = l.description || '';
  const prev = document.getElementById('gal-prev');
  const next = document.getElementById('gal-next');
  if (prev) prev.addEventListener('click', () => stepModal(-1));
  if (next) next.addEventListener('click', () => stepModal(1));
}
document.getElementById('modal-close').addEventListener('click', closeModal);
document.getElementById('modal').addEventListener('click', (e) => {
  if (e.target.id === 'modal') closeModal();
});

/* =====================================================================
   VIEW: SELL
   ===================================================================== */
function viewSell(){
  return `
    <div class="wrap sell-layout">
      <div>
        <h1>List an item</h1>
        <p class="lede">Give buyers what they need to trust a secondhand purchase: what it is, its real condition, and clear photos.</p>
        <div class="success-note" id="success-note">Listing published — it's live on All Listings.</div>
        <form id="sell-form" novalidate>
          <div class="field" id="field-type">
            <label for="f-type">Product type <span class="req">*</span></label>
            <select id="f-type">
              <option value="">Select a category</option>
              ${CATEGORIES.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('')}
            </select>
            <div class="field-error">Choose a product type.</div>
          </div>

          <div class="field" id="field-name">
            <label for="f-name">Product name <span class="req">*</span></label>
            <input type="text" id="f-name" placeholder="e.g. iPhone 13 Pro, 256GB">
            <div class="field-error">Give your listing a name.</div>
          </div>

          <div class="field" id="field-condition">
            <label for="f-condition">Condition grade <span class="req">*</span></label>
            <select id="f-condition">
              <option value="">Select a condition</option>
              ${CONDITIONS.map(c => `<option value="${c.value}">${c.label}</option>`).join('')}
            </select>
            <div class="field-error">Select the item's condition.</div>
          </div>

          <div class="field" id="field-price">
            <label for="f-price">Price <span class="req">*</span></label>
            <div class="price-input">
              <span>₹</span>
              <input type="number" id="f-price" min="0" step="1" placeholder="0">
            </div>
            <div class="field-error">Enter an asking price.</div>
          </div>

          <div class="field" id="field-desc">
            <label for="f-desc">Description <span class="req">*</span></label>
            <textarea id="f-desc" placeholder="Describe wear and tear, specs (storage, RAM, screen size...), included accessories, and why you're selling."></textarea>
            <div class="hint">This is where buyers will look for condition details and specifications.</div>
            <div class="field-error">Add a description covering condition and specs.</div>
          </div>

          <div class="submit-row">
            <button type="submit" class="btn btn-primary" id="submit-btn">Publish listing</button>
            <span class="submit-note">Metadata is sent to the backend once published.</span>
          </div>
        </form>
      </div>

      <div class="panel">
        <h2>Photos <span class="req">*</span> <span style="font-weight:400;color:var(--text-muted)">(required)</span></h2>
        <p class="panel-sub">Add at least one photo. Clear, well-lit shots of any wear or damage help your item sell.</p>
        <div class="dropzone" id="dropzone" tabindex="0" role="button" aria-label="Upload photos">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M12 16V4M12 4L7 9M12 4l5 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 16v3a1 1 0 001 1h14a1 1 0 001-1v-3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
          <div class="dz-title">Drop photos here or click to browse</div>
          <div class="dz-sub">PNG, JPG, WEBP or GIF · up to 8 photos</div>
          <input type="file" id="file-input" accept="image/png,image/jpeg,image/webp,image/gif" multiple hidden>
        </div>
        <div class="field-error" id="img-error" style="display:none">Add at least one photo before publishing.</div>
        <div class="thumbs" id="thumbs"></div>
      </div>
    </div>
  `;
}

function renderThumbs(){
  const el = document.getElementById('thumbs');
  if (!el) return;
  el.innerHTML = state.stagedImages.map(img => `
    <div class="thumb ${img.uploading ? 'uploading' : ''}" data-tmp="${img.tmpId}">
      <img src="${escapeHtml(img.url || '')}" alt="">
      <button type="button" class="thumb-remove" data-remove="${img.tmpId}" aria-label="Remove photo">×</button>
    </div>
  `).join('');
  el.querySelectorAll('[data-remove]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const tmpId = btn.dataset.remove;
      const img = state.stagedImages.find(i => i.tmpId === tmpId);
      state.stagedImages = state.stagedImages.filter(i => i.tmpId !== tmpId);
      renderThumbs();
      if (img && img.id && state.assets && !img.id.startsWith('local-img-')){
        try { await state.assets.delete(img.id); } catch(e){ /* best-effort cleanup */ }
      }
    });
  });
}

async function handleFiles(fileList){
  const files = Array.from(fileList).slice(0, Math.max(0, 8 - state.stagedImages.length));
  for (const file of files){
    if (!/^image\/(png|jpe?g|webp|gif)$/.test(file.type)) continue;
    const tmpId = 'tmp-' + Date.now().toString(36) + Math.random().toString(36).slice(2,6);
    const localPreview = URL.createObjectURL(file);
    state.stagedImages.push({ tmpId, id:null, url: localPreview, uploading: true });
    renderThumbs();
    try {
      const { id, url } = await uploadImageFile(file);
      const entry = state.stagedImages.find(i => i.tmpId === tmpId);
      if (entry){ entry.id = id; entry.url = url; entry.uploading = false; }
      renderThumbs();
    } catch(err){
      state.stagedImages = state.stagedImages.filter(i => i.tmpId !== tmpId);
      renderThumbs();
      console.error('image upload failed', err);
    }
  }
}

function wireSellView(){
  state.stagedImages = [];
  renderThumbs();

  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('file-input');
  dropzone.addEventListener('click', () => fileInput.click());
  dropzone.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); fileInput.click(); } });
  fileInput.addEventListener('change', () => { handleFiles(fileInput.files); fileInput.value = ''; });
  ['dragenter','dragover'].forEach(evt => dropzone.addEventListener(evt, (e) => { e.preventDefault(); dropzone.classList.add('drag'); }));
  ['dragleave','drop'].forEach(evt => dropzone.addEventListener(evt, (e) => { e.preventDefault(); dropzone.classList.remove('drag'); }));
  dropzone.addEventListener('drop', (e) => { if (e.dataTransfer.files) handleFiles(e.dataTransfer.files); });

  const form = document.getElementById('sell-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById('submit-btn');

    const type = document.getElementById('f-type').value;
    const name = document.getElementById('f-name').value.trim();
    const condition = document.getElementById('f-condition').value;
    const priceRaw = document.getElementById('f-price').value;
    const desc = document.getElementById('f-desc').value.trim();

    let valid = true;
    const setInvalid = (fieldId, bad) => {
      const el = document.getElementById(fieldId);
      el.classList.toggle('invalid', bad);
      if (bad) valid = false;
    };
    setInvalid('field-type', !type);
    setInvalid('field-name', !name);
    setInvalid('field-condition', !condition);
    setInvalid('field-price', priceRaw === '' || isNaN(Number(priceRaw)) || Number(priceRaw) < 0);
    setInvalid('field-desc', !desc);

    const imgErr = document.getElementById('img-error');
    const readyImages = state.stagedImages.filter(i => !i.uploading);
    const hasImages = readyImages.length > 0;
    imgErr.style.display = hasImages ? 'none' : 'block';
    if (!hasImages) valid = false;

    if (state.stagedImages.some(i => i.uploading)) valid = false;

    if (!valid) return;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Publishing…';

    const listing = {
      productType: type,
      productName: name,
      condition,
      price: Number(priceRaw),
      description: desc,
      images: readyImages.map(i => ({ id: i.id, url: i.url })),
      createdAt: Date.now(),
    };

    try {
      await saveListingToBackend(listing);
      document.getElementById('success-note').classList.add('show');
      form.reset();
      state.stagedImages = [];
      renderThumbs();
      document.querySelectorAll('.field.invalid').forEach(f => f.classList.remove('invalid'));
      window.setTimeout(() => { location.hash = '#listings'; }, 700);
    } catch(err){
      console.error('failed to save listing', err);
      alert('Something went wrong publishing this listing. Please try again.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Publish listing';
    }
  });
}

renderView();
initCapabilities();

})();
