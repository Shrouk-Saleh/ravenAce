// ─────────────────────────────────────────────────────────────────────────────
// main/main.js — Electron Main Process Entry Point
// ─────────────────────────────────────────────────────────────────────────────

const { app, BrowserWindow, Menu, protocol, net } = require('electron');
const path = require('path');
const ProtocolHandler = require('../core/launcher/ProtocolHandler');
const { PROTOCOL_SCHEME, IPC_CHANNELS } = require('../shared/constants');
const securityPolicy = require('../config/securityPolicy.json');
const appConfig = require('../config/appConfig.json');

// Register the custom scheme before app is ready
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { secure: true, standard: true, supportFetchAPI: true, corsEnabled: true } }
]);

app.on('ready', () => {
  const { session } = require('electron');
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': ["default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' http://localhost:5000 ws://localhost:5000"]
      }
    });
  });
});

// Services
const HttpClient = require('../communication/HttpClient');
const SessionService = require('../services/SessionService');
const SessionGuardian = require('../services/SessionGuardian');
const ExamService = require('../services/ExamService');
const AutoSaveService = require('../services/AutoSaveService');
const SubmissionService = require('../services/SubmissionService');
const LaunchReporter = require('../core/launcher/LaunchReporter');
const ExamEngine = require('../core/ExamEngine');
const SecurityManager = require('../core/security/SecurityManager');

let deepLinkUrl = null;
let mainWindow = null;
let examEngine = null;

app.setAppUserModelId(appConfig.appId || 'com.ravenace.secure-engine');
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  console.log('[main.js] I am the second instance. Quitting...');
  app.exit(0);
}

if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(PROTOCOL_SCHEME, process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient(PROTOCOL_SCHEME);
}

const extractDeepLink = (argv) => {
  return argv.find((arg) => arg.startsWith(`${PROTOCOL_SCHEME}://`)) || null;
};

deepLinkUrl = extractDeepLink(process.argv);

function createSecureWindow() {
  const isDev = process.env.NODE_ENV === 'development';

  mainWindow = new BrowserWindow({
    width: appConfig.window.defaultWidth,
    height: appConfig.window.defaultHeight,
    minWidth: appConfig.window.minWidth,
    minHeight: appConfig.window.minHeight,
    fullscreen: true,
    fullscreenable: true,
    resizable: false,
    minimizable: false,
    closable: false, 
    frame: false, 
    autoHideMenuBar: true,
    show: false, 
    backgroundColor: '#0c1d3a',
    kiosk: true,
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'preload.js'),
      contextIsolation: true, 
      nodeIntegration: false, 
      sandbox: true, 
      devTools: isDev, // SECURITY: Only allow DevTools in development
      webSecurity: true, 
      allowRunningInsecureContent: false,
      navigateOnDragDrop: false, 
    },
  });

  // Content protection prevents screen recording or capturing
  try {
    mainWindow.setContentProtection(true);
  } catch (err) {
    console.warn('[main.js] Failed to set content protection:', err);
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.webContents.on('will-navigate', (event) => {
    event.preventDefault();
  });

  mainWindow.webContents.on('will-redirect', (event) => {
    event.preventDefault();
  });

  mainWindow.webContents.setWindowOpenHandler(() => {
    return { action: 'deny' };
  });

  // Explicitly deny all permission requests (camera, mic, notifications, etc.)
  mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    console.warn(`[main.js] Blocked permission request: ${permission}`);
    callback(false);
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error(`[main.js] Failed to load ${validatedURL}: ${errorDescription} (${errorCode})`);
  });

  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[RENDERER CONSOLE]: ${message}`);
  });

  mainWindow.webContents.on('did-finish-load', () => {
    // Load complete. No arbitrary HTML dumping.
  });

  mainWindow.loadURL('app://-/index.html');

  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    // Block DevTools opening in production and report as a critical violation
    mainWindow.webContents.on('devtools-opened', () => {
      mainWindow.webContents.closeDevTools();
      console.error('[main.js] DevTools blocked in production mode.');
      if (examEngine && examEngine.services.securityManager) {
        examEngine.services.securityManager._handleViolation({
          eventType: 'devtools_opened',
          severity: 'critical',
          metadata: { description: 'Attempted to open Developer Tools.' }
        });
      }
    });
  }

  // SECURITY: Detect renderer crashes (e.g. out of memory, unhandled fatal exceptions)
  mainWindow.webContents.on('render-process-gone', (event, details) => {
    console.error(`[main.js] Renderer process gone! Reason: ${details.reason}`);
    if (examEngine && examEngine.services.securityManager) {
      // Differentiate between clean crashes (OOM) and potential exploits
      const isOOM = details.reason === 'oom' || details.reason === 'clean-exit';
      examEngine.services.securityManager._handleViolation({
        eventType: 'renderer_crashed',
        severity: isOOM ? 'high' : 'critical',
        metadata: { description: `Renderer process died: ${details.reason}` }
      });
    }
  });

  // SECURITY: Prevent Alt+F4 or Taskbar closing unless gracefully exiting
  mainWindow.on('close', (e) => {
    if (examEngine && !examEngine.isExiting) {
      console.warn('[main.js] Unauthorized window close attempt intercepted.');
      e.preventDefault();
      
      if (examEngine.services.securityManager) {
        examEngine.services.securityManager._handleViolation({
          eventType: 'unauthorized_exit',
          severity: 'high',
          metadata: { description: 'Attempted to close the exam window without submitting.' }
        });
      }
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Initialize Services
  const httpClient = new HttpClient();
  const sessionService = new SessionService(httpClient, mainWindow);
  const sessionGuardian = new SessionGuardian(httpClient, sessionService, securityPolicy);
  const examService = new ExamService(httpClient, sessionService);
  const autoSaveService = new AutoSaveService(httpClient, sessionService);
  const submissionService = new SubmissionService(httpClient, sessionService);
  const launchReporter = new LaunchReporter(httpClient);

  const services = {
    sessionService,
    sessionGuardian,
    examService,
    autoSaveService,
    submissionService,
    launchReporter,
  };

  sessionGuardian.on('heartbeat_failed', async () => {
    try {
      await submissionService.submit('heartbeat_failed');
    } finally {
      app.quit();
    }
  });

  const securityManager = new SecurityManager(mainWindow, services, securityPolicy);
  services.securityManager = securityManager;

  // NOTE: Do NOT call registerIpcHandlers here — ExamEngine.start() does it.
  examEngine = new ExamEngine(mainWindow, services);
  services.examEngine = examEngine;
  examEngine.start();

  return mainWindow;
}

app.whenReady().then(() => {
  protocol.handle('app', (request) => {
    let url = request.url.substring('app://-/'.length);
    if (!url || url === '') url = 'index.html';
    // Strip query strings or hashes
    url = url.split('?')[0].split('#')[0];
    
    // Resolve the path within the renderer/dist directory
    const filePath = path.normalize(path.join(__dirname, '..', 'renderer', 'dist', url));
    const { pathToFileURL } = require('url');
    return net.fetch(pathToFileURL(filePath).toString());
  });

  createSecureWindow();

  if (mainWindow) {
    if (deepLinkUrl) {
      console.log('[main.js] deepLinkUrl found on launch:', deepLinkUrl);
    } else {
      console.log('[main.js] No deepLinkUrl found on launch');
    }

    mainWindow.webContents.once('did-finish-load', () => {

      if (deepLinkUrl) {
        console.log('[main.js] mainWindow loaded, sending deep link token');
        const parsed = ProtocolHandler.parse(deepLinkUrl);
        if (parsed.valid) {
          mainWindow.webContents.send('raven:app:init', { token: parsed.token });
        } else {
          mainWindow.webContents.send('raven:app:init', { error: parsed.error });
        }
      } else {
        // Send empty token to trigger the 'No session token provided' error in the UI
        mainWindow.webContents.send('raven:app:init', { token: null });
      }
    });
  }
});

app.on('second-instance', (_event, argv) => {
  console.log('[main.js] second-instance fired with argv:', argv);
  const url = extractDeepLink(argv);
  if (url && mainWindow) {
    const parsed = ProtocolHandler.parse(url);
    if (parsed.valid) {
      console.log('[main.js] Valid token extracted:', parsed.token);
      mainWindow.webContents.send('raven:app:init', { token: parsed.token });
    } else {
      console.log('[main.js] Invalid token:', parsed.error);
    }
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  } else {
    console.log('[main.js] No deep link found in argv or mainWindow is null');
  }
});

app.on('open-url', (event, url) => {
  event.preventDefault();
  deepLinkUrl = url;

  if (mainWindow) {
    const parsed = ProtocolHandler.parse(url);
    if (parsed.valid) {
      mainWindow.webContents.send('raven:app:init', { token: parsed.token });
    }
    mainWindow.focus();
  }
});

app.on('window-all-closed', () => {
  app.quit();
});

module.exports = { createSecureWindow };
