import React, { useState, useEffect, createContext, useContext } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Contextos
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';

// Componentes
import Login from './components/Login';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Movimientos from './components/Movimientos';
import Codigos from './components/Codigos';
import Terceros from './components/Terceros';
import Reportes from './components/Reportes';
import Configuracion from './components/Configuracion';
import Usuarios from './components/Usuarios';

// Contexto de navegación simple
const NavigationContext = createContext();

export const useNavigation = () => useContext(NavigationContext);

function AppContent() {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');

  if (loading) {
    return (
      <div className="loading" style={{ height: '100vh' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'movimientos':
        return <Movimientos />;
      case 'codigos':
        return <Codigos />;
      case 'terceros':
        return <Terceros />;
      case 'reportes':
        return <Reportes />;
      case 'configuracion':
        return <Configuracion />;
      case 'usuarios':
        return <Usuarios />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <NavigationContext.Provider value={{ currentPage, setCurrentPage }}>
      <DataProvider>
        <Layout>
          {renderPage()}
        </Layout>
      </DataProvider>
    </NavigationContext.Provider>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </AuthProvider>
  );
}

export default App;
