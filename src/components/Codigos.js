import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { FiPlus, FiEdit2, FiTrash2, FiInfo } from 'react-icons/fi';

const Codigos = () => {
  const [activeTab, setActiveTab] = useState('ingresos');
  const {
    codigosIngreso,
    codigosEgreso,
    createCodigoIngreso,
    updateCodigoIngreso,
    deleteCodigoIngreso,
    createCodigoEgreso,
    updateCodigoEgreso,
    deleteCodigoEgreso
  } = useData();
  const { canDelete } = useAuth();

  const [showModal, setShowModal] = useState(false);
  const [editingCodigo, setEditingCodigo] = useState(null);
  const [formData, setFormData] = useState({
    codigo: '',
    concepto: '',
    observaciones: ''
  });

  const handleOpenModal = (codigo = null) => {
    if (codigo) {
      setEditingCodigo(codigo);
      setFormData({
        codigo: codigo.codigo,
        concepto: codigo.concepto,
        observaciones: codigo.observaciones || ''
      });
    } else {
      setEditingCodigo(null);
      setFormData({ codigo: '', concepto: '', observaciones: '' });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingCodigo(null);
    setFormData({ codigo: '', concepto: '', observaciones: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    let result;
    if (activeTab === 'ingresos') {
      if (editingCodigo) {
        result = await updateCodigoIngreso(editingCodigo.codigo, formData);
      } else {
        result = await createCodigoIngreso(formData);
      }
    } else {
      if (editingCodigo) {
        result = await updateCodigoEgreso(editingCodigo.codigo, formData);
      } else {
        result = await createCodigoEgreso(formData);
      }
    }

    if (result.success) {
      handleCloseModal();
    }
  };

  const handleDelete = async (codigo) => {
    if (!window.confirm('¿Está seguro de eliminar este código?')) return;

    if (activeTab === 'ingresos') {
      await deleteCodigoIngreso(codigo);
    } else {
      await deleteCodigoEgreso(codigo);
    }
  };

  const codigosActuales = activeTab === 'ingresos' ? codigosIngreso : codigosEgreso;

  return (
    <div>
      {/* Tabs */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'ingresos' ? 'active' : ''}`}
          onClick={() => setActiveTab('ingresos')}
        >
          Códigos de Ingreso ({codigosIngreso.length})
        </button>
        <button
          className={`tab ${activeTab === 'egresos' ? 'active' : ''}`}
          onClick={() => setActiveTab('egresos')}
        >
          Códigos de Egreso ({codigosEgreso.length})
        </button>
      </div>

      {/* Header */}
      <div style={styles.header}>
        <h3 style={styles.title}>
          {activeTab === 'ingresos' ? 'Códigos de Ingreso (Entradas a Caja)' : 'Códigos de Egreso (Salidas de Caja)'}
        </h3>
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
          <FiPlus /> Nuevo Código
        </button>
      </div>

      {/* Tabla */}
      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th style={{ width: 80 }}>Código</th>
                <th>Concepto</th>
                <th>Observaciones</th>
                <th style={{ width: 120 }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {codigosActuales.map(codigo => (
                <tr key={codigo.codigo}>
                  <td>
                    <span style={styles.codigoBadge}>{codigo.codigo}</span>
                  </td>
                  <td>
                    <strong>{codigo.concepto}</strong>
                  </td>
                  <td style={{ fontSize: 13, color: '#718096' }}>
                    {codigo.observaciones || '-'}
                  </td>
                  <td>
                    <div style={styles.actions}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleOpenModal(codigo)}
                        title="Editar"
                      >
                        <FiEdit2 size={14} />
                      </button>
                      {canDelete() && (
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDelete(codigo.codigo)}
                          title="Eliminar"
                        >
                          <FiTrash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {codigosActuales.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon"><FiInfo /></div>
            <div className="empty-state-title">No hay códigos</div>
            <p className="empty-state-description">
              Aún no se han creado códigos de {activeTab}.
            </p>
            <button className="btn btn-primary" onClick={() => handleOpenModal()}>
              <FiPlus /> Crear primer código
            </button>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingCodigo ? 'Editar Código' : 'Nuevo Código'}</h2>
              <button className="modal-close" onClick={handleCloseModal}>&times;</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Código</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.codigo}
                    onChange={(e) => setFormData({ ...formData, codigo: e.target.value.toUpperCase() })}
                    placeholder={activeTab === 'ingresos' ? 'Ej: A, B, C...' : 'Ej: 1, 2, 3...'}
                    required
                    disabled={editingCodigo}
                    maxLength={3}
                  />
                  <small style={{ color: '#718096' }}>
                    {activeTab === 'ingresos'
                      ? 'Use letras (A, B, C...) para códigos de ingreso'
                      : 'Use números (1, 2, 3...) para códigos de egreso'}
                  </small>
                </div>

                <div className="form-group">
                  <label className="form-label">Concepto</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.concepto}
                    onChange={(e) => setFormData({ ...formData, concepto: e.target.value })}
                    placeholder="Descripción del concepto"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Observaciones</label>
                  <textarea
                    className="form-input"
                    value={formData.observaciones}
                    onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                    placeholder="Notas adicionales sobre cuándo usar este código..."
                    rows={4}
                    style={{ resize: 'vertical' }}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingCodigo ? 'Actualizar' : 'Crear'} Código
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
    alignItems: 'center',
    marginBottom: 20
  },
  title: {
    fontSize: 16,
    fontWeight: 600,
    color: '#2d3748',
    margin: 0
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
  actions: {
    display: 'flex',
    gap: 8
  }
};

export default Codigos;
