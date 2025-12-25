const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const Database = require('./database');
const Store = require('electron-store');

const store = new Store();
let mainWindow;
let db;

// Configuración de la ruta de la base de datos
function getDatabasePath() {
  // Buscar primero en OneDrive si está configurado
  const oneDrivePath = store.get('onedrivePath');
  if (oneDrivePath) {
    return path.join(oneDrivePath, 'NeuroContable', 'neurocontable.db');
  }
  // Si no, usar la carpeta local de la aplicación
  return path.join(app.getPath('userData'), 'neurocontable.db');
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '../../public/icon.png'),
    title: 'NeuroContable - Sistema de Caja Diario'
  });

  // En desarrollo cargar desde localhost, en producción desde build
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../build/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // Inicializar base de datos
  const dbPath = getDatabasePath();
  db = new Database(dbPath);

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (db) {
    db.close();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// ============== IPC HANDLERS ==============

// --- Configuración ---
ipcMain.handle('config:getOneDrivePath', () => {
  return store.get('onedrivePath', '');
});

ipcMain.handle('config:setOneDrivePath', async (event, customPath) => {
  if (customPath) {
    store.set('onedrivePath', customPath);
    return { success: true, path: customPath };
  }

  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Seleccionar carpeta de OneDrive'
  });

  if (!result.canceled && result.filePaths.length > 0) {
    store.set('onedrivePath', result.filePaths[0]);
    return { success: true, path: result.filePaths[0] };
  }
  return { success: false };
});

ipcMain.handle('config:getDatabasePath', () => {
  return getDatabasePath();
});

// --- Autenticación ---
ipcMain.handle('auth:login', (event, { email, password }) => {
  return db.login(email, password);
});

ipcMain.handle('auth:getUsers', () => {
  return db.getUsers();
});

ipcMain.handle('auth:createUser', (event, userData) => {
  return db.createUser(userData);
});

ipcMain.handle('auth:updateUser', (event, { id, userData }) => {
  return db.updateUser(id, userData);
});

ipcMain.handle('auth:deleteUser', (event, id) => {
  return db.deleteUser(id);
});

// --- Terceros ---
ipcMain.handle('terceros:getAll', () => {
  return db.getTerceros();
});

ipcMain.handle('terceros:create', (event, data) => {
  return db.createTercero(data);
});

ipcMain.handle('terceros:update', (event, { codigo, data }) => {
  return db.updateTercero(codigo, data);
});

ipcMain.handle('terceros:delete', (event, codigo) => {
  return db.deleteTercero(codigo);
});

// --- Códigos de Ingreso ---
ipcMain.handle('codigosIngreso:getAll', () => {
  return db.getCodigosIngreso();
});

ipcMain.handle('codigosIngreso:create', (event, data) => {
  return db.createCodigoIngreso(data);
});

ipcMain.handle('codigosIngreso:update', (event, { codigo, data }) => {
  return db.updateCodigoIngreso(codigo, data);
});

ipcMain.handle('codigosIngreso:delete', (event, codigo) => {
  return db.deleteCodigoIngreso(codigo);
});

// --- Códigos de Egreso ---
ipcMain.handle('codigosEgreso:getAll', () => {
  return db.getCodigosEgreso();
});

ipcMain.handle('codigosEgreso:create', (event, data) => {
  return db.createCodigoEgreso(data);
});

ipcMain.handle('codigosEgreso:update', (event, { codigo, data }) => {
  return db.updateCodigoEgreso(codigo, data);
});

ipcMain.handle('codigosEgreso:delete', (event, codigo) => {
  return db.deleteCodigoEgreso(codigo);
});

// --- Movimientos ---
ipcMain.handle('movimientos:getAll', (event, filtros) => {
  return db.getMovimientos(filtros);
});

ipcMain.handle('movimientos:create', (event, data) => {
  return db.createMovimiento(data);
});

ipcMain.handle('movimientos:update', (event, { id, data }) => {
  return db.updateMovimiento(id, data);
});

ipcMain.handle('movimientos:delete', (event, id) => {
  return db.deleteMovimiento(id);
});

ipcMain.handle('movimientos:getByDateRange', (event, { fechaInicio, fechaFin }) => {
  return db.getMovimientosByDateRange(fechaInicio, fechaFin);
});

// --- Saldos ---
ipcMain.handle('saldos:getByCuenta', () => {
  return db.getSaldosByCuenta();
});

ipcMain.handle('saldos:getByTercero', () => {
  return db.getSaldosByTercero();
});

ipcMain.handle('saldos:getGeneral', () => {
  return db.getSaldoGeneral();
});

// --- Reportes ---
ipcMain.handle('reportes:getResumenPorConcepto', (event, { fechaInicio, fechaFin, tipo }) => {
  return db.getResumenPorConcepto(fechaInicio, fechaFin, tipo);
});

ipcMain.handle('reportes:getResumenPorPeriodo', (event, { fechaInicio, fechaFin, agrupacion }) => {
  return db.getResumenPorPeriodo(fechaInicio, fechaFin, agrupacion);
});

ipcMain.handle('reportes:getResumenPorTercero', (event, { fechaInicio, fechaFin }) => {
  return db.getResumenPorTercero(fechaInicio, fechaFin);
});

ipcMain.handle('reportes:getComparativo', (event, { periodo1, periodo2 }) => {
  return db.getComparativo(periodo1, periodo2);
});

// --- Exportación ---
ipcMain.handle('export:selectPath', async (event, { defaultName, filters }) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: defaultName,
    filters: filters
  });
  return result;
});

// --- Utilidades ---
ipcMain.handle('app:getVersion', () => {
  return app.getVersion();
});

ipcMain.handle('app:isOnline', () => {
  return require('dns').promises.lookup('google.com')
    .then(() => true)
    .catch(() => false);
});
