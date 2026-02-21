const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    icon: path.join(__dirname, 'assets/icon.png'), // Add icon later
  });

  mainWindow.loadFile('src/index.html');

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
}

function sendLog(message) {
  if (mainWindow) {
    mainWindow.webContents.send('log', message);
  }
}

function sendProgress(percent) {
  if (mainWindow) {
    mainWindow.webContents.send('progress', percent);
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC handlers for build process
ipcMain.handle('build-app', async (event, config) => {
  try {
    const outputPath = await buildApp(config);
    return { success: true, outputPath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

async function buildApp(config) {
  sendLog('Validating configuration...');
  sendProgress(5);

  // Validate URL
  try {
    new URL(config.url);
  } catch {
    throw new Error('Invalid URL');
  }

  if (!config.name || !config.appId) {
    throw new Error('App name and identifier are required');
  }

  sendLog('Creating project structure...');
  sendProgress(10);

  const { url, name, appId, version, ...otherConfig } = config;

  // Create output directory
  const outputDir = path.join(__dirname, 'output', name.replace(/\s+/g, '-').toLowerCase());
  await fs.mkdir(outputDir, { recursive: true });

  sendLog('Generating app source code...');
  sendProgress(20);

  // Generate Electron app structure
  const appDir = path.join(outputDir, 'app');
  await fs.mkdir(appDir, { recursive: true });

  // Create package.json for the generated app
  const appPackageJson = {
    name: name.replace(/\s+/g, '-').toLowerCase(),
    version: version,
    main: 'main.js',
    author: otherConfig.company || 'Unknown',
    description: otherConfig.description || '',
    scripts: {
      dist: 'electron-builder'
    },
    devDependencies: {
      'electron': '^25.0.0',
      'electron-builder': '^24.0.0'
    },
    build: {
      appId: appId,
      productName: name,
      directories: {
        output: 'dist'
      },
      files: ['**/*']
    }
  };
  await fs.writeFile(path.join(appDir, 'package.json'), JSON.stringify(appPackageJson, null, 2));

  // Create main.js for the generated app
  const mainJs = generateMainJs(config);
  await fs.writeFile(path.join(appDir, 'main.js'), mainJs);

  // Create preload.js if needed
  if (otherConfig.customPreload) {
    const preloadContent = `
const { contextBridge } = require('electron');

${otherConfig.customPreload}

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Add any APIs here
});
`;
    await fs.writeFile(path.join(appDir, 'preload.js'), preloadContent);
  }

  // Copy icon if provided
  if (otherConfig.iconPath) {
    await fs.copyFile(otherConfig.iconPath, path.join(appDir, 'icon.png'));
  }

  sendLog('Installing dependencies...');
  sendProgress(40);

  try {
    // Install dependencies
    await execAsync('npm install', { cwd: appDir });
  } catch (error) {
    throw new Error(`Failed to install dependencies: ${error.message}`);
  }

  sendLog('Packaging application...');
  sendProgress(60);

  // Package the app
  const packageFormats = config.packageFormats || ['win'];
  for (const format of packageFormats) {
    try {
      await packageApp(appDir, outputDir, format, config);
    } catch (error) {
      throw new Error(`Failed to package for ${format}: ${error.message}`);
    }
  }

  sendLog('Saving configuration...');
  sendProgress(90);

  // Save config
  await fs.writeFile(path.join(outputDir, 'config-used.json'), JSON.stringify(config, null, 2));

  sendLog('Build completed successfully!');
  sendProgress(100);

  return outputDir;
}

function generateMainJs(config) {
  const { url, name, width = 800, height = 600, resizable = true, frame = true, alwaysOnTop = false, fullscreen = false, transparent = false, enableCookies = true, enableLocalStorage = true, allowRightClick = true, allowDevTools = false, customUserAgent, blockExternalLinks = false, allowDownloads = true, sandbox = false } = config;

  return `
const { app, BrowserWindow, session } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  const ses = session.fromPartition('persist:${name}');

  // Configure session
  if (!${enableCookies}) {
    ses.cookies.set({ url: '${url}', name: 'dummy', value: 'dummy' }).then(() => {
      ses.cookies.remove('${url}', 'dummy');
    });
  }

  mainWindow = new BrowserWindow({
    width: ${width},
    height: ${height},
    resizable: ${resizable},
    frame: ${frame},
    alwaysOnTop: ${alwaysOnTop},
    fullscreen: ${fullscreen},
    transparent: ${transparent},
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      session: ses,
      preload: path.join(__dirname, 'preload.js'),
      ${sandbox ? 'sandbox: true,' : ''}
    },
    icon: path.join(__dirname, 'icon.png'),
    title: '${name}',
  });

  mainWindow.loadURL('${url}');

  // Disable right click if not allowed
  if (!${allowRightClick}) {
    mainWindow.webContents.on('context-menu', (e) => e.preventDefault());
  }

  // Disable dev tools if not allowed
  if (!${allowDevTools}) {
    mainWindow.webContents.on('devtools-opened', () => {
      mainWindow.webContents.closeDevTools();
    });
  }

  // Set custom user agent
  ${customUserAgent ? `mainWindow.webContents.setUserAgent('${customUserAgent}');` : ''}

  // Block external links
  if (${blockExternalLinks}) {
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      if (url.startsWith('${url}')) {
        return { action: 'allow' };
      }
      return { action: 'deny' };
    });
  }

  // Handle downloads
  if (${allowDownloads}) {
    mainWindow.webContents.session.on('will-download', (event, item) => {
      item.setSavePath(path.join(app.getPath('downloads'), item.getFilename()));
    });
  } else {
    mainWindow.webContents.session.on('will-download', (event) => {
      event.preventDefault();
    });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
`;
}

async function packageApp(appDir, outputDir, format, config) {
  const { name } = config;
  const appName = name.replace(/\s+/g, '-').toLowerCase();

  sendLog(`Packaging for ${format}...`);

  if (format === 'win') {
    // Use electron-builder for Windows
    const buildConfig = {
      appId: config.appId,
      productName: name,
      directories: {
        output: path.join(outputDir, 'installers'),
        app: appDir,
      },
      win: {
        target: 'nsis',
      },
      files: ['**/*'],
    };
    await fs.writeFile(path.join(appDir, 'electron-builder.json'), JSON.stringify(buildConfig, null, 2));
    await execAsync('npx electron-builder --win', { cwd: appDir });
  } else if (format === 'deb') {
    // For Linux DEB
    const buildConfig = {
      appId: config.appId,
      productName: name,
      directories: {
        output: path.join(outputDir, 'installers'),
        app: appDir,
      },
      linux: {
        target: 'deb',
      },
      files: ['**/*'],
    };
    await fs.writeFile(path.join(appDir, 'electron-builder.json'), JSON.stringify(buildConfig, null, 2));
    await execAsync('npx electron-builder --linux deb', { cwd: appDir });
  } else if (format === 'appimage') {
    // For AppImage
    const buildConfig = {
      appId: config.appId,
      productName: name,
      directories: {
        output: path.join(outputDir, 'installers'),
        app: appDir,
      },
      linux: {
        target: 'AppImage',
      },
      files: ['**/*'],
    };
    await fs.writeFile(path.join(appDir, 'electron-builder.json'), JSON.stringify(buildConfig, null, 2));
    await execAsync('npx electron-builder --linux AppImage', { cwd: appDir });
  }

  sendLog(`Packaging for ${format} completed.`);
}

// IPC handlers for saving/loading config, etc.
ipcMain.handle('save-config', async (event, config) => {
  const filePath = await dialog.showSaveDialog(mainWindow, {
    title: 'Save Configuration',
    filters: [{ name: 'JSON', extensions: ['json'] }],
    defaultPath: 'project.config.json',
  });
  if (!filePath.canceled) {
    await fs.writeFile(filePath.filePath, JSON.stringify(config, null, 2));
    return { success: true };
  }
  return { success: false };
});

ipcMain.handle('load-config', async () => {
  const filePath = await dialog.showOpenDialog(mainWindow, {
    title: 'Load Configuration',
    filters: [{ name: 'JSON', extensions: ['json'] }],
    properties: ['openFile'],
  });
  if (!filePath.canceled) {
    const data = await fs.readFile(filePath.filePaths[0], 'utf8');
    return { success: true, config: JSON.parse(data) };
  }
  return { success: false };
});

ipcMain.handle('show-success-dialog', async (event, outputPath) => {
  const result = await dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'Build Completed',
    message: 'Your application has been packaged successfully.',
    detail: `Location: ${outputPath}`,
    buttons: ['Open Folder', 'OK'],
    defaultId: 0,
  });
  if (result.response === 0) {
    const { shell } = require('electron');
    shell.openPath(outputPath);
  }
});
