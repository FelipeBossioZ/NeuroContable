const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

class DatabaseManager {
  constructor(dbPath) {
    // Asegurar que el directorio existe
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL'); // Mejor rendimiento para múltiples accesos
    this.initialize();
  }

  initialize() {
    // Crear tablas
    this.db.exec(`
      -- Tabla de usuarios
      CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        rol TEXT NOT NULL CHECK(rol IN ('admin', 'operador')),
        activo INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Tabla de terceros (clientes/cuentas)
      CREATE TABLE IF NOT EXISTS terceros (
        codigo TEXT PRIMARY KEY,
        nombre TEXT NOT NULL,
        descripcion TEXT,
        tipo TEXT DEFAULT 'cliente',
        activo INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Tabla de códigos de ingreso
      CREATE TABLE IF NOT EXISTS codigos_ingreso (
        codigo TEXT PRIMARY KEY,
        concepto TEXT NOT NULL,
        observaciones TEXT,
        activo INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Tabla de códigos de egreso
      CREATE TABLE IF NOT EXISTS codigos_egreso (
        codigo TEXT PRIMARY KEY,
        concepto TEXT NOT NULL,
        observaciones TEXT,
        activo INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Tabla de movimientos
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
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (codigo_tercero) REFERENCES terceros(codigo),
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
      );

      -- Índices para mejor rendimiento
      CREATE INDEX IF NOT EXISTS idx_movimientos_fecha ON movimientos(fecha);
      CREATE INDEX IF NOT EXISTS idx_movimientos_tipo ON movimientos(tipo);
      CREATE INDEX IF NOT EXISTS idx_movimientos_codigo_operacion ON movimientos(codigo_operacion);
      CREATE INDEX IF NOT EXISTS idx_movimientos_codigo_tercero ON movimientos(codigo_tercero);

      -- Tabla de configuración
      CREATE TABLE IF NOT EXISTS configuracion (
        clave TEXT PRIMARY KEY,
        valor TEXT
      );
    `);

    // Insertar datos iniciales si no existen
    this.insertarDatosIniciales();
  }

  insertarDatosIniciales() {
    // Verificar si ya hay usuarios
    const userCount = this.db.prepare('SELECT COUNT(*) as count FROM usuarios').get();
    if (userCount.count === 0) {
      // Crear usuario admin por defecto
      const hash = bcrypt.hashSync('admin123', 10);
      this.db.prepare(`
        INSERT INTO usuarios (nombre, email, password_hash, rol)
        VALUES (?, ?, ?, ?)
      `).run('Administrador', 'admin@neurocontable.com', hash, 'admin');
    }

    // Verificar si ya hay terceros
    const terceroCount = this.db.prepare('SELECT COUNT(*) as count FROM terceros').get();
    if (terceroCount.count === 0) {
      const terceros = [
        ['0', 'CONSIGNACIÓN POR IDENTIFICAR', 'Consignaciones pendientes de identificar', 'sistema'],
        ['1', 'Cuenta 1 - DAFF', 'Cuenta bancaria DAFF', 'cuenta'],
        ['2', 'Cuenta 2 - GTFF', 'Cuenta bancaria GTFF', 'cuenta'],
        ['3', 'PARA CLIENTE', 'Movimientos para clientes', 'cliente'],
        ['4', 'PARA CLIENTE', 'Movimientos para clientes', 'cliente'],
        ['5', 'PARA CLIENTE', 'Movimientos para clientes', 'cliente']
      ];

      const stmt = this.db.prepare(`
        INSERT INTO terceros (codigo, nombre, descripcion, tipo) VALUES (?, ?, ?, ?)
      `);

      terceros.forEach(t => stmt.run(...t));
    }

    // Verificar si ya hay códigos de ingreso
    const ingresoCount = this.db.prepare('SELECT COUNT(*) as count FROM codigos_ingreso').get();
    if (ingresoCount.count === 0) {
      const codigosIngreso = [
        ['A', 'Recibido por: -FACTURAS -GTFF', 'Abonan o cancelan facturación de GTFF'],
        ['B', 'Recibido por: -Cuentas de cobro -GTFF', 'Abonan o cancelan cuentas de cobro de GTFF'],
        ['C', 'Recibido por: -Cuentas de cobro -DAFF', 'Abonan o cancelan cuentas de cobro de DAFF'],
        ['D', 'Recibido por: -Otros ingresos Sin Facturación', 'Pagos sin factura: asesorías, GMF, propinas, regalos, aguinaldos, reintegros'],
        ['E', 'Ingresos Recibidos de terceros para pagos', 'Dineros consignados por terceros para destino específico'],
        ['F', 'Recibido por: -Cuentas por Cobrar', 'Abonan o cancelan dineros prestados o cuentas por cobrar diferentes a facturación'],
        ['G', 'Recibido por: -Abono a préstamos por Nómina de:', 'Abono o cancelación de préstamos de Diego A. Fernández F.'],
        ['H', 'Recibido por: -Abono a préstamos por Nómina de:', 'Abono o cancelación de préstamos de Felipe Bossio Zapata'],
        ['I', '-Retiros y Traslados de Bancos', 'Traslados y retiros de cuentas bancarias que entran a caja'],
        ['J', '-Consignaciones pendientes de identificar', 'Consignaciones sin identificar, uso provisional'],
        ['K', 'Recibido por: -Préstamos a favor de la oficina', 'Dineros por préstamos que le hagan a GTFF'],
        ['L', 'Reembolsos y recuperaciones', 'Reembolsos y recuperaciones'],
        ['M', 'Recibido por: -Abono a préstamos', 'Abono o cancelación de préstamos de Juliana Fernández F.'],
        ['N', 'Pago bonificaciones', 'Solo para el pago de la bonificación al final del año'],
        ['O', 'Recibido por: -Préstamos de Juliana Fernandez', 'Dineros por préstamos de Juliana Fernández a la oficina'],
        ['P', 'Recibido por: aguinaldos', 'Aguinaldos para Empleado 1'],
        ['Q', 'Recibido por: aguinaldos', 'Aguinaldos para Empleado 2'],
        ['R', 'Recibido por: aguinaldos', 'Aguinaldos para Empleado 3']
      ];

      const stmt = this.db.prepare(`
        INSERT INTO codigos_ingreso (codigo, concepto, observaciones) VALUES (?, ?, ?)
      `);

      codigosIngreso.forEach(c => stmt.run(...c));
    }

    // Verificar si ya hay códigos de egreso
    const egresoCount = this.db.prepare('SELECT COUNT(*) as count FROM codigos_egreso').get();
    if (egresoCount.count === 0) {
      const codigosEgreso = [
        ['1', 'Gastos personales', 'Gastos exclusivamente personales que no tengan que ver con la familia, oficina y Barbosa'],
        ['2', 'Pago de Salarios a:', 'Se pagan los Salarios cada semana'],
        ['3', 'Pago de Prestaciones sociales a:', 'Se pagan las Liquidaciones del personal al final del año o por retiro'],
        ['4', 'Pago de Bonificación a:', 'Se pagan Bonificaciones no incluidas en las liquidaciones del personal'],
        ['5', 'Préstamos por Nómina a:', 'Se desembolsan préstamos a Diego A. Fernández F.'],
        ['6', 'Préstamos por Nómina a:', 'Se desembolsan préstamos a Felipe Bossio Zapata'],
        ['7', 'Pagos de: -Seguridad Social', 'Se pagan los aportes a la seguridad social de la oficina y personal cada mes'],
        ['8', 'Pagos de: -Cuota para alimentos y Manutención', 'Se hacen pagos a Libia y las niñas, a Choly, a Omar, a Juliana y DAFF'],
        ['9', 'Pagos de: -Servicios públicos -OFICINA-', 'Se hacen pagos sólo de UNE y EPM que tengan que ver con la Oficina'],
        ['10', 'Pagos de: -Servicios públicos -NIÑAS-', 'Se hacen pagos sólo de UNE y EPM de que tengan que ver con Babilonia'],
        ['11', 'Pagos de: -Servicios Administración y otros Oficina', 'Se hacen pagos sólo de UNE y EPM de que tengan que ver con Ermita'],
        ['12', 'Pagos de: -Celulares', 'Se pagan los celulares de Libia y GTFF, (se debe discriminar por tercero)'],
        ['13', 'Pagos de: -Suscripciones', 'Se paga el trimestre de CETA'],
        ['14', 'Pagos de: -Seminarios y capacitaciones', 'Se pagan por la asistencia a seminarios'],
        ['15', 'Pagos de: -Mantenimiento de equipos y telefonía', 'Se paga por el mantenimiento de computadores, teléfonos y reparación de equipos'],
        ['16', 'Pagos de: -Aguinaldos y Propinas', 'Se pagan Propinas (Agua) y aguinaldos al fin del año'],
        ['17', 'Pagos de: -Sanciones e intereses asumidos', 'Se pagan por cuenta de la oficina impuestos, sanciones e intereses al asumir por un error cometido'],
        ['18', 'Pagos de: -Pasajes y transportes', 'Se pagan pasajes y demás, si no se van a cobrar se le carga al tercero de la oficina'],
        ['19', 'Pagos de: -Gastos Barbosa', 'Se pagan todo lo que tenga que ver con Barbosa como pagos a EPM, acueductos y pagos para ALFF'],
        ['20', 'Pagos de: -Demás Gastos oficina', 'Se pagan gastos como Aseo y demás extraordinarios y no clasificados'],
        ['21', 'Pagos de: -Cuentas por Pagar a:', 'Se hacen abonos o cancelaciones de platas que debe la oficina'],
        ['22', 'Compra de: -Equipos, dotaciones y repuestos para oficina', 'Sólo para la oficina o GTFF'],
        ['23', 'Compra de: -Útiles de aseo', 'Sólo para gastos de la oficina, si son para GTFF van en el código (1)'],
        ['24', 'Compra de: -Papelería', 'Sólo para gastos de la oficina, si son para GTFF van en el código (1)'],
        ['25', 'Compra de: -Manuales, Libros y formularios', 'Sólo para gastos de la oficina, si son para GTFF van en el código (1)'],
        ['26', 'Compra de: -Drogas y farmacia', 'Sólo para gastos de la oficina, si son para GTFF van en el código (1)'],
        ['27', 'Compra de: -Restaurante y cafetería', 'Sólo para gastos de la oficina, si son para GTFF van en el código (1)'],
        ['28', 'Préstamos a:', 'Se desembolsa o presta plata a personas distintas a los clientes (Terceros)'],
        ['29', 'Egresos por Cuenta de Terceros -Pagos impuestos-', 'Se presta plata a los clientes (Terceros) para pagarles cualquier tipo de Impuestos'],
        ['30', 'Egresos por Cuenta de Terceros -Seguridad social-', 'Se presta plata a los clientes (Terceros) para pagarles la seguridad social'],
        ['31', 'Egresos por Cuenta de Terceros -Certificados y otros', 'Se presta plata a los clientes (Terceros) para comprarles cualquier tipo de certificado'],
        ['32', 'Egresos por Cuenta de Terceros -Mantenimiento o compras de equipos y repuestos', 'Se presta plata a los clientes (Terceros) para comprarles o pagarles mantenimiento de equipos'],
        ['33', 'AJUSTE POR -Consignación - Traslado a Bancos', 'Se hace por consignaciones a las cuentas de Bancolombia (GTFF, DAFF y Choly)'],
        ['34', 'AJUSTE POR -Consignaciones pendientes de identificar', 'Se reciben consignaciones sin identificar, se asienta en el gasto para no distorsionar la caja'],
        ['35', 'Impuestos, tasas y contribuciones -GTFF-', 'Se hacen pagos de IVA, Predial, de demás impuestos a nombre de GTFF'],
        ['36', 'Pago en efectivo', 'de las Facturas GTFF y las cuentas de cobro DAFF'],
        ['37', 'Gastos Barbosa', 'Gastos de Barbosa'],
        ['38', 'Pagos de bonificaciones', 'Sólo para el pago de la bonificación al final del año'],
        ['39', 'Pago intereses préstamo Juliana', 'Se hacen abonos a los intereses del préstamo de Juliana María Fernández Fernández'],
        ['40', 'Rembolso por retención en la fuente no descontadas', 'Rembolso de la retención en la fuente de las facturas de GTFF que el cliente no descuenta'],
        ['41', 'AJUSTE POR -aguinaldos a la empresa y otros', 'Ajustes por aguinaldos a la empresa'],
        ['42', 'AJUSTE POR -Cruce de cuentas', 'Ajustes por cruce de cuentas'],
        ['43', 'Pago Hipotecario BANCOLOMBIA', 'Pago del crédito hipotecario Bancolombia'],
        ['44', 'Gastos Oficina Arriendo', 'Gastos de arriendo de la oficina']
      ];

      const stmt = this.db.prepare(`
        INSERT INTO codigos_egreso (codigo, concepto, observaciones) VALUES (?, ?, ?)
      `);

      codigosEgreso.forEach(c => stmt.run(...c));
    }

    // Insertar año actual en configuración
    const config = this.db.prepare('SELECT * FROM configuracion WHERE clave = ?').get('ano_actual');
    if (!config) {
      this.db.prepare('INSERT INTO configuracion (clave, valor) VALUES (?, ?)')
        .run('ano_actual', new Date().getFullYear().toString());
    }
  }

  // ============== AUTENTICACIÓN ==============
  login(email, password) {
    const user = this.db.prepare('SELECT * FROM usuarios WHERE email = ? AND activo = 1').get(email);
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
    return this.db.prepare(`
      SELECT id, nombre, email, rol, activo, created_at
      FROM usuarios ORDER BY nombre
    `).all();
  }

  createUser({ nombre, email, password, rol }) {
    try {
      const hash = bcrypt.hashSync(password, 10);
      const result = this.db.prepare(`
        INSERT INTO usuarios (nombre, email, password_hash, rol)
        VALUES (?, ?, ?, ?)
      `).run(nombre, email, hash, rol);
      return { success: true, id: result.lastInsertRowid };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  updateUser(id, { nombre, email, password, rol, activo }) {
    try {
      if (password) {
        const hash = bcrypt.hashSync(password, 10);
        this.db.prepare(`
          UPDATE usuarios SET nombre = ?, email = ?, password_hash = ?, rol = ?, activo = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(nombre, email, hash, rol, activo ? 1 : 0, id);
      } else {
        this.db.prepare(`
          UPDATE usuarios SET nombre = ?, email = ?, rol = ?, activo = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(nombre, email, rol, activo ? 1 : 0, id);
      }
      return { success: true };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  deleteUser(id) {
    try {
      this.db.prepare('DELETE FROM usuarios WHERE id = ?').run(id);
      return { success: true };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  // ============== TERCEROS ==============
  getTerceros() {
    return this.db.prepare('SELECT * FROM terceros WHERE activo = 1 ORDER BY codigo').all();
  }

  createTercero({ codigo, nombre, descripcion, tipo }) {
    try {
      this.db.prepare(`
        INSERT INTO terceros (codigo, nombre, descripcion, tipo)
        VALUES (?, ?, ?, ?)
      `).run(codigo, nombre, descripcion || '', tipo || 'cliente');
      return { success: true };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  updateTercero(codigo, { nombre, descripcion, tipo }) {
    try {
      this.db.prepare(`
        UPDATE terceros SET nombre = ?, descripcion = ?, tipo = ?
        WHERE codigo = ?
      `).run(nombre, descripcion, tipo, codigo);
      return { success: true };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  deleteTercero(codigo) {
    try {
      this.db.prepare('UPDATE terceros SET activo = 0 WHERE codigo = ?').run(codigo);
      return { success: true };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  // ============== CÓDIGOS DE INGRESO ==============
  getCodigosIngreso() {
    return this.db.prepare('SELECT * FROM codigos_ingreso WHERE activo = 1 ORDER BY codigo').all();
  }

  createCodigoIngreso({ codigo, concepto, observaciones }) {
    try {
      this.db.prepare(`
        INSERT INTO codigos_ingreso (codigo, concepto, observaciones)
        VALUES (?, ?, ?)
      `).run(codigo, concepto, observaciones || '');
      return { success: true };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  updateCodigoIngreso(codigo, { concepto, observaciones }) {
    try {
      this.db.prepare(`
        UPDATE codigos_ingreso SET concepto = ?, observaciones = ?
        WHERE codigo = ?
      `).run(concepto, observaciones, codigo);
      return { success: true };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  deleteCodigoIngreso(codigo) {
    try {
      this.db.prepare('UPDATE codigos_ingreso SET activo = 0 WHERE codigo = ?').run(codigo);
      return { success: true };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  // ============== CÓDIGOS DE EGRESO ==============
  getCodigosEgreso() {
    return this.db.prepare('SELECT * FROM codigos_egreso WHERE activo = 1 ORDER BY CAST(codigo AS INTEGER)').all();
  }

  createCodigoEgreso({ codigo, concepto, observaciones }) {
    try {
      this.db.prepare(`
        INSERT INTO codigos_egreso (codigo, concepto, observaciones)
        VALUES (?, ?, ?)
      `).run(codigo, concepto, observaciones || '');
      return { success: true };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  updateCodigoEgreso(codigo, { concepto, observaciones }) {
    try {
      this.db.prepare(`
        UPDATE codigos_egreso SET concepto = ?, observaciones = ?
        WHERE codigo = ?
      `).run(concepto, observaciones, codigo);
      return { success: true };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  deleteCodigoEgreso(codigo) {
    try {
      this.db.prepare('UPDATE codigos_egreso SET activo = 0 WHERE codigo = ?').run(codigo);
      return { success: true };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  // ============== MOVIMIENTOS ==============
  getMovimientos(filtros = {}) {
    let sql = `
      SELECT
        m.*,
        CASE
          WHEN m.tipo = 'ingreso' THEN ci.concepto
          ELSE ce.concepto
        END as concepto_operacion,
        t.nombre as nombre_tercero
      FROM movimientos m
      LEFT JOIN codigos_ingreso ci ON m.tipo = 'ingreso' AND m.codigo_operacion = ci.codigo
      LEFT JOIN codigos_egreso ce ON m.tipo = 'egreso' AND m.codigo_operacion = ce.codigo
      LEFT JOIN terceros t ON m.codigo_tercero = t.codigo
      WHERE 1=1
    `;

    const params = [];

    if (filtros.fechaInicio) {
      sql += ' AND m.fecha >= ?';
      params.push(filtros.fechaInicio);
    }

    if (filtros.fechaFin) {
      sql += ' AND m.fecha <= ?';
      params.push(filtros.fechaFin);
    }

    if (filtros.tipo) {
      sql += ' AND m.tipo = ?';
      params.push(filtros.tipo);
    }

    if (filtros.codigoOperacion) {
      sql += ' AND m.codigo_operacion = ?';
      params.push(filtros.codigoOperacion);
    }

    if (filtros.codigoTercero) {
      sql += ' AND m.codigo_tercero = ?';
      params.push(filtros.codigoTercero);
    }

    sql += ' ORDER BY m.fecha DESC, m.id DESC';

    return this.db.prepare(sql).all(...params);
  }

  createMovimiento({ fecha, tipo, codigo_operacion, codigo_tercero, monto, detalle, revision, usuario_id }) {
    try {
      const result = this.db.prepare(`
        INSERT INTO movimientos (fecha, tipo, codigo_operacion, codigo_tercero, monto, detalle, revision, usuario_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(fecha, tipo, codigo_operacion, codigo_tercero, monto, detalle || '', revision || '', usuario_id);
      return { success: true, id: result.lastInsertRowid };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  updateMovimiento(id, { fecha, tipo, codigo_operacion, codigo_tercero, monto, detalle, revision }) {
    try {
      this.db.prepare(`
        UPDATE movimientos
        SET fecha = ?, tipo = ?, codigo_operacion = ?, codigo_tercero = ?, monto = ?, detalle = ?, revision = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(fecha, tipo, codigo_operacion, codigo_tercero, monto, detalle, revision, id);
      return { success: true };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  deleteMovimiento(id) {
    try {
      this.db.prepare('DELETE FROM movimientos WHERE id = ?').run(id);
      return { success: true };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  getMovimientosByDateRange(fechaInicio, fechaFin) {
    return this.getMovimientos({ fechaInicio, fechaFin });
  }

  // ============== SALDOS ==============
  getSaldosByCuenta() {
    return this.db.prepare(`
      SELECT
        t.codigo,
        t.nombre,
        COALESCE(SUM(CASE WHEN m.tipo = 'ingreso' THEN m.monto ELSE 0 END), 0) as total_ingresos,
        COALESCE(SUM(CASE WHEN m.tipo = 'egreso' THEN m.monto ELSE 0 END), 0) as total_egresos,
        COALESCE(SUM(CASE WHEN m.tipo = 'ingreso' THEN m.monto ELSE -m.monto END), 0) as saldo
      FROM terceros t
      LEFT JOIN movimientos m ON t.codigo = m.codigo_tercero
      WHERE t.activo = 1 AND t.tipo = 'cuenta'
      GROUP BY t.codigo, t.nombre
      ORDER BY t.codigo
    `).all();
  }

  getSaldosByTercero() {
    return this.db.prepare(`
      SELECT
        t.codigo,
        t.nombre,
        t.tipo,
        COALESCE(SUM(CASE WHEN m.tipo = 'ingreso' THEN m.monto ELSE 0 END), 0) as total_ingresos,
        COALESCE(SUM(CASE WHEN m.tipo = 'egreso' THEN m.monto ELSE 0 END), 0) as total_egresos,
        COALESCE(SUM(CASE WHEN m.tipo = 'ingreso' THEN m.monto ELSE -m.monto END), 0) as saldo
      FROM terceros t
      LEFT JOIN movimientos m ON t.codigo = m.codigo_tercero
      WHERE t.activo = 1
      GROUP BY t.codigo, t.nombre, t.tipo
      ORDER BY t.codigo
    `).all();
  }

  getSaldoGeneral() {
    const result = this.db.prepare(`
      SELECT
        COALESCE(SUM(CASE WHEN tipo = 'ingreso' THEN monto ELSE 0 END), 0) as total_ingresos,
        COALESCE(SUM(CASE WHEN tipo = 'egreso' THEN monto ELSE 0 END), 0) as total_egresos,
        COALESCE(SUM(CASE WHEN tipo = 'ingreso' THEN monto ELSE -monto END), 0) as saldo
      FROM movimientos
    `).get();
    return result;
  }

  // ============== REPORTES ==============
  getResumenPorConcepto(fechaInicio, fechaFin, tipo) {
    let sql;
    if (tipo === 'ingreso') {
      sql = `
        SELECT
          ci.codigo,
          ci.concepto,
          COUNT(m.id) as cantidad,
          COALESCE(SUM(m.monto), 0) as total
        FROM codigos_ingreso ci
        LEFT JOIN movimientos m ON ci.codigo = m.codigo_operacion AND m.tipo = 'ingreso'
          AND m.fecha BETWEEN ? AND ?
        WHERE ci.activo = 1
        GROUP BY ci.codigo, ci.concepto
        ORDER BY total DESC
      `;
    } else {
      sql = `
        SELECT
          ce.codigo,
          ce.concepto,
          COUNT(m.id) as cantidad,
          COALESCE(SUM(m.monto), 0) as total
        FROM codigos_egreso ce
        LEFT JOIN movimientos m ON ce.codigo = m.codigo_operacion AND m.tipo = 'egreso'
          AND m.fecha BETWEEN ? AND ?
        WHERE ce.activo = 1
        GROUP BY ce.codigo, ce.concepto
        ORDER BY total DESC
      `;
    }
    return this.db.prepare(sql).all(fechaInicio, fechaFin);
  }

  getResumenPorPeriodo(fechaInicio, fechaFin, agrupacion) {
    let dateFormat;
    switch (agrupacion) {
      case 'diario':
        dateFormat = '%Y-%m-%d';
        break;
      case 'semanal':
        dateFormat = '%Y-W%W';
        break;
      case 'mensual':
        dateFormat = '%Y-%m';
        break;
      default:
        dateFormat = '%Y-%m-%d';
    }

    return this.db.prepare(`
      SELECT
        strftime('${dateFormat}', fecha) as periodo,
        SUM(CASE WHEN tipo = 'ingreso' THEN monto ELSE 0 END) as ingresos,
        SUM(CASE WHEN tipo = 'egreso' THEN monto ELSE 0 END) as egresos,
        SUM(CASE WHEN tipo = 'ingreso' THEN monto ELSE -monto END) as saldo
      FROM movimientos
      WHERE fecha BETWEEN ? AND ?
      GROUP BY strftime('${dateFormat}', fecha)
      ORDER BY periodo
    `).all(fechaInicio, fechaFin);
  }

  getResumenPorTercero(fechaInicio, fechaFin) {
    return this.db.prepare(`
      SELECT
        t.codigo,
        t.nombre,
        t.tipo as tipo_tercero,
        SUM(CASE WHEN m.tipo = 'ingreso' THEN m.monto ELSE 0 END) as ingresos,
        SUM(CASE WHEN m.tipo = 'egreso' THEN m.monto ELSE 0 END) as egresos,
        SUM(CASE WHEN m.tipo = 'ingreso' THEN m.monto ELSE -m.monto END) as saldo
      FROM terceros t
      LEFT JOIN movimientos m ON t.codigo = m.codigo_tercero
        AND m.fecha BETWEEN ? AND ?
      WHERE t.activo = 1
      GROUP BY t.codigo, t.nombre, t.tipo
      ORDER BY saldo DESC
    `).all(fechaInicio, fechaFin);
  }

  getComparativo(periodo1, periodo2) {
    const datos1 = this.db.prepare(`
      SELECT
        SUM(CASE WHEN tipo = 'ingreso' THEN monto ELSE 0 END) as ingresos,
        SUM(CASE WHEN tipo = 'egreso' THEN monto ELSE 0 END) as egresos,
        SUM(CASE WHEN tipo = 'ingreso' THEN monto ELSE -monto END) as saldo
      FROM movimientos
      WHERE fecha BETWEEN ? AND ?
    `).get(periodo1.inicio, periodo1.fin);

    const datos2 = this.db.prepare(`
      SELECT
        SUM(CASE WHEN tipo = 'ingreso' THEN monto ELSE 0 END) as ingresos,
        SUM(CASE WHEN tipo = 'egreso' THEN monto ELSE 0 END) as egresos,
        SUM(CASE WHEN tipo = 'ingreso' THEN monto ELSE -monto END) as saldo
      FROM movimientos
      WHERE fecha BETWEEN ? AND ?
    `).get(periodo2.inicio, periodo2.fin);

    return {
      periodo1: { ...periodo1, datos: datos1 },
      periodo2: { ...periodo2, datos: datos2 }
    };
  }

  close() {
    if (this.db) {
      this.db.close();
    }
  }
}

module.exports = DatabaseManager;
