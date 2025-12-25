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
  Legend,
  Filler
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import {
  FiTrendingUp,
  FiTrendingDown,
  FiDollarSign,
  FiActivity,
  FiCalendar
} from 'react-icons/fi';
import { format, subDays, startOfMonth, endOfMonth, startOfYear } from 'date-fns';
import { es } from 'date-fns/locale';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const Dashboard = () => {
  const { movimientos, saldoGeneral, formatMonto, codigosIngreso, codigosEgreso } = useData();
  const [resumenPeriodo, setResumenPeriodo] = useState([]);
  const [resumenConceptosIngreso, setResumenConceptosIngreso] = useState([]);
  const [resumenConceptosEgreso, setResumenConceptosEgreso] = useState([]);
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState('mes');

  useEffect(() => {
    cargarDatos();
  }, [periodoSeleccionado, movimientos]);

  const cargarDatos = async () => {
    let fechaInicio, fechaFin;
    const hoy = new Date();

    switch (periodoSeleccionado) {
      case 'semana':
        fechaInicio = format(subDays(hoy, 7), 'yyyy-MM-dd');
        fechaFin = format(hoy, 'yyyy-MM-dd');
        break;
      case 'mes':
        fechaInicio = format(startOfMonth(hoy), 'yyyy-MM-dd');
        fechaFin = format(endOfMonth(hoy), 'yyyy-MM-dd');
        break;
      case 'ano':
        fechaInicio = format(startOfYear(hoy), 'yyyy-MM-dd');
        fechaFin = format(hoy, 'yyyy-MM-dd');
        break;
      default:
        fechaInicio = format(startOfMonth(hoy), 'yyyy-MM-dd');
        fechaFin = format(endOfMonth(hoy), 'yyyy-MM-dd');
    }

    try {
      const [periodo, ingreso, egreso] = await Promise.all([
        window.electronAPI.reportes.getResumenPorPeriodo(fechaInicio, fechaFin, 'diario'),
        window.electronAPI.reportes.getResumenPorConcepto(fechaInicio, fechaFin, 'ingreso'),
        window.electronAPI.reportes.getResumenPorConcepto(fechaInicio, fechaFin, 'egreso')
      ]);

      setResumenPeriodo(periodo || []);
      setResumenConceptosIngreso(ingreso?.filter(c => c.total > 0) || []);
      setResumenConceptosEgreso(egreso?.filter(c => c.total > 0) || []);
    } catch (error) {
      console.error('Error cargando datos del dashboard:', error);
    }
  };

  // Datos para gráfica de línea (Evolución del saldo)
  const lineChartData = {
    labels: resumenPeriodo.map(r => {
      const fecha = new Date(r.periodo + 'T00:00:00');
      return format(fecha, 'dd MMM', { locale: es });
    }),
    datasets: [
      {
        label: 'Ingresos',
        data: resumenPeriodo.map(r => r.ingresos),
        borderColor: '#48bb78',
        backgroundColor: 'rgba(72, 187, 120, 0.1)',
        fill: true,
        tension: 0.4
      },
      {
        label: 'Egresos',
        data: resumenPeriodo.map(r => r.egresos),
        borderColor: '#f56565',
        backgroundColor: 'rgba(245, 101, 101, 0.1)',
        fill: true,
        tension: 0.4
      }
    ]
  };

  // Datos para gráfica de barras (Comparativo)
  const barChartData = {
    labels: resumenPeriodo.slice(-7).map(r => {
      const fecha = new Date(r.periodo + 'T00:00:00');
      return format(fecha, 'EEE', { locale: es });
    }),
    datasets: [
      {
        label: 'Ingresos',
        data: resumenPeriodo.slice(-7).map(r => r.ingresos),
        backgroundColor: '#48bb78',
        borderRadius: 4
      },
      {
        label: 'Egresos',
        data: resumenPeriodo.slice(-7).map(r => r.egresos),
        backgroundColor: '#f56565',
        borderRadius: 4
      }
    ]
  };

  // Datos para gráfica de dona (Ingresos por concepto)
  const colores = [
    '#4299e1', '#48bb78', '#ed8936', '#9f7aea', '#f56565',
    '#38b2ac', '#667eea', '#ed64a6', '#ecc94b', '#fc8181'
  ];

  const doughnutIngresosData = {
    labels: resumenConceptosIngreso.slice(0, 8).map(c => c.codigo + ' - ' + c.concepto.substring(0, 20)),
    datasets: [{
      data: resumenConceptosIngreso.slice(0, 8).map(c => c.total),
      backgroundColor: colores,
      borderWidth: 0
    }]
  };

  const doughnutEgresosData = {
    labels: resumenConceptosEgreso.slice(0, 8).map(c => c.codigo + ' - ' + c.concepto.substring(0, 20)),
    datasets: [{
      data: resumenConceptosEgreso.slice(0, 8).map(c => c.total),
      backgroundColor: colores,
      borderWidth: 0
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom'
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value) => formatMonto(value)
        }
      }
    }
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          boxWidth: 12,
          font: { size: 11 }
        }
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = ((context.raw / total) * 100).toFixed(1);
            return `${formatMonto(context.raw)} (${percentage}%)`;
          }
        }
      }
    }
  };

  // Calcular totales del período
  const totalesPeriodo = resumenPeriodo.reduce((acc, r) => ({
    ingresos: acc.ingresos + r.ingresos,
    egresos: acc.egresos + r.egresos,
    saldo: acc.saldo + r.saldo
  }), { ingresos: 0, egresos: 0, saldo: 0 });

  return (
    <div>
      {/* Selector de período */}
      <div style={styles.periodSelector}>
        <FiCalendar size={16} />
        <select
          value={periodoSeleccionado}
          onChange={(e) => setPeriodoSeleccionado(e.target.value)}
          className="form-select"
          style={{ width: 'auto', padding: '8px 12px' }}
        >
          <option value="semana">Última semana</option>
          <option value="mes">Este mes</option>
          <option value="ano">Este año</option>
        </select>
      </div>

      {/* Tarjetas de resumen */}
      <div className="grid grid-4" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Total Ingresos</span>
            <div className="stat-card-icon" style={{ background: 'rgba(72, 187, 120, 0.15)', color: '#48bb78' }}>
              <FiTrendingUp />
            </div>
          </div>
          <div className="stat-card-value monto-ingreso">
            {formatMonto(totalesPeriodo.ingresos)}
          </div>
          <div className="stat-card-change" style={{ color: '#48bb78' }}>
            {movimientos.filter(m => m.tipo === 'ingreso').length} movimientos
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Total Egresos</span>
            <div className="stat-card-icon" style={{ background: 'rgba(245, 101, 101, 0.15)', color: '#f56565' }}>
              <FiTrendingDown />
            </div>
          </div>
          <div className="stat-card-value monto-egreso">
            {formatMonto(totalesPeriodo.egresos)}
          </div>
          <div className="stat-card-change" style={{ color: '#f56565' }}>
            {movimientos.filter(m => m.tipo === 'egreso').length} movimientos
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Saldo Período</span>
            <div className="stat-card-icon" style={{ background: 'rgba(66, 153, 225, 0.15)', color: '#4299e1' }}>
              <FiActivity />
            </div>
          </div>
          <div className="stat-card-value" style={{ color: totalesPeriodo.saldo >= 0 ? '#48bb78' : '#f56565' }}>
            {formatMonto(totalesPeriodo.saldo)}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Saldo General</span>
            <div className="stat-card-icon" style={{ background: 'rgba(159, 122, 234, 0.15)', color: '#9f7aea' }}>
              <FiDollarSign />
            </div>
          </div>
          <div className="stat-card-value" style={{ color: saldoGeneral.saldo >= 0 ? '#48bb78' : '#f56565' }}>
            {formatMonto(saldoGeneral.saldo)}
          </div>
        </div>
      </div>

      {/* Gráficas */}
      <div className="grid grid-2" style={{ marginBottom: 24 }}>
        <div className="card">
          <h3 style={styles.cardTitle}>Evolución de Ingresos vs Egresos</h3>
          <div style={{ height: 300 }}>
            {resumenPeriodo.length > 0 ? (
              <Line data={lineChartData} options={chartOptions} />
            ) : (
              <div className="empty-state">
                <p>No hay datos para mostrar</p>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <h3 style={styles.cardTitle}>Comparativo Últimos 7 Días</h3>
          <div style={{ height: 300 }}>
            {resumenPeriodo.length > 0 ? (
              <Bar data={barChartData} options={chartOptions} />
            ) : (
              <div className="empty-state">
                <p>No hay datos para mostrar</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h3 style={styles.cardTitle}>Ingresos por Concepto</h3>
          <div style={{ height: 300 }}>
            {resumenConceptosIngreso.length > 0 ? (
              <Doughnut data={doughnutIngresosData} options={doughnutOptions} />
            ) : (
              <div className="empty-state">
                <p>No hay ingresos en este período</p>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <h3 style={styles.cardTitle}>Egresos por Concepto</h3>
          <div style={{ height: 300 }}>
            {resumenConceptosEgreso.length > 0 ? (
              <Doughnut data={doughnutEgresosData} options={doughnutOptions} />
            ) : (
              <div className="empty-state">
                <p>No hay egresos en este período</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Últimos movimientos */}
      <div className="card" style={{ marginTop: 24 }}>
        <h3 style={styles.cardTitle}>Últimos Movimientos</h3>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Código</th>
                <th>Concepto</th>
                <th>Tercero</th>
                <th style={{ textAlign: 'right' }}>Monto</th>
              </tr>
            </thead>
            <tbody>
              {movimientos.slice(0, 10).map(mov => (
                <tr key={mov.id}>
                  <td>{format(new Date(mov.fecha + 'T00:00:00'), 'dd/MM/yyyy')}</td>
                  <td>
                    <span className={`badge badge-${mov.tipo}`}>
                      {mov.tipo === 'ingreso' ? 'Ingreso' : 'Egreso'}
                    </span>
                  </td>
                  <td><strong>{mov.codigo_operacion}</strong></td>
                  <td>{mov.concepto_operacion?.substring(0, 40)}...</td>
                  <td>{mov.nombre_tercero || '-'}</td>
                  <td style={{ textAlign: 'right' }}>
                    <span className={`monto monto-${mov.tipo}`}>
                      {mov.tipo === 'egreso' ? '-' : ''}{formatMonto(mov.monto)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const styles = {
  periodSelector: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: '#2d3748',
    marginBottom: 16,
    margin: 0,
    marginBottom: 16
  }
};

export default Dashboard;
