const statusEl = document.querySelector('#healthStatus');
const checkButton = document.querySelector('#checkHealth');

async function checkHealth() {
  statusEl.textContent = 'Kontrol ediliyor';
  statusEl.classList.remove('ok');

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
  }
}

checkButton.addEventListener('click', checkHealth);
checkHealth();
