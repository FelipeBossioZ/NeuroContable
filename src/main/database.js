const initSqlJs = require('sql.js');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

class DatabaseManager {
  constructor(dbPath) {
    this.dbPath = dbPath;
    this.db = null;
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;

    // Asegurar que el directorio existe
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Inicializar SQL.js
    const SQL = await initSqlJs();

    // Cargar base de datos existente o crear nueva
    if (fs.existsSync(this.dbPath)) {
      const fileBuffer = fs.readFileSync(this.dbPath);
      this.db = new SQL.Database(fileBuffer);
    } else {
      this.db = new SQL.Database();
    }

    // Crear tablas
    this.createTables();
    this.insertarDatosIniciales();
    this.save();
    this.initialized = true;
  }

  createTables() {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        rol TEXT NOT NULL CHECK(rol IN ('admin', 'operador')),
        activo INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS terceros (
        codigo TEXT PRIMARY KEY,
        nombre TEXT NOT NULL,
        descripcion TEXT,
        tipo TEXT DEFAULT 'cliente',
        activo INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS codigos_ingreso (
        codigo TEXT PRIMARY KEY,
        concepto TEXT NOT NULL,
        observaciones TEXT,
        activo INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS codigos_egreso (
        codigo TEXT PRIMARY KEY,
        concepto TEXT NOT NULL,
        observaciones TEXT,
        activo INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS movimientos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fecha DATE NOT NULL,
        tipo TEXT NOT NULL CHECK(tipo IN ('ingreso', 'egreso')),
        codigo_operacion TEXT NOT NULL,
        codigo_tercero TEXT,
        monto REAL NOT NULL DEFAULT 0,
        detalle TEXT,
        revision TEXT,
        usuario_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    this.db.run(`CREATE INDEX IF NOT EXISTS idx_mov_fecha ON movimientos(fecha)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_mov_tipo ON movimientos(tipo)`);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS configuracion (
        clave TEXT PRIMARY KEY,
        valor TEXT
      )
    `);
  }

  save() {
    const data = this.db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(this.dbPath, buffer);
  }

  // Helpers
  get(sql, params = []) {
    try {
      const stmt = this.db.prepare(sql);
      if (params.length > 0) stmt.bind(params);
      if (stmt.step()) {
        const row = stmt.getAsObject();
        stmt.free();
        return row;
      }
      stmt.free();
      return null;
    } catch (error) {
      console.error('DB get error:', error);
      return null;
    }
  }

  all(sql, params = []) {
    try {
      const stmt = this.db.prepare(sql);
      if (params.length > 0) stmt.bind(params);
      const results = [];
      while (stmt.step()) {
        results.push(stmt.getAsObject());
      }
      stmt.free();
      return results;
    } catch (error) {
      console.error('DB all error:', error);
      return [];
    }
  }

  run(sql, params = []) {
    try {
      this.db.run(sql, params);
      this.save();
      return { success: true };
    } catch (error) {
      console.error('DB run error:', error);
      return { success: false, message: error.message };
    }
  }

  insertarDatosIniciales() {
    // Usuario admin
    const userCount = this.get('SELECT COUNT(*) as count FROM usuarios');
    if (!userCount || userCount.count === 0) {
      const hash = bcrypt.hashSync('admin123', 10);
      this.db.run(`INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES (?, ?, ?, ?)`,
        ['Administrador', 'admin@neurocontable.com', hash, 'admin']);
    }

    // Terceros
    const terceroCount = this.get('SELECT COUNT(*) as count FROM terceros');
    if (!terceroCount || terceroCount.count === 0) {
      const terceros = [
        ['0', 'CONSIGNACIÓN POR IDENTIFICAR', 'Consignaciones pendientes', 'sistema'],
        ['1', 'Cuenta 1 - DAFF', 'Cuenta bancaria DAFF', 'cuenta'],
        ['2', 'Cuenta 2 - GTFF', 'Cuenta bancaria GTFF', 'cuenta'],
        ['3', 'PARA CLIENTE', 'Movimientos para clientes', 'cliente'],
        ['4', 'PARA CLIENTE', 'Movimientos para clientes', 'cliente'],
        ['5', 'PARA CLIENTE', 'Movimientos para clientes', 'cliente']
      ];
      terceros.forEach(t => {
        this.db.run(`INSERT INTO terceros (codigo, nombre, descripcion, tipo) VALUES (?, ?, ?, ?)`, t);
      });
    }

    // Códigos de ingreso
    const ingresoCount = this.get('SELECT COUNT(*) as count FROM codigos_ingreso');
    if (!ingresoCount || ingresoCount.count === 0) {
      const codigos = [
        ['A', 'Recibido por: -FACTURAS -GTFF', 'Facturación de GTFF'],
        ['B', 'Recibido por: -Cuentas de cobro -GTFF', 'Cuentas de cobro GTFF'],
        ['C', 'Recibido por: -Cuentas de cobro -DAFF', 'Cuentas de cobro DAFF'],
        ['D', 'Recibido por: -Otros ingresos Sin Facturación', 'Pagos sin factura'],
        ['E', 'Ingresos Recibidos de terceros para pagos', 'Dineros de terceros'],
        ['F', 'Recibido por: -Cuentas por Cobrar', 'Dineros prestados'],
        ['G', 'Recibido por: -Abono a préstamos por Nómina', 'Préstamos Diego'],
        ['H', 'Recibido por: -Abono a préstamos por Nómina', 'Préstamos Felipe'],
        ['I', '-Retiros y Traslados de Bancos', 'Retiros bancarios'],
        ['J', '-Consignaciones pendientes de identificar', 'Sin identificar'],
        ['K', 'Recibido por: -Préstamos a favor de la oficina', 'Préstamos a GTFF'],
        ['L', 'Reembolsos y recuperaciones', 'Reembolsos'],
        ['M', 'Recibido por: -Abono a préstamos', 'Préstamos Juliana'],
        ['N', 'Pago bonificaciones', 'Bonificación anual'],
        ['O', 'Recibido por: -Préstamos de Juliana', 'Préstamos Juliana'],
        ['P', 'Recibido por: aguinaldos', 'Aguinaldos Emp 1'],
        ['Q', 'Recibido por: aguinaldos', 'Aguinaldos Emp 2'],
        ['R', 'Recibido por: aguinaldos', 'Aguinaldos Emp 3']
      ];
      codigos.forEach(c => {
        this.db.run(`INSERT INTO codigos_ingreso (codigo, concepto, observaciones) VALUES (?, ?, ?)`, c);
      });
    }

    // Códigos de egreso
    const egresoCount = this.get('SELECT COUNT(*) as count FROM codigos_egreso');
    if (!egresoCount || egresoCount.count === 0) {
      const codigos = [
        ['1', 'Gastos personales', 'Gastos personales'],
        ['2', 'Pago de Salarios a:', 'Salarios semanales'],
        ['3', 'Pago de Prestaciones sociales a:', 'Liquidaciones'],
        ['4', 'Pago de Bonificación a:', 'Bonificaciones'],
        ['5', 'Préstamos por Nómina a:', 'Préstamos Diego'],
        ['6', 'Préstamos por Nómina a:', 'Préstamos Felipe'],
        ['7', 'Pagos de: -Seguridad Social', 'Seguridad social'],
        ['8', 'Pagos de: -Cuota alimentos', 'Alimentos familia'],
        ['9', 'Pagos de: -Servicios públicos OFICINA', 'Servicios oficina'],
        ['10', 'Pagos de: -Servicios públicos NIÑAS', 'Servicios Babilonia'],
        ['11', 'Pagos de: -Servicios Administración', 'Servicios Ermita'],
        ['12', 'Pagos de: -Celulares', 'Celulares'],
        ['13', 'Pagos de: -Suscripciones', 'CETA'],
        ['14', 'Pagos de: -Seminarios', 'Capacitaciones'],
        ['15', 'Pagos de: -Mantenimiento equipos', 'Computadores'],
        ['16', 'Pagos de: -Aguinaldos y Propinas', 'Aguinaldos'],
        ['17', 'Pagos de: -Sanciones e intereses', 'Sanciones'],
        ['18', 'Pagos de: -Pasajes y transportes', 'Transportes'],
        ['19', 'Pagos de: -Gastos Barbosa', 'Barbosa'],
        ['20', 'Pagos de: -Demás Gastos oficina', 'Otros gastos'],
        ['21', 'Pagos de: -Cuentas por Pagar', 'Deudas oficina'],
        ['22', 'Compra de: -Equipos oficina', 'Equipos'],
        ['23', 'Compra de: -Útiles de aseo', 'Aseo'],
        ['24', 'Compra de: -Papelería', 'Papelería'],
        ['25', 'Compra de: -Manuales y Libros', 'Libros'],
        ['26', 'Compra de: -Drogas y farmacia', 'Farmacia'],
        ['27', 'Compra de: -Restaurante', 'Restaurante'],
        ['28', 'Préstamos a:', 'Préstamos terceros'],
        ['29', 'Egresos Terceros -Impuestos-', 'Impuestos clientes'],
        ['30', 'Egresos Terceros -Seguridad social-', 'Seg social clientes'],
        ['31', 'Egresos Terceros -Certificados-', 'Certificados'],
        ['32', 'Egresos Terceros -Mantenimiento-', 'Equipos clientes'],
        ['33', 'AJUSTE POR -Consignación Bancos', 'Consignaciones'],
        ['34', 'AJUSTE POR -Consignaciones por identificar', 'Sin identificar'],
        ['35', 'Impuestos GTFF', 'IVA, Predial'],
        ['36', 'Pago en efectivo', 'Facturas efectivo'],
        ['37', 'Gastos Barbosa', 'Barbosa'],
        ['38', 'Pagos de bonificaciones', 'Bonificaciones'],
        ['39', 'Pago intereses préstamo Juliana', 'Intereses Juliana'],
        ['40', 'Rembolso retención fuente', 'Retención'],
        ['41', 'AJUSTE POR -aguinaldos empresa', 'Aguinaldos'],
        ['42', 'AJUSTE POR -Cruce cuentas', 'Cruce'],
        ['43', 'Pago Hipotecario BANCOLOMBIA', 'Hipoteca'],
        ['44', 'Gastos Oficina Arriendo', 'Arriendo']
      ];
      codigos.forEach(c => {
        this.db.run(`INSERT INTO codigos_egreso (codigo, concepto, observaciones) VALUES (?, ?, ?)`, c);
      });
    }
  }

  // ============== AUTENTICACIÓN ==============
  login(email, password) {
    const user = this.get('SELECT * FROM usuarios WHERE email = ? AND activo = 1', [email]);
    if (!user) {
      return { success: false, message: 'Usuario no encontrado' };
    }
    if (!bcrypt.compareSync(password, user.password_hash)) {
      return { success: false, message: 'Contraseña incorrecta' };
    }
    const { password_hash, ...userData } = user;
    return { success: true, user: userData };
  }

  getUsers() {
    return this.all('SELECT id, nombre, email, rol, activo, created_at FROM usuarios ORDER BY nombre');
  }

  createUser({ nombre, email, password, rol }) {
    try {
      const hash = bcrypt.hashSync(password, 10);
      this.db.run(`INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES (?, ?, ?, ?)`,
        [nombre, email, hash, rol]);
      this.save();
      return { success: true };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  updateUser(id, { nombre, email, password, rol, activo }) {
    try {
      if (password) {
        const hash = bcrypt.hashSync(password, 10);
        this.db.run(`UPDATE usuarios SET nombre=?, email=?, password_hash=?, rol=?, activo=? WHERE id=?`,
          [nombre, email, hash, rol, activo ? 1 : 0, id]);
      } else {
        this.db.run(`UPDATE usuarios SET nombre=?, email=?, rol=?, activo=? WHERE id=?`,
          [nombre, email, rol, activo ? 1 : 0, id]);
      }
      this.save();
      return { success: true };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  deleteUser(id) {
    this.db.run('DELETE FROM usuarios WHERE id = ?', [id]);
    this.save();
    return { success: true };
  }

  // ============== TERCEROS ==============
  getTerceros() {
    return this.all('SELECT * FROM terceros WHERE activo = 1 ORDER BY codigo');
  }

  createTercero({ codigo, nombre, descripcion, tipo }) {
    try {
      this.db.run(`INSERT INTO terceros (codigo, nombre, descripcion, tipo) VALUES (?, ?, ?, ?)`,
        [codigo, nombre, descripcion || '', tipo || 'cliente']);
      this.save();
      return { success: true };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  updateTercero(codigo, { nombre, descripcion, tipo }) {
    this.db.run(`UPDATE terceros SET nombre=?, descripcion=?, tipo=? WHERE codigo=?`,
      [nombre, descripcion, tipo, codigo]);
    this.save();
    return { success: true };
  }

  deleteTercero(codigo) {
    this.db.run('UPDATE terceros SET activo = 0 WHERE codigo = ?', [codigo]);
    this.save();
    return { success: true };
  }

  // ============== CÓDIGOS INGRESO ==============
  getCodigosIngreso() {
    return this.all('SELECT * FROM codigos_ingreso WHERE activo = 1 ORDER BY codigo');
  }

  createCodigoIngreso({ codigo, concepto, observaciones }) {
    try {
      this.db.run(`INSERT INTO codigos_ingreso (codigo, concepto, observaciones) VALUES (?, ?, ?)`,
        [codigo, concepto, observaciones || '']);
      this.save();
      return { success: true };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  updateCodigoIngreso(codigo, { concepto, observaciones }) {
    this.db.run(`UPDATE codigos_ingreso SET concepto=?, observaciones=? WHERE codigo=?`,
      [concepto, observaciones, codigo]);
    this.save();
    return { success: true };
  }

  deleteCodigoIngreso(codigo) {
    this.db.run('UPDATE codigos_ingreso SET activo = 0 WHERE codigo = ?', [codigo]);
    this.save();
    return { success: true };
  }

  // ============== CÓDIGOS EGRESO ==============
  getCodigosEgreso() {
    return this.all('SELECT * FROM codigos_egreso WHERE activo = 1 ORDER BY CAST(codigo AS INTEGER)');
  }

  createCodigoEgreso({ codigo, concepto, observaciones }) {
    try {
      this.db.run(`INSERT INTO codigos_egreso (codigo, concepto, observaciones) VALUES (?, ?, ?)`,
        [codigo, concepto, observaciones || '']);
      this.save();
      return { success: true };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  updateCodigoEgreso(codigo, { concepto, observaciones }) {
    this.db.run(`UPDATE codigos_egreso SET concepto=?, observaciones=? WHERE codigo=?`,
      [concepto, observaciones, codigo]);
    this.save();
    return { success: true };
  }

  deleteCodigoEgreso(codigo) {
    this.db.run('UPDATE codigos_egreso SET activo = 0 WHERE codigo = ?', [codigo]);
    this.save();
    return { success: true };
  }

  // ============== MOVIMIENTOS ==============
  getMovimientos(filtros = {}) {
    let sql = `
      SELECT m.*,
        CASE WHEN m.tipo = 'ingreso' THEN ci.concepto ELSE ce.concepto END as concepto_operacion,
        t.nombre as nombre_tercero
      FROM movimientos m
      LEFT JOIN codigos_ingreso ci ON m.tipo = 'ingreso' AND m.codigo_operacion = ci.codigo
      LEFT JOIN codigos_egreso ce ON m.tipo = 'egreso' AND m.codigo_operacion = ce.codigo
      LEFT JOIN terceros t ON m.codigo_tercero = t.codigo
      WHERE 1=1
    `;

    if (filtros.fechaInicio) sql += ` AND m.fecha >= '${filtros.fechaInicio}'`;
    if (filtros.fechaFin) sql += ` AND m.fecha <= '${filtros.fechaFin}'`;
    if (filtros.tipo) sql += ` AND m.tipo = '${filtros.tipo}'`;
    if (filtros.codigoTercero) sql += ` AND m.codigo_tercero = '${filtros.codigoTercero}'`;

    sql += ' ORDER BY m.fecha DESC, m.id DESC';
    return this.all(sql);
  }

  createMovimiento({ fecha, tipo, codigo_operacion, codigo_tercero, monto, detalle, revision, usuario_id }) {
    try {
      this.db.run(`INSERT INTO movimientos (fecha, tipo, codigo_operacion, codigo_tercero, monto, detalle, revision, usuario_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [fecha, tipo, codigo_operacion, codigo_tercero, monto, detalle || '', revision || '', usuario_id]);
      this.save();
      return { success: true };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  updateMovimiento(id, { fecha, tipo, codigo_operacion, codigo_tercero, monto, detalle, revision }) {
    this.db.run(`UPDATE movimientos SET fecha=?, tipo=?, codigo_operacion=?, codigo_tercero=?, monto=?, detalle=?, revision=? WHERE id=?`,
      [fecha, tipo, codigo_operacion, codigo_tercero, monto, detalle, revision, id]);
    this.save();
    return { success: true };
  }

  deleteMovimiento(id) {
    this.db.run('DELETE FROM movimientos WHERE id = ?', [id]);
    this.save();
    return { success: true };
  }

  getMovimientosByDateRange(fechaInicio, fechaFin) {
    return this.getMovimientos({ fechaInicio, fechaFin });
  }

  // ============== SALDOS ==============
  getSaldosByCuenta() {
    return this.all(`
      SELECT t.codigo, t.nombre,
        COALESCE(SUM(CASE WHEN m.tipo = 'ingreso' THEN m.monto ELSE 0 END), 0) as total_ingresos,
        COALESCE(SUM(CASE WHEN m.tipo = 'egreso' THEN m.monto ELSE 0 END), 0) as total_egresos,
        COALESCE(SUM(CASE WHEN m.tipo = 'ingreso' THEN m.monto ELSE -m.monto END), 0) as saldo
      FROM terceros t
      LEFT JOIN movimientos m ON t.codigo = m.codigo_tercero
      WHERE t.activo = 1 AND t.tipo = 'cuenta'
      GROUP BY t.codigo, t.nombre ORDER BY t.codigo
    `);
  }

  getSaldosByTercero() {
    return this.all(`
      SELECT t.codigo, t.nombre, t.tipo,
        COALESCE(SUM(CASE WHEN m.tipo = 'ingreso' THEN m.monto ELSE 0 END), 0) as total_ingresos,
        COALESCE(SUM(CASE WHEN m.tipo = 'egreso' THEN m.monto ELSE 0 END), 0) as total_egresos,
        COALESCE(SUM(CASE WHEN m.tipo = 'ingreso' THEN m.monto ELSE -m.monto END), 0) as saldo
      FROM terceros t
      LEFT JOIN movimientos m ON t.codigo = m.codigo_tercero
      WHERE t.activo = 1
      GROUP BY t.codigo, t.nombre, t.tipo ORDER BY t.codigo
    `);
  }

  getSaldoGeneral() {
    const result = this.get(`
      SELECT
        COALESCE(SUM(CASE WHEN tipo = 'ingreso' THEN monto ELSE 0 END), 0) as total_ingresos,
        COALESCE(SUM(CASE WHEN tipo = 'egreso' THEN monto ELSE 0 END), 0) as total_egresos,
        COALESCE(SUM(CASE WHEN tipo = 'ingreso' THEN monto ELSE -monto END), 0) as saldo
      FROM movimientos
    `);
    return result || { total_ingresos: 0, total_egresos: 0, saldo: 0 };
  }

  // ============== REPORTES ==============
  getResumenPorConcepto(fechaInicio, fechaFin, tipo) {
    const tabla = tipo === 'ingreso' ? 'codigos_ingreso' : 'codigos_egreso';
    const alias = tipo === 'ingreso' ? 'ci' : 'ce';
    return this.all(`
      SELECT ${alias}.codigo, ${alias}.concepto, COUNT(m.id) as cantidad, COALESCE(SUM(m.monto), 0) as total
      FROM ${tabla} ${alias}
      LEFT JOIN movimientos m ON ${alias}.codigo = m.codigo_operacion AND m.tipo = '${tipo}'
        AND m.fecha BETWEEN '${fechaInicio}' AND '${fechaFin}'
      WHERE ${alias}.activo = 1
      GROUP BY ${alias}.codigo, ${alias}.concepto
      ORDER BY total DESC
    `);
  }

  getResumenPorPeriodo(fechaInicio, fechaFin, agrupacion) {
    const fmt = agrupacion === 'mensual' ? '%Y-%m' : agrupacion === 'semanal' ? '%Y-W%W' : '%Y-%m-%d';
    return this.all(`
      SELECT strftime('${fmt}', fecha) as periodo,
        SUM(CASE WHEN tipo = 'ingreso' THEN monto ELSE 0 END) as ingresos,
        SUM(CASE WHEN tipo = 'egreso' THEN monto ELSE 0 END) as egresos,
        SUM(CASE WHEN tipo = 'ingreso' THEN monto ELSE -monto END) as saldo
      FROM movimientos
      WHERE fecha BETWEEN '${fechaInicio}' AND '${fechaFin}'
      GROUP BY strftime('${fmt}', fecha)
      ORDER BY periodo
    `);
  }

  getResumenPorTercero(fechaInicio, fechaFin) {
    return this.all(`
      SELECT t.codigo, t.nombre, t.tipo as tipo_tercero,
        SUM(CASE WHEN m.tipo = 'ingreso' THEN m.monto ELSE 0 END) as ingresos,
        SUM(CASE WHEN m.tipo = 'egreso' THEN m.monto ELSE 0 END) as egresos,
        SUM(CASE WHEN m.tipo = 'ingreso' THEN m.monto ELSE -m.monto END) as saldo
      FROM terceros t
      LEFT JOIN movimientos m ON t.codigo = m.codigo_tercero AND m.fecha BETWEEN '${fechaInicio}' AND '${fechaFin}'
      WHERE t.activo = 1
      GROUP BY t.codigo, t.nombre, t.tipo
      ORDER BY saldo DESC
    `);
  }

  getComparativo(periodo1, periodo2) {
    const d1 = this.get(`
      SELECT COALESCE(SUM(CASE WHEN tipo='ingreso' THEN monto ELSE 0 END),0) as ingresos,
        COALESCE(SUM(CASE WHEN tipo='egreso' THEN monto ELSE 0 END),0) as egresos,
        COALESCE(SUM(CASE WHEN tipo='ingreso' THEN monto ELSE -monto END),0) as saldo
      FROM movimientos WHERE fecha BETWEEN '${periodo1.inicio}' AND '${periodo1.fin}'
    `) || { ingresos: 0, egresos: 0, saldo: 0 };

    const d2 = this.get(`
      SELECT COALESCE(SUM(CASE WHEN tipo='ingreso' THEN monto ELSE 0 END),0) as ingresos,
        COALESCE(SUM(CASE WHEN tipo='egreso' THEN monto ELSE 0 END),0) as egresos,
        COALESCE(SUM(CASE WHEN tipo='ingreso' THEN monto ELSE -monto END),0) as saldo
      FROM movimientos WHERE fecha BETWEEN '${periodo2.inicio}' AND '${periodo2.fin}'
    `) || { ingresos: 0, egresos: 0, saldo: 0 };

    return { periodo1: { ...periodo1, datos: d1 }, periodo2: { ...periodo2, datos: d2 } };
  }

  close() {
    if (this.db) {
      this.save();
      this.db.close();
    }
  }
}

module.exports = DatabaseManager;
