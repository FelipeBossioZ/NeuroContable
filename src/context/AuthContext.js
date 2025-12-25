import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'react-toastify';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar si hay una sesión guardada
    const savedUser = localStorage.getItem('neurocontable_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('neurocontable_user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const result = await window.electronAPI.auth.login({ email, password });

      if (result.success) {
        setUser(result.user);
        localStorage.setItem('neurocontable_user', JSON.stringify(result.user));
        toast.success(`Bienvenido, ${result.user.nombre}`);
        return { success: true };
      } else {
        toast.error(result.message || 'Error al iniciar sesión');
        return { success: false, message: result.message };
      }
    } catch (error) {
      toast.error('Error de conexión');
      return { success: false, message: 'Error de conexión' };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('neurocontable_user');
    toast.info('Sesión cerrada');
  };

  const isAdmin = () => {
    return user?.rol === 'admin';
  };

  const canDelete = () => {
    return user?.rol === 'admin';
  };

  const canCreateCodigos = () => {
    return true; // Tanto admin como operador pueden crear códigos
  };

  const canEditMovimientos = () => {
    return true; // Tanto admin como operador pueden editar movimientos
  };

  const canDeleteMovimientos = () => {
    return user?.rol === 'admin'; // Solo admin puede eliminar movimientos
  };

  const value = {
    user,
    loading,
    login,
    logout,
    isAdmin,
    canDelete,
    canCreateCodigos,
    canEditMovimientos,
    canDeleteMovimientos
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
