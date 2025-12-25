import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import {
  FiFolder,
  FiDatabase,
  FiRefreshCw,
  FiCheck,
  FiAlertTriangle,
  FiInfo,
  FiCloud,
  FiHardDrive
} from 'react-icons/fi';

const Configuracion = () => {
  const [oneDrivePath, setOneDrivePath] = useState('');
  const [databasePath, setDatabasePath] = useState('');
  const [isOnline, setIsOnline] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarConfiguracion();
  }, []);

  const cargarConfiguracion = async () => {
    setLoading(true);
    try {
      const [onedrive, dbPath, online] = await Promise.all([
        window.electronAPI.config.getOneDrivePath(),
        window.electronAPI.config.getDatabasePath(),
        window.electronAPI.app.isOnline()
      ]);

      setOneDrivePath(onedrive || '');
      setDatabasePath(dbPath || '');
      setIsOnline(online);
    } catch (error) {
      console.error('Error cargando configuración:', error);
    }
    setLoading(false);
  };

  const seleccionarOneDrive = async () => {
    try {
      const result = await window.electronAPI.config.setOneDrivePath();
      if (result.success) {
        setOneDrivePath(result.path);
        toast.success('Carpeta de OneDrive configurada correctamente');
        // Recargar la ruta de la base de datos
        const dbPath = await window.electronAPI.config.getDatabasePath();
        setDatabasePath(dbPath);
      }
    } catch (error) {
      toast.error('Error al seleccionar carpeta');
    }
  };

  const verificarConexion = async () => {
    const online = await window.electronAPI.app.isOnline();
    setIsOnline(online);
    if (online) {
      toast.success('Conexión a internet activa');
    } else {
      toast.warning('Sin conexión a internet - Modo offline activo');
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={styles.header}>
        <h3 style={styles.title}>Configuración del Sistema</h3>
      </div>

      {/* Estado de conexión */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={styles.sectionHeader}>
          <div style={styles.sectionIcon}>
            {isOnline ? <FiCloud /> : <FiHardDrive />}
          </div>
          <div>
            <h4 style={styles.sectionTitle}>Estado de Conexión</h4>
            <p style={styles.sectionDescription}>
              Estado actual de la sincronización con OneDrive
            </p>
          </div>
        </div>

        <div style={styles.statusGrid}>
          <div style={{
            ...styles.statusCard,
            borderColor: isOnline ? '#48bb78' : '#ed8936'
          }}>
            <div style={{
              ...styles.statusIcon,
              background: isOnline ? 'rgba(72, 187, 120, 0.15)' : 'rgba(237, 137, 54, 0.15)',
              color: isOnline ? '#48bb78' : '#ed8936'
            }}>
              {isOnline ? <FiCheck size={24} /> : <FiAlertTriangle size={24} />}
            </div>
            <div>
              <strong style={{ fontSize: 16 }}>
                {isOnline ? 'Conectado' : 'Modo Offline'}
              </strong>
              <p style={{ margin: 0, fontSize: 13, color: '#718096' }}>
                {isOnline
                  ? 'Los cambios se sincronizarán automáticamente con OneDrive'
                  : 'Los cambios se guardarán localmente y se sincronizarán cuando haya conexión'}
              </p>
            </div>
          </div>

          <button className="btn btn-secondary" onClick={verificarConexion}>
            <FiRefreshCw /> Verificar Conexión
          </button>
        </div>
      </div>

      {/* Configuración de OneDrive */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={styles.sectionHeader}>
          <div style={styles.sectionIcon}>
            <FiFolder />
          </div>
          <div>
            <h4 style={styles.sectionTitle}>Carpeta de OneDrive</h4>
            <p style={styles.sectionDescription}>
              Selecciona la carpeta de OneDrive donde se guardará la base de datos para sincronización entre equipos
            </p>
          </div>
        </div>

        <div style={styles.configRow}>
          <div style={styles.configInput}>
            <label style={styles.label}>Ruta de OneDrive</label>
            <div style={styles.pathDisplay}>
              <FiFolder style={{ color: '#718096' }} />
              <span>{oneDrivePath || 'No configurado - Usando almacenamiento local'}</span>
            </div>
          </div>
          <button className="btn btn-primary" onClick={seleccionarOneDrive}>
            <FiFolder /> Seleccionar Carpeta
          </button>
        </div>

        <div className="alert alert-info" style={{ marginTop: 16 }}>
          <FiInfo />
          <div>
            <strong>Nota:</strong> La base de datos se guardará en una subcarpeta llamada "NeuroContable" dentro de la carpeta seleccionada.
            Asegúrese de que todos los equipos apunten a la misma carpeta de OneDrive para sincronizar los datos.
          </div>
        </div>
      </div>

      {/* Información de la base de datos */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={styles.sectionHeader}>
          <div style={styles.sectionIcon}>
            <FiDatabase />
          </div>
          <div>
            <h4 style={styles.sectionTitle}>Base de Datos</h4>
            <p style={styles.sectionDescription}>
              Información sobre la ubicación de la base de datos actual
            </p>
          </div>
        </div>

        <div style={styles.configRow}>
          <div style={styles.configInput}>
            <label style={styles.label}>Ubicación del archivo</label>
            <div style={styles.pathDisplay}>
              <FiDatabase style={{ color: '#718096' }} />
              <span style={{ fontSize: 13, wordBreak: 'break-all' }}>{databasePath}</span>
            </div>
          </div>
        </div>

        <div className="alert alert-warning" style={{ marginTop: 16 }}>
          <FiAlertTriangle />
          <div>
            <strong>Importante:</strong> No modifique ni elimine el archivo de base de datos directamente.
            Todos los cambios deben realizarse a través de la aplicación.
          </div>
        </div>
      </div>

      {/* Instrucciones de sincronización */}
      <div className="card">
        <div style={styles.sectionHeader}>
          <div style={styles.sectionIcon}>
            <FiInfo />
          </div>
          <div>
            <h4 style={styles.sectionTitle}>Cómo Funciona la Sincronización</h4>
          </div>
        </div>

        <div style={styles.instructionsList}>
          <div style={styles.instructionItem}>
            <div style={styles.instructionNumber}>1</div>
            <div>
              <strong>Seleccione la carpeta de OneDrive</strong>
              <p style={styles.instructionText}>
                Elija una carpeta dentro de su OneDrive que esté sincronizada en todos los equipos donde usará la aplicación.
              </p>
            </div>
          </div>

          <div style={styles.instructionItem}>
            <div style={styles.instructionNumber}>2</div>
            <div>
              <strong>Configure en todos los equipos</strong>
              <p style={styles.instructionText}>
                En cada equipo, instale la aplicación y seleccione la misma carpeta de OneDrive.
              </p>
            </div>
          </div>

          <div style={styles.instructionItem}>
            <div style={styles.instructionNumber}>3</div>
            <div>
              <strong>Sincronización automática</strong>
              <p style={styles.instructionText}>
                OneDrive se encargará de sincronizar el archivo de base de datos entre todos los equipos automáticamente.
              </p>
            </div>
          </div>

          <div style={styles.instructionItem}>
            <div style={styles.instructionNumber}>4</div>
            <div>
              <strong>Modo offline</strong>
              <p style={styles.instructionText}>
                Si pierde la conexión a internet, la aplicación seguirá funcionando con los datos locales.
                Cuando se restablezca la conexión, OneDrive sincronizará los cambios.
              </p>
            </div>
          </div>
        </div>

        <div className="alert alert-info" style={{ marginTop: 20 }}>
          <FiInfo />
          <div>
            <strong>Recomendación:</strong> Evite que dos usuarios editen el mismo registro simultáneamente para prevenir conflictos de sincronización.
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  header: {
    marginBottom: 24
  },
  title: {
    fontSize: 18,
    fontWeight: 600,
    color: '#2d3748',
    margin: 0
  },
  sectionHeader: {
    display: 'flex',
    gap: 16,
    marginBottom: 20
  },
  sectionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    background: 'rgba(26, 54, 93, 0.1)',
    color: '#1a365d',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 24
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: '#2d3748',
    margin: 0
  },
  sectionDescription: {
    fontSize: 13,
    color: '#718096',
    margin: '4px 0 0 0'
  },
  statusGrid: {
    display: 'flex',
    alignItems: 'center',
    gap: 20
  },
  statusCard: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    padding: 16,
    border: '2px solid',
    borderRadius: 8
  },
  statusIcon: {
    width: 48,
    height: 48,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  configRow: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: 16
  },
  configInput: {
    flex: 1
  },
  label: {
    display: 'block',
    fontSize: 13,
    fontWeight: 500,
    color: '#4a5568',
    marginBottom: 6
  },
  pathDisplay: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '12px 16px',
    background: '#f7fafc',
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    fontSize: 14
  },
  instructionsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16
  },
  instructionItem: {
    display: 'flex',
    gap: 16
  },
  instructionNumber: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    background: '#1a365d',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 600,
    flexShrink: 0
  },
  instructionText: {
    fontSize: 13,
    color: '#718096',
    margin: '4px 0 0 0'
  }
};

export default Configuracion;
