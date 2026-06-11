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
const navButtons = document.querySelectorAll('[data-page]');
const pages = document.querySelectorAll('.page');
const workflowModal = document.querySelector('#workflowModal');
const workflowModalStep = document.querySelector('#workflowModalStep');
const workflowModalTitle = document.querySelector('#workflowModalTitle');
const workflowModalDesc = document.querySelector('#workflowModalDesc');
const workflowModalBody = document.querySelector('#workflowModalBody');
const workflowModalTabs = document.querySelector('#workflowModalTabs');
const workflowModalActions = document.querySelector('#workflowModalActions');
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
  sources: null,
  categories: null,
  articles: null,
  selections: null
};

let editingSourceId = null;

const workflowConfig = {
  sources: {
    step: '2. Adim',
    title: 'RSS Kaynaklarini Duzenle',
    desc: 'RSS kaynaklarini duzenleyin ve Railway RSS proxy icin kaynak listenizi hazirlayin.',
    pages: [{ id: 'sources', label: 'RSS Kaynaklari' }],
    actions: ''
  },
  data: {
    step: '1. Adim',
    title: 'Kategorileri Duzenle',
    desc: 'Bu fazda lokal veri, yedekleme ve ileride kategori ayarlarina baglanacak veri alani hazirlaniyor.',
    pages: [{ id: 'data', label: 'Veri Yonetimi' }],
    actions: ''
  },
  articles: {
    step: '3. Adim',
    title: 'RSS Haberlerini Sec',
    desc: 'Haber cekme, AI skorlama ve secim akisi sonraki fazlarda bu alana eklenecek.',
    pages: [{ id: 'articles', label: 'RSS Haberleri' }],
    actions: 'articleFlow'
  },
  send: {
    step: '4. Adim',
    title: 'EML Ciktisi Olustur',
    desc: 'Bulten onizleme ve tek EML dosyasi uretimi sonraki fazda bu alana eklenecek.',
    pages: [{ id: 'send', label: 'EML Ciktisi' }],
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

function toast(message, type = 'info') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  toastContainer.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

async function checkHealth() {
  if (!statusEl) {
    return;
  }
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
}

async function renderStats() {
  const [sources, categories, articles, selections] = await Promise.all([
    getAll('rssSources'),
    getAll('categories'),
    getAll('articles'),
    getAll('selections')
  ]);

  const summary = document.querySelector('#workflowSummary');
  if (summary) {
    summary.textContent = `${sources.length} kaynak, ${articles.length} haber, ${selections.length} secili icerik. Pipeline: local.`;
  }

  document.querySelector('[data-step-card="1"]')?.classList.toggle('completed', categories.length > 0);
  document.querySelector('[data-step-card="2"]')?.classList.toggle('completed', sources.length > 0);
  document.querySelector('[data-step-card="3"]')?.classList.toggle('completed', selections.length > 0);
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

function buildWorkflowActions(type) {
  if (type !== 'articleFlow') {
    return '';
  }
  return '<div class="rss-action-strip">' +
    '<label title="Her RSS kaynagindan cekilecek maksimum haber sayisi">Kaynak basi ' +
      '<select disabled><option selected>50</option></select>' +
    '</label>' +
    '<button class="btn btn-primary" type="button" disabled>RSS Cek</button>' +
    '<button class="btn btn-orange" type="button" disabled>AI Skorla</button>' +
    '<button class="btn btn-green" type="button" disabled>Secimi Kaydet</button>' +
  '</div>';
}

function returnWorkflowPagesToContent() {
  if (!workflowModalBody) {
    return;
  }
  const content = document.querySelector('.content');
  const footer = content?.querySelector('.app-footer');
  Array.from(workflowModalBody.children).forEach((el) => {
    if (!el.classList?.contains('page')) {
      return;
    }
    el.classList.remove('active');
    if (footer) {
      content.insertBefore(el, footer);
    } else {
      content.appendChild(el);
    }
  });
}

function openWorkflowModal(kind) {
  const cfg = workflowConfig[kind];
  if (!cfg || !workflowModal) {
    return;
  }

  returnWorkflowPagesToContent();
  pages.forEach((page) => page.classList.remove('active'));
  document.querySelector('#page-dashboard')?.classList.add('active');

  workflowModalStep.textContent = cfg.step;
  workflowModalTitle.textContent = cfg.title;
  workflowModalDesc.textContent = cfg.desc;
  workflowModalActions.innerHTML = buildWorkflowActions(cfg.actions);
  workflowModalTabs.innerHTML = cfg.pages.map((page, index) =>
    `<button type="button" class="${index === 0 ? 'active' : ''}" data-workflow-tab="${page.id}">${page.label}</button>`
  ).join('');
  workflowModalBody.innerHTML = '';

  cfg.pages.forEach((page, index) => {
    const el = document.querySelector(`#page-${page.id}`);
    if (!el) {
      return;
    }
    workflowModalBody.appendChild(el);
    el.classList.toggle('active', index === 0);
  });

  workflowModal.classList.add('show');
  workflowModal.setAttribute('aria-hidden', 'false');
}

function closeWorkflowModal() {
  returnWorkflowPagesToContent();
  workflowModal?.classList.remove('show');
  workflowModal?.setAttribute('aria-hidden', 'true');
  showPage('dashboard');
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

document.querySelectorAll('[data-open-page]').forEach((button) => {
  button.addEventListener('click', () => openWorkflowModal(button.dataset.openPage));
});

workflowModalTabs?.addEventListener('click', (event) => {
  const pageId = event.target.dataset?.workflowTab;
  if (!pageId) {
    return;
  }
  workflowModalTabs.querySelectorAll('button').forEach((button) => {
    button.classList.toggle('active', button.dataset.workflowTab === pageId);
  });
  workflowModalBody.querySelectorAll('.page').forEach((page) => {
    page.classList.toggle('active', page.id === `page-${pageId}`);
  });
});

document.querySelector('#closeWorkflowModal')?.addEventListener('click', closeWorkflowModal);
workflowModal?.addEventListener('click', (event) => {
  if (event.target === workflowModal) {
    closeWorkflowModal();
  }
});

checkButton?.addEventListener('click', checkHealth);
sourceForm.addEventListener('submit', saveSource);
document.querySelector('#clearSourceForm').addEventListener('click', clearSourceForm);
document.querySelector('#exportData')?.addEventListener('click', downloadBackup);
document.querySelector('#exportDataSecondary').addEventListener('click', downloadBackup);
document.querySelector('#resetData').addEventListener('click', handleReset);
document.querySelector('#resetDataTop')?.addEventListener('click', handleReset);
importInput.addEventListener('change', handleImport);

await seedDefaults();
await refresh();
checkHealth();
