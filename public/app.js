import {
  deleteItem,
  exportData,
  getAll,
  importData,
  putItem,
  resetData,
  seedDefaults
} from './db.js';

const statusEl = document.querySelector('#healthStatus');
const checkButton = document.querySelector('#checkHealth');
const pageTitle = document.querySelector('#pageTitle');
const navButtons = document.querySelectorAll('[data-page]');
const pages = document.querySelectorAll('.page');
const sourceForm = document.querySelector('#sourceForm');
const sourceName = document.querySelector('#sourceName');
const sourceCategory = document.querySelector('#sourceCategory');
const sourceUrl = document.querySelector('#sourceUrl');
const sourcesTable = document.querySelector('#sourcesTable');
const sourcesEmpty = document.querySelector('#sourcesEmpty');
const sourceCount = document.querySelector('#sourceCount');
const importInput = document.querySelector('#importData');
const toastContainer = document.querySelector('#toastContainer');

const stats = {
  sources: document.querySelector('#statSources'),
  categories: document.querySelector('#statCategories'),
  articles: document.querySelector('#statArticles'),
  selections: document.querySelector('#statSelections')
};

let editingSourceId = null;

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

function toast(message, type = 'info') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  toastContainer.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

async function checkHealth() {
  statusEl.textContent = 'Kontrol ediliyor';
  statusEl.classList.remove('ok', 'error');

  try {
    const response = await fetch('/health', { cache: 'no-store' });
    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.error || 'health_failed');
    }
    statusEl.textContent = 'Backend hazir';
    statusEl.classList.add('ok');
  } catch {
    statusEl.textContent = 'Backend yok';
    statusEl.classList.add('error');
  }
}

function showPage(pageName) {
  navButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.page === pageName);
  });
  pages.forEach((page) => {
    page.classList.toggle('active', page.id === `page-${pageName}`);
  });
  const activeButton = document.querySelector(`[data-page="${pageName}"]`);
  pageTitle.textContent = activeButton ? activeButton.textContent.replace(/^\d+/, '').trim() : 'Dashboard';
}

async function renderStats() {
  const [sources, categories, articles, selections] = await Promise.all([
    getAll('rssSources'),
    getAll('categories'),
    getAll('articles'),
    getAll('selections')
  ]);

  stats.sources.textContent = sources.length;
  stats.categories.textContent = categories.length;
  stats.articles.textContent = articles.length;
  stats.selections.textContent = selections.length;
}

async function renderSources() {
  const sources = await getAll('rssSources');
  sources.sort((a, b) => a.name.localeCompare(b.name, 'tr'));
  sourceCount.textContent = `${sources.length} kaynak`;
  sourcesEmpty.style.display = sources.length ? 'none' : 'block';
  sourcesTable.innerHTML = sources.map((source) => `
    <tr>
      <td><strong>${esc(source.name)}</strong></td>
      <td>${esc(source.category || 'general')}</td>
      <td><a href="${esc(source.url)}" target="_blank" rel="noreferrer">${esc(source.url)}</a></td>
      <td class="row-actions">
        <button class="btn btn-sm btn-ghost" data-edit-source="${esc(source.id)}" type="button">Duzenle</button>
        <button class="btn btn-sm btn-red" data-delete-source="${esc(source.id)}" type="button">Sil</button>
      </td>
    </tr>
  `).join('');
}

function clearSourceForm() {
  editingSourceId = null;
  sourceForm.reset();
  sourceForm.querySelector('[type="submit"]').textContent = 'Kaydet';
}

async function saveSource(event) {
  event.preventDefault();
  const now = new Date().toISOString();
  const id = editingSourceId || makeId('src');
  const item = {
    id,
    name: sourceName.value.trim(),
    category: sourceCategory.value.trim() || 'general',
    url: sourceUrl.value.trim(),
    enabled: true,
    updatedAt: now
  };

  if (!item.name || !item.url) {
    toast('Kaynak adi ve URL zorunlu.', 'error');
    return;
  }

  const existing = (await getAll('rssSources')).find((source) => source.id === id);
  await putItem('rssSources', {
    ...existing,
    ...item,
    createdAt: existing?.createdAt || now
  });
  clearSourceForm();
  await refresh();
  toast('RSS kaynagi kaydedildi.', 'success');
}

async function editSource(id) {
  const source = (await getAll('rssSources')).find((item) => item.id === id);
  if (!source) {
    return;
  }
  editingSourceId = source.id;
  sourceName.value = source.name;
  sourceCategory.value = source.category || '';
  sourceUrl.value = source.url;
  sourceForm.querySelector('[type="submit"]').textContent = 'Guncelle';
  showPage('sources');
}

async function removeSource(id) {
  if (!confirm('Bu RSS kaynagini silmek istiyor musunuz?')) {
    return;
  }
  await deleteItem('rssSources', id);
  await refresh();
  toast('RSS kaynagi silindi.', 'info');
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
  toast('JSON yedek hazirlandi.', 'success');
}

async function handleImport(event) {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }

  try {
    const snapshot = JSON.parse(await file.text());
    await importData(snapshot);
    await refresh();
    toast('Yedek yuklendi.', 'success');
  } catch (error) {
    toast(error.message || 'Yedek yuklenemedi.', 'error');
  } finally {
    importInput.value = '';
  }
}

async function handleReset() {
  if (!confirm('Tarayicidaki lokal TA RSS verilerini sifirlamak istiyor musunuz?')) {
    return;
  }
  await resetData();
  clearSourceForm();
  await refresh();
  toast('Lokal veri sifirlandi.', 'info');
}

async function refresh() {
  await renderStats();
  await renderSources();
}

document.addEventListener('click', async (event) => {
  const editId = event.target.dataset?.editSource;
  const deleteId = event.target.dataset?.deleteSource;

  if (editId) {
    await editSource(editId);
  }
  if (deleteId) {
    await removeSource(deleteId);
  }
});

navButtons.forEach((button) => {
  button.addEventListener('click', () => showPage(button.dataset.page));
});

checkButton.addEventListener('click', checkHealth);
sourceForm.addEventListener('submit', saveSource);
document.querySelector('#clearSourceForm').addEventListener('click', clearSourceForm);
document.querySelector('#exportData').addEventListener('click', downloadBackup);
document.querySelector('#exportDataSecondary').addEventListener('click', downloadBackup);
document.querySelector('#resetData').addEventListener('click', handleReset);
importInput.addEventListener('change', handleImport);

await seedDefaults();
await refresh();
checkHealth();
