import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import {
  FiPlus,
  FiTrash2,
  FiDownload,
  FiFilter,
  FiRefreshCw,
  FiCalendar,
  FiAlertCircle
} from 'react-icons/fi';
import { format, startOfMonth, endOfMonth, startOfYear } from 'date-fns';
import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

const Movimientos = () => {
  const gridRef = useRef();
  const {
    movimientos,
    terceros,
    codigosIngreso,
    codigosEgreso,
    createMovimiento,
    updateMovimiento,
    deleteMovimiento,
    refreshMovimientos,
    formatMonto
  } = useData();
  const { canDeleteMovimientos, user } = useAuth();

  const [filtros, setFiltros] = useState({
    fechaInicio: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    fechaFin: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
    tipo: '',
    codigoTercero: ''
  });

  const [selectedRows, setSelectedRows] = useState([]);
  const [showNuevoModal, setShowNuevoModal] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [totales, setTotales] = useState({ ingresos: 0, egresos: 0, saldo: 0 });

  // Cargar datos filtrados
  useEffect(() => {
    cargarMovimientos();
  }, [filtros]);

  // Calcular totales
  useEffect(() => {
    const ingresos = movimientos
      .filter(m => m.tipo === 'ingreso')
      .reduce((sum, m) => sum + m.monto, 0);
    const egresos = movimientos
      .filter(m => m.tipo === 'egreso')
      .reduce((sum, m) => sum + m.monto, 0);

    setTotales({
      ingresos,
      egresos,
      saldo: ingresos - egresos
    });
  }, [movimientos]);

  const cargarMovimientos = async () => {
    await refreshMovimientos(filtros);
  };

  // Configuración de columnas para AG-Grid
  const columnDefs = useMemo(() => [
    {
      headerName: '',
      field: 'checkbox',
      checkboxSelection: true,
      headerCheckboxSelection: true,
      width: 50,
      pinned: 'left',
      lockPosition: true
    },
    {
      headerName: 'Fecha',
      field: 'fecha',
      width: 120,
      editable: true,
      cellEditor: 'agDateCellEditor',
      valueFormatter: (params) => {
        if (!params.value) return '';
        return format(new Date(params.value + 'T00:00:00'), 'dd/MM/yyyy');
      },
      cellStyle: { fontWeight: 500 }
    },
    {
      headerName: 'Tipo',
      field: 'tipo',
      width: 100,
      editable: true,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: {
        values: ['ingreso', 'egreso']
      },
      cellRenderer: (params) => {
        const tipo = params.value;
        return `<span class="badge badge-${tipo}">${tipo === 'ingreso' ? 'Ingreso' : 'Egreso'}</span>`;
      }
    },
    {
      headerName: 'Código',
      field: 'codigo_operacion',
      width: 90,
      editable: true,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: (params) => {
        const tipo = params.data.tipo;
        if (tipo === 'ingreso') {
          return { values: codigosIngreso.map(c => c.codigo) };
        }
        return { values: codigosEgreso.map(c => c.codigo) };
      },
      cellStyle: { fontWeight: 600, textAlign: 'center' }
    },
    {
      headerName: 'Concepto',
      field: 'concepto_operacion',
      flex: 2,
      minWidth: 250,
      editable: false,
      cellStyle: { fontSize: '12px' }
    },
    {
      headerName: 'Cód. Tercero',
      field: 'codigo_tercero',
      width: 110,
      editable: true,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: {
        values: ['', ...terceros.map(t => t.codigo)]
      }
    },
    {
      headerName: 'Tercero',
      field: 'nombre_tercero',
      flex: 1,
      minWidth: 150,
      editable: false
    },
    {
      headerName: 'Monto',
      field: 'monto',
      width: 140,
      editable: true,
      type: 'numericColumn',
      valueFormatter: (params) => formatMonto(params.value || 0),
      cellStyle: (params) => ({
        fontWeight: 600,
        fontFamily: "'Consolas', 'Monaco', monospace",
        color: params.data?.tipo === 'ingreso' ? '#48bb78' : '#f56565',
        textAlign: 'right'
      })
    },
    {
      headerName: 'Detalle',
      field: 'detalle',
      flex: 1,
      minWidth: 200,
      editable: true,
      cellEditor: 'agTextCellEditor'
    },
    {
      headerName: 'Revisión',
      field: 'revision',
      width: 100,
      editable: true,
      cellEditor: 'agTextCellEditor'
    }
  ], [codigosIngreso, codigosEgreso, terceros, formatMonto]);

  const defaultColDef = useMemo(() => ({
    sortable: true,
    filter: true,
    resizable: true
  }), []);

  // Manejar cambios en celdas
  const onCellValueChanged = useCallback(async (event) => {
    const { data, colDef, newValue, oldValue } = event;

    if (newValue === oldValue) return;

    // Si cambió el tipo, actualizar el código de operación
    let updateData = { ...data };

    if (colDef.field === 'tipo') {
      updateData.codigo_operacion = newValue === 'ingreso'
        ? codigosIngreso[0]?.codigo
        : codigosEgreso[0]?.codigo;
    }

    // Si cambió el código de operación, actualizar el concepto
    if (colDef.field === 'codigo_operacion') {
      const codigos = data.tipo === 'ingreso' ? codigosIngreso : codigosEgreso;
      const codigo = codigos.find(c => c.codigo === newValue);
      updateData.concepto_operacion = codigo?.concepto || '';
    }

    // Si cambió el código de tercero, actualizar el nombre
    if (colDef.field === 'codigo_tercero') {
      const tercero = terceros.find(t => t.codigo === newValue);
      updateData.nombre_tercero = tercero?.nombre || '';
    }

    const result = await updateMovimiento(data.id, {
      fecha: updateData.fecha,
      tipo: updateData.tipo,
      codigo_operacion: updateData.codigo_operacion,
      codigo_tercero: updateData.codigo_tercero,
      monto: parseFloat(updateData.monto) || 0,
      detalle: updateData.detalle,
      revision: updateData.revision
    });

    if (!result.success) {
      // Revertir cambios
      event.api.undoCellEditing();
    }
  }, [codigosIngreso, codigosEgreso, terceros, updateMovimiento]);

  // Manejar selección de filas
  const onSelectionChanged = useCallback(() => {
    const selectedNodes = gridRef.current.api.getSelectedNodes();
    setSelectedRows(selectedNodes.map(node => node.data));
  }, []);

  // Eliminar movimientos seleccionados
  const handleDeleteSelected = async () => {
    if (selectedRows.length === 0) return;

    if (!window.confirm(`¿Está seguro de eliminar ${selectedRows.length} movimiento(s)?`)) {
      return;
    }

    for (const row of selectedRows) {
      await deleteMovimiento(row.id);
    }

    setSelectedRows([]);
  };

  // Exportar a Excel
  const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Movimientos');

    // Configurar columnas
    worksheet.columns = [
      { header: 'Fecha', key: 'fecha', width: 12 },
      { header: 'Tipo', key: 'tipo', width: 10 },
      { header: 'Código', key: 'codigo_operacion', width: 10 },
      { header: 'Concepto', key: 'concepto_operacion', width: 40 },
      { header: 'Cód. Tercero', key: 'codigo_tercero', width: 12 },
      { header: 'Tercero', key: 'nombre_tercero', width: 25 },
      { header: 'Monto', key: 'monto', width: 15 },
      { header: 'Detalle', key: 'detalle', width: 30 },
      { header: 'Revisión', key: 'revision', width: 12 }
    ];

    // Estilo de encabezados
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1A365D' }
    };
    worksheet.getRow(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };

    // Agregar datos
    movimientos.forEach(mov => {
      const row = worksheet.addRow({
        fecha: format(new Date(mov.fecha + 'T00:00:00'), 'dd/MM/yyyy'),
        tipo: mov.tipo === 'ingreso' ? 'Ingreso' : 'Egreso',
        codigo_operacion: mov.codigo_operacion,
        concepto_operacion: mov.concepto_operacion,
        codigo_tercero: mov.codigo_tercero,
        nombre_tercero: mov.nombre_tercero,
        monto: mov.monto,
        detalle: mov.detalle,
        revision: mov.revision
      });

      // Color según tipo
      if (mov.tipo === 'ingreso') {
        row.getCell('monto').font = { color: { argb: 'FF48BB78' } };
      } else {
        row.getCell('monto').font = { color: { argb: 'FFF56565' } };
      }
    });

    // Agregar totales
    worksheet.addRow({});
    const totalesRow = worksheet.addRow({
      concepto_operacion: 'TOTALES:',
      monto: totales.saldo
    });
    totalesRow.font = { bold: true };

    // Formato de moneda
    worksheet.getColumn('monto').numFmt = '"$"#,##0';

    // Guardar archivo
    const result = await window.electronAPI.export.selectPath({
      defaultName: `Movimientos_${format(new Date(), 'yyyyMMdd')}.xlsx`,
      filters: [{ name: 'Excel', extensions: ['xlsx'] }]
    });

    if (!result.canceled) {
      const buffer = await workbook.xlsx.writeBuffer();
      // En Electron, necesitamos usar el sistema de archivos
      const fs = window.require('fs');
      fs.writeFileSync(result.filePath, Buffer.from(buffer));
      toast.success('Archivo Excel exportado correctamente');
    }
  };

  // Exportar a PDF
  const exportToPDF = async () => {
    const doc = new jsPDF('l', 'mm', 'a4');

    doc.setFontSize(18);
    doc.text('Movimientos de Caja', 14, 22);

    doc.setFontSize(10);
    doc.text(`Período: ${format(new Date(filtros.fechaInicio), 'dd/MM/yyyy')} - ${format(new Date(filtros.fechaFin), 'dd/MM/yyyy')}`, 14, 30);

    doc.autoTable({
      startY: 35,
      head: [['Fecha', 'Tipo', 'Código', 'Concepto', 'Tercero', 'Monto', 'Detalle']],
      body: movimientos.map(mov => [
        format(new Date(mov.fecha + 'T00:00:00'), 'dd/MM/yyyy'),
        mov.tipo === 'ingreso' ? 'Ingreso' : 'Egreso',
        mov.codigo_operacion,
        mov.concepto_operacion?.substring(0, 30),
        mov.nombre_tercero || '-',
        formatMonto(mov.monto),
        mov.detalle?.substring(0, 20) || ''
      ]),
      foot: [['', '', '', '', 'TOTAL:', formatMonto(totales.saldo), '']],
      styles: { fontSize: 8 },
      headStyles: { fillColor: [26, 54, 93] },
      footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' }
    });

    const result = await window.electronAPI.export.selectPath({
      defaultName: `Movimientos_${format(new Date(), 'yyyyMMdd')}.pdf`,
      filters: [{ name: 'PDF', extensions: ['pdf'] }]
    });

    if (!result.canceled) {
      doc.save(result.filePath);
      toast.success('Archivo PDF exportado correctamente');
    }
  };

  // Calcular saldo acumulado para cada fila
  const rowDataWithSaldo = useMemo(() => {
    let saldoAcumulado = 0;
    return [...movimientos].reverse().map(mov => {
      if (mov.tipo === 'ingreso') {
        saldoAcumulado += mov.monto;
      } else {
        saldoAcumulado -= mov.monto;
      }
      return { ...mov, saldo_acumulado: saldoAcumulado };
    }).reverse();
  }, [movimientos]);

  return (
    <div>
      {/* Barra de filtros */}
      <div className="filters">
        <div className="filter-group">
          <label><FiCalendar size={12} /> Desde</label>
          <input
            type="date"
            value={filtros.fechaInicio}
            onChange={(e) => setFiltros({ ...filtros, fechaInicio: e.target.value })}
          />
        </div>
        <div className="filter-group">
          <label><FiCalendar size={12} /> Hasta</label>
          <input
            type="date"
            value={filtros.fechaFin}
            onChange={(e) => setFiltros({ ...filtros, fechaFin: e.target.value })}
          />
        </div>
        <div className="filter-group">
          <label><FiFilter size={12} /> Tipo</label>
          <select
            value={filtros.tipo}
            onChange={(e) => setFiltros({ ...filtros, tipo: e.target.value })}
          >
            <option value="">Todos</option>
            <option value="ingreso">Ingresos</option>
            <option value="egreso">Egresos</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Tercero</label>
          <select
            value={filtros.codigoTercero}
            onChange={(e) => setFiltros({ ...filtros, codigoTercero: e.target.value })}
          >
            <option value="">Todos</option>
            {terceros.map(t => (
              <option key={t.codigo} value={t.codigo}>{t.codigo} - {t.nombre}</option>
            ))}
          </select>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary btn-sm" onClick={cargarMovimientos}>
            <FiRefreshCw size={14} /> Actualizar
          </button>
          <button className="btn btn-success btn-sm" onClick={() => setShowNuevoModal(true)}>
            <FiPlus size={14} /> Nuevo
          </button>
          {canDeleteMovimientos() && selectedRows.length > 0 && (
            <button className="btn btn-danger btn-sm" onClick={handleDeleteSelected}>
              <FiTrash2 size={14} /> Eliminar ({selectedRows.length})
            </button>
          )}
          <button className="btn btn-secondary btn-sm" onClick={exportToExcel}>
            <FiDownload size={14} /> Excel
          </button>
          <button className="btn btn-secondary btn-sm" onClick={exportToPDF}>
            <FiDownload size={14} /> PDF
          </button>
        </div>
      </div>

      {/* Resumen de totales */}
      <div style={styles.totalesBar}>
        <div style={styles.totalItem}>
          <span style={styles.totalLabel}>Ingresos:</span>
          <span className="monto monto-ingreso">{formatMonto(totales.ingresos)}</span>
        </div>
        <div style={styles.totalItem}>
          <span style={styles.totalLabel}>Egresos:</span>
          <span className="monto monto-egreso">{formatMonto(totales.egresos)}</span>
        </div>
        <div style={styles.totalItem}>
          <span style={styles.totalLabel}>Saldo:</span>
          <span className="monto" style={{ color: totales.saldo >= 0 ? '#48bb78' : '#f56565' }}>
            {formatMonto(totales.saldo)}
          </span>
        </div>
        <div style={styles.diferencia}>
          {totales.saldo === 0 ? (
            <span style={{ color: '#48bb78' }}>OK Saldos</span>
          ) : (
            <span style={{ color: '#dd6b20' }}>
              <FiAlertCircle /> Diferencia: {formatMonto(Math.abs(totales.saldo))}
            </span>
          )}
        </div>
      </div>

      {/* AG-Grid */}
      <div className="ag-theme-alpine" style={{ height: 'calc(100vh - 340px)', width: '100%' }}>
        <AgGridReact
          ref={gridRef}
          rowData={rowDataWithSaldo}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          rowSelection="multiple"
          onSelectionChanged={onSelectionChanged}
          onCellValueChanged={onCellValueChanged}
          animateRows={true}
          enableCellTextSelection={true}
          suppressRowClickSelection={true}
          getRowId={(params) => params.data.id}
          overlayNoRowsTemplate="<span>No hay movimientos para mostrar</span>"
        />
      </div>

      {/* Modal Nuevo Movimiento */}
      {showNuevoModal && (
        <NuevoMovimientoModal
          onClose={() => setShowNuevoModal(false)}
          onCreate={createMovimiento}
          codigosIngreso={codigosIngreso}
          codigosEgreso={codigosEgreso}
          terceros={terceros}
          userId={user?.id}
        />
      )}
    </div>
  );
};

// Componente Modal para nuevo movimiento
const NuevoMovimientoModal = ({ onClose, onCreate, codigosIngreso, codigosEgreso, terceros, userId }) => {
  const [formData, setFormData] = useState({
    fecha: format(new Date(), 'yyyy-MM-dd'),
    tipo: 'ingreso',
    codigo_operacion: codigosIngreso[0]?.codigo || '',
    codigo_tercero: '',
    monto: '',
    detalle: '',
    revision: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const result = await onCreate({
      ...formData,
      monto: parseFloat(formData.monto) || 0,
      usuario_id: userId
    });

    setLoading(false);

    if (result.success) {
      onClose();
    }
  };

  const codigosActuales = formData.tipo === 'ingreso' ? codigosIngreso : codigosEgreso;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 600 }}>
        <div className="modal-header">
          <h2>Nuevo Movimiento</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Fecha</label>
                <input
                  type="date"
                  className="form-input"
                  value={formData.fecha}
                  onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Tipo</label>
                <select
                  className="form-select"
                  value={formData.tipo}
                  onChange={(e) => setFormData({
                    ...formData,
                    tipo: e.target.value,
                    codigo_operacion: e.target.value === 'ingreso'
                      ? codigosIngreso[0]?.codigo
                      : codigosEgreso[0]?.codigo
                  })}
                >
                  <option value="ingreso">Ingreso</option>
                  <option value="egreso">Egreso</option>
                </select>
              </div>
            </div>

            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Código de Operación</label>
                <select
                  className="form-select"
                  value={formData.codigo_operacion}
                  onChange={(e) => setFormData({ ...formData, codigo_operacion: e.target.value })}
                  required
                >
                  {codigosActuales.map(c => (
                    <option key={c.codigo} value={c.codigo}>
                      {c.codigo} - {c.concepto.substring(0, 40)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Tercero</label>
                <select
                  className="form-select"
                  value={formData.codigo_tercero}
                  onChange={(e) => setFormData({ ...formData, codigo_tercero: e.target.value })}
                >
                  <option value="">-- Sin tercero --</option>
                  {terceros.map(t => (
                    <option key={t.codigo} value={t.codigo}>
                      {t.codigo} - {t.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Monto</label>
              <input
                type="number"
                className="form-input"
                value={formData.monto}
                onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
                placeholder="0"
                min="0"
                step="1"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Detalle</label>
              <input
                type="text"
                className="form-input"
                value={formData.detalle}
                onChange={(e) => setFormData({ ...formData, detalle: e.target.value })}
                placeholder="Descripción adicional..."
              />
            </div>

            <div className="form-group">
              <label className="form-label">Revisión</label>
              <input
                type="text"
                className="form-input"
                value={formData.revision}
                onChange={(e) => setFormData({ ...formData, revision: e.target.value })}
                placeholder="Marca de revisión..."
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar Movimiento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const styles = {
  totalesBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 24,
    padding: '12px 20px',
    background: 'white',
    borderRadius: 8,
    marginBottom: 16,
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  totalItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8
  },
  totalLabel: {
    fontSize: 13,
    color: '#718096'
  },
  diferencia: {
    marginLeft: 'auto',
    fontWeight: 600,
    fontSize: 14
  }
};

export default Movimientos;
