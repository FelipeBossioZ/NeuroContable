import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Bar, Line, Pie } from 'react-chartjs-2';
import {
  FiCalendar,
  FiDownload,
  FiBarChart2,
  FiPieChart,
  FiTrendingUp
} from 'react-icons/fi';
import { format, subMonths, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { es } from 'date-fns/locale';
import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const Reportes = () => {
  const { formatMonto } = useData();
  const [tipoReporte, setTipoReporte] = useState('periodo');
  const [filtros, setFiltros] = useState({
    fechaInicio: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    fechaFin: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
    agrupacion: 'diario'
  });
  const [datosReporte, setDatosReporte] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    cargarReporte();
  }, [tipoReporte, filtros]);

  const cargarReporte = async () => {
    setLoading(true);
    try {
      let datos;
      switch (tipoReporte) {
        case 'periodo':
          datos = await window.electronAPI.reportes.getResumenPorPeriodo(
            filtros.fechaInicio,
            filtros.fechaFin,
            filtros.agrupacion
          );
          break;
        case 'conceptoIngreso':
          datos = await window.electronAPI.reportes.getResumenPorConcepto(
            filtros.fechaInicio,
            filtros.fechaFin,
            'ingreso'
          );
          break;
        case 'conceptoEgreso':
          datos = await window.electronAPI.reportes.getResumenPorConcepto(
            filtros.fechaInicio,
            filtros.fechaFin,
            'egreso'
          );
          break;
        case 'tercero':
          datos = await window.electronAPI.reportes.getResumenPorTercero(
            filtros.fechaInicio,
            filtros.fechaFin
          );
          break;
        default:
          datos = [];
      }
      setDatosReporte(datos || []);
    } catch (error) {
      console.error('Error cargando reporte:', error);
    }
    setLoading(false);
  };

  const aplicarPreset = (preset) => {
    const hoy = new Date();
    let fechaInicio, fechaFin;

    switch (preset) {
      case 'esteMes':
        fechaInicio = startOfMonth(hoy);
        fechaFin = endOfMonth(hoy);
        break;
      case 'mesAnterior':
        fechaInicio = startOfMonth(subMonths(hoy, 1));
        fechaFin = endOfMonth(subMonths(hoy, 1));
        break;
      case 'ultimos3Meses':
        fechaInicio = startOfMonth(subMonths(hoy, 2));
        fechaFin = endOfMonth(hoy);
        break;
      case 'esteAno':
        fechaInicio = startOfYear(hoy);
        fechaFin = endOfYear(hoy);
        break;
      default:
        return;
    }

    setFiltros({
      ...filtros,
      fechaInicio: format(fechaInicio, 'yyyy-MM-dd'),
      fechaFin: format(fechaFin, 'yyyy-MM-dd')
    });
  };

  // Colores para gráficas
  const colores = [
    '#4299e1', '#48bb78', '#ed8936', '#9f7aea', '#f56565',
    '#38b2ac', '#667eea', '#ed64a6', '#ecc94b', '#fc8181'
  ];

  // Configurar datos de gráficas según el tipo de reporte
  const getChartData = () => {
    if (tipoReporte === 'periodo') {
      return {
        labels: datosReporte.map(d => {
          if (filtros.agrupacion === 'mensual') {
            return d.periodo;
          }
          const fecha = new Date(d.periodo + 'T00:00:00');
          return format(fecha, 'dd MMM', { locale: es });
        }),
        datasets: [
          {
            label: 'Ingresos',
            data: datosReporte.map(d => d.ingresos || 0),
            backgroundColor: '#48bb78',
            borderColor: '#48bb78',
            borderWidth: 2
          },
          {
            label: 'Egresos',
            data: datosReporte.map(d => d.egresos || 0),
            backgroundColor: '#f56565',
            borderColor: '#f56565',
            borderWidth: 2
          }
        ]
      };
    }

    if (tipoReporte === 'conceptoIngreso' || tipoReporte === 'conceptoEgreso') {
      const filtered = datosReporte.filter(d => d.total > 0).slice(0, 10);
      return {
        labels: filtered.map(d => `${d.codigo} - ${d.concepto?.substring(0, 20)}`),
        datasets: [{
          data: filtered.map(d => d.total),
          backgroundColor: colores,
          borderWidth: 0
        }]
      };
    }

    if (tipoReporte === 'tercero') {
      const filtered = datosReporte.filter(d => d.ingresos > 0 || d.egresos > 0);
      return {
        labels: filtered.map(d => d.nombre?.substring(0, 15) || d.codigo),
        datasets: [
          {
            label: 'Ingresos',
            data: filtered.map(d => d.ingresos || 0),
            backgroundColor: '#48bb78'
          },
          {
            label: 'Egresos',
            data: filtered.map(d => d.egresos || 0),
            backgroundColor: '#f56565'
          }
        ]
      };
    }

    return { labels: [], datasets: [] };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom'
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            return `${context.dataset.label || ''}: ${formatMonto(context.raw)}`;
          }
        }
      }
    },
    scales: tipoReporte !== 'conceptoIngreso' && tipoReporte !== 'conceptoEgreso' ? {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value) => formatMonto(value)
        }
      }
    } : undefined
  };

  // Calcular totales
  const totales = datosReporte.reduce((acc, d) => ({
    ingresos: acc.ingresos + (d.ingresos || d.total || 0),
    egresos: acc.egresos + (d.egresos || 0),
    cantidad: acc.cantidad + (d.cantidad || 1)
  }), { ingresos: 0, egresos: 0, cantidad: 0 });

  // Exportar reporte
  const exportarExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Reporte');

    // Título
    worksheet.mergeCells('A1:E1');
    worksheet.getCell('A1').value = `Reporte: ${getTituloReporte()}`;
    worksheet.getCell('A1').font = { bold: true, size: 14 };

    worksheet.mergeCells('A2:E2');
    worksheet.getCell('A2').value = `Período: ${format(new Date(filtros.fechaInicio), 'dd/MM/yyyy')} - ${format(new Date(filtros.fechaFin), 'dd/MM/yyyy')}`;

    // Datos según tipo de reporte
    if (tipoReporte === 'periodo') {
      worksheet.addRow([]);
      worksheet.addRow(['Período', 'Ingresos', 'Egresos', 'Saldo']);
      datosReporte.forEach(d => {
        worksheet.addRow([d.periodo, d.ingresos, d.egresos, d.saldo]);
      });
    } else if (tipoReporte === 'conceptoIngreso' || tipoReporte === 'conceptoEgreso') {
      worksheet.addRow([]);
      worksheet.addRow(['Código', 'Concepto', 'Cantidad', 'Total']);
      datosReporte.forEach(d => {
        worksheet.addRow([d.codigo, d.concepto, d.cantidad, d.total]);
      });
    } else if (tipoReporte === 'tercero') {
      worksheet.addRow([]);
      worksheet.addRow(['Código', 'Tercero', 'Ingresos', 'Egresos', 'Saldo']);
      datosReporte.forEach(d => {
        worksheet.addRow([d.codigo, d.nombre, d.ingresos, d.egresos, d.saldo]);
      });
    }

    const result = await window.electronAPI.export.selectPath({
      defaultName: `Reporte_${tipoReporte}_${format(new Date(), 'yyyyMMdd')}.xlsx`,
      filters: [{ name: 'Excel', extensions: ['xlsx'] }]
    });

    if (!result.canceled) {
      const buffer = await workbook.xlsx.writeBuffer();
      const fs = window.require('fs');
      fs.writeFileSync(result.filePath, Buffer.from(buffer));
    }
  };

  const exportarPDF = async () => {
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text(getTituloReporte(), 14, 20);

    doc.setFontSize(10);
    doc.text(`Período: ${format(new Date(filtros.fechaInicio), 'dd/MM/yyyy')} - ${format(new Date(filtros.fechaFin), 'dd/MM/yyyy')}`, 14, 28);

    let columns, rows;

    if (tipoReporte === 'periodo') {
      columns = ['Período', 'Ingresos', 'Egresos', 'Saldo'];
      rows = datosReporte.map(d => [d.periodo, formatMonto(d.ingresos), formatMonto(d.egresos), formatMonto(d.saldo)]);
    } else if (tipoReporte === 'conceptoIngreso' || tipoReporte === 'conceptoEgreso') {
      columns = ['Código', 'Concepto', 'Cantidad', 'Total'];
      rows = datosReporte.map(d => [d.codigo, d.concepto?.substring(0, 40), d.cantidad, formatMonto(d.total)]);
    } else {
      columns = ['Código', 'Tercero', 'Ingresos', 'Egresos', 'Saldo'];
      rows = datosReporte.map(d => [d.codigo, d.nombre?.substring(0, 25), formatMonto(d.ingresos), formatMonto(d.egresos), formatMonto(d.saldo)]);
    }

    doc.autoTable({
      startY: 35,
      head: [columns],
      body: rows,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [26, 54, 93] }
    });

    const result = await window.electronAPI.export.selectPath({
      defaultName: `Reporte_${tipoReporte}_${format(new Date(), 'yyyyMMdd')}.pdf`,
      filters: [{ name: 'PDF', extensions: ['pdf'] }]
    });

    if (!result.canceled) {
      doc.save(result.filePath);
    }
  };

  const getTituloReporte = () => {
    const titulos = {
      periodo: 'Resumen por Período',
      conceptoIngreso: 'Ingresos por Concepto',
      conceptoEgreso: 'Egresos por Concepto',
      tercero: 'Movimientos por Tercero'
    };
    return titulos[tipoReporte] || 'Reporte';
  };

  return (
    <div>
      {/* Selector de tipo de reporte */}
      <div className="tabs" style={{ marginBottom: 20 }}>
        <button
          className={`tab ${tipoReporte === 'periodo' ? 'active' : ''}`}
          onClick={() => setTipoReporte('periodo')}
        >
          <FiTrendingUp size={14} style={{ marginRight: 6 }} />
          Por Período
        </button>
        <button
          className={`tab ${tipoReporte === 'conceptoIngreso' ? 'active' : ''}`}
          onClick={() => setTipoReporte('conceptoIngreso')}
        >
          <FiPieChart size={14} style={{ marginRight: 6 }} />
          Ingresos por Concepto
        </button>
        <button
          className={`tab ${tipoReporte === 'conceptoEgreso' ? 'active' : ''}`}
          onClick={() => setTipoReporte('conceptoEgreso')}
        >
          <FiPieChart size={14} style={{ marginRight: 6 }} />
          Egresos por Concepto
        </button>
        <button
          className={`tab ${tipoReporte === 'tercero' ? 'active' : ''}`}
          onClick={() => setTipoReporte('tercero')}
        >
          <FiBarChart2 size={14} style={{ marginRight: 6 }} />
          Por Tercero
        </button>
      </div>

      {/* Filtros */}
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

        {tipoReporte === 'periodo' && (
          <div className="filter-group">
            <label>Agrupar por</label>
            <select
              value={filtros.agrupacion}
              onChange={(e) => setFiltros({ ...filtros, agrupacion: e.target.value })}
            >
              <option value="diario">Diario</option>
              <option value="semanal">Semanal</option>
              <option value="mensual">Mensual</option>
            </select>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => aplicarPreset('esteMes')}>
            Este mes
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => aplicarPreset('mesAnterior')}>
            Mes anterior
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => aplicarPreset('ultimos3Meses')}>
            Últimos 3 meses
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => aplicarPreset('esteAno')}>
            Este año
          </button>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary btn-sm" onClick={exportarExcel}>
            <FiDownload size={14} /> Excel
          </button>
          <button className="btn btn-secondary btn-sm" onClick={exportarPDF}>
            <FiDownload size={14} /> PDF
          </button>
        </div>
      </div>

      {/* Contenido del reporte */}
      <div className="grid grid-2" style={{ gap: 24 }}>
        {/* Gráfica */}
        <div className="card">
          <h3 style={styles.cardTitle}>{getTituloReporte()}</h3>
          <div style={{ height: 350 }}>
            {loading ? (
              <div className="loading"><div className="spinner"></div></div>
            ) : datosReporte.length > 0 ? (
              tipoReporte === 'conceptoIngreso' || tipoReporte === 'conceptoEgreso' ? (
                <Pie data={getChartData()} options={chartOptions} />
              ) : tipoReporte === 'periodo' ? (
                <Line data={getChartData()} options={chartOptions} />
              ) : (
                <Bar data={getChartData()} options={chartOptions} />
              )
            ) : (
              <div className="empty-state">
                <p>No hay datos para el período seleccionado</p>
              </div>
            )}
          </div>
        </div>

        {/* Tabla resumen */}
        <div className="card">
          <h3 style={styles.cardTitle}>Detalle</h3>
          <div style={{ maxHeight: 350, overflowY: 'auto' }}>
            <table>
              <thead>
                <tr>
                  {tipoReporte === 'periodo' && (
                    <>
                      <th>Período</th>
                      <th style={{ textAlign: 'right' }}>Ingresos</th>
                      <th style={{ textAlign: 'right' }}>Egresos</th>
                      <th style={{ textAlign: 'right' }}>Saldo</th>
                    </>
                  )}
                  {(tipoReporte === 'conceptoIngreso' || tipoReporte === 'conceptoEgreso') && (
                    <>
                      <th>Código</th>
                      <th>Concepto</th>
                      <th style={{ textAlign: 'right' }}>Total</th>
                    </>
                  )}
                  {tipoReporte === 'tercero' && (
                    <>
                      <th>Tercero</th>
                      <th style={{ textAlign: 'right' }}>Ingresos</th>
                      <th style={{ textAlign: 'right' }}>Egresos</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {datosReporte.slice(0, 15).map((d, i) => (
                  <tr key={i}>
                    {tipoReporte === 'periodo' && (
                      <>
                        <td>{d.periodo}</td>
                        <td style={{ textAlign: 'right' }} className="monto monto-ingreso">{formatMonto(d.ingresos)}</td>
                        <td style={{ textAlign: 'right' }} className="monto monto-egreso">{formatMonto(d.egresos)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatMonto(d.saldo)}</td>
                      </>
                    )}
                    {(tipoReporte === 'conceptoIngreso' || tipoReporte === 'conceptoEgreso') && (
                      <>
                        <td><strong>{d.codigo}</strong></td>
                        <td style={{ fontSize: 12 }}>{d.concepto?.substring(0, 30)}</td>
                        <td style={{ textAlign: 'right' }} className="monto">{formatMonto(d.total)}</td>
                      </>
                    )}
                    {tipoReporte === 'tercero' && (
                      <>
                        <td>{d.nombre?.substring(0, 20)}</td>
                        <td style={{ textAlign: 'right' }} className="monto monto-ingreso">{formatMonto(d.ingresos)}</td>
                        <td style={{ textAlign: 'right' }} className="monto monto-egreso">{formatMonto(d.egresos)}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Totales */}
      <div className="card" style={{ marginTop: 24 }}>
        <div style={styles.totalesGrid}>
          <div style={styles.totalBox}>
            <span style={styles.totalLabel}>Total Ingresos</span>
            <span className="monto monto-ingreso" style={styles.totalValue}>
              {formatMonto(totales.ingresos)}
            </span>
          </div>
          <div style={styles.totalBox}>
            <span style={styles.totalLabel}>Total Egresos</span>
            <span className="monto monto-egreso" style={styles.totalValue}>
              {formatMonto(totales.egresos)}
            </span>
          </div>
          <div style={styles.totalBox}>
            <span style={styles.totalLabel}>Saldo</span>
            <span className="monto" style={{
              ...styles.totalValue,
              color: (totales.ingresos - totales.egresos) >= 0 ? '#48bb78' : '#f56565'
            }}>
              {formatMonto(totales.ingresos - totales.egresos)}
            </span>
          </div>
          <div style={styles.totalBox}>
            <span style={styles.totalLabel}>Registros</span>
            <span style={styles.totalValue}>{datosReporte.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  cardTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: '#2d3748',
    margin: 0,
    marginBottom: 16
  },
  totalesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 20
  },
  totalBox: {
    textAlign: 'center'
  },
  totalLabel: {
    display: 'block',
    fontSize: 13,
    color: '#718096',
    marginBottom: 4
  },
  totalValue: {
    fontSize: 24,
    fontWeight: 700
  }
};

export default Reportes;
