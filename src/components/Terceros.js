import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { FiPlus, FiEdit2, FiTrash2, FiUsers, FiCreditCard, FiHelpCircle } from 'react-icons/fi';

const Terceros = () => {
  const { terceros, createTercero, updateTercero, deleteTercero } = useData();
  const { canDelete } = useAuth();

  const [showModal, setShowModal] = useState(false);
  const [editingTercero, setEditingTercero] = useState(null);
  const [formData, setFormData] = useState({
    codigo: '',
    nombre: '',
    descripcion: '',
    tipo: 'cliente'
  });

  const handleOpenModal = (tercero = null) => {
    if (tercero) {
      setEditingTercero(tercero);
      setFormData({
        codigo: tercero.codigo,
        nombre: tercero.nombre,
        descripcion: tercero.descripcion || '',
        tipo: tercero.tipo || 'cliente'
      });
    } else {
      setEditingTercero(null);
      // Sugerir siguiente código
      const maxCodigo = Math.max(...terceros.map(t => parseInt(t.codigo) || 0), 0);
      setFormData({
        codigo: (maxCodigo + 1).toString(),
        nombre: '',
        descripcion: '',
        tipo: 'cliente'
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingTercero(null);
    setFormData({ codigo: '', nombre: '', descripcion: '', tipo: 'cliente' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    let result;
    if (editingTercero) {
      result = await updateTercero(editingTercero.codigo, formData);
    } else {
      result = await createTercero(formData);
    }

    if (result.success) {
      handleCloseModal();
    }
  };

  const handleDelete = async (codigo) => {
    if (!window.confirm('¿Está seguro de eliminar este tercero?')) return;
    await deleteTercero(codigo);
  };

  const getTipoIcon = (tipo) => {
    switch (tipo) {
      case 'cuenta':
        return <FiCreditCard />;
      case 'cliente':
        return <FiUsers />;
      case 'sistema':
        return <FiHelpCircle />;
      default:
        return <FiUsers />;
    }
  };

  const getTipoBadge = (tipo) => {
    const badges = {
      cuenta: { bg: '#ebf8ff', color: '#2b6cb0' },
      cliente: { bg: '#f0fff4', color: '#276749' },
      sistema: { bg: '#faf5ff', color: '#6b46c1' }
    };
    return badges[tipo] || badges.cliente;
  };

  // Agrupar por tipo
  const tercerosPorTipo = {
    cuenta: terceros.filter(t => t.tipo === 'cuenta'),
    cliente: terceros.filter(t => t.tipo === 'cliente'),
    sistema: terceros.filter(t => t.tipo === 'sistema')
  };

  return (
    <div>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h3 style={styles.title}>Gestión de Terceros</h3>
          <p style={styles.subtitle}>Clientes, cuentas bancarias y otros terceros</p>
        </div>
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
          <FiPlus /> Nuevo Tercero
        </button>
      </div>

      {/* Resumen */}
      <div className="grid grid-3" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Cuentas</span>
            <div className="stat-card-icon" style={{ background: '#ebf8ff', color: '#2b6cb0' }}>
              <FiCreditCard />
            </div>
          </div>
          <div className="stat-card-value">{tercerosPorTipo.cuenta.length}</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Clientes</span>
            <div className="stat-card-icon" style={{ background: '#f0fff4', color: '#276749' }}>
              <FiUsers />
            </div>
          </div>
          <div className="stat-card-value">{tercerosPorTipo.cliente.length}</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Sistema</span>
            <div className="stat-card-icon" style={{ background: '#faf5ff', color: '#6b46c1' }}>
              <FiHelpCircle />
            </div>
          </div>
          <div className="stat-card-value">{tercerosPorTipo.sistema.length}</div>
        </div>
      </div>

      {/* Tabla */}
      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th style={{ width: 80 }}>Código</th>
                <th style={{ width: 100 }}>Tipo</th>
                <th>Nombre</th>
                <th>Descripción</th>
                <th style={{ width: 120 }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {terceros.map(tercero => {
                const tipoBadge = getTipoBadge(tercero.tipo);
                return (
                  <tr key={tercero.codigo}>
                    <td>
                      <span style={styles.codigoBadge}>{tercero.codigo}</span>
                    </td>
                    <td>
                      <span style={{
                        ...styles.tipoBadge,
                        background: tipoBadge.bg,
                        color: tipoBadge.color
                      }}>
                        {getTipoIcon(tercero.tipo)}
                        <span>{tercero.tipo}</span>
                      </span>
                    </td>
                    <td>
                      <strong>{tercero.nombre}</strong>
                    </td>
                    <td style={{ fontSize: 13, color: '#718096' }}>
                      {tercero.descripcion || '-'}
                    </td>
                    <td>
                      <div style={styles.actions}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleOpenModal(tercero)}
                          title="Editar"
                        >
                          <FiEdit2 size={14} />
                        </button>
                        {canDelete() && (
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDelete(tercero.codigo)}
                            title="Eliminar"
                          >
                            <FiTrash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {terceros.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon"><FiUsers /></div>
            <div className="empty-state-title">No hay terceros</div>
            <p className="empty-state-description">
              Aún no se han creado terceros en el sistema.
            </p>
            <button className="btn btn-primary" onClick={() => handleOpenModal()}>
              <FiPlus /> Crear primer tercero
            </button>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingTercero ? 'Editar Tercero' : 'Nuevo Tercero'}</h2>
              <button className="modal-close" onClick={handleCloseModal}>&times;</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="grid grid-2">
                  <div className="form-group">
                    <label className="form-label">Código</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.codigo}
                      onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                      placeholder="Ej: 0, 1, 2..."
                      required
                      disabled={editingTercero}
                      maxLength={10}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Tipo</label>
                    <select
                      className="form-select"
                      value={formData.tipo}
                      onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                    >
                      <option value="cliente">Cliente</option>
                      <option value="cuenta">Cuenta Bancaria</option>
                      <option value="sistema">Sistema</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Nombre</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    placeholder="Nombre completo o razón social"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Descripción</label>
                  <textarea
                    className="form-input"
                    value={formData.descripcion}
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                    placeholder="Descripción o notas adicionales..."
                    rows={3}
                    style={{ resize: 'vertical' }}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingTercero ? 'Actualizar' : 'Crear'} Tercero
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20
  },
  title: {
    fontSize: 18,
    fontWeight: 600,
    color: '#2d3748',
    margin: 0
  },
  subtitle: {
    fontSize: 13,
    color: '#718096',
    margin: '4px 0 0 0'
  },
  codigoBadge: {
    display: 'inline-block',
    padding: '4px 12px',
    background: '#1a365d',
    color: 'white',
    borderRadius: 4,
    fontWeight: 600,
    fontSize: 14
  },
  tipoBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 10px',
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 500,
    textTransform: 'capitalize'
  },
  actions: {
    display: 'flex',
    gap: 8
  }
};

export default Terceros;
