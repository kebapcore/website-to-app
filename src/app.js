// app.js
const { ipcRenderer } = require('electron');

let currentConfig = {};

// DOM elements
const sections = document.querySelectorAll('.section');
const navItems = document.querySelectorAll('.sidebar li');
const buildBtn = document.getElementById('build-btn');
const saveConfigBtn = document.getElementById('save-config');
const loadConfigBtn = document.getElementById('load-config');
const logOutput = document.getElementById('log-output');
const progressBar = document.getElementById('progress-bar');

// Navigation
navItems.forEach(item => {
  item.addEventListener('click', () => {
    const sectionId = item.dataset.section;
    showSection(sectionId);
  });
});

function showSection(sectionId) {
  sections.forEach(section => section.classList.remove('active'));
  navItems.forEach(item => item.classList.remove('active'));

  document.getElementById(sectionId).classList.add('active');
  document.querySelector(`[data-section="${sectionId}"]`).classList.add('active');
}

// Build button
buildBtn.addEventListener('click', async () => {
  const config = getConfigFromForm();
  log('Starting build process...');
  updateProgress(10);

  try {
    const result = await ipcRenderer.invoke('build-app', config);
    if (result.success) {
      log('Build completed successfully!');
      updateProgress(100);
      showSuccessDialog(result.outputPath);
    } else {
      log(`Build failed: ${result.error}`);
      updateProgress(0);
    }
  } catch (error) {
    log(`Build error: ${error.message}`);
    updateProgress(0);
  }
});

// Save config
saveConfigBtn.addEventListener('click', async () => {
  const config = getConfigFromForm();
  const result = await ipcRenderer.invoke('save-config', config);
  if (result.success) {
    log('Configuration saved.');
  }
});

// Load config
loadConfigBtn.addEventListener('click', async () => {
  const result = await ipcRenderer.invoke('load-config');
  if (result.success) {
    loadConfigToForm(result.config);
    log('Configuration loaded.');
  }
});

function getConfigFromForm() {
  const packageFormats = [];
  if (document.getElementById('win').checked) packageFormats.push('win');
  if (document.getElementById('deb').checked) packageFormats.push('deb');
  if (document.getElementById('appimage').checked) packageFormats.push('appimage');

  return {
    url: document.getElementById('url').value,
    name: document.getElementById('name').value,
    appId: document.getElementById('appId').value,
    version: document.getElementById('version').value,
    enableCookies: document.getElementById('enableCookies').checked,
    enableLocalStorage: document.getElementById('enableLocalStorage').checked,
    allowRightClick: document.getElementById('allowRightClick').checked,
    allowDevTools: document.getElementById('allowDevTools').checked,
    customUserAgent: document.getElementById('customUserAgent').value,
    blockExternalLinks: document.getElementById('blockExternalLinks').checked,
    allowDownloads: document.getElementById('allowDownloads').checked,
    sandbox: document.getElementById('sandbox').checked,
    width: parseInt(document.getElementById('width').value),
    height: parseInt(document.getElementById('height').value),
    resizable: document.getElementById('resizable').checked,
    frame: document.getElementById('frame').checked,
    alwaysOnTop: document.getElementById('alwaysOnTop').checked,
    fullscreen: document.getElementById('fullscreen').checked,
    transparent: document.getElementById('transparent').checked,
    iconPath: document.getElementById('iconPath').files[0]?.path,
    windowTitle: document.getElementById('windowTitle').value,
    themeColor: document.getElementById('themeColor').value,
    trayIcon: document.getElementById('trayIcon').checked,
    productName: document.getElementById('productName').value,
    description: document.getElementById('description').value,
    company: document.getElementById('company').value,
    copyright: document.getElementById('copyright').value,
    license: document.getElementById('license').value,
    customPreload: document.getElementById('customPreload').value,
    packageFormats,
  };
}

function loadConfigToForm(config) {
  document.getElementById('url').value = config.url || '';
  document.getElementById('name').value = config.name || '';
  document.getElementById('appId').value = config.appId || '';
  document.getElementById('version').value = config.version || '1.0.0';
  document.getElementById('enableCookies').checked = config.enableCookies !== false;
  document.getElementById('enableLocalStorage').checked = config.enableLocalStorage !== false;
  document.getElementById('allowRightClick').checked = config.allowRightClick !== false;
  document.getElementById('allowDevTools').checked = config.allowDevTools || false;
  document.getElementById('customUserAgent').value = config.customUserAgent || '';
  document.getElementById('blockExternalLinks').checked = config.blockExternalLinks || false;
  document.getElementById('allowDownloads').checked = config.allowDownloads !== false;
  document.getElementById('sandbox').checked = config.sandbox || false;
  document.getElementById('width').value = config.width || 800;
  document.getElementById('height').value = config.height || 600;
  document.getElementById('resizable').checked = config.resizable !== false;
  document.getElementById('frame').checked = config.frame !== false;
  document.getElementById('alwaysOnTop').checked = config.alwaysOnTop || false;
  document.getElementById('fullscreen').checked = config.fullscreen || false;
  document.getElementById('transparent').checked = config.transparent || false;
  document.getElementById('windowTitle').value = config.windowTitle || '';
  document.getElementById('themeColor').value = config.themeColor || '#ffffff';
  document.getElementById('trayIcon').checked = config.trayIcon || false;
  document.getElementById('productName').value = config.productName || '';
  document.getElementById('description').value = config.description || '';
  document.getElementById('company').value = config.company || '';
  document.getElementById('copyright').value = config.copyright || '';
  document.getElementById('license').value = config.license || '';
  document.getElementById('customPreload').value = config.customPreload || '';
  // Package formats
  document.getElementById('win').checked = config.packageFormats?.includes('win') || true;
  document.getElementById('deb').checked = config.packageFormats?.includes('deb') || false;
  document.getElementById('appimage').checked = config.packageFormats?.includes('appimage') || false;
}

function log(message) {
  const timestamp = new Date().toLocaleTimeString();
  logOutput.textContent += `[${timestamp}] ${message}\n`;
  logOutput.scrollTop = logOutput.scrollHeight;
}

function updateProgress(percent) {
  progressBar.style.setProperty('--progress', `${percent}%`);
}

function showSuccessDialog(outputPath) {
  ipcRenderer.invoke('show-success-dialog', outputPath);
}

// Initialize
showSection('project');

// Listen for logs from main
ipcRenderer.on('log', (event, message) => {
  log(message);
});

ipcRenderer.on('progress', (event, percent) => {
  updateProgress(percent);
});