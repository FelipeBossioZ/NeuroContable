# NeuroContable - Sistema de Caja Diario

Sistema de escritorio para gestión de caja diario (ingresos y egresos) con sincronización OneDrive.

## Características

- **Interfaz tipo Excel**: Edición en línea de movimientos con AG-Grid
- **Tiempo real**: Actualización instantánea de saldos y totales
- **Gráficas interactivas**: Visualización de datos con Chart.js
- **Sincronización OneDrive**: Base de datos compartida entre múltiples equipos
- **Modo offline**: Funciona sin conexión, sincroniza al reconectar
- **Exportación**: Genera reportes en Excel y PDF
- **Control de acceso**: Sistema de usuarios con roles (Admin/Operador)

## Requisitos

- Node.js 18 o superior
- npm o yarn
- Windows/Mac/Linux

## Instalación

```bash
# Clonar el repositorio
git clone <url-del-repositorio>
cd NeuroContable

# Instalar dependencias
npm install

# Ejecutar en modo desarrollo
npm run dev

# Compilar para producción
npm run dist
```

## Estructura del Proyecto

```
NeuroContable/
├── public/                  # Archivos estáticos
├── src/
│   ├── main/               # Proceso principal de Electron
│   │   ├── main.js         # Entrada de Electron
│   │   ├── preload.js      # API expuesta al renderer
│   │   └── database.js     # Gestión de SQLite
│   ├── components/         # Componentes React
│   │   ├── Login.js
│   │   ├── Layout.js
│   │   ├── Dashboard.js
│   │   ├── Movimientos.js  # Interfaz tipo Excel
│   │   ├── Codigos.js
│   │   ├── Terceros.js
│   │   ├── Reportes.js
│   │   ├── Configuracion.js
│   │   └── Usuarios.js
│   ├── context/            # Contextos de React
│   │   ├── AuthContext.js
│   │   └── DataContext.js
│   ├── App.js
│   ├── index.js
│   └── index.css
└── package.json
```

## Uso del Sistema

### Primer Inicio

1. Al iniciar, aparecerá la pantalla de login
2. Usuario por defecto: `admin@neurocontable.com`
3. Contraseña: `admin123`
4. **Importante**: Cambiar la contraseña después del primer inicio

### Configuración de OneDrive

1. Ir a **Configuración** en el menú lateral
2. Seleccionar la carpeta de OneDrive
3. Repetir en todos los equipos que usarán el sistema
4. Los datos se sincronizarán automáticamente

### Roles de Usuario

| Rol | Permisos |
|-----|----------|
| **Admin** | Todo: crear, editar, eliminar movimientos, códigos, terceros y usuarios |
| **Operador** | Crear y editar movimientos/códigos. No puede eliminar ni gestionar usuarios |

### Códigos de Ingreso (Entradas)

Los códigos de ingreso usan letras (A, B, C, etc.):
- A: Facturas GTFF
- B: Cuentas de cobro GTFF
- C: Cuentas de cobro DAFF
- ... (configurables)

### Códigos de Egreso (Salidas)

Los códigos de egreso usan números (1, 2, 3, etc.):
- 1: Gastos personales
- 2: Pago de salarios
- 3: Prestaciones sociales
- ... (configurables)

## Atajos de Teclado (en tabla de movimientos)

- **Enter**: Confirmar edición de celda
- **Esc**: Cancelar edición
- **Tab**: Siguiente celda
- **Ctrl+C/V**: Copiar/Pegar

## Exportación de Datos

### Excel
- Desde **Movimientos**: botón "Excel"
- Desde **Reportes**: botón "Excel"

### PDF
- Desde **Movimientos**: botón "PDF"
- Desde **Reportes**: botón "PDF"

## Respaldo de Datos

La base de datos se guarda en:
- **Con OneDrive**: `[Carpeta OneDrive]/NeuroContable/neurocontable.db`
- **Sin OneDrive**: `[AppData]/NeuroContable/neurocontable.db`

Se recomienda:
1. Mantener OneDrive sincronizado
2. Hacer respaldos periódicos del archivo `.db`

## Solución de Problemas

### Error de sincronización
1. Verificar conexión a internet
2. Verificar que OneDrive esté funcionando
3. Reiniciar la aplicación

### Conflictos de datos
Evitar que dos usuarios editen el mismo registro simultáneamente.

### Base de datos corrupta
1. Cerrar la aplicación en todos los equipos
2. Restaurar desde respaldo

## Tecnologías Utilizadas

- **Electron**: Aplicación de escritorio multiplataforma
- **React**: Interfaz de usuario
- **AG-Grid**: Tabla tipo Excel
- **SQLite**: Base de datos local
- **Chart.js**: Gráficas
- **ExcelJS**: Exportación a Excel
- **jsPDF**: Exportación a PDF

## Licencia

Propietario - Todos los derechos reservados
