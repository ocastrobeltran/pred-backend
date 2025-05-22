import { query } from "../config/database.js"
import { sendResponse, sendError } from "../utils/response.util.js"

export const getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 10, leida } = req.query
    const pageNumber = Number.parseInt(page)
    const limitNumber = Number.parseInt(limit)
    const offset = (pageNumber - 1) * limitNumber
    const userId = req.user.id

    // Construir la consulta base
    let queryText = `
      SELECT *
      FROM notificaciones
      WHERE usuario_id = $1
    `

    const queryParams = [userId]
    let paramIndex = 2

    // Añadir filtros
    if (leida !== undefined) {
      queryText += ` AND leida = $${paramIndex++}`
      queryParams.push(leida === "true" || leida === "1")
    }

    // Añadir ordenamiento
    queryText += ` ORDER BY created_at DESC`

    // Consulta para contar el total de registros
    const countQuery = `SELECT COUNT(*) FROM (${queryText}) AS count_query`

    // Añadir paginación
    queryText += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`
    queryParams.push(limitNumber, offset)

    // Ejecutar consultas
    const [notificationsResult, countResult] = await Promise.all([
      query(queryText, queryParams),
      query(countQuery, queryParams.slice(0, -2)), // Excluir los parámetros de LIMIT y OFFSET
    ])

    const notifications = notificationsResult.rows
    const total = Number.parseInt(countResult.rows[0].count)

    return sendResponse(
      res,
      {
        data: notifications,
        pagination: {
          total,
          per_page: limitNumber,
          current_page: pageNumber,
          last_page: Math.ceil(total / limitNumber),
        },
      },
      "Notificaciones obtenidas exitosamente",
    )
  } catch (error) {
    console.error("Error en getNotifications:", error)
    return sendError(res, "Error en el servidor", 500)
  }
}

export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.id

    // Verificar si la notificación existe y pertenece al usuario
    const notificationQuery = await query(
      `
      SELECT id FROM notificaciones
      WHERE id = $1 AND usuario_id = $2
    `,
      [Number.parseInt(id), userId],
    )

    if (notificationQuery.rows.length === 0) {
      return sendError(res, "Notificación no encontrada", 404)
    }

    // Marcar como leída
    await query(
      `
      UPDATE notificaciones
      SET leida = true
      WHERE id = $1
    `,
      [Number.parseInt(id)],
    )

    return sendResponse(res, null, "Notificación marcada como leída exitosamente")
  } catch (error) {
    console.error("Error en markAsRead:", error)
    return sendError(res, "Error en el servidor", 500)
  }
}

export const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id

    // Marcar todas las notificaciones del usuario como leídas
    await query(
      `
      UPDATE notificaciones
      SET leida = true
      WHERE usuario_id = $1 AND leida = false
    `,
      [userId],
    )

    return sendResponse(res, null, "Todas las notificaciones marcadas como leídas exitosamente")
  } catch (error) {
    console.error("Error en markAllAsRead:", error)
    return sendError(res, "Error en el servidor", 500)
  }
}

export const countUnread = async (req, res) => {
  try {
    const userId = req.user.id

    // Contar notificaciones no leídas
    const countResult = await query(
      `
      SELECT COUNT(*) FROM notificaciones
      WHERE usuario_id = $1 AND leida = false
    `,
      [userId],
    )

    const count = Number.parseInt(countResult.rows[0].count)

    return sendResponse(res, { count }, "Conteo de notificaciones no leídas obtenido exitosamente")
  } catch (error) {
    console.error("Error en countUnread:", error)
    return sendError(res, "Error en el servidor", 500)
  }
}

export const createNotification = async (userId, title, message, type = "info", url = null) => {
  try {
    await query(
      `
      INSERT INTO notificaciones (usuario_id, titulo, mensaje, tipo, url, leida, created_at)
      VALUES ($1, $2, $3, $4, $5, false, NOW())
    `,
      [userId, title, message, type, url],
    )

    return true
  } catch (error) {
    console.error("Error al crear notificación:", error)
    return false
  }
}
