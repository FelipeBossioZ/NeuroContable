import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '../App';
import { useData } from '../context/DataContext';
import {
  FiHome,
  FiDollarSign,
  FiList,
  FiUsers,
  FiBarChart2,
  FiSettings,
  FiLogOut,
  FiMenu,
  FiX,
  FiWifi,
  FiWifiOff,
  FiUser
} from 'react-icons/fi';

const Layout = ({ children }) => {
  const { user, logout, isAdmin } = useAuth();
  const { currentPage, setCurrentPage } = useNavigation();
  const { isOnline, saldoGeneral, formatMonto } = useData();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: FiHome },
    { id: 'movimientos', label: 'Movimientos', icon: FiDollarSign },
    { id: 'codigos', label: 'Códigos', icon: FiList },
    { id: 'terceros', label: 'Terceros', icon: FiUsers },
    { id: 'reportes', label: 'Reportes', icon: FiBarChart2 },
    { id: 'configuracion', label: 'Configuración', icon: FiSettings },
  ];

  if (isAdmin()) {
    menuItems.push({ id: 'usuarios', label: 'Usuarios', icon: FiUser });
  }

  return (
    <div style={styles.layout}>
      {/* Sidebar */}
      <aside style={{
        ...styles.sidebar,
        width: sidebarOpen ? 260 : 70,
        transition: 'width 0.3s ease'
      }}>
        <div style={styles.sidebarHeader}>
          {sidebarOpen && (
            <div>
              <h1 style={styles.logo}>NeuroContable</h1>
              <p style={styles.logoSubtitle}>Sistema de Caja</p>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={styles.menuToggle}
          >
            {sidebarOpen ? <FiX size={20} /> : <FiMenu size={20} />}
          </button>
        </div>

        <nav style={styles.nav}>
          {menuItems.map(item => (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              style={{
                ...styles.navItem,
                ...(currentPage === item.id ? styles.navItemActive : {}),
                justifyContent: sidebarOpen ? 'flex-start' : 'center'
              }}
            >
              <item.icon size={20} />
              {sidebarOpen && <span style={styles.navLabel}>{item.label}</span>}
            </button>
          ))}
        </nav>

        <div style={styles.sidebarFooter}>
          {sidebarOpen && (
            <div style={styles.userInfo}>
              <div style={styles.userAvatar}>
                {user?.nombre?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div style={styles.userDetails}>
                <span style={styles.userName}>{user?.nombre}</span>
                <span className={`badge badge-${user?.rol}`}>{user?.rol}</span>
              </div>
            </div>
          )}
          <button onClick={logout} style={styles.logoutButton}>
            <FiLogOut size={20} />
            {sidebarOpen && <span>Cerrar Sesión</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={styles.main}>
        {/* Top Bar */}
        <header style={styles.topBar}>
          <div style={styles.topBarLeft}>
            <h2 style={styles.pageTitle}>
              {menuItems.find(item => item.id === currentPage)?.label || 'Dashboard'}
            </h2>
          </div>
          <div style={styles.topBarRight}>
            <div style={styles.saldoInfo}>
              <span style={styles.saldoLabel}>Saldo Actual:</span>
              <span style={{
                ...styles.saldoValue,
                color: saldoGeneral.saldo >= 0 ? '#38a169' : '#e53e3e'
              }}>
                {formatMonto(saldoGeneral.saldo)}
              </span>
            </div>
            <div style={{
              ...styles.onlineStatus,
              background: isOnline ? 'rgba(72, 187, 120, 0.15)' : 'rgba(245, 101, 101, 0.15)',
              color: isOnline ? '#38a169' : '#e53e3e'
            }}>
              {isOnline ? <FiWifi size={16} /> : <FiWifiOff size={16} />}
              <span>{isOnline ? 'En línea' : 'Sin conexión'}</span>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div style={styles.content}>
          {children}
        </div>
      </main>
    </div>
  );
};

const styles = {
  layout: {
    display: 'flex',
    minHeight: '100vh',
    background: '#f7fafc'
  },
  sidebar: {
    background: '#1a365d',
    color: 'white',
    display: 'flex',
    flexDirection: 'column',
    position: 'fixed',
    left: 0,
    top: 0,
    bottom: 0,
    zIndex: 100,
    boxShadow: '2px 0 10px rgba(0, 0, 0, 0.1)'
  },
  sidebarHeader: {
    padding: '20px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 80
  },
  logo: {
    fontSize: 20,
    fontWeight: 700,
    margin: 0,
    color: 'white'
  },
  logoSubtitle: {
    fontSize: 12,
    opacity: 0.7,
    margin: 0
  },
  menuToggle: {
    background: 'rgba(255, 255, 255, 0.1)',
    border: 'none',
    color: 'white',
    padding: 8,
    borderRadius: 6,
    cursor: 'pointer'
  },
  nav: {
    flex: 1,
    padding: '16px 12px',
    overflowY: 'auto'
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    padding: '12px 16px',
    border: 'none',
    background: 'transparent',
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontWeight: 500,
    borderRadius: 8,
    cursor: 'pointer',
    marginBottom: 4,
    transition: 'all 0.2s ease'
  },
  navItemActive: {
    background: 'rgba(255, 255, 255, 0.15)',
    color: 'white'
  },
  navLabel: {
    whiteSpace: 'nowrap'
  },
  sidebarFooter: {
    padding: '16px',
    borderTop: '1px solid rgba(255, 255, 255, 0.1)'
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    background: 'rgba(255, 255, 255, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 16,
    fontWeight: 600
  },
  userDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4
  },
  userName: {
    fontSize: 14,
    fontWeight: 500
  },
  logoutButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    padding: '10px 16px',
    border: 'none',
    background: 'rgba(229, 62, 62, 0.2)',
    color: '#fc8181',
    fontSize: 14,
    fontWeight: 500,
    borderRadius: 8,
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  main: {
    flex: 1,
    marginLeft: 260,
    transition: 'margin-left 0.3s ease',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column'
  },
  topBar: {
    background: 'white',
    padding: '16px 24px',
    borderBottom: '1px solid #e2e8f0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'sticky',
    top: 0,
    zIndex: 50
  },
  topBarLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 16
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: 600,
    color: '#1a365d',
    margin: 0
  },
  topBarRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 20
  },
  saldoInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: 8
  },
  saldoLabel: {
    fontSize: 13,
    color: '#718096'
  },
  saldoValue: {
    fontSize: 18,
    fontWeight: 700,
    fontFamily: "'Consolas', 'Monaco', monospace"
  },
  onlineStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 12px',
    borderRadius: 20,
    fontSize: 13,
    fontWeight: 500
  },
  content: {
    flex: 1,
    padding: 24,
    overflowY: 'auto'
  }
};

export default Layout;
