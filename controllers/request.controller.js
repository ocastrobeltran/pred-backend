import { query, pool } from "../config/database.js"
import { sendResponse, sendError } from "../utils/response.util.js"
import { sendEmail, getEmailTemplate } from "../utils/email.util.js"

// Obtener todas las solicitudes con paginación y filtros
export const getAllRequests = async (req, res) => {
  try {
    const { page = 1, limit = 10, usuario_id, escenario_id, estado_id, fecha_desde, fecha_hasta, search } = req.query
    const pageNumber = Number.parseInt(page)
    const limitNumber = Number.parseInt(limit)
    const offset = (pageNumber - 1) * limitNumber
    const userRole = req.user.role
    const userId = req.user.id

    // Construir la consulta base
    let queryText = `
      SELECT s.*, 
             e.nombre as escenario_nombre,
             l.nombre as localidad_nombre,
             u.nombre as usuario_nombre,
             u.apellido as usuario_apellido,
             u.email as usuario_email,
             p.nombre as proposito_nombre,
             es.nombre as estado_nombre,
             es.color as estado_color,
             a.nombre as admin_nombre,
             a.apellido as admin_apellido
      FROM solicitudes s
      LEFT JOIN escenarios e ON s.escenario_id = e.id
      LEFT JOIN localidades l ON e.localidad_id = l.id
      LEFT JOIN usuarios u ON s.usuario_id = u.id
      LEFT JOIN propositos_reserva p ON s.proposito_id = p.id
      LEFT JOIN estados_solicitud es ON s.estado_id = es.id
      LEFT JOIN usuarios a ON s.admin_id = a.id
      WHERE 1=1
    `

    const queryParams = []
    let paramIndex = 1

    // Si no es administrador o supervisor, solo puede ver sus propias solicitudes
    if (userRole !== "admin" && userRole !== "supervisor") {
      queryText += ` AND s.usuario_id = $${paramIndex++}`
      queryParams.push(userId)
    } else if (usuario_id) {
      queryText += ` AND s.usuario_id = $${paramIndex++}`
      queryParams.push(Number.parseInt(usuario_id))
    }

    if (escenario_id) {
      queryText += ` AND s.escenario_id = $${paramIndex++}`
      queryParams.push(Number.parseInt(escenario_id))
    }

    if (estado_id) {
      queryText += ` AND s.estado_id = $${paramIndex++}`
      queryParams.push(Number.parseInt(estado_id))
    }

    if (fecha_desde) {
      queryText += ` AND s.fecha_reserva >= $${paramIndex++}`
      queryParams.push(fecha_desde)
    }

    if (fecha_hasta) {
      queryText += ` AND s.fecha_reserva <= $${paramIndex++}`
      queryParams.push(fecha_hasta)
    }

    if (search) {
      queryText += ` AND (s.codigo_reserva ILIKE $${paramIndex} OR e.nombre ILIKE $${paramIndex} OR u.nombre ILIKE $${paramIndex} OR u.apellido ILIKE $${paramIndex})`
      queryParams.push(`%${search}%`)
      paramIndex++
    }

    // Añadir ordenamiento
    queryText += ` ORDER BY s.fecha_reserva DESC, s.hora_inicio ASC`

    // Consulta para contar el total de registros
    const countQuery = `SELECT COUNT(*) FROM (${queryText}) AS count_query`

    // Añadir paginación
    queryText += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`
    queryParams.push(limitNumber, offset)

    // Ejecutar consultas
    const [requestsResult, countResult] = await Promise.all([
      query(queryText, queryParams),
      query(countQuery, queryParams.slice(0, -2)), // Excluir los parámetros de LIMIT y OFFSET
    ])

    const requests = requestsResult.rows
    const total = Number.parseInt(countResult.rows[0].count)

    // Formatear datos para la respuesta
    const formattedRequests = requests.map((request) => ({
      id: request.id,
      usuario: {
        id: request.usuario_id,
        nombre: request.usuario_nombre,
        apellido: request.usuario_apellido,
        email: request.usuario_email,
      },
      escenario: {
        id: request.escenario_id,
        nombre: request.escenario_nombre,
        localidad: request.localidad_nombre,
      },
      fecha_reserva: request.fecha_reserva,
      hora_inicio: request.hora_inicio,
      hora_fin: request.hora_fin,
      proposito: {
        id: request.proposito_id,
        nombre: request.proposito_nombre,
      },
      num_participantes: request.num_participantes,
      estado: {
        id: request.estado_id,
        nombre: request.estado_nombre,
        color: request.estado_color,
      },
      admin: request.admin_id
        ? {
            id: request.admin_id,
            nombre: request.admin_nombre,
            apellido: request.admin_apellido,
          }
        : null,
      admin_notas: request.admin_notas,
      fecha_respuesta: request.fecha_respuesta,
      codigo_reserva: request.codigo_reserva,
      notas: request.notas,
      created_at: request.created_at,
    }))

    return sendResponse(
      res,
      {
        data: formattedRequests,
        pagination: {
          total,
          per_page: limitNumber,
          current_page: pageNumber,
          last_page: Math.ceil(total / limitNumber),
        },
      },
      "Solicitudes obtenidas exitosamente",
    )
  } catch (error) {
    console.error("Error en getAllRequests:", error)
    return sendError(res, "Error en el servidor", 500)
  }
}

// Obtener una solicitud por ID
export const getRequestById = async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.id
    const userRole = req.user.role

    // Consulta principal
    const requestQuery = await query(
      `
      SELECT s.*, 
             e.nombre as escenario_nombre,
             l.nombre as localidad_nombre,
             u.nombre as usuario_nombre,
             u.apellido as usuario_apellido,
             u.email as usuario_email,
             u.telefono as usuario_telefono,
             p.nombre as proposito_nombre,
             es.nombre as estado_nombre,
             es.color as estado_color,
             a.nombre as admin_nombre,
             a.apellido as admin_apellido
      FROM solicitudes s
      LEFT JOIN escenarios e ON s.escenario_id = e.id
      LEFT JOIN localidades l ON e.localidad_id = l.id
      LEFT JOIN usuarios u ON s.usuario_id = u.id
      LEFT JOIN propositos_reserva p ON s.proposito_id = p.id
      LEFT JOIN estados_solicitud es ON s.estado_id = es.id
      LEFT JOIN usuarios a ON s.admin_id = a.id
      WHERE s.id = $1
    `,
      [Number.parseInt(id)],
    )

    if (requestQuery.rows.length === 0) {
      return sendError(res, "Solicitud no encontrada", 404)
    }

    const request = requestQuery.rows[0]

    // Verificar permisos (solo el propio usuario o un administrador/supervisor puede ver los detalles)
    if (request.usuario_id !== userId && userRole !== "admin" && userRole !== "supervisor") {
      return sendError(res, "No tienes permisos para realizar esta acción", 403)
    }

    // Obtener historial de estados
    const historialQuery = await query(
      `
      SELECT h.*,
             ea.nombre as estado_anterior_nombre,
             ea.color as estado_anterior_color,
             en.nombre as estado_nuevo_nombre,
             en.color as estado_nuevo_color,
             u.nombre as usuario_nombre,
             u.apellido as usuario_apellido
      FROM historial_estados_solicitud h
      LEFT JOIN estados_solicitud ea ON h.estado_anterior_id = ea.id
      LEFT JOIN estados_solicitud en ON h.estado_nuevo_id = en.id
      LEFT JOIN usuarios u ON h.usuario_id = u.id
      WHERE h.solicitud_id = $1
      ORDER BY h.created_at DESC
    `,
      [Number.parseInt(id)],
    )

    // Formatear datos para la respuesta
    const formattedRequest = {
      id: request.id,
      usuario: {
        id: request.usuario_id,
        nombre: request.usuario_nombre,
        apellido: request.usuario_apellido,
        email: request.usuario_email,
        telefono: request.usuario_telefono,
      },
      escenario: {
        id: request.escenario_id,
        nombre: request.escenario_nombre,
        localidad: request.localidad_nombre,
      },
      fecha_reserva: request.fecha_reserva,
      hora_inicio: request.hora_inicio,
      hora_fin: request.hora_fin,
      proposito: {
        id: request.proposito_id,
        nombre: request.proposito_nombre,
      },
      num_participantes: request.num_participantes,
      estado: {
        id: request.estado_id,
        nombre: request.estado_nombre,
        color: request.estado_color,
      },
      admin: request.admin_id
        ? {
            id: request.admin_id,
            nombre: request.admin_nombre,
            apellido: request.admin_apellido,
          }
        : null,
      admin_notas: request.admin_notas,
      fecha_respuesta: request.fecha_respuesta,
      codigo_reserva: request.codigo_reserva,
      notas: request.notas,
      created_at: request.created_at,
      updated_at: request.updated_at,
      historial: historialQuery.rows.map((h) => ({
        id: h.id,
        estado_anterior: h.estado_anterior_id
          ? {
              id: h.estado_anterior_id,
              nombre: h.estado_anterior_nombre,
              color: h.estado_anterior_color,
            }
          : null,
        estado_nuevo: {
          id: h.estado_nuevo_id,
          nombre: h.estado_nuevo_nombre,
          color: h.estado_nuevo_color,
        },
        usuario: {
          id: h.usuario_id,
          nombre: h.usuario_nombre,
          apellido: h.usuario_apellido,
        },
        notas: h.notas,
        created_at: h.created_at,
      })),
    }

    return sendResponse(res, formattedRequest, "Solicitud obtenida exitosamente")
  } catch (error) {
    console.error("Error en getRequestById:", error)
    return sendError(res, "Error en el servidor", 500)
  }
}

// Buscar solicitud por código de reserva
export const findByReservationCode = async (req, res) => {
  try {
    const { codigo } = req.query

    if (!codigo) {
      return sendError(res, "Código de reserva no proporcionado", 400)
    }

    // Buscar solicitud
    const requestQuery = await query(
      `
      SELECT s.*, 
             e.nombre as escenario_nombre,
             l.nombre as localidad_nombre,
             u.nombre as usuario_nombre,
             u.apellido as usuario_apellido,
             u.email as usuario_email,
             p.nombre as proposito_nombre,
             es.nombre as estado_nombre,
             es.color as estado_color,
             a.nombre as admin_nombre,
             a.apellido as admin_apellido
      FROM solicitudes s
      LEFT JOIN escenarios e ON s.escenario_id = e.id
      LEFT JOIN localidades l ON e.localidad_id = l.id
      LEFT JOIN usuarios u ON s.usuario_id = u.id
      LEFT JOIN propositos_reserva p ON s.proposito_id = p.id
      LEFT JOIN estados_solicitud es ON s.estado_id = es.id
      LEFT JOIN usuarios a ON s.admin_id = a.id
      WHERE s.codigo_reserva = $1
    `,
      [codigo],
    )

    if (requestQuery.rows.length === 0) {
      return sendError(res, "Solicitud no encontrada", 404)
    }

    const request = requestQuery.rows[0]

    // Formatear datos para la respuesta
    const formattedRequest = {
      id: request.id,
      usuario: {
        id: request.usuario_id,
        nombre: request.usuario_nombre,
        apellido: request.usuario_apellido,
        email: request.usuario_email,
      },
      escenario: {
        id: request.escenario_id,
        nombre: request.escenario_nombre,
        localidad: request.localidad_nombre,
      },
      fecha_reserva: request.fecha_reserva,
      hora_inicio: request.hora_inicio,
      hora_fin: request.hora_fin,
      proposito: {
        id: request.proposito_id,
        nombre: request.proposito_nombre,
      },
      num_participantes: request.num_participantes,
      estado: {
        id: request.estado_id,
        nombre: request.estado_nombre,
        color: request.estado_color,
      },
      admin: request.admin_id
        ? {
            id: request.admin_id,
            nombre: request.admin_nombre,
            apellido: request.admin_apellido,
          }
        : null,
      admin_notas: request.admin_notas,
      fecha_respuesta: request.fecha_respuesta,
      codigo_reserva: request.codigo_reserva,
      notas: request.notas,
      created_at: request.created_at,
    }

    return sendResponse(res, formattedRequest, "Solicitud obtenida exitosamente")
  } catch (error) {
    console.error("Error en findByReservationCode:", error)
    return sendError(res, "Error en el servidor", 500)
  }
}

// Crear una nueva solicitud
export const createRequest = async (req, res) => {
  try {
    const { escenario_id, fecha_reserva, hora_inicio, hora_fin, proposito_id, num_participantes, notas } = req.body
    const userId = req.user.id

    // Validar datos
    const requiredFields = [
      "escenario_id",
      "fecha_reserva",
      "hora_inicio",
      "hora_fin",
      "proposito_id",
      "num_participantes",
    ]
    const missingFields = requiredFields.filter((field) => !req.body[field])

    if (missingFields.length > 0) {
      return sendError(
        res,
        "Datos incompletos",
        400,
        missingFields.map((field) => `El campo ${field} es requerido`),
      )
    }

    // Verificar disponibilidad
    const escenarioId = Number.parseInt(escenario_id)
    const date = new Date(fecha_reserva)
    const dayOfWeek = date.getDay()
    const diasSemana = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"]
    const diaSemana = diasSemana[dayOfWeek]

    // const horarioDisponibleQuery = await query(
    //   `
    //   SELECT id FROM horarios_disponibles
    //   WHERE escenario_id = $1
    //   AND dia_semana = $2
    //   AND hora_inicio <= $3
    //   AND hora_fin >= $4
    //   AND disponible = true
    // `,
    //   [escenarioId, diaSemana, hora_inicio, hora_fin],
    // )

    // if (horarioDisponibleQuery.rows.length === 0) {
    //   return sendError(res, "El horario seleccionado no está disponible para este escenario", 400)
    // }

    // Verificar si ya existe una solicitud aprobada para ese horario
    const solicitudExistenteQuery = await query(
      `
      SELECT s.id
      FROM solicitudes s
      JOIN estados_solicitud es ON s.estado_id = es.id
      WHERE s.escenario_id = $1
      AND s.fecha_reserva = $2
      AND es.nombre = 'aprobada'
      AND (
        (s.hora_inicio <= $3 AND s.hora_fin > $3) OR
        (s.hora_inicio < $4 AND s.hora_fin >= $4) OR
        (s.hora_inicio >= $3 AND s.hora_fin <= $4)
      )
    `,
      [escenarioId, fecha_reserva, hora_inicio, hora_fin],
    )

    if (solicitudExistenteQuery.rows.length > 0) {
      return sendError(res, "Ya existe una reserva aprobada para este escenario en el horario seleccionado", 400)
    }

    // Generar código único de reserva
    const codigo =
      "RES-" + date.toISOString().slice(0, 10).replace(/-/g, "") + "-" + Math.floor(1000 + Math.random() * 9000)

    // Obtener el ID del estado "creada"
    const estadoCreadaQuery = await query(`
      SELECT id FROM estados_solicitud WHERE nombre = 'creada'
    `)

    if (estadoCreadaQuery.rows.length === 0) {
      return sendError(res, "Error al obtener el estado inicial de la solicitud", 500)
    }

    const estadoCreadaId = estadoCreadaQuery.rows[0].id

    // Iniciar transacción
    const client = await pool.connect()

    try {
      await client.query("BEGIN")

      // Crear solicitud
      const newRequestQuery = await client.query(
        `
        INSERT INTO solicitudes (
          usuario_id, escenario_id, fecha_reserva, hora_inicio, hora_fin,
          proposito_id, num_participantes, estado_id, notas, codigo_reserva,
          created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
        RETURNING id
      `,
        [
          userId,
          escenarioId,
          fecha_reserva,
          hora_inicio,
          hora_fin,
          Number.parseInt(proposito_id),
          Number.parseInt(num_participantes),
          estadoCreadaId,
          notas || "",
          codigo,
        ],
      )

      const newRequestId = newRequestQuery.rows[0].id

      // Crear notificación para el usuario
      await client.query(
        `
        INSERT INTO notificaciones (
          usuario_id, titulo, mensaje, tipo, url, leida, created_at
        )
        VALUES ($1, $2, $3, $4, $5, false, NOW())
      `,
        [
          userId,
          "Solicitud creada",
          `Tu solicitud de reserva para el ${date.toLocaleDateString()} ha sido creada exitosamente. Código: ${codigo}`,
          "success",
          `/solicitudes/${newRequestId}`,
        ],
      )

      // Notificar a los administradores
      const adminsQuery = await client.query(`
        SELECT u.id
        FROM usuarios u
        JOIN roles r ON u.rol_id = r.id
        WHERE r.nombre = 'admin'
        AND u.estado = 'activo'
      `)

      const escenarioQuery = await client.query(
        `
        SELECT nombre FROM escenarios WHERE id = $1
      `,
        [escenarioId],
      )

      const escenarioNombre = escenarioQuery.rows[0].nombre

      for (const admin of adminsQuery.rows) {
        await client.query(
          `
          INSERT INTO notificaciones (
            usuario_id, titulo, mensaje, tipo, url, leida, created_at
          )
          VALUES ($1, $2, $3, $4, $5, false, NOW())
        `,
          [
            admin.id,
            "Nueva solicitud de reserva",
            `Se ha recibido una nueva solicitud de reserva para el escenario ${escenarioNombre} el día ${date.toLocaleDateString()}`,
            "info",
            `/admin/solicitudes/${newRequestId}`,
          ],
        )
      }

      await client.query("COMMIT")

      // Enviar email de confirmación
      const userQuery = await query(
        `
        SELECT nombre, email FROM usuarios WHERE id = $1
      `,
        [userId],
      )

      const user = userQuery.rows[0]

      const emailTemplate = getEmailTemplate("request_created", {
        nombre: user.nombre,
        escenario: escenarioNombre,
        fecha: date.toLocaleDateString(),
        codigo,
      })

      await sendEmail(user.email, emailTemplate.subject, emailTemplate.html)

      return sendResponse(
        res,
        {
          solicitud_id: newRequestId,
          codigo_reserva: codigo,
        },
        "Solicitud creada exitosamente",
      )
    } catch (error) {
      await client.query("ROLLBACK")
      throw error
    } finally {
      client.release()
    }
  } catch (error) {
    console.error("Error en createRequest:", error)
    return sendError(res, "Error en el servidor", 500)
  }
}

export const verificarDisponibilidad = async (req, res) => {
  try {
    const { escenario_id, fecha, hora_inicio, hora_fin } = req.body

    // Buscar si existe una reserva aprobada que traslape
    const result = await query(
      `
      SELECT id
      FROM solicitudes
      WHERE escenario_id = $1
        AND fecha_reserva = $2
        AND estado_id = 3
        AND (
          (hora_inicio <= $4 AND hora_fin >= $3)
        )
      `,
      [escenario_id, fecha, hora_inicio, hora_fin]
    )

    const disponible = result.rows.length === 0

    return sendResponse(
      res,
      { disponible },
      disponible ? "Horario disponible" : "Horario no disponible"
    )
  } catch (error) {
    console.error("Error en verificarDisponibilidad:", error)
    return sendError(res, "Error en el servidor", 500)
  }
}

// Cambiar estado de una solicitud
export const changeRequestStatus = async (req, res) => {
  try {
    const { id } = req.params
    const { estado, admin_notas } = req.body
    const adminId = req.user.id

    // Validar datos
    if (!estado) {
      return sendError(res, "El estado es requerido", 400)
    }

    // Verificar permisos de administrador o supervisor
    if (req.user.role !== "admin" && req.user.role !== "supervisor") {
      return sendError(res, "No tienes permisos para realizar esta acción", 403)
    }

    // Verificar si la solicitud existe
    const existingRequestQuery = await query(
      `
      SELECT s.*, 
             e.nombre as escenario_nombre,
             u.id as usuario_id,
             u.nombre as usuario_nombre,
             u.email as usuario_email,
             es.id as estado_id,
             es.nombre as estado_nombre
      FROM solicitudes s
      JOIN escenarios e ON s.escenario_id = e.id
      JOIN usuarios u ON s.usuario_id = u.id
      JOIN estados_solicitud es ON s.estado_id = es.id
      WHERE s.id = $1
    `,
      [Number.parseInt(id)],
    )

    if (existingRequestQuery.rows.length === 0) {
      return sendError(res, "Solicitud no encontrada", 404)
    }

    const existingRequest = existingRequestQuery.rows[0]

    // Obtener el ID del nuevo estado
    const nuevoEstadoQuery = await query(
      `
      SELECT id FROM estados_solicitud WHERE nombre = $1
    `,
      [estado],
    )

    if (nuevoEstadoQuery.rows.length === 0) {
      return sendError(res, "Estado no válido", 400)
    }

    const nuevoEstadoId = nuevoEstadoQuery.rows[0].id

    // Iniciar transacción
    const client = await pool.connect()

    try {
      await client.query("BEGIN")

      // Actualizar solicitud
      await client.query(
        `
        UPDATE solicitudes
        SET estado_id = $1, admin_id = $2, admin_notas = $3, fecha_respuesta = NOW(), updated_at = NOW()
        WHERE id = $4
      `,
        [nuevoEstadoId, adminId, admin_notas || "", Number.parseInt(id)],
      )

      // Registrar en el historial
      await client.query(
        `
        INSERT INTO historial_estados_solicitud (
          solicitud_id, estado_anterior_id, estado_nuevo_id, usuario_id, notas, created_at
        )
        VALUES ($1, $2, $3, $4, $5, NOW())
      `,
        [Number.parseInt(id), existingRequest.estado_id, nuevoEstadoId, adminId, admin_notas || ""],
      )

      // Crear notificación para el usuario
      let titulo, mensaje, tipo

      switch (estado) {
        case "aprobada":
          titulo = "Solicitud aprobada"
          mensaje = `Tu solicitud de reserva para el ${existingRequest.fecha_reserva.toLocaleDateString()} en el escenario ${existingRequest.escenario_nombre} ha sido aprobada. ¡Felicitaciones!`
          tipo = "success"
          break
        case "rechazada":
          titulo = "Solicitud rechazada"
          mensaje = `Tu solicitud de reserva para el ${existingRequest.fecha_reserva.toLocaleDateString()} en el escenario ${existingRequest.escenario_nombre} ha sido rechazada. Consulta los detalles para más información.`
          tipo = "error"
          break
        case "en_proceso":
          titulo = "Solicitud en proceso"
          mensaje = `Tu solicitud de reserva para el ${existingRequest.fecha_reserva.toLocaleDateString()} en el escenario ${existingRequest.escenario_nombre} ha sido puesta en proceso de revisión.`
          tipo = "info"
          break
        default:
          titulo = "Solicitud actualizada"
          mensaje = `Tu solicitud de reserva para el ${existingRequest.fecha_reserva.toLocaleDateString()} en el escenario ${existingRequest.escenario_nombre} ha sido actualizada.`
          tipo = "info"
      }

      await client.query(
        `
        INSERT INTO notificaciones (
          usuario_id, titulo, mensaje, tipo, url, leida, created_at
        )
        VALUES ($1, $2, $3, $4, $5, false, NOW())
      `,
        [existingRequest.usuario_id, titulo, mensaje, tipo, `/solicitudes/${id}`],
      )

      await client.query("COMMIT")

      // Enviar email de notificación
      const emailTemplate = getEmailTemplate("request_updated", {
        nombre: existingRequest.usuario_nombre,
        escenario: existingRequest.escenario_nombre,
        fecha: existingRequest.fecha_reserva.toLocaleDateString(),
        estado,
        notas: admin_notas,
      })

      await sendEmail(existingRequest.usuario_email, emailTemplate.subject, emailTemplate.html)

      return sendResponse(res, null, "Estado de solicitud actualizado exitosamente")
    } catch (error) {
      await client.query("ROLLBACK")
      throw error
    } finally {
      client.release()
    }
  } catch (error) {
    console.error("Error en changeRequestStatus:", error)
    return sendError(res, "Error en el servidor", 500)
  }
}

// Obtener estados de solicitud
export const getRequestStatuses = async (req, res) => {
  try {
    const statusesQuery = await query(`
      SELECT id, nombre, descripcion, color
      FROM estados_solicitud
      ORDER BY id ASC
    `)

    return sendResponse(res, statusesQuery.rows, "Estados obtenidos exitosamente")
  } catch (error) {
    console.error("Error en getRequestStatuses:", error)
    return sendError(res, "Error en el servidor", 500)
  }
}

// Obtener propósitos de reserva
export const getRequestPurposes = async (req, res) => {
  try {
    const purposesQuery = await query(`
      SELECT id, nombre, descripcion
      FROM propositos_reserva
      ORDER BY id ASC
    `)

    return sendResponse(res, purposesQuery.rows, "Propósitos obtenidos exitosamente")
  } catch (error) {
    console.error("Error en getRequestPurposes:", error)
    return sendError(res, "Error en el servidor", 500)
  }
}

export const getAvailableDays = async (req, res) => {
  try {
    let { escenario_id, desde, hasta } = req.query

    if (!escenario_id || !desde || !hasta) {
      return sendError(res, "Error de validación en parámetros", 400, [
        "escenario_id, desde y hasta son requeridos"
      ])
    }

    escenario_id = Number.parseInt(escenario_id)
    if (isNaN(escenario_id)) {
      return sendError(res, "Error de validación en parámetros", 400, ["El ID debe ser un número"])
    }
    const availableHours = [
      "08:00:00",
      "10:00:00",
      "12:00:00",
      "14:00:00",
      "16:00:00",
      "18:00:00",
    ]

    // Obtener todas las reservas aprobadas en el rango
    const reservasQuery = await query(
      `
      SELECT fecha_reserva, hora_inicio, hora_fin
      FROM solicitudes
      WHERE escenario_id = $1
        AND fecha_reserva BETWEEN $2 AND $3
        AND estado_id = 3
      `,
      [escenario_id, desde, hasta]
    )

    // Agrupar reservas por fecha
    const reservasPorFecha = {}
    reservasQuery.rows.forEach(r => {
      const fecha = r.fecha_reserva.toISOString().slice(0, 10)
      if (!reservasPorFecha[fecha]) reservasPorFecha[fecha] = []
      reservasPorFecha[fecha].push({ inicio: r.hora_inicio, fin: r.hora_fin })
    })

    // Generar fechas del rango
    const fechas = []
    let d = new Date(desde)
    const end = new Date(hasta)
    while (d <= end) {
      fechas.push(d.toISOString().slice(0, 10))
      d.setDate(d.getDate() + 1)
    }

    // Para cada fecha, verificar si hay al menos un horario libre
    const diasDisponibles = fechas.filter(fecha => {
      const reservas = reservasPorFecha[fecha] || []
      // Para cada horario, verificar si está libre
      return availableHours.some(hora => {
        return !reservas.some(r =>
          (hora >= r.inicio && hora < r.fin)
        )
      })
    })

    return sendResponse(res, diasDisponibles, "Días disponibles obtenidos exitosamente")
  } catch (error) {
    console.error("Error en getAvailableDays:", error)
    return sendError(res, "Error en el servidor", 500)
  }
}

export const getAvailableHours = async (req, res) => {
  try {
    let { escenario_id, fecha } = req.query
    escenario_id = Number.parseInt(escenario_id)
    if (isNaN(escenario_id)) {
      return sendError(res, "Error de validación en parámetros", 400, ["El ID debe ser un número"])
    }

    const availableHours = [
      "08:00:00",
      "10:00:00",
      "12:00:00",
      "14:00:00",
      "16:00:00",
      "18:00:00",
    ]

    const reservasQuery = await query(
      `
      SELECT hora_inicio, hora_fin
      FROM solicitudes
      WHERE escenario_id = $1
        AND fecha_reserva = $2
        AND estado_id = 3
      `,
      [escenario_id, fecha]
    )

    const booked = reservasQuery.rows

    // Filtrar horarios ocupados
    const freeHours = availableHours.filter(hora =>
      !booked.some(r => hora >= r.hora_inicio && hora < r.hora_fin)
    )

    return sendResponse(res, freeHours, "Horas disponibles obtenidas exitosamente")
  } catch (error) {
    console.error("Error en getAvailableHours:", error)
    return sendError(res, "Error en el servidor", 500)
  }
}