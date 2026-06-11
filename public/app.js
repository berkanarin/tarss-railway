import {
  deleteItem,
  exportData,
  getAll,
  importData,
  putItem,
  resetData,
  seedDefaults
} from './db.js';

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

const state = {
  sources: [],
  categories: [],
  articles: [],
  selections: [],
  blacklist: { competitors: [], banned: [], topics: [] },
  editingSourceId: null,
  editingCategoryId: null,
  gnewsUrl: ''
};

const workflowConfig = {
  categories: {
    step: '1. Adim',
    title: 'Kategorileri Duzenle',
    desc: 'Skorlama kategorileri, anahtar kelimeler ve yasakli kelime kurallari bu alanda yonetilir.',
    pages: [
      { id: 'categories', label: 'Kategoriler' },
      { id: 'blacklist', label: 'Yasakli Kelimeler' }
    ],
    actions: ''
  },
  sources: {
    step: '2. Adim',
    title: 'RSS Kaynaklarini Duzenle',
    desc: 'RSS kaynaklarini duzenleyin ve Railway RSS proxy ile guncel icerikleri cekin.',
    pages: [
      { id: 'sources', label: 'RSS Kaynaklari' },
      { id: 'gnews', label: 'Google News RSS' }
    ],
    actions: ''
  },
  articles: {
    step: '3. Adim',
    title: 'RSS Haberlerini Sec',
    desc: 'Haberleri guncelleyin, AI ile skorlayin, ardindan bultene girecek icerikleri secin.',
    pages: [
      { id: 'articles', label: 'RSS Haberleri' },
      { id: 'selected', label: 'Secilenler' }
    ],
    actions: 'articleFlow'
  },
  send: {
    step: '4. Adim',
    title: 'EML Ciktisi Olustur',
    desc: 'Bulten ayarlarini kontrol edin, onizleme alin ve tek EML dosyasini indirin.',
    pages: [{ id: 'send', label: 'EML Ciktisi' }],
    actions: ''
  },
  data: {
    step: 'Veri',
    title: 'Veri Yonetimi',
    desc: 'IndexedDB yedekleme, geri yukleme ve lokal veri sifirlama islemleri.',
    pages: [{ id: 'data', label: 'Veri Yonetimi' }],
    actions: ''
  }
};

function makeId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  })[char]);
}

function textLines(value) {
  return String(value || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

function toast(message, type = 'info') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  $('#toastContainer').appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

async function loadState() {
  const [sources, categories, articles, selections, blacklistRows, settingsRows] = await Promise.all([
    getAll('rssSources'),
    getAll('categories'),
    getAll('articles'),
    getAll('selections'),
    getAll('blacklist'),
    getAll('settings')
  ]);

  state.sources = sources.sort((a, b) => a.name.localeCompare(b.name, 'tr'));
  state.categories = categories.sort((a, b) => a.name.localeCompare(b.name, 'tr'));
  state.articles = articles.sort((a, b) => new Date(b.published || b.fetched_at || 0) - new Date(a.published || a.fetched_at || 0));
  state.selections = selections;
  state.blacklist = blacklistRows[0] || { id: 'default', competitors: [], banned: [], topics: [] };

  const settings = settingsRows.find((item) => item.id === 'app');
  if (settings) {
    $('#bulletinTitle').value = settings.bulletinTitle || 'TA RSS Bulteni';
    $('#mailSubject').value = settings.mailSubject || settings.bulletinTitle || 'TA RSS Bulteni';
    $('#introText').value = settings.introText || '';
  }
}

function buildWorkflowActions(type) {
  if (type !== 'articleFlow') return '';
  return '<div class="rss-action-strip">' +
    '<label title="Her RSS kaynagindan cekilecek maksimum haber sayisi">Kaynak basi ' +
      '<select id="fetchMaxItems"><option value="5">5</option><option value="10">10</option><option value="20" selected>20</option><option value="50">50</option></select>' +
    '</label>' +
    '<button class="btn btn-primary" id="btnFetchRSS" type="button">RSS Cek</button>' +
    '<button class="btn btn-orange" id="btnScoreRSS" type="button">AI Skorla</button>' +
    '<button class="btn btn-green" id="btnSaveSelection" type="button">Secimi Kaydet</button>' +
  '</div>';
}

function returnWorkflowPagesToContent() {
  const body = $('#workflowModalBody');
  const content = $('.content');
  const footer = content?.querySelector('.app-footer');
  if (!body || !content) return;
  Array.from(body.children).forEach((el) => {
    if (!el.classList?.contains('page')) return;
    el.classList.remove('active');
    if (footer) content.insertBefore(el, footer);
    else content.appendChild(el);
  });
}

function openWorkflowModal(kind) {
  const cfg = workflowConfig[kind];
  if (!cfg) return;

  returnWorkflowPagesToContent();
  $$('.page').forEach((page) => page.classList.remove('active'));
  $('#page-dashboard')?.classList.add('active');

  $('#workflowModalStep').textContent = cfg.step;
  $('#workflowModalTitle').textContent = cfg.title;
  $('#workflowModalDesc').textContent = cfg.desc;
  $('#workflowModalActions').innerHTML = buildWorkflowActions(cfg.actions);
  $('#workflowModalTabs').innerHTML = cfg.pages.map((page, index) =>
    `<button type="button" class="${index === 0 ? 'active' : ''}" data-workflow-tab="${page.id}">${page.label}</button>`
  ).join('');
  $('#workflowModalBody').innerHTML = '';

  cfg.pages.forEach((page, index) => {
    const el = $(`#page-${page.id}`);
    if (!el) return;
    $('#workflowModalBody').appendChild(el);
    el.classList.toggle('active', index === 0);
  });

  $('#workflowModal').classList.add('show');
  $('#workflowModal').setAttribute('aria-hidden', 'false');
  bindDynamicActions();
  renderWorkflowStatus();
}

function closeWorkflowModal() {
  returnWorkflowPagesToContent();
  $('#workflowModal')?.classList.remove('show');
  $('#workflowModal')?.setAttribute('aria-hidden', 'true');
  $('#page-dashboard')?.classList.add('active');
}

function setWorkflowPanel(pageId) {
  $$('#workflowModalTabs button').forEach((button) => button.classList.toggle('active', button.dataset.workflowTab === pageId));
  $$('#workflowModalBody .page').forEach((page) => page.classList.toggle('active', page.id === `page-${pageId}`));
}

function renderWorkflowStatus() {
  const selectedCount = state.selections.length;
  $('[data-step-card="1"]')?.classList.toggle('completed', state.categories.length > 0);
  $('[data-step-card="2"]')?.classList.toggle('completed', state.sources.length > 0);
  $('[data-step-card="3"]')?.classList.toggle('completed', selectedCount > 0);
  $('[data-step-card="4"]')?.classList.toggle('completed', selectedCount > 0 && $('#bulletinPreview')?.innerHTML.trim().length > 0);
  $('#workflowSummary').textContent = `${state.sources.length} kaynak, ${state.articles.length} haber, ${selectedCount} secili icerik. Pipeline: browser.`;
}

function renderCategories() {
  $('#categoriesBody').innerHTML = state.categories.map((category) => `
    <tr>
      <td><input type="checkbox" data-category-check="${esc(category.id)}"></td>
      <td><input value="${esc(category.name)}" data-category-field="name" data-id="${esc(category.id)}"></td>
      <td>
        <select data-category-field="priority" data-id="${esc(category.id)}">
          <option value="high"${category.priority === 'high' ? ' selected' : ''}>Yuksek</option>
          <option value="medium"${category.priority === 'medium' ? ' selected' : ''}>Orta</option>
          <option value="low"${category.priority === 'low' ? ' selected' : ''}>Dusuk</option>
        </select>
      </td>
      <td><textarea rows="2" data-category-field="keywords" data-id="${esc(category.id)}">${esc((category.keywords || []).join(', '))}</textarea></td>
      <td><button class="btn btn-sm btn-red" data-delete-category="${esc(category.id)}" type="button">X</button></td>
    </tr>
  `).join('');
  const all = $('#catCheckAll');
  if (all) all.checked = false;
}

async function addCategory() {
  await putItem('categories', {
    id: makeId('cat'),
    name: 'Yeni Kategori',
    priority: 'medium',
    color: '#395aa7',
    keywords: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
  await refresh();
}

async function updateCategory(id, field, value) {
  const category = state.categories.find((item) => item.id === id);
  if (!category) return;
  const next = { ...category, updatedAt: new Date().toISOString() };
  if (field === 'keywords') next.keywords = value.split(',').map((item) => item.trim()).filter(Boolean);
  else next[field] = value;
  await putItem('categories', next);
  await refresh(false);
}

async function deleteSelectedCategories() {
  const ids = $$('[data-category-check]:checked').map((input) => input.dataset.categoryCheck);
  if (!ids.length) {
    toast('Silmek icin kategori secin.', 'info');
    return;
  }
  if (!confirm(`${ids.length} kategori silinsin mi?`)) return;
  for (const id of ids) {
    await deleteItem('categories', id);
  }
  await refresh();
  toast('Secili kategoriler silindi.', 'success');
}

function renderBlacklist() {
  $('#blacklistCompetitors').value = (state.blacklist.competitors || []).join('\n');
  $('#blacklistBanned').value = (state.blacklist.banned || []).join('\n');
  $('#blacklistTopics').value = (state.blacklist.topics || []).join('\n');
  const total = (state.blacklist.competitors || []).length + (state.blacklist.banned || []).length + (state.blacklist.topics || []).length;
  $('#blacklistCount').textContent = `${total} kural`;
}

async function saveBlacklist() {
  state.blacklist = {
    id: 'default',
    competitors: textLines($('#blacklistCompetitors').value),
    banned: textLines($('#blacklistBanned').value),
    topics: textLines($('#blacklistTopics').value),
    updatedAt: new Date().toISOString()
  };
  await putItem('blacklist', state.blacklist);
  renderBlacklist();
  $('#blacklistSaved').style.display = 'inline';
  setTimeout(() => { $('#blacklistSaved').style.display = 'none'; }, 1600);
}

function renderSources() {
  $('#sourceCount').textContent = `${state.sources.length} kaynak`;
  $('#sourcesEmpty').style.display = state.sources.length ? 'none' : 'block';
  $('#sourcesBody').innerHTML = state.sources.map((source) => `
    <tr>
      <td><input type="checkbox" data-source-check="${esc(source.id)}"></td>
      <td><input value="${esc(source.name)}" data-source-field="name" data-id="${esc(source.id)}"></td>
      <td><input value="${esc(source.url)}" data-source-field="url" data-id="${esc(source.id)}"></td>
      <td><input value="${esc(source.category || 'tech')}" data-source-field="category" data-id="${esc(source.id)}"></td>
      <td>
        <select data-source-field="language" data-id="${esc(source.id)}">
          <option value="tr"${(source.language || 'tr') === 'tr' ? ' selected' : ''}>TR</option>
          <option value="en"${source.language === 'en' ? ' selected' : ''}>EN</option>
        </select>
      </td>
      <td>
        <select data-source-field="priority" data-id="${esc(source.id)}">
          <option value="high"${source.priority === 'high' ? ' selected' : ''}>Yuksek</option>
          <option value="medium"${(source.priority || 'medium') === 'medium' ? ' selected' : ''}>Orta</option>
          <option value="low"${source.priority === 'low' ? ' selected' : ''}>Dusuk</option>
        </select>
      </td>
      <td class="row-actions">
        <button class="btn btn-sm btn-red" data-delete-source="${esc(source.id)}" type="button">Sil</button>
      </td>
    </tr>
  `).join('');
  const all = $('#srcCheckAll');
  if (all) all.checked = false;
}

async function addSource() {
  await putItem('rssSources', {
    id: makeId('src'),
    name: 'Yeni Kaynak',
    category: 'tech',
    language: 'tr',
    priority: 'medium',
    url: '',
    enabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
  await refresh();
}

async function updateSource(id, field, value) {
  const source = state.sources.find((item) => item.id === id);
  if (!source) return;
  await putItem('rssSources', {
    ...source,
    [field]: value,
    enabled: true,
    updatedAt: new Date().toISOString()
  });
  await refresh(false);
}

async function deleteSelectedSources() {
  const ids = $$('[data-source-check]:checked').map((input) => input.dataset.sourceCheck);
  if (!ids.length) {
    toast('Silmek icin RSS kaynagi secin.', 'info');
    return;
  }
  if (!confirm(`${ids.length} RSS kaynagi silinsin mi?`)) return;
  for (const id of ids) {
    await deleteItem('rssSources', id);
  }
  await refresh();
  toast('Secili RSS kaynaklari silindi.', 'success');
}

function buildGnewsUrl() {
  const site = $('#gnewsSite').value.trim();
  const keywords = $('#gnewsKeywords').value.trim();
  const [hl, gl, ceid] = $('#gnewsLang').value.split('|');
  const query = [keywords, site ? `site:${site}` : ''].filter(Boolean).join(' ');
  if (!query) {
    toast('Site veya anahtar kelime girin.', 'error');
    return '';
  }
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=${encodeURIComponent(hl)}&gl=${encodeURIComponent(gl)}&ceid=${encodeURIComponent(ceid)}`;
  state.gnewsUrl = url;
  $('#gnewsUrlPreview').textContent = url;
  $('#addGnewsToSources').style.display = 'none';
  $('#gnewsResults').style.display = 'none';
  $('#gnewsStatus').textContent = 'URL olusturuldu.';
  return url;
}

async function testGnewsUrl() {
  const url = state.gnewsUrl || buildGnewsUrl();
  if (!url) return;
  $('#gnewsStatus').textContent = 'RSS besleme kontrol ediliyor...';
  try {
    const response = await fetch('/api/rss/fetch', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        sources: [{ name: 'Google News Test', url, category: 'tech', language: 'tr', priority: 'medium', enabled: true }],
        maxItems: 5
      })
    });
    const data = await response.json();
    if (!response.ok || !(data.items || []).length) throw new Error(data.errors?.[0]?.error || 'Haber bulunamadi');
    $('#gnewsResults').style.display = 'block';
    $('#gnewsResultInfo').textContent = `${data.items.length} haber bulundu.`;
    $('#gnewsResultBody').innerHTML = data.items.map((item, index) => `
      <tr>
        <td>${index + 1}</td>
        <td><a href="${esc(item.url)}" target="_blank" rel="noreferrer">${esc(item.title)}</a></td>
        <td>${esc(item.published || '')}</td>
        <td>${esc(item.source || '')}</td>
      </tr>
    `).join('');
    $('#addGnewsToSources').style.display = 'inline-flex';
    $('#gnewsStatus').textContent = 'Test basarili.';
  } catch (error) {
    $('#gnewsStatus').textContent = error.message || 'Test basarisiz.';
    $('#addGnewsToSources').style.display = 'none';
    toast(error.message || 'Google News RSS test edilemedi.', 'error');
  }
}

async function addGnewsToSources() {
  const url = state.gnewsUrl || buildGnewsUrl();
  if (!url) return;
  const site = $('#gnewsSite').value.trim();
  const keywords = $('#gnewsKeywords').value.trim();
  await putItem('rssSources', {
    id: makeId('src'),
    name: site ? `Google News - ${site}` : `Google News - ${keywords || 'RSS'}`,
    category: 'tech',
    language: $('#gnewsLang').value.split('|')[0] || 'tr',
    priority: 'medium',
    url,
    enabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
  await refresh();
  toast('Google News RSS kaynaklara eklendi.', 'success');
}

function populateArticleFilters() {
  const categoryFilter = $('#filterCategory');
  const sourceFilter = $('#filterSource');
  categoryFilter.innerHTML = '<option value="">Tum Kategoriler</option>' + state.categories.map((category) => `<option value="${esc(category.name)}">${esc(category.name)}</option>`).join('');
  sourceFilter.innerHTML = '<option value="">Tum Kaynaklar</option>' + state.sources.map((source) => `<option value="${esc(source.name)}">${esc(source.name)}</option>`).join('');
}

function filteredArticles() {
  const category = $('#filterCategory').value;
  const source = $('#filterSource').value;
  const minScore = Number($('#filterScore').value || 0);
  const query = $('#filterSearch').value.trim().toLowerCase();
  return state.articles.filter((article) => {
    if (category && !(article.categories || []).includes(category)) return false;
    if (source && article.source !== source) return false;
    if (minScore && Number(article.overall_score || 0) < minScore) return false;
    if (query && !`${article.title} ${article.summary} ${article.source}`.toLowerCase().includes(query)) return false;
    return true;
  });
}

function scoreClass(score) {
  if (score >= 7) return 'score-high';
  if (score >= 5) return 'score-mid';
  return 'score-low';
}

function articleCard(article, selectedView = false) {
  const score = Number(article.overall_score || 0);
  const selected = state.selections.some((item) => item.id === article.id);
  const tags = (article.categories || []).map((category) => `<span class="tag high">${esc(category)}</span>`).join('');
  return `
    <div class="article-card ${selected ? 'selected' : ''}">
      <img class="thumb" src="${esc(article.image_url || '')}" alt="" onerror="this.style.display='none'">
      <div class="body">
        <div class="title"><a href="${esc(article.url)}" target="_blank" rel="noreferrer">${esc(article.turkish_title || article.title)}</a></div>
        <div class="meta"><span>${esc(article.source || '')}</span><span>${esc(article.published || '')}</span></div>
        <div class="summary">${esc(article.turkish_summary || article.summary || '')}</div>
        <div class="tags">${tags}</div>
      </div>
      <div class="score-badge ${scoreClass(score)}">${score.toFixed(1)}</div>
      <div class="actions">
        <button class="btn btn-sm ${selected ? 'btn-red' : 'btn-primary'}" data-toggle-selection="${esc(article.id)}" type="button">${selected ? 'Cikar' : 'Sec'}</button>
        <button class="btn btn-sm btn-ghost" data-edit-article="${esc(article.id)}" type="button">Duzenle</button>
      </div>
    </div>
  `;
}

function renderArticles() {
  const articles = filteredArticles();
  $('#articlesEmpty').style.display = articles.length ? 'none' : 'block';
  $('#articleList').innerHTML = articles.map((article) => articleCard(article)).join('');
}

function renderSelected() {
  $('#selectedCount').textContent = `${state.selections.length} secim`;
  $('#selectedEmpty').style.display = state.selections.length ? 'none' : 'block';
  $('#selectedList').innerHTML = state.selections.map((article) => articleCard(article, true)).join('');
}

async function fetchRss() {
  if (!state.sources.length) {
    toast('Once RSS kaynagi ekleyin.', 'error');
    openWorkflowModal('sources');
    return;
  }
  const button = $('#btnFetchRSS');
  if (button) button.disabled = true;
  try {
    const response = await fetch('/api/rss/fetch', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sources: state.sources, maxItems: Number($('#fetchMaxItems')?.value || 20) })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'RSS cekilemedi');
    const existing = new Map(state.articles.map((article) => [article.id, article]));
    for (const article of data.items || []) {
      await putItem('articles', { ...existing.get(article.id), ...article });
    }
    await refresh();
    toast(`${data.total || 0} haber alindi.`, 'success');
  } catch (error) {
    toast(error.message || 'RSS cekilemedi.', 'error');
  } finally {
    if (button) button.disabled = false;
  }
}

function localPrefilter(article) {
  const text = `${article.title} ${article.summary}`.toLowerCase();
  return state.categories.some((category) => (category.keywords || []).some((keyword) => text.includes(String(keyword).toLowerCase())));
}

async function scoreArticles() {
  const pending = state.articles.filter((article) => !article.scored_at && localPrefilter(article)).slice(0, 25);
  const filtered = state.articles.filter((article) => !article.scored_at && !localPrefilter(article));
  for (const article of filtered) {
    await putItem('articles', {
      ...article,
      overall_score: 0,
      category_scores: {},
      categories: [],
      scores: { relevance: 0, quality: 0, actionability: 0, timeliness: 0 },
      reasoning: 'On-filtre: kategori anahtar kelimesiyle eslesmedi',
      scored_at: new Date().toISOString()
    });
  }
  if (!pending.length) {
    await refresh();
    toast('AI skor bekleyen haber yok.', 'info');
    return;
  }
  const button = $('#btnScoreRSS');
  if (button) button.disabled = true;
  try {
    const response = await fetch('/api/ai/score-batch', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ articles: pending, categories: state.categories, blacklist: state.blacklist, limit: 25 })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.errors?.[0]?.error || data.error || 'AI skorlanamadi');
    for (const article of data.scored || []) {
      await putItem('articles', article);
    }
    await refresh();
    toast(`${(data.scored || []).length} haber skorlandi.`, 'success');
  } catch (error) {
    await refresh();
    toast(error.message || 'AI skorlanamadi.', 'error');
  } finally {
    if (button) button.disabled = false;
  }
}

async function toggleSelection(id) {
  const existing = state.selections.find((item) => item.id === id);
  if (existing) {
    await deleteItem('selections', id);
  } else {
    const article = state.articles.find((item) => item.id === id);
    if (article) await putItem('selections', { ...article, selected_at: new Date().toISOString() });
  }
  await refresh(false);
  renderArticles();
  renderSelected();
}

function openArticleEditor(id) {
  const article = state.articles.find((item) => item.id === id) || state.selections.find((item) => item.id === id);
  if (!article) return;
  $('#editArticleId').value = article.id;
  $('#editArticleTitle').value = article.turkish_title || article.title || '';
  $('#editArticleSummary').value = article.turkish_summary || article.summary || '';
  $('#editArticleUrl').value = article.url || '';
  $('#editArticleImage').value = article.image_url || '';
  $('#editArticleCategories').value = (article.categories || []).join(', ');
  $('#editArticleScore').value = Number(article.overall_score || 0).toFixed(1);
  $('#articleEditModal').classList.add('show');
  $('#articleEditModal').setAttribute('aria-hidden', 'false');
}

function closeArticleEditor() {
  $('#articleEditModal').classList.remove('show');
  $('#articleEditModal').setAttribute('aria-hidden', 'true');
  $('#articleEditForm').reset();
}

async function saveArticleEdit(event) {
  event.preventDefault();
  const id = $('#editArticleId').value;
  const article = state.articles.find((item) => item.id === id) || state.selections.find((item) => item.id === id);
  if (!article) return;
  const selectedAt = state.selections.find((item) => item.id === id)?.selected_at;
  const next = {
    ...article,
    title: $('#editArticleTitle').value.trim(),
    turkish_title: $('#editArticleTitle').value.trim(),
    summary: $('#editArticleSummary').value.trim(),
    turkish_summary: $('#editArticleSummary').value.trim(),
    url: $('#editArticleUrl').value.trim(),
    image_url: $('#editArticleImage').value.trim(),
    categories: $('#editArticleCategories').value.split(',').map((item) => item.trim()).filter(Boolean),
    overall_score: Number($('#editArticleScore').value || 0),
    updated_at: new Date().toISOString()
  };
  await putItem('articles', next);
  if (selectedAt) {
    await putItem('selections', { ...next, selected_at: selectedAt });
  }
  closeArticleEditor();
  await refresh(false);
  renderArticles();
  renderSelected();
  toast('RSS icerigi guncellendi.', 'success');
}

async function deleteCurrentArticle() {
  const id = $('#editArticleId').value;
  if (!id || !confirm('Bu haber silinsin mi?')) return;
  await deleteItem('articles', id);
  await deleteItem('selections', id);
  closeArticleEditor();
  await refresh(false);
  toast('Haber silindi.', 'success');
}

function buildBulletinHtml() {
  const title = esc($('#bulletinTitle').value || 'TA RSS Bulteni');
  const intro = esc($('#introText').value || '');
  const items = state.selections.map((article) => `
    <tr>
      <td style="padding:16px 0;border-bottom:1px solid #e5e7eb">
        <h2 style="font-family:Arial,sans-serif;font-size:18px;line-height:1.3;margin:0 0 6px;color:#0f1f4a">${esc(article.turkish_title || article.title)}</h2>
        <p style="font-family:Arial,sans-serif;font-size:13px;line-height:1.55;margin:0 0 10px;color:#63718a">${esc(article.turkish_summary || article.summary || '')}</p>
        <a href="${esc(article.url)}" style="font-family:Arial,sans-serif;color:#1c3a8c;font-size:13px;font-weight:bold">Detaylari incele</a>
      </td>
    </tr>
  `).join('');
  return `<!doctype html><html><body style="margin:0;background:#f3f6fb;padding:24px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center"><table role="presentation" width="680" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:10px;padding:28px"><tr><td><h1 style="font-family:Arial,sans-serif;font-size:26px;margin:0 0 10px;color:#0f1f4a">${title}</h1><p style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#63718a;margin:0 0 18px">${intro}</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${items || '<tr><td>Secili icerik yok.</td></tr>'}</table></td></tr></table></td></tr></table></body></html>`;
}

async function saveSettings() {
  await putItem('settings', {
    id: 'app',
    bulletinTitle: $('#bulletinTitle').value,
    mailSubject: $('#mailSubject').value,
    introText: $('#introText').value,
    updatedAt: new Date().toISOString()
  });
}

async function previewBulletin() {
  await saveSettings();
  $('#bulletinPreview').innerHTML = buildBulletinHtml();
  renderWorkflowStatus();
}

function downloadEmlContent() {
  const subject = $('#mailSubject').value || $('#bulletinTitle').value || 'TA RSS Bulteni';
  const html = buildBulletinHtml();
  const boundary = `----=_TA_RSS_${Date.now()}`;
  const eml = [
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=utf-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    state.selections.map((article) => `${article.turkish_title || article.title}\n${article.url}`).join('\n\n'),
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=utf-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    html,
    '',
    `--${boundary}--`
  ].join('\r\n');
  const blob = new Blob([eml], { type: 'message/rfc822' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `ta-rss-${new Date().toISOString().slice(0, 10)}.eml`;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function downloadBackup() {
  const snapshot = await exportData();
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `ta-rss-backup-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function handleImport(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    await importData(JSON.parse(await file.text()));
    await refresh();
    toast('Yedek yuklendi.', 'success');
  } catch (error) {
    toast(error.message || 'Yedek yuklenemedi.', 'error');
  } finally {
    event.target.value = '';
  }
}

async function handleReset() {
  if (!confirm('Tarayicidaki lokal TA RSS verilerini sifirlamak istiyor musunuz?')) return;
  await resetData();
  await refresh();
  toast('Lokal veri sifirlandi.', 'info');
}

async function refresh(rerenderFormData = true) {
  await loadState();
  renderWorkflowStatus();
  renderCategories();
  if (rerenderFormData) renderBlacklist();
  renderSources();
  populateArticleFilters();
  renderArticles();
  renderSelected();
}

function bindDynamicActions() {
  $('#btnFetchRSS')?.addEventListener('click', fetchRss);
  $('#btnScoreRSS')?.addEventListener('click', scoreArticles);
  $('#btnSaveSelection')?.addEventListener('click', () => toast('Secimler tarayiciya kaydedildi.', 'success'));
}

document.addEventListener('click', async (event) => {
  const openPage = event.target.closest('[data-open-page]')?.dataset.openPage;
  const workflowTab = event.target.dataset?.workflowTab;
  const deleteSourceId = event.target.dataset?.deleteSource;
  const deleteCategoryId = event.target.dataset?.deleteCategory;
  const toggleSelectionId = event.target.dataset?.toggleSelection;
  const editArticleId = event.target.dataset?.editArticle;

  if (openPage) openWorkflowModal(openPage);
  if (workflowTab) setWorkflowPanel(workflowTab);
  if (deleteSourceId && confirm('Bu RSS kaynagini silmek istiyor musunuz?')) {
    await deleteItem('rssSources', deleteSourceId);
    await refresh();
  }
  if (deleteCategoryId && confirm('Bu kategoriyi silmek istiyor musunuz?')) {
    await deleteItem('categories', deleteCategoryId);
    await refresh();
  }
  if (toggleSelectionId) await toggleSelection(toggleSelectionId);
  if (editArticleId) openArticleEditor(editArticleId);
});

document.addEventListener('change', async (event) => {
  const field = event.target.dataset?.categoryField;
  const id = event.target.dataset?.id;
  const sourceField = event.target.dataset?.sourceField;
  if (field && id) await updateCategory(id, field, event.target.value);
  if (sourceField && id) await updateSource(id, sourceField, event.target.value);
  if (['filterCategory', 'filterSource', 'filterScore'].includes(event.target.id)) renderArticles();
  if (event.target.id === 'catCheckAll') $$('[data-category-check]').forEach((input) => { input.checked = event.target.checked; });
  if (event.target.id === 'srcCheckAll') $$('[data-source-check]').forEach((input) => { input.checked = event.target.checked; });
});

document.addEventListener('input', (event) => {
  if (event.target.id === 'filterSearch') renderArticles();
});

$('#closeWorkflowModal')?.addEventListener('click', closeWorkflowModal);
$('#workflowModal')?.addEventListener('click', (event) => {
  if (event.target === $('#workflowModal')) closeWorkflowModal();
});
$('#addCategory')?.addEventListener('click', addCategory);
$('#deleteSelectedCategories')?.addEventListener('click', deleteSelectedCategories);
$('#saveCategories')?.addEventListener('click', () => toast('Kategoriler kaydedildi.', 'success'));
$('#saveBlacklist')?.addEventListener('click', saveBlacklist);
$('#addSource')?.addEventListener('click', addSource);
$('#deleteSelectedSources')?.addEventListener('click', deleteSelectedSources);
$('#saveSources')?.addEventListener('click', () => toast('RSS kaynaklari kaydedildi.', 'success'));
$('#buildGnewsUrl')?.addEventListener('click', buildGnewsUrl);
$('#testGnewsUrl')?.addEventListener('click', testGnewsUrl);
$('#addGnewsToSources')?.addEventListener('click', addGnewsToSources);
$('#clearFilters')?.addEventListener('click', () => {
  $('#filterCategory').value = '';
  $('#filterSource').value = '';
  $('#filterScore').value = '0';
  $('#filterSearch').value = '';
  renderArticles();
});
$('#exportData')?.addEventListener('click', downloadBackup);
$('#exportDataSecondary')?.addEventListener('click', downloadBackup);
$('#importData')?.addEventListener('change', handleImport);
$('#resetData')?.addEventListener('click', handleReset);
$('#resetDataTop')?.addEventListener('click', handleReset);
$('#previewBulletin')?.addEventListener('click', previewBulletin);
$('#downloadEml')?.addEventListener('click', async () => {
  await saveSettings();
  downloadEmlContent();
});
$('#closeArticleEdit')?.addEventListener('click', closeArticleEditor);
$('#cancelArticleEdit')?.addEventListener('click', closeArticleEditor);
$('#articleEditModal')?.addEventListener('click', (event) => {
  if (event.target === $('#articleEditModal')) closeArticleEditor();
});
$('#articleEditForm')?.addEventListener('submit', saveArticleEdit);
$('#deleteArticle')?.addEventListener('click', deleteCurrentArticle);

await seedDefaults();
await refresh();
