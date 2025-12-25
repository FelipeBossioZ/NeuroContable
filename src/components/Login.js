import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { FiMail, FiLock, FiLogIn } from 'react-icons/fi';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(email, password);

    if (!result.success) {
      setError(result.message || 'Error al iniciar sesión');
    }

    setLoading(false);
  };

  return (
    <div style={styles.container}>
      <div style={styles.loginBox}>
        <div style={styles.header}>
          <h1 style={styles.title}>NeuroContable</h1>
          <p style={styles.subtitle}>Sistema de Caja Diario</p>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          {error && (
            <div className="alert alert-error" style={{ marginBottom: 20 }}>
              {error}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">
              <FiMail style={{ marginRight: 8 }} />
              Correo electrónico
            </label>
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="correo@ejemplo.com"
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              <FiLock style={{ marginRight: 8 }} />
              Contraseña
            </label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={styles.submitButton}
            disabled={loading}
          >
            {loading ? (
              <span className="spinner" style={{ width: 20, height: 20 }}></span>
            ) : (
              <>
                <FiLogIn />
                Iniciar Sesión
              </>
            )}
          </button>
        </form>

        <div style={styles.footer}>
          <p style={styles.footerText}>
            Usuario por defecto: <strong>admin@neurocontable.com</strong>
          </p>
          <p style={styles.footerText}>
            Contraseña: <strong>admin123</strong>
          </p>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #1a365d 0%, #2c5282 100%)',
    padding: 20
  },
  loginBox: {
    background: 'white',
    borderRadius: 12,
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
    padding: 40,
    width: '100%',
    maxWidth: 420
  },
  header: {
    textAlign: 'center',
    marginBottom: 32
  },
  title: {
    fontSize: 28,
    fontWeight: 700,
    color: '#1a365d',
    margin: 0
  },
  subtitle: {
    fontSize: 14,
    color: '#718096',
    marginTop: 8
  },
  form: {
    marginBottom: 24
  },
  submitButton: {
    width: '100%',
    marginTop: 8,
    padding: '12px 20px',
    fontSize: 16
  },
  footer: {
    textAlign: 'center',
    paddingTop: 20,
    borderTop: '1px solid #e2e8f0'
  },
  footerText: {
    fontSize: 12,
    color: '#718096',
    margin: '4px 0'
  }
};

export default Login;
