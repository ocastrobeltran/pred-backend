-- Crear tablas si no existen

-- Roles
CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(50) UNIQUE NOT NULL,
  descripcion TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Usuarios
CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  apellido VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  cedula VARCHAR(20) UNIQUE,
  telefono VARCHAR(20),
  direccion TEXT,
  rol_id INTEGER NOT NULL REFERENCES roles(id),
  estado VARCHAR(20) DEFAULT 'pendiente',
  token_verificacion VARCHAR(100),
  token_expiracion TIMESTAMP,
  ultimo_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Localidades
CREATE TABLE IF NOT EXISTS localidades (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) UNIQUE NOT NULL,
  descripcion TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Deportes
CREATE TABLE IF NOT EXISTS deportes (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) UNIQUE NOT NULL,
  descripcion TEXT,
  icono VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Amenidades
CREATE TABLE IF NOT EXISTS amenidades (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) UNIQUE NOT NULL,
  descripcion TEXT,
  icono VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Escenarios
CREATE TABLE IF NOT EXISTS escenarios (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  descripcion TEXT,
  capacidad INTEGER,
  dimensiones VARCHAR(100),
  localidad_id INTEGER NOT NULL REFERENCES localidades(id),
  deporte_principal_id INTEGER NOT NULL REFERENCES deportes(id),
  direccion TEXT,
  estado VARCHAR(20) DEFAULT 'disponible',
  imagen_principal VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Relación Escenarios-Deportes
CREATE TABLE IF NOT EXISTS escenario_deportes (
  id SERIAL PRIMARY KEY,
  escenario_id INTEGER NOT NULL REFERENCES escenarios(id) ON DELETE CASCADE,
  deporte_id INTEGER NOT NULL REFERENCES deportes(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(escenario_id, deporte_id)
);

-- Relación Escenarios-Amenidades
CREATE TABLE IF NOT EXISTS escenario_amenidades (
  id SERIAL PRIMARY KEY,
  escenario_id INTEGER NOT NULL REFERENCES escenarios(id) ON DELETE CASCADE,
  amenidad_id INTEGER NOT NULL REFERENCES amenidades(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(escenario_id, amenidad_id)
);

-- Imágenes de Escenarios
CREATE TABLE IF NOT EXISTS escenario_imagenes (
  id SERIAL PRIMARY KEY,
  escenario_id INTEGER NOT NULL REFERENCES escenarios(id) ON DELETE CASCADE,
  url_imagen VARCHAR(255) NOT NULL,
  es_principal BOOLEAN DEFAULT FALSE,
  orden INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Horarios Disponibles
CREATE TABLE IF NOT EXISTS horarios_disponibles (
  id SERIAL PRIMARY KEY,
  escenario_id INTEGER NOT NULL REFERENCES escenarios(id) ON DELETE CASCADE,
  dia_semana VARCHAR(20) NOT NULL,
  hora_inicio TIME NOT NULL,
  hora_fin TIME NOT NULL,
  disponible BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Estados de Solicitud
CREATE TABLE IF NOT EXISTS estados_solicitud (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(50) UNIQUE NOT NULL,
  descripcion TEXT,
  color VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Propósitos de Reserva
CREATE TABLE IF NOT EXISTS propositos_reserva (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) UNIQUE NOT NULL,
  descripcion TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Solicitudes
CREATE TABLE IF NOT EXISTS solicitudes (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
  escenario_id INTEGER NOT NULL REFERENCES escenarios(id),
  fecha_reserva DATE NOT NULL,
  hora_inicio TIME NOT NULL,
  hora_fin TIME NOT NULL,
  proposito_id INTEGER NOT NULL REFERENCES propositos_reserva(id),
  num_participantes INTEGER NOT NULL,
  estado_id INTEGER NOT NULL REFERENCES estados_solicitud(id),
  notas TEXT,
  admin_id INTEGER REFERENCES usuarios(id),
  admin_notas TEXT,
  fecha_respuesta TIMESTAMP,
  codigo_reserva VARCHAR(20) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Historial de Estados de Solicitud
CREATE TABLE IF NOT EXISTS historial_estados_solicitud (
  id SERIAL PRIMARY KEY,
  solicitud_id INTEGER NOT NULL REFERENCES solicitudes(id) ON DELETE CASCADE,
  estado_anterior_id INTEGER REFERENCES estados_solicitud(id),
  estado_nuevo_id INTEGER NOT NULL REFERENCES estados_solicitud(id),
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
  notas TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notificaciones
CREATE TABLE IF NOT EXISTS notificaciones (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  titulo VARCHAR(255) NOT NULL,
  mensaje TEXT NOT NULL,
  tipo VARCHAR(20) DEFAULT 'info',
  leida BOOLEAN DEFAULT FALSE,
  url VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Configuración
CREATE TABLE IF NOT EXISTS configuracion (
  id SERIAL PRIMARY KEY,
  clave VARCHAR(100) UNIQUE NOT NULL,
  valor TEXT,
  descripcion TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertar datos iniciales si no existen

-- Roles
INSERT INTO roles (nombre, descripcion)
VALUES 
  ('admin', 'Administrador del sistema'),
  ('supervisor', 'Supervisor de escenarios'),
  ('usuario', 'Usuario regular')
ON CONFLICT (nombre) DO NOTHING;

-- Usuario administrador por defecto
INSERT INTO usuarios (nombre, apellido, email, password, cedula, telefono, direccion, rol_id, estado)
SELECT 'Admin', 'Sistema', 'admin@pred.com', '$2b$10$XOPbrlUPQdwdJhj2Yls48eUJlxSZ96gKqCBbbSZkI7SMQRn0NFv2y', '1234567890', '3001234567', 'Dirección Admin', r.id, 'activo'
FROM roles r
WHERE r.nombre = 'admin'
AND NOT EXISTS (SELECT 1 FROM usuarios WHERE email = 'admin@pred.com')
LIMIT 1;

-- Estados de solicitud
INSERT INTO estados_solicitud (nombre, descripcion, color)
VALUES 
  ('pendiente', 'Solicitud en espera de revisión', 'yellow'),
  ('aprobada', 'Solicitud aprobada', 'green'),
  ('rechazada', 'Solicitud rechazada', 'red'),
  ('completada', 'Reserva completada', 'blue'),
  ('cancelada', 'Reserva cancelada', 'gray')
ON CONFLICT (nombre) DO NOTHING;

-- Propósitos de reserva
INSERT INTO propositos_reserva (nombre, descripcion)
VALUES 
  ('Evento deportivo', 'Competencia o evento deportivo organizado'),
  ('Entrenamiento', 'Sesión de entrenamiento deportivo'),
  ('Competencia', 'Competencia deportiva oficial'),
  ('Recreación', 'Actividad recreativa'),
  ('Clase', 'Clase o enseñanza deportiva')
ON CONFLICT (nombre) DO NOTHING;

-- Localidades
INSERT INTO localidades (nombre, descripcion)
VALUES 
  ('Centro', 'Zona centro de la ciudad'),
  ('Olaya Herrera', 'Barrio Olaya Herrera'),
  ('El Campestre', 'Zona El Campestre'),
  ('Chiquinquirá', 'Barrio Chiquinquirá')
ON CONFLICT (nombre) DO NOTHING;

-- Deportes
INSERT INTO deportes (nombre, descripcion, icono)
VALUES 
  ('Fútbol', 'Fútbol 11', 'football'),
  ('Baloncesto', 'Baloncesto', 'basketball'),
  ('Voleibol', 'Voleibol', 'volleyball'),
  ('Natación', 'Natación', 'swimming'),
  ('Atletismo', 'Atletismo', 'running'),
  ('Béisbol', 'Béisbol', 'baseball'),
  ('Softbol', 'Softbol', 'baseball'),
  ('Patinaje', 'Patinaje', 'skating'),
  ('Tenis', 'Tenis', 'tennis'),
  ('Levantamiento de pesas', 'Levantamiento de pesas', 'weightlifting')
ON CONFLICT (nombre) DO NOTHING;

-- Amenidades
INSERT INTO amenidades (nombre, descripcion, icono)
VALUES 
  ('Estacionamiento', 'Área de estacionamiento', 'parking'),
  ('Vestuarios', 'Vestuarios con duchas', 'shower'),
  ('Iluminación', 'Sistema de iluminación para uso nocturno', 'lightbulb'),
  ('Gradas', 'Gradas para espectadores', 'users'),
  ('Cafetería', 'Servicio de cafetería', 'coffee'),
  ('Baños públicos', 'Baños para el público', 'toilet'),
  ('Enfermería', 'Servicio de primeros auxilios', 'first-aid'),
  ('Wifi', 'Conexión a internet', 'wifi'),
  ('Seguridad', 'Personal de seguridad', 'shield')
ON CONFLICT (nombre) DO NOTHING;