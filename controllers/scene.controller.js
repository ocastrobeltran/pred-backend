import { query, pool } from "../config/database.js"
import { sendResponse, sendError } from "../utils/response.util.js"

// Obtener todos los escenarios con paginación y filtros
export const getAllScenes = async (req, res) => {
  try {
    const { page = 1, limit = 10, localidad_id, deporte_id, estado, search } = req.query
    const pageNumber = Number.parseInt(page)
    const limitNumber = Number.parseInt(limit)
    const offset = (pageNumber - 1) * limitNumber

    // Construir la consulta base
    let queryText = `
      SELECT e.*, 
             l.nombre as localidad_nombre,
             d.nombre as deporte_nombre,
             d.icono as deporte_icono
      FROM escenarios e
      LEFT JOIN localidades l ON e.localidad_id = l.id
      LEFT JOIN deportes d ON e.deporte_principal_id = d.id
      WHERE 1=1
    `

    const queryParams = []
    let paramIndex = 1

    // Añadir filtros
    if (localidad_id) {
      queryText += ` AND e.localidad_id = $${paramIndex++}`
      queryParams.push(Number.parseInt(localidad_id))
    }

    if (estado) {
      queryText += ` AND e.estado = $${paramIndex++}`
      queryParams.push(estado)
    }

    if (search) {
      queryText += ` AND (e.nombre ILIKE $${paramIndex} OR e.descripcion ILIKE $${paramIndex})`
      queryParams.push(`%${search}%`)
      paramIndex++
    }

    // Filtro especial para deporte (principal o asociado)
    if (deporte_id) {
      queryText += ` AND (e.deporte_principal_id = $${paramIndex} OR EXISTS (
        SELECT 1 FROM escenario_deportes ed WHERE ed.escenario_id = e.id AND ed.deporte_id = $${paramIndex}
      ))`
      queryParams.push(Number.parseInt(deporte_id))
      paramIndex++
    }

    // Añadir ordenamiento
    queryText += ` ORDER BY e.id DESC`

    // Consulta para contar el total de registros
    const countQuery = `SELECT COUNT(*) FROM (${queryText}) AS count_query`

    // Añadir paginación
    queryText += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`
    queryParams.push(limitNumber, offset)

    console.log("Query:", queryText)
    console.log("Params:", queryParams)

    // Ejecutar consultas
    const [scenesResult, countResult] = await Promise.all([
      query(queryText, queryParams),
      query(countQuery, queryParams.slice(0, -2)), // Excluir los parámetros de LIMIT y OFFSET
    ])

    const scenes = scenesResult.rows
    const total = Number.parseInt(countResult.rows[0].count)

    // Obtener información adicional para cada escenario
    const scenesWithDetails = await Promise.all(
      scenes.map(async (scene) => {
        // Obtener deportes asociados
        const deportesQuery = await query(
          `
        SELECT d.id, d.nombre, d.icono
        FROM escenario_deportes ed
        JOIN deportes d ON ed.deporte_id = d.id
        WHERE ed.escenario_id = $1
      `,
          [scene.id],
        )

        // Obtener amenidades
        const amenidadesQuery = await query(
          `
        SELECT a.id, a.nombre, a.icono
        FROM escenario_amenidades ea
        JOIN amenidades a ON ea.amenidad_id = a.id
        WHERE ea.escenario_id = $1
      `,
          [scene.id],
        )

        // Obtener imágenes
        const imagenesQuery = await query(
          `
        SELECT id, url_imagen, es_principal, orden
        FROM escenario_imagenes
        WHERE escenario_id = $1
        ORDER BY es_principal DESC, orden ASC
      `,
          [scene.id],
        )

        return {
          id: scene.id,
          nombre: scene.nombre,
          descripcion: scene.descripcion,
          capacidad: scene.capacidad,
          dimensiones: scene.dimensiones,
          direccion: scene.direccion,
          estado: scene.estado,
          imagen_principal: scene.imagen_principal,
          localidad: {
            id: scene.localidad_id,
            nombre: scene.localidad_nombre,
          },
          deporte_principal: {
            id: scene.deporte_principal_id,
            nombre: scene.deporte_nombre,
            icono: scene.deporte_icono,
          },
          deportes: deportesQuery.rows.map((d) => ({
            id: d.id,
            nombre: d.nombre,
            icono: d.icono,
          })),
          amenidades: amenidadesQuery.rows.map((a) => ({
            id: a.id,
            nombre: a.nombre,
            icono: a.icono,
          })),
          imagenes: imagenesQuery.rows.map((img) => ({
            id: img.id,
            url: img.url_imagen,
            es_principal: img.es_principal,
            orden: img.orden,
          })),
          created_at: scene.created_at,
        }
      }),
    )

    return sendResponse(
      res,
      {
        data: scenesWithDetails,
        pagination: {
          total,
          per_page: limitNumber,
          current_page: pageNumber,
          last_page: Math.ceil(total / limitNumber),
        },
      },
      "Escenarios obtenidos exitosamente",
    )
  } catch (error) {
    console.error("Error en getAllScenes:", error)
    return sendError(res, "Error en el servidor", 500)
  }
}

// Obtener un escenario por ID
export const getSceneById = async (req, res) => {
  try {
    const { id } = req.params

    // Consulta principal
    const sceneQuery = await query(
      `
      SELECT e.*, 
             l.nombre as localidad_nombre,
             d.nombre as deporte_nombre,
             d.icono as deporte_icono
      FROM escenarios e
      LEFT JOIN localidades l ON e.localidad_id = l.id
      LEFT JOIN deportes d ON e.deporte_principal_id = d.id
      WHERE e.id = $1
    `,
      [id],
    )

    if (sceneQuery.rows.length === 0) {
      return sendError(res, "Escenario no encontrado", 404)
    }

    const scene = sceneQuery.rows[0]

    // Obtener deportes asociados
    const deportesQuery = await query(
      `
      SELECT d.id, d.nombre, d.icono
      FROM escenario_deportes ed
      JOIN deportes d ON ed.deporte_id = d.id
      WHERE ed.escenario_id = $1
    `,
      [id],
    )

    // Obtener amenidades
    const amenidadesQuery = await query(
      `
      SELECT a.id, a.nombre, a.icono
      FROM escenario_amenidades ea
      JOIN amenidades a ON ea.amenidad_id = a.id
      WHERE ea.escenario_id = $1
    `,
      [id],
    )

    // Obtener imágenes
    const imagenesQuery = await query(
      `
      SELECT id, url_imagen, es_principal, orden
      FROM escenario_imagenes
      WHERE escenario_id = $1
      ORDER BY es_principal DESC, orden ASC
    `,
      [id],
    )

    // Obtener horarios
    const horariosQuery = await query(
      `
      SELECT id, dia_semana, hora_inicio, hora_fin, disponible
      FROM horarios_disponibles
      WHERE escenario_id = $1
      ORDER BY CASE 
        WHEN dia_semana = 'lunes' THEN 1
        WHEN dia_semana = 'martes' THEN 2
        WHEN dia_semana = 'miércoles' THEN 3
        WHEN dia_semana = 'jueves' THEN 4
        WHEN dia_semana = 'viernes' THEN 5
        WHEN dia_semana = 'sábado' THEN 6
        WHEN dia_semana = 'domingo' THEN 7
      END, hora_inicio
    `,
      [id],
    )

    const sceneDetails = {
      id: scene.id,
      nombre: scene.nombre,
      descripcion: scene.descripcion,
      capacidad: scene.capacidad,
      dimensiones: scene.dimensiones,
      direccion: scene.direccion,
      estado: scene.estado,
      imagen_principal: scene.imagen_principal,
      localidad: {
        id: scene.localidad_id,
        nombre: scene.localidad_nombre,
      },
      deporte_principal: {
        id: scene.deporte_principal_id,
        nombre: scene.deporte_nombre,
        icono: scene.deporte_icono,
      },
      deportes: deportesQuery.rows.map((d) => ({
        id: d.id,
        nombre: d.nombre,
        icono: d.icono,
      })),
      amenidades: amenidadesQuery.rows.map((a) => ({
        id: a.id,
        nombre: a.nombre,
        icono: a.icono,
      })),
      imagenes: imagenesQuery.rows.map((img) => ({
        id: img.id,
        url: img.url_imagen,
        es_principal: img.es_principal,
        orden: img.orden,
      })),
      horarios: horariosQuery.rows.map((h) => ({
        id: h.id,
        dia_semana: h.dia_semana,
        hora_inicio: h.hora_inicio,
        hora_fin: h.hora_fin,
        disponible: h.disponible,
      })),
      created_at: scene.created_at,
      updated_at: scene.updated_at,
    }

    return sendResponse(res, sceneDetails, "Escenario obtenido exitosamente")
  } catch (error) {
    console.error("Error en getSceneById:", error)
    return sendError(res, "Error en el servidor", 500)
  }
}

// Obtener localidades
export const getLocations = async (req, res) => {
  try {
    const locationsQuery = await query(`
      SELECT id, nombre, descripcion
      FROM localidades
      ORDER BY nombre
    `)

    return sendResponse(res, locationsQuery.rows, "Localidades obtenidas exitosamente")
  } catch (error) {
    console.error("Error en getLocations:", error)
    return sendError(res, "Error en el servidor", 500)
  }
}

// Obtener deportes
export const getSports = async (req, res) => {
  try {
    const sportsQuery = await query(`
      SELECT id, nombre, descripcion, icono
      FROM deportes
      ORDER BY nombre
    `)

    return sendResponse(res, sportsQuery.rows, "Deportes obtenidos exitosamente")
  } catch (error) {
    console.error("Error en getSports:", error)
    return sendError(res, "Error en el servidor", 500)
  }
}

// Obtener amenidades
export const getAmenities = async (req, res) => {
  try {
    const amenitiesQuery = await query(`
      SELECT id, nombre, descripcion, icono
      FROM amenidades
      ORDER BY nombre
    `)

    return sendResponse(res, amenitiesQuery.rows, "Amenidades obtenidas exitosamente")
  } catch (error) {
    console.error("Error en getAmenities:", error)
    return sendError(res, "Error en el servidor", 500)
  }
}

// ✅ FUNCIÓN CRÍTICA: Obtener días disponibles
export const getAvailableDays = async (req, res) => {
  try {
    let { escenario_id, desde, hasta } = req.query

    console.log("🔍 SCENE CONTROLLER - getAvailableDays - Parámetros:", { escenario_id, desde, hasta })

    if (!escenario_id || !desde || !hasta) {
      return sendError(res, "Error de validación en parámetros", 400, ["escenario_id, desde y hasta son requeridos"])
    }

    escenario_id = Number.parseInt(escenario_id)
    if (isNaN(escenario_id)) {
      return sendError(res, "Error de validación en parámetros", 400, ["El ID debe ser un número"])
    }

    const availableHours = ["08:00", "10:00", "12:00", "14:00", "16:00", "18:00"]

    // ✅ CORRECCIÓN: Usar estado_id = 3 (aprobada) según los datos reales
    const reservasQuery = await query(
      `
      SELECT fecha_reserva, hora_inicio, hora_fin
      FROM solicitudes
      WHERE escenario_id = $1
        AND DATE(fecha_reserva) BETWEEN DATE($2) AND DATE($3)
        AND estado_id = 3
      `,
      [escenario_id, desde, hasta],
    )

    console.log("📅 SCENE CONTROLLER - Reservas aprobadas encontradas:", reservasQuery.rows.length)

    // Agrupar reservas por fecha
    const reservasPorFecha = {}
    reservasQuery.rows.forEach((r) => {
      const fecha = r.fecha_reserva.toISOString().slice(0, 10)
      if (!reservasPorFecha[fecha]) reservasPorFecha[fecha] = []

      const inicio = r.hora_inicio.length > 5 ? r.hora_inicio.slice(0, 5) : r.hora_inicio
      const fin = r.hora_fin.length > 5 ? r.hora_fin.slice(0, 5) : r.hora_fin

      reservasPorFecha[fecha].push({ inicio, fin })
    })

    // Generar fechas del rango
    const fechas = []
    const d = new Date(desde)
    const end = new Date(hasta)
    while (d <= end) {
      fechas.push(d.toISOString().slice(0, 10))
      d.setDate(d.getDate() + 1)
    }

    // Para cada fecha, verificar si hay al menos un horario libre
    const diasDisponibles = fechas.filter((fecha) => {
      const reservas = reservasPorFecha[fecha] || []
      // Para cada horario, verificar si está libre
      return availableHours.some((hora) => {
        return !reservas.some((r) => hora >= r.inicio && hora < r.fin)
      })
    })

    console.log("✅ SCENE CONTROLLER - Días disponibles finales:", diasDisponibles.length)

    return sendResponse(res, diasDisponibles, "Días disponibles obtenidos exitosamente")
  } catch (error) {
    console.error("❌ Error en getAvailableDays:", error)
    return sendError(res, "Error en el servidor", 500)
  }
}

// ✅ FUNCIÓN CRÍTICA: Obtener horas disponibles - INVESTIGACIÓN PROFUNDA
export const getAvailableHours = async (req, res) => {
  try {
    let { escenario_id, fecha } = req.query

    console.log("🚨 INVESTIGACIÓN PROFUNDA - getAvailableHours")
    console.log("📥 Parámetros:", { escenario_id, fecha })

    if (!escenario_id || !fecha) {
      return sendError(res, "Error de validación en parámetros", 400, ["escenario_id y fecha son requeridos"])
    }

    escenario_id = Number.parseInt(escenario_id)
    if (isNaN(escenario_id)) {
      return sendError(res, "Error de validación en parámetros", 400, ["El ID debe ser un número"])
    }

    // Horarios base disponibles
    const availableHours = ["08:00", "10:00", "12:00", "14:00", "16:00", "18:00"]
    console.log("⏰ Horarios base:", availableHours)

    // 🔍 INVESTIGACIÓN 1: Ver TODAS las solicitudes para este escenario
    console.log("\n🔍 INVESTIGACIÓN 1: TODAS las solicitudes del escenario")
    const todasSolicitudesQuery = await query(
      `
      SELECT id, fecha_reserva, hora_inicio, hora_fin, estado_id, codigo_reserva, created_at
      FROM solicitudes
      WHERE escenario_id = $1
      ORDER BY fecha_reserva, hora_inicio
      `,
      [escenario_id],
    )

    console.log(`📊 Total solicitudes en el escenario: ${todasSolicitudesQuery.rows.length}`)
    todasSolicitudesQuery.rows.forEach((s, index) => {
      const fecha = s.fecha_reserva.toISOString().slice(0, 10)
      console.log(
        `   ${index + 1}. ID: ${s.id} | ${fecha} | ${s.hora_inicio}-${s.hora_fin} | Estado: ${s.estado_id} | ${s.codigo_reserva}`,
      )
    })

    // 🔍 INVESTIGACIÓN 2: Buscar específicamente por fecha con diferentes métodos
    console.log("\n🔍 INVESTIGACIÓN 2: Búsqueda por fecha con diferentes métodos")

    // Método 1: Comparación directa
    const metodo1 = await query(
      `
      SELECT id, fecha_reserva, hora_inicio, hora_fin, estado_id, codigo_reserva
      FROM solicitudes
      WHERE escenario_id = $1 AND fecha_reserva = $2
      ORDER BY hora_inicio
      `,
      [escenario_id, fecha],
    )
    console.log(`📅 Método 1 (fecha_reserva = '${fecha}'): ${metodo1.rows.length} resultados`)

    // Método 2: Con DATE()
    const metodo2 = await query(
      `
      SELECT id, fecha_reserva, hora_inicio, hora_fin, estado_id, codigo_reserva
      FROM solicitudes
      WHERE escenario_id = $1 AND DATE(fecha_reserva) = DATE($2)
      ORDER BY hora_inicio
      `,
      [escenario_id, fecha],
    )
    console.log(`📅 Método 2 (DATE() = DATE('${fecha}')): ${metodo2.rows.length} resultados`)

    // Método 3: Con CAST
    const metodo3 = await query(
      `
      SELECT id, fecha_reserva, hora_inicio, hora_fin, estado_id, codigo_reserva
      FROM solicitudes
      WHERE escenario_id = $1 AND fecha_reserva::date = $2::date
      ORDER BY hora_inicio
      `,
      [escenario_id, fecha],
    )
    console.log(`📅 Método 3 (::date = '${fecha}'::date): ${metodo3.rows.length} resultados`)

    // Método 4: Con BETWEEN
    const fechaInicio = fecha + " 00:00:00"
    const fechaFin = fecha + " 23:59:59"
    const metodo4 = await query(
      `
      SELECT id, fecha_reserva, hora_inicio, hora_fin, estado_id, codigo_reserva
      FROM solicitudes
      WHERE escenario_id = $1 AND fecha_reserva BETWEEN $2 AND $3
      ORDER BY hora_inicio
      `,
      [escenario_id, fechaInicio, fechaFin],
    )
    console.log(`📅 Método 4 (BETWEEN '${fechaInicio}' AND '${fechaFin}'): ${metodo4.rows.length} resultados`)

    // 🔍 INVESTIGACIÓN 3: Buscar por código específico
    console.log("\n🔍 INVESTIGACIÓN 3: Búsqueda por código específico")
    const porCodigo = await query(
      `
      SELECT id, fecha_reserva, hora_inicio, hora_fin, estado_id, codigo_reserva, escenario_id
      FROM solicitudes
      WHERE codigo_reserva = 'RES-20250606-1462'
      `,
    )
    console.log(`🔍 Reserva RES-20250606-1462: ${porCodigo.rows.length} resultados`)
    if (porCodigo.rows.length > 0) {
      const r = porCodigo.rows[0]
      const fecha = r.fecha_reserva.toISOString().slice(0, 10)
      console.log(
        `   📋 Detalles: ID: ${r.id} | Escenario: ${r.escenario_id} | ${fecha} | ${r.hora_inicio}-${r.hora_fin} | Estado: ${r.estado_id}`,
      )
    }

    // 🔍 INVESTIGACIÓN 4: Usar el método que más resultados devuelva
    console.log("\n🔍 INVESTIGACIÓN 4: Seleccionando el mejor método")
    const metodos = [
      { nombre: "Método 1", resultados: metodo1.rows },
      { nombre: "Método 2", resultados: metodo2.rows },
      { nombre: "Método 3", resultados: metodo3.rows },
      { nombre: "Método 4", resultados: metodo4.rows },
    ]

    const mejorMetodo = metodos.reduce((mejor, actual) =>
      actual.resultados.length > mejor.resultados.length ? actual : mejor,
    )

    console.log(`🏆 Mejor método: ${mejorMetodo.nombre} con ${mejorMetodo.resultados.length} resultados`)

    // Usar las reservas del mejor método, filtradas por estado aprobado
    const reservasAprobadas = mejorMetodo.resultados.filter((r) => r.estado_id === 3)

    console.log(`🔒 Reservas aprobadas (estado_id = 3): ${reservasAprobadas.length}`)
    reservasAprobadas.forEach((r, index) => {
      const fecha = r.fecha_reserva.toISOString().slice(0, 10)
      console.log(`   ${index + 1}. ID: ${r.id} | ${fecha} | ${r.hora_inicio}-${r.hora_fin} | ${r.codigo_reserva}`)
    })

    // Procesar reservas ocupadas
    const reservasOcupadas = reservasAprobadas.map((r) => {
      const inicio = r.hora_inicio.length > 5 ? r.hora_inicio.slice(0, 5) : r.hora_inicio
      const fin = r.hora_fin.length > 5 ? r.hora_fin.slice(0, 5) : r.hora_fin
      return { inicio, fin, codigo: r.codigo_reserva, id: r.id }
    })

    // ✅ ANÁLISIS DETALLADO: Verificar cada hora contra TODAS las reservas
    console.log("\n🔍 ANÁLISIS HORA POR HORA:")
    const horasLibres = availableHours.filter((hora) => {
      console.log(`\n⏰ Analizando hora: ${hora}`)

      const conflictos = reservasOcupadas.filter((reserva) => {
        const ocupado = hora >= reserva.inicio && hora < reserva.fin
        console.log(`   vs ${reserva.codigo} (${reserva.inicio}-${reserva.fin}): ${ocupado ? "❌ CONFLICTO" : "✅ OK"}`)
        return ocupado
      })

      const estaLibre = conflictos.length === 0
      console.log(`   📊 Resultado: ${estaLibre ? "✅ DISPONIBLE" : "❌ OCUPADA"} (${conflictos.length} conflictos)`)

      return estaLibre
    })

    console.log("\n" + "=".repeat(80))
    console.log("🎯 RESULTADO FINAL:")
    console.log(`📊 Horas disponibles: [${horasLibres.join(", ")}]`)
    console.log(`📊 Total: ${horasLibres.length}/${availableHours.length} horas disponibles`)
    console.log("=".repeat(80))

    return sendResponse(res, horasLibres, "Horas disponibles obtenidas exitosamente")
  } catch (error) {
    console.error("❌ Error en getAvailableHours:", error)
    return sendError(res, "Error en el servidor", 500)
  }
}

// Verificar disponibilidad
export const checkAvailability = async (req, res) => {
  try {
    const { escenario_id, fecha, hora_inicio, hora_fin } = req.body

    // Verificar si hay solicitudes aprobadas para ese horario
    const solicitudesQuery = await query(
      `
      SELECT id
      FROM solicitudes
      WHERE escenario_id = $1
      AND DATE(fecha_reserva) = DATE($2)
      AND estado_id = 3
      AND (
        (hora_inicio <= $3 AND hora_fin > $3) OR
        (hora_inicio < $4 AND hora_fin >= $4) OR
        (hora_inicio >= $3 AND hora_fin <= $4)
      )
    `,
      [escenario_id, fecha, hora_inicio, hora_fin],
    )

    const disponible = solicitudesQuery.rows.length === 0

    return sendResponse(res, { disponible }, disponible ? "Horario disponible" : "Horario no disponible")
  } catch (error) {
    console.error("Error en checkAvailability:", error)
    return sendError(res, "Error en el servidor", 500)
  }
}

// Obtener horas reservadas para un escenario en una fecha específica
export const getReservedHours = async (req, res) => {
  try {
    const { id } = req.params
    const { fecha } = req.query

    if (!fecha) {
      return sendError(res, "Se requiere la fecha", 400)
    }

    // Obtener horas reservadas
    const reservedHoursQuery = await query(
      `
      SELECT hora_inicio, hora_fin
      FROM solicitudes
      WHERE escenario_id = $1
      AND DATE(fecha_reserva) = DATE($2)
      AND estado_id = 3
      ORDER BY hora_inicio
    `,
      [id, fecha],
    )

    // Obtener horarios disponibles para ese día de la semana
    const diaSemana = new Date(fecha).toLocaleDateString("es-ES", { weekday: "long" }).toLowerCase()

    const horariosQuery = await query(
      `
      SELECT hora_inicio, hora_fin, disponible
      FROM horarios_disponibles
      WHERE escenario_id = $1
      AND dia_semana = $2
      ORDER BY hora_inicio
    `,
      [id, diaSemana],
    )

    return sendResponse(
      res,
      {
        fecha,
        dia_semana: diaSemana,
        horas_reservadas: reservedHoursQuery.rows,
        horarios_configurados: horariosQuery.rows,
      },
      "Horas reservadas obtenidas exitosamente",
    )
  } catch (error) {
    console.error("Error en getReservedHours:", error)
    return sendError(res, "Error en el servidor", 500)
  }
}

// Crear un nuevo escenario (solo admin)
export const createScene = async (req, res) => {
  try {
    const {
      nombre,
      descripcion,
      capacidad,
      dimensiones,
      localidad_id,
      deporte_principal_id,
      direccion,
      estado,
      imagen_principal,
      deportes,
      amenidades,
      imagenes,
      horarios,
    } = req.body

    // Iniciar transacción
    const client = await pool.connect()

    try {
      await client.query("BEGIN")

      // Insertar escenario
      const sceneQuery = await client.query(
        `
        INSERT INTO escenarios (
          nombre, descripcion, capacidad, dimensiones, localidad_id, 
          deporte_principal_id, direccion, estado, imagen_principal, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
        RETURNING id
      `,
        [
          nombre,
          descripcion,
          capacidad,
          dimensiones,
          localidad_id,
          deporte_principal_id,
          direccion,
          estado || "disponible",
          imagen_principal,
        ],
      )

      const escenarioId = sceneQuery.rows[0].id

      // Insertar deportes asociados
      if (deportes && deportes.length > 0) {
        for (const deporteId of deportes) {
          await client.query(
            `
            INSERT INTO escenario_deportes (escenario_id, deporte_id, created_at)
            VALUES ($1, $2, NOW())
          `,
            [escenarioId, deporteId],
          )
        }
      }

      // Insertar amenidades
      if (amenidades && amenidades.length > 0) {
        for (const amenidadId of amenidades) {
          await client.query(
            `
            INSERT INTO escenario_amenidades (escenario_id, amenidad_id, created_at)
            VALUES ($1, $2, NOW())
          `,
            [escenarioId, amenidadId],
          )
        }
      }

      // Insertar imágenes
      if (imagenes && imagenes.length > 0) {
        for (let i = 0; i < imagenes.length; i++) {
          const { url, es_principal } = imagenes[i]
          await client.query(
            `
            INSERT INTO escenario_imagenes (escenario_id, url_imagen, es_principal, orden, created_at)
            VALUES ($1, $2, $3, $4, NOW())
          `,
            [escenarioId, url, es_principal || false, i],
          )
        }
      }

      // Insertar horarios
      if (horarios && horarios.length > 0) {
        for (const horario of horarios) {
          const { dia_semana, hora_inicio, hora_fin, disponible } = horario
          await client.query(
            `
            INSERT INTO horarios_disponibles (escenario_id, dia_semana, hora_inicio, hora_fin, disponible, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
          `,
            [escenarioId, dia_semana, hora_inicio, hora_fin, disponible !== false],
          )
        }
      }

      await client.query("COMMIT")

      return sendResponse(res, { id: escenarioId }, "Escenario creado exitosamente", 201)
    } catch (error) {
      await client.query("ROLLBACK")
      throw error
    } finally {
      client.release()
    }
  } catch (error) {
    console.error("Error en createScene:", error)
    return sendError(res, "Error en el servidor", 500)
  }
}

// Actualizar un escenario (solo admin)
export const updateScene = async (req, res) => {
  try {
    const { id } = req.params
    const {
      nombre,
      descripcion,
      capacidad,
      dimensiones,
      localidad_id,
      deporte_principal_id,
      direccion,
      estado,
      imagen_principal,
      deportes,
      amenidades,
      imagenes,
      horarios,
    } = req.body

    // Verificar si el escenario existe
    const sceneCheck = await query("SELECT id FROM escenarios WHERE id = $1", [id])

    if (sceneCheck.rows.length === 0) {
      return sendError(res, "Escenario no encontrado", 404)
    }

    // Iniciar transacción
    const client = await pool.connect()

    try {
      await client.query("BEGIN")

      // Actualizar escenario
      const updateFields = []
      const updateValues = []
      let paramIndex = 1

      if (nombre !== undefined) {
        updateFields.push(`nombre = $${paramIndex++}`)
        updateValues.push(nombre)
      }

      if (descripcion !== undefined) {
        updateFields.push(`descripcion = $${paramIndex++}`)
        updateValues.push(descripcion)
      }

      if (capacidad !== undefined) {
        updateFields.push(`capacidad = $${paramIndex++}`)
        updateValues.push(capacidad)
      }

      if (dimensiones !== undefined) {
        updateFields.push(`dimensiones = $${paramIndex++}`)
        updateValues.push(dimensiones)
      }

      if (localidad_id !== undefined) {
        updateFields.push(`localidad_id = $${paramIndex++}`)
        updateValues.push(localidad_id)
      }

      if (deporte_principal_id !== undefined) {
        updateFields.push(`deporte_principal_id = $${paramIndex++}`)
        updateValues.push(deporte_principal_id)
      }

      if (direccion !== undefined) {
        updateFields.push(`direccion = $${paramIndex++}`)
        updateValues.push(direccion)
      }

      if (estado !== undefined) {
        updateFields.push(`estado = $${paramIndex++}`)
        updateValues.push(estado)
      }

      if (imagen_principal !== undefined) {
        updateFields.push(`imagen_principal = $${paramIndex++}`)
        updateValues.push(imagen_principal)
      }

      updateFields.push(`updated_at = $${paramIndex++}`)
      updateValues.push(new Date())

      if (updateFields.length > 0) {
        updateValues.push(id)
        await client.query(
          `
          UPDATE escenarios
          SET ${updateFields.join(", ")}
          WHERE id = $${paramIndex}
        `,
          updateValues,
        )
      }

      // Actualizar deportes asociados
      if (deportes !== undefined) {
        // Eliminar deportes existentes
        await client.query("DELETE FROM escenario_deportes WHERE escenario_id = $1", [id])

        // Insertar nuevos deportes
        if (deportes.length > 0) {
          for (const deporteId of deportes) {
            await client.query(
              `
              INSERT INTO escenario_deportes (escenario_id, deporte_id, created_at)
              VALUES ($1, $2, NOW())
            `,
              [id, deporteId],
            )
          }
        }
      }

      // Actualizar amenidades
      if (amenidades !== undefined) {
        // Eliminar amenidades existentes
        await client.query("DELETE FROM escenario_amenidades WHERE escenario_id = $1", [id])

        // Insertar nuevas amenidades
        if (amenidades.length > 0) {
          for (const amenidadId of amenidades) {
            await client.query(
              `
              INSERT INTO escenario_amenidades (escenario_id, amenidad_id, created_at)
              VALUES ($1, $2, NOW())
            `,
              [id, amenidadId],
            )
          }
        }
      }

      // Actualizar imágenes
      if (imagenes !== undefined) {
        // Eliminar imágenes existentes
        await client.query("DELETE FROM escenario_imagenes WHERE escenario_id = $1", [id])

        // Insertar nuevas imágenes
        if (imagenes.length > 0) {
          for (let i = 0; i < imagenes.length; i++) {
            const { url, es_principal } = imagenes[i]
            await client.query(
              `
              INSERT INTO escenario_imagenes (escenario_id, url_imagen, es_principal, orden, created_at)
              VALUES ($1, $2, $3, $4, NOW())
            `,
              [id, url, es_principal || false, i],
            )
          }
        }
      }

      // Actualizar horarios
      if (horarios !== undefined) {
        // Eliminar horarios existentes
        await client.query("DELETE FROM horarios_disponibles WHERE escenario_id = $1", [id])

        // Insertar nuevos horarios
        if (horarios.length > 0) {
          for (const horario of horarios) {
            const { dia_semana, hora_inicio, hora_fin, disponible } = horario
            await client.query(
              `
              INSERT INTO horarios_disponibles (escenario_id, dia_semana, hora_inicio, hora_fin, disponible, created_at, updated_at)
              VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
            `,
              [id, dia_semana, hora_inicio, hora_fin, disponible !== false],
            )
          }
        }
      }

      await client.query("COMMIT")

      return sendResponse(res, { id: Number.parseInt(id) }, "Escenario actualizado exitosamente")
    } catch (error) {
      await client.query("ROLLBACK")
      throw error
    } finally {
      client.release()
    }
  } catch (error) {
    console.error("Error en updateScene:", error)
    return sendError(res, "Error en el servidor", 500)
  }
}

// Eliminar un escenario (solo admin)
export const deleteScene = async (req, res) => {
  try {
    const { id } = req.params

    // Verificar si el escenario existe
    const sceneCheck = await query("SELECT id FROM escenarios WHERE id = $1", [id])

    if (sceneCheck.rows.length === 0) {
      return sendError(res, "Escenario no encontrado", 404)
    }

    // Verificar si hay solicitudes asociadas
    const requestsCheck = await query("SELECT id FROM solicitudes WHERE escenario_id = $1 LIMIT 1", [id])

    if (requestsCheck.rows.length > 0) {
      return sendError(res, "No se puede eliminar el escenario porque tiene solicitudes asociadas", 400)
    }

    // Iniciar transacción
    const client = await pool.connect()

    try {
      await client.query("BEGIN")

      // Eliminar horarios
      await client.query("DELETE FROM horarios_disponibles WHERE escenario_id = $1", [id])

      // Eliminar imágenes
      await client.query("DELETE FROM escenario_imagenes WHERE escenario_id = $1", [id])

      // Eliminar amenidades
      await client.query("DELETE FROM escenario_amenidades WHERE escenario_id = $1", [id])

      // Eliminar deportes
      await client.query("DELETE FROM escenario_deportes WHERE escenario_id = $1", [id])

      // Eliminar escenario
      await client.query("DELETE FROM escenarios WHERE id = $1", [id])

      await client.query("COMMIT")

      return sendResponse(res, null, "Escenario eliminado exitosamente")
    } catch (error) {
      await client.query("ROLLBACK")
      throw error
    } finally {
      client.release()
    }
  } catch (error) {
    console.error("Error en deleteScene:", error)
    return sendError(res, "Error en el servidor", 500)
  }
}
