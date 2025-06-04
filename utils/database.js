import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

// Obtener __dirname en módulos ES
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Ruta base para los archivos de datos
const dataDir = path.join(__dirname, "..", "data")

// Asegurar que el directorio existe
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

// Función para leer datos de un archivo JSON
export const readData = (fileName) => {
  const filePath = path.join(dataDir, `${fileName}.json`)

  if (!fs.existsSync(filePath)) {
    return []
  }

  try {
    const data = fs.readFileSync(filePath, "utf8")
    return JSON.parse(data)
  } catch (error) {
    console.error(`Error al leer ${fileName}.json:`, error)
    return []
  }
}

// Función para escribir datos en un archivo JSON
export const writeData = (fileName, data) => {
  const filePath = path.join(dataDir, `${fileName}.json`)

  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8")
    return true
  } catch (error) {
    console.error(`Error al escribir ${fileName}.json:`, error)
    return false
  }
}

// Función para inicializar datos si no existen
export const initializeData = () => {
  // Inicializar roles si no existen
  const roles = readData("roles")
  if (roles.length === 0) {
    writeData("roles", [
      { id: 1, nombre: "admin", descripcion: "Administrador del sistema" },
      { id: 2, nombre: "usuario", descripcion: "Usuario regular" },
      { id: 3, nombre: "supervisor", descripcion: "Supervisor de escenarios" },
    ])
  }

  // Inicializar usuarios si no existen
  const users = readData("users")
  if (users.length === 0) {
    writeData("users", [
      {
        id: 1,
        nombre: "Admin",
        apellido: "Sistema",
        email: "admin@example.com",
        password: "$2b$10$XOPbrlUPQdwdJUpSrIF6X.LbE14qsMmKGq/zKrwgz/B0FVqxqckb6", // 'password123'
        cedula: "1234567890",
        telefono: "3001234567",
        direccion: "Calle Principal #123",
        rolId: 1,
        estado: "activo",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ])
  }

  // Inicializar localidades si no existen
  const locations = readData("locations")
  if (locations.length === 0) {
    writeData("locations", [
      { id: 1, nombre: "Centro", descripcion: "Zona centro de la ciudad" },
      { id: 2, nombre: "Olaya Herrera", descripcion: "Barrio Olaya Herrera" },
      { id: 3, nombre: "Chiquinquirá", descripcion: "Barrio Chiquinquirá" },
      { id: 4, nombre: "El Campestre", descripcion: "Zona El Campestre" },
    ])
  }

  // Inicializar deportes si no existen
  const sports = readData("sports")
  if (sports.length === 0) {
    writeData("sports", [
      { id: 1, nombre: "Fútbol", descripcion: "Fútbol 11", icono: "football" },
      { id: 2, nombre: "Baloncesto", descripcion: "Baloncesto", icono: "basketball" },
      { id: 3, nombre: "Voleibol", descripcion: "Voleibol", icono: "volleyball" },
      { id: 4, nombre: "Tenis", descripcion: "Tenis", icono: "tennis" },
      { id: 5, nombre: "Natación", descripcion: "Natación", icono: "swimming" },
      { id: 6, nombre: "Béisbol", descripcion: "Béisbol", icono: "baseball" },
      { id: 7, nombre: "Softbol", descripcion: "Softbol", icono: "softball" },
      { id: 8, nombre: "Patinaje", descripcion: "Patinaje", icono: "skating" },
      { id: 9, nombre: "Atletismo", descripcion: "Atletismo", icono: "athletics" },
    ])
  }

  // Inicializar amenidades si no existen
  const amenities = readData("amenities")
  if (amenities.length === 0) {
    writeData("amenities", [
      { id: 1, nombre: "Estacionamiento", descripcion: "Área de estacionamiento", icono: "parking" },
      { id: 2, nombre: "Vestuarios", descripcion: "Vestuarios con duchas", icono: "shower" },
      { id: 3, nombre: "Cafetería", descripcion: "Servicio de cafetería", icono: "coffee" },
      { id: 4, nombre: "Iluminación", descripcion: "Iluminación nocturna", icono: "lightbulb" },
      { id: 5, nombre: "Gradas", descripcion: "Gradas para espectadores", icono: "users" },
    ])
  }

  // Inicializar escenarios si no existen
  const scenes = readData("scenes")
  if (scenes.length === 0) {
    writeData("scenes", [
      {
        id: 1,
        nombre: "Estadio Jaime Morón",
        descripcion:
          "El Estadio Jaime Morón León es el principal escenario deportivo para la práctica del fútbol en la ciudad de Cartagena. Cuenta con una capacidad para 16.000 espectadores, césped natural y graderías techadas.",
        capacidad: 16000,
        dimensiones: "105m x 68m",
        localidadId: 2,
        deportePrincipalId: 1,
        direccion: "Barrio Olaya Herrera, Cartagena",
        estado: "disponible",
        imagenPrincipal: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 2,
        nombre: "Estadio de Béisbol Once de Noviembre",
        descripcion: "Estadio de béisbol con capacidad para 12.000 espectadores, iluminación nocturna y palcos VIP.",
        capacidad: 12000,
        dimensiones: "120m x 120m",
        localidadId: 1,
        deportePrincipalId: 6,
        direccion: "Centro, Cartagena",
        estado: "disponible",
        imagenPrincipal: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 3,
        nombre: "Complejo Acuático Jaime González Johnson",
        descripcion: "Complejo con piscina olímpica de 50 metros, piscina de clavados y áreas de entrenamiento.",
        capacidad: 1000,
        dimensiones: "50m x 25m",
        localidadId: 1,
        deportePrincipalId: 5,
        direccion: "Centro, Cartagena",
        estado: "disponible",
        imagenPrincipal: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ])
  }

  // Inicializar propósitos de reserva si no existen
  const purposes = readData("purposes")
  if (purposes.length === 0) {
    writeData("purposes", [
      { id: 1, nombre: "Evento deportivo", descripcion: "Competencia o evento deportivo organizado" },
      { id: 2, nombre: "Entrenamiento", descripcion: "Sesión de entrenamiento deportivo" },
      { id: 3, nombre: "Competencia", descripcion: "Competencia deportiva oficial" },
      { id: 4, nombre: "Recreación", descripcion: "Actividad recreativa" },
      { id: 5, nombre: "Clase", descripcion: "Clase o curso deportivo" },
    ])
  }

  // Inicializar estados de solicitud si no existen
  const requestStatuses = readData("requestStatuses")
  if (requestStatuses.length === 0) {
    writeData("requestStatuses", [
      { id: 1, nombre: "pendiente", descripcion: "Solicitud pendiente de revisión", color: "yellow" },
      { id: 2, nombre: "aprobada", descripcion: "Solicitud aprobada", color: "green" },
      { id: 3, nombre: "rechazada", descripcion: "Solicitud rechazada", color: "red" },
      { id: 4, nombre: "completada", descripcion: "Reserva completada", color: "blue" },
    ])
  }
}

// Inicializar datos al cargar el módulo
initializeData()
