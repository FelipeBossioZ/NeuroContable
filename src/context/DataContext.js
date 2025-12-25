import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';

const DataContext = createContext();

export const useData = () => useContext(DataContext);

export const DataProvider = ({ children }) => {
  const [terceros, setTerceros] = useState([]);
  const [codigosIngreso, setCodigosIngreso] = useState([]);
  const [codigosEgreso, setCodigosEgreso] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [saldoGeneral, setSaldoGeneral] = useState({ total_ingresos: 0, total_egresos: 0, saldo: 0 });
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);

  // Cargar datos iniciales
  const loadInitialData = useCallback(async () => {
    setLoading(true);
    try {
      const [tercerosData, ingresosData, egresosData, saldoData] = await Promise.all([
        window.electronAPI.terceros.getAll(),
        window.electronAPI.codigosIngreso.getAll(),
        window.electronAPI.codigosEgreso.getAll(),
        window.electronAPI.saldos.getGeneral()
      ]);

      setTerceros(tercerosData || []);
      setCodigosIngreso(ingresosData || []);
      setCodigosEgreso(egresosData || []);
      setSaldoGeneral(saldoData || { total_ingresos: 0, total_egresos: 0, saldo: 0 });

      // Cargar movimientos del año actual
      const year = new Date().getFullYear();
      const movimientosData = await window.electronAPI.movimientos.getAll({
        fechaInicio: `${year}-01-01`,
        fechaFin: `${year}-12-31`
      });
      setMovimientos(movimientosData || []);
    } catch (error) {
      console.error('Error cargando datos:', error);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  }, []);

  // Verificar estado de conexión
  useEffect(() => {
    const checkOnlineStatus = async () => {
      try {
        const online = await window.electronAPI.app.isOnline();
        setIsOnline(online);
      } catch (error) {
        setIsOnline(false);
      }
    };

    checkOnlineStatus();
    const interval = setInterval(checkOnlineStatus, 30000); // Verificar cada 30 segundos

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // ============== TERCEROS ==============
  const refreshTerceros = async () => {
    const data = await window.electronAPI.terceros.getAll();
    setTerceros(data || []);
  };

  const createTercero = async (data) => {
    const result = await window.electronAPI.terceros.create(data);
    if (result.success) {
      await refreshTerceros();
      toast.success('Tercero creado correctamente');
    } else {
      toast.error(result.message || 'Error al crear tercero');
    }
    return result;
  };

  const updateTercero = async (codigo, data) => {
    const result = await window.electronAPI.terceros.update(codigo, data);
    if (result.success) {
      await refreshTerceros();
      toast.success('Tercero actualizado correctamente');
    } else {
      toast.error(result.message || 'Error al actualizar tercero');
    }
    return result;
  };

  const deleteTercero = async (codigo) => {
    const result = await window.electronAPI.terceros.delete(codigo);
    if (result.success) {
      await refreshTerceros();
      toast.success('Tercero eliminado correctamente');
    } else {
      toast.error(result.message || 'Error al eliminar tercero');
    }
    return result;
  };

  // ============== CÓDIGOS DE INGRESO ==============
  const refreshCodigosIngreso = async () => {
    const data = await window.electronAPI.codigosIngreso.getAll();
    setCodigosIngreso(data || []);
  };

  const createCodigoIngreso = async (data) => {
    const result = await window.electronAPI.codigosIngreso.create(data);
    if (result.success) {
      await refreshCodigosIngreso();
      toast.success('Código de ingreso creado correctamente');
    } else {
      toast.error(result.message || 'Error al crear código de ingreso');
    }
    return result;
  };

  const updateCodigoIngreso = async (codigo, data) => {
    const result = await window.electronAPI.codigosIngreso.update(codigo, data);
    if (result.success) {
      await refreshCodigosIngreso();
      toast.success('Código de ingreso actualizado correctamente');
    } else {
      toast.error(result.message || 'Error al actualizar código de ingreso');
    }
    return result;
  };

  const deleteCodigoIngreso = async (codigo) => {
    const result = await window.electronAPI.codigosIngreso.delete(codigo);
    if (result.success) {
      await refreshCodigosIngreso();
      toast.success('Código de ingreso eliminado correctamente');
    } else {
      toast.error(result.message || 'Error al eliminar código de ingreso');
    }
    return result;
  };

  // ============== CÓDIGOS DE EGRESO ==============
  const refreshCodigosEgreso = async () => {
    const data = await window.electronAPI.codigosEgreso.getAll();
    setCodigosEgreso(data || []);
  };

  const createCodigoEgreso = async (data) => {
    const result = await window.electronAPI.codigosEgreso.create(data);
    if (result.success) {
      await refreshCodigosEgreso();
      toast.success('Código de egreso creado correctamente');
    } else {
      toast.error(result.message || 'Error al crear código de egreso');
    }
    return result;
  };

  const updateCodigoEgreso = async (codigo, data) => {
    const result = await window.electronAPI.codigosEgreso.update(codigo, data);
    if (result.success) {
      await refreshCodigosEgreso();
      toast.success('Código de egreso actualizado correctamente');
    } else {
      toast.error(result.message || 'Error al actualizar código de egreso');
    }
    return result;
  };

  const deleteCodigoEgreso = async (codigo) => {
    const result = await window.electronAPI.codigosEgreso.delete(codigo);
    if (result.success) {
      await refreshCodigosEgreso();
      toast.success('Código de egreso eliminado correctamente');
    } else {
      toast.error(result.message || 'Error al eliminar código de egreso');
    }
    return result;
  };

  // ============== MOVIMIENTOS ==============
  const refreshMovimientos = async (filtros = {}) => {
    const data = await window.electronAPI.movimientos.getAll(filtros);
    setMovimientos(data || []);
    // También actualizar saldo general
    const saldo = await window.electronAPI.saldos.getGeneral();
    setSaldoGeneral(saldo || { total_ingresos: 0, total_egresos: 0, saldo: 0 });
    return data;
  };

  const createMovimiento = async (data) => {
    const result = await window.electronAPI.movimientos.create(data);
    if (result.success) {
      await refreshMovimientos();
      toast.success('Movimiento registrado correctamente');
    } else {
      toast.error(result.message || 'Error al registrar movimiento');
    }
    return result;
  };

  const updateMovimiento = async (id, data) => {
    const result = await window.electronAPI.movimientos.update(id, data);
    if (result.success) {
      await refreshMovimientos();
      toast.success('Movimiento actualizado correctamente');
    } else {
      toast.error(result.message || 'Error al actualizar movimiento');
    }
    return result;
  };

  const deleteMovimiento = async (id) => {
    const result = await window.electronAPI.movimientos.delete(id);
    if (result.success) {
      await refreshMovimientos();
      toast.success('Movimiento eliminado correctamente');
    } else {
      toast.error(result.message || 'Error al eliminar movimiento');
    }
    return result;
  };

  // ============== UTILIDADES ==============
  const getCodigoConcepto = (tipo, codigo) => {
    if (tipo === 'ingreso') {
      const found = codigosIngreso.find(c => c.codigo === codigo);
      return found ? found.concepto : codigo;
    } else {
      const found = codigosEgreso.find(c => c.codigo === codigo);
      return found ? found.concepto : codigo;
    }
  };

  const getTerceroNombre = (codigo) => {
    const found = terceros.find(t => t.codigo === codigo);
    return found ? found.nombre : codigo;
  };

  const formatMonto = (monto) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(monto);
  };

  const value = {
    // Data
    terceros,
    codigosIngreso,
    codigosEgreso,
    movimientos,
    saldoGeneral,
    loading,
    isOnline,

    // Refresh functions
    loadInitialData,
    refreshTerceros,
    refreshCodigosIngreso,
    refreshCodigosEgreso,
    refreshMovimientos,

    // CRUD Terceros
    createTercero,
    updateTercero,
    deleteTercero,

    // CRUD Códigos Ingreso
    createCodigoIngreso,
    updateCodigoIngreso,
    deleteCodigoIngreso,

    // CRUD Códigos Egreso
    createCodigoEgreso,
    updateCodigoEgreso,
    deleteCodigoEgreso,

    // CRUD Movimientos
    createMovimiento,
    updateMovimiento,
    deleteMovimiento,

    // Utilidades
    getCodigoConcepto,
    getTerceroNombre,
    formatMonto
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};
