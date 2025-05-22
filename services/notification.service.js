import { query } from "../config/database.js"

// Servicio para crear una notificación
export const createNotification = async (userId, title, message, type = "info", url = null) => {
  try {
    const result = await query(
      `
      INSERT INTO notificaciones (usuario_id, titulo, mensaje, tipo, url, leida, created_at)
      VALUES ($1, $2, $3, $4, $5, false, NOW())
      RETURNING id
    `,
      [userId, title, message, type, url],
    )

    return { success: true, notification_id: result.rows[0].id }
  } catch (error) {
    console.error("Error al crear notificación:", error)
    return { success: false, error: error.message }
  }
}

// Servicio para obtener notificaciones de un usuario
export const getUserNotifications = async (userId, page = 1, limit = 10, leida = undefined) => {
  try {
    const offset = (page - 1) * limit

    // Construir consulta base
    let queryText = `
      SELECT *
      FROM notificaciones
      WHERE usuario_id = $1
    `

    const queryParams = [userId]
    let paramIndex = 2

    // Añadir filtro de leída si se proporciona
    if (leida !== undefined) {
      queryText += ` AND leida = $${paramIndex++}`
      queryParams.push(leida === true)
    }

    // Añadir ordenamiento
    queryText += ` ORDER BY created_at DESC`

    // Consulta para contar el total de registros
    const countQuery = `SELECT COUNT(*) FROM (${queryText}) AS count_query`

    // Añadir paginación
    queryText += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`
    queryParams.push(limit, offset)

    // Ejecutar consultas
    const [notificationsResult, countResult] = await Promise.all([
      query(queryText, queryParams),
      query(countQuery, queryParams.slice(0, -2)), // Excluir los parámetros de LIMIT y OFFSET
    ])

    const notifications = notificationsResult.rows
    const total = Number.parseInt(countResult.rows[0].count)

    return {
      success: true,
      data: {
        notifications,
        pagination: {
          total,
          per_page: limit,
          current_page: page,
          last_page: Math.ceil(total / limit),
        },
      },
    }
  } catch (error) {
    console.error("Error al obtener notificaciones:", error)
    return { success: false, error: error.message }
  }
}

// Servicio para marcar una notificación como leída
export const markNotificationAsRead = async (notificationId, userId) => {
  try {
    // Verificar si la notificación existe y pertenece al usuario
    const notificationQuery = await query(
      `
      SELECT id FROM notificaciones
      WHERE id = $1 AND usuario_id = $2
    `,
      [notificationId, userId],
    )

    if (notificationQuery.rows.length === 0) {
      return { success: false, message: "Notificación no encontrada o no autorizada" }
    }

    // Marcar como leída
    await query(
      `
      UPDATE notificaciones
      SET leida = true
      WHERE id = $1
    `,
      [notificationId],
    )

    return { success: true }
  } catch (error) {
    console.error("Error al marcar notificación como leída:", error)
    return { success: false, error: error.message }
  }
}

// Servicio para marcar todas las notificaciones de un usuario como leídas
export const markAllNotificationsAsRead = async (userId) => {
  try {
    // Marcar todas las notificaciones del usuario como leídas
    await query(
      `
      UPDATE notificaciones
      SET leida = true
      WHERE usuario_id = $1 AND leida = false
    `,
      [userId],
    )

    return { success: true }
  } catch (error) {
    console.error("Error al marcar todas las notificaciones como leídas:", error)
    return { success: false, error: error.message }
  }
}

// Servicio para contar notificaciones no leídas
export const countUnreadNotifications = async (userId) => {
  try {
    // Contar notificaciones no leídas
    const countResult = await query(
      `
      SELECT COUNT(*) FROM notificaciones
      WHERE usuario_id = $1 AND leida = false
    `,
      [userId],
    )

    const count = Number.parseInt(countResult.rows[0].count)

    return { success: true, count }
  } catch (error) {
    console.error("Error al contar notificaciones no leídas:", error)
    return { success: false, error: error.message }
  }
}

// Servicio para notificar a todos los administradores
export const notifyAllAdmins = async (title, message, type = "info", url = null) => {
  try {
    // Obtener todos los administradores activos
    const adminsQuery = await query(`
      SELECT u.id
      FROM usuarios u
      JOIN roles r ON u.rol_id = r.id
      WHERE r.nombre = 'admin'
      AND u.estado = 'activo'
    `)

    const admins = adminsQuery.rows

    // Crear notificación para cada administrador
    for (const admin of admins) {
      await query(
        `
        INSERT INTO notificaciones (usuario_id, titulo, mensaje, tipo, url, leida, created_at)
        VALUES ($1, $2, $3, $4, $5, false, NOW())
      `,
        [admin.id, title, message, type, url],
      )
    }

    return { success: true, adminCount: admins.length }
  } catch (error) {
    console.error("Error al notificar a administradores:", error)
    return { success: false, error: error.message }
  }
}
