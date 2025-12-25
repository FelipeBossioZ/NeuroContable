import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import {
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiUser,
  FiMail,
  FiShield,
  FiCheck,
  FiX
} from 'react-icons/fi';

const Usuarios = () => {
  const { isAdmin } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    password: '',
    rol: 'operador',
    activo: true
  });

  useEffect(() => {
    cargarUsuarios();
  }, []);

  const cargarUsuarios = async () => {
    setLoading(true);
    try {
      const data = await window.electronAPI.auth.getUsers();
      setUsuarios(data || []);
    } catch (error) {
      console.error('Error cargando usuarios:', error);
    }
    setLoading(false);
  };

  const handleOpenModal = (usuario = null) => {
    if (usuario) {
      setEditingUser(usuario);
      setFormData({
        nombre: usuario.nombre,
        email: usuario.email,
        password: '',
        rol: usuario.rol,
        activo: usuario.activo === 1
      });
    } else {
      setEditingUser(null);
      setFormData({
        nombre: '',
        email: '',
        password: '',
        rol: 'operador',
        activo: true
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setFormData({
      nombre: '',
      email: '',
      password: '',
      rol: 'operador',
      activo: true
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!editingUser && !formData.password) {
      toast.error('La contraseña es requerida para nuevos usuarios');
      return;
    }

    let result;
    if (editingUser) {
      result = await window.electronAPI.auth.updateUser(editingUser.id, formData);
    } else {
      result = await window.electronAPI.auth.createUser(formData);
    }

    if (result.success) {
      toast.success(editingUser ? 'Usuario actualizado' : 'Usuario creado');
      handleCloseModal();
      cargarUsuarios();
    } else {
      toast.error(result.message || 'Error al guardar usuario');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar este usuario?')) return;

    const result = await window.electronAPI.auth.deleteUser(id);
    if (result.success) {
      toast.success('Usuario eliminado');
      cargarUsuarios();
    } else {
      toast.error(result.message || 'Error al eliminar usuario');
    }
  };

  if (!isAdmin()) {
    return (
      <div className="card">
        <div className="empty-state">
          <div className="empty-state-icon"><FiShield /></div>
          <div className="empty-state-title">Acceso Denegado</div>
          <p className="empty-state-description">
            Solo los administradores pueden acceder a esta sección.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h3 style={styles.title}>Gestión de Usuarios</h3>
          <p style={styles.subtitle}>Administra los usuarios y sus permisos</p>
        </div>
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
          <FiPlus /> Nuevo Usuario
        </button>
      </div>

      {/* Info de roles */}
      <div className="grid grid-2" style={{ marginBottom: 24 }}>
        <div className="card" style={{ padding: 16 }}>
          <div style={styles.roleInfo}>
            <div style={{ ...styles.roleIcon, background: 'rgba(49, 130, 206, 0.15)', color: '#3182ce' }}>
              <FiShield />
            </div>
            <div>
              <strong>Administrador</strong>
              <p style={styles.roleDescription}>
                Acceso completo: puede crear, editar y eliminar todos los registros, usuarios y configuraciones.
              </p>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: 16 }}>
          <div style={styles.roleInfo}>
            <div style={{ ...styles.roleIcon, background: 'rgba(221, 107, 32, 0.15)', color: '#dd6b20' }}>
              <FiUser />
            </div>
            <div>
              <strong>Operador</strong>
              <p style={styles.roleDescription}>
                Puede crear y editar movimientos y códigos. No puede eliminar registros ni gestionar usuarios.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de usuarios */}
      <div className="card">
        {loading ? (
          <div className="loading"><div className="spinner"></div></div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 50 }}></th>
                  <th>Nombre</th>
                  <th>Email</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th style={{ width: 120 }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map(usuario => (
                  <tr key={usuario.id}>
                    <td>
                      <div style={styles.avatar}>
                        {usuario.nombre?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                    </td>
                    <td>
                      <strong>{usuario.nombre}</strong>
                    </td>
                    <td>
                      <div style={styles.emailCell}>
                        <FiMail size={14} style={{ color: '#718096' }} />
                        {usuario.email}
                      </div>
                    </td>
                    <td>
                      <span className={`badge badge-${usuario.rol}`}>
                        {usuario.rol === 'admin' ? 'Administrador' : 'Operador'}
                      </span>
                    </td>
                    <td>
                      <span style={{
                        ...styles.statusBadge,
                        background: usuario.activo ? 'rgba(72, 187, 120, 0.15)' : 'rgba(245, 101, 101, 0.15)',
                        color: usuario.activo ? '#48bb78' : '#f56565'
                      }}>
                        {usuario.activo ? <FiCheck size={12} /> : <FiX size={12} />}
                        {usuario.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td>
                      <div style={styles.actions}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleOpenModal(usuario)}
                          title="Editar"
                        >
                          <FiEdit2 size={14} />
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDelete(usuario.id)}
                          title="Eliminar"
                        >
                          <FiTrash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && usuarios.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon"><FiUser /></div>
            <div className="empty-state-title">No hay usuarios</div>
            <button className="btn btn-primary" onClick={() => handleOpenModal()}>
              <FiPlus /> Crear primer usuario
            </button>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}</h2>
              <button className="modal-close" onClick={handleCloseModal}>&times;</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">
                    <FiUser style={{ marginRight: 6 }} />
                    Nombre completo
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    placeholder="Nombre del usuario"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <FiMail style={{ marginRight: 6 }} />
                    Correo electrónico
                  </label>
                  <input
                    type="email"
                    className="form-input"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="correo@ejemplo.com"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Contraseña {editingUser && '(dejar vacío para mantener la actual)'}
                  </label>
                  <input
                    type="password"
                    className="form-input"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder={editingUser ? '••••••••' : 'Contraseña segura'}
                    required={!editingUser}
                  />
                </div>

                <div className="grid grid-2">
                  <div className="form-group">
                    <label className="form-label">
                      <FiShield style={{ marginRight: 6 }} />
                      Rol
                    </label>
                    <select
                      className="form-select"
                      value={formData.rol}
                      onChange={(e) => setFormData({ ...formData, rol: e.target.value })}
                    >
                      <option value="operador">Operador</option>
                      <option value="admin">Administrador</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Estado</label>
                    <select
                      className="form-select"
                      value={formData.activo ? 'true' : 'false'}
                      onChange={(e) => setFormData({ ...formData, activo: e.target.value === 'true' })}
                    >
                      <option value="true">Activo</option>
                      <option value="false">Inactivo</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingUser ? 'Actualizar' : 'Crear'} Usuario
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
  roleInfo: {
    display: 'flex',
    gap: 12,
    alignItems: 'flex-start'
  },
  roleIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 20
  },
  roleDescription: {
    fontSize: 12,
    color: '#718096',
    margin: '4px 0 0 0'
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    background: '#1a365d',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 600
  },
  emailCell: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 13
  },
  statusBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '4px 10px',
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 500
  },
  actions: {
    display: 'flex',
    gap: 8
  }
};

export default Usuarios;
