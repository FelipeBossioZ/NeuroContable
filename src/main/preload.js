const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Configuración
  config: {
    getOneDrivePath: () => ipcRenderer.invoke('config:getOneDrivePath'),
    setOneDrivePath: (path) => ipcRenderer.invoke('config:setOneDrivePath', path),
    getDatabasePath: () => ipcRenderer.invoke('config:getDatabasePath')
  },

  // Autenticación
  auth: {
    login: (credentials) => ipcRenderer.invoke('auth:login', credentials),
    getUsers: () => ipcRenderer.invoke('auth:getUsers'),
    createUser: (userData) => ipcRenderer.invoke('auth:createUser', userData),
    updateUser: (id, userData) => ipcRenderer.invoke('auth:updateUser', { id, userData }),
    deleteUser: (id) => ipcRenderer.invoke('auth:deleteUser', id)
  },

  // Terceros
  terceros: {
    getAll: () => ipcRenderer.invoke('terceros:getAll'),
    create: (data) => ipcRenderer.invoke('terceros:create', data),
    update: (codigo, data) => ipcRenderer.invoke('terceros:update', { codigo, data }),
    delete: (codigo) => ipcRenderer.invoke('terceros:delete', codigo)
  },

  // Códigos de Ingreso
  codigosIngreso: {
    getAll: () => ipcRenderer.invoke('codigosIngreso:getAll'),
    create: (data) => ipcRenderer.invoke('codigosIngreso:create', data),
    update: (codigo, data) => ipcRenderer.invoke('codigosIngreso:update', { codigo, data }),
    delete: (codigo) => ipcRenderer.invoke('codigosIngreso:delete', codigo)
  },

  // Códigos de Egreso
  codigosEgreso: {
    getAll: () => ipcRenderer.invoke('codigosEgreso:getAll'),
    create: (data) => ipcRenderer.invoke('codigosEgreso:create', data),
    update: (codigo, data) => ipcRenderer.invoke('codigosEgreso:update', { codigo, data }),
    delete: (codigo) => ipcRenderer.invoke('codigosEgreso:delete', codigo)
  },

  // Movimientos
  movimientos: {
    getAll: (filtros) => ipcRenderer.invoke('movimientos:getAll', filtros),
    create: (data) => ipcRenderer.invoke('movimientos:create', data),
    update: (id, data) => ipcRenderer.invoke('movimientos:update', { id, data }),
    delete: (id) => ipcRenderer.invoke('movimientos:delete', id),
    getByDateRange: (fechaInicio, fechaFin) =>
      ipcRenderer.invoke('movimientos:getByDateRange', { fechaInicio, fechaFin })
  },

  // Saldos
  saldos: {
    getByCuenta: () => ipcRenderer.invoke('saldos:getByCuenta'),
    getByTercero: () => ipcRenderer.invoke('saldos:getByTercero'),
    getGeneral: () => ipcRenderer.invoke('saldos:getGeneral')
  },

  // Reportes
  reportes: {
    getResumenPorConcepto: (fechaInicio, fechaFin, tipo) =>
      ipcRenderer.invoke('reportes:getResumenPorConcepto', { fechaInicio, fechaFin, tipo }),
    getResumenPorPeriodo: (fechaInicio, fechaFin, agrupacion) =>
      ipcRenderer.invoke('reportes:getResumenPorPeriodo', { fechaInicio, fechaFin, agrupacion }),
    getResumenPorTercero: (fechaInicio, fechaFin) =>
      ipcRenderer.invoke('reportes:getResumenPorTercero', { fechaInicio, fechaFin }),
    getComparativo: (periodo1, periodo2) =>
      ipcRenderer.invoke('reportes:getComparativo', { periodo1, periodo2 })
  },

  // Exportación
  export: {
    selectPath: (options) => ipcRenderer.invoke('export:selectPath', options)
  },

  // Utilidades
  app: {
    getVersion: () => ipcRenderer.invoke('app:getVersion'),
    isOnline: () => ipcRenderer.invoke('app:isOnline')
  }
});
