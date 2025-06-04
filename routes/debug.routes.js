import express from "express"
import { query } from "../config/database.js"
import { sendResponse, sendError } from "../utils/response.util.js"

const router = express.Router()

// Endpoint para depuración - SOLO PARA DESARROLLO
router.get("/debug-reservas", async (req, res) => {
  try {
    console.log("🔍 EJECUTANDO CONSULTA DE DEPURACIÓN")

    // Consulta 1: Ver todas las solicitudes
    const todasSolicitudes = await query(`
      SELECT id, escenario_id, fecha_reserva, hora_inicio, hora_fin, 
             estado_id, codigo_reserva, created_at
      FROM solicitudes
      ORDER BY fecha_reserva DESC, hora_inicio
    `)

    console.log(`📊 Total solicitudes: ${todasSolicitudes.rows.length}`)
    todasSolicitudes.rows.forEach((s, index) => {
      const fecha = s.fecha_reserva.toISOString().slice(0, 10)
      console.log(
        `   ${index + 1}. ID: ${s.id} | Escenario: ${s.escenario_id} | ${fecha} | ${s.hora_inicio}-${s.hora_fin} | Estado: ${s.estado_id} | ${s.codigo_reserva}`,
      )
    })

    // Consulta 2: Buscar específicamente la reserva problemática
    const reservaProblematica = await query(`
      SELECT id, escenario_id, fecha_reserva, hora_inicio, hora_fin, 
             estado_id, codigo_reserva, created_at
      FROM solicitudes
      WHERE codigo_reserva = 'RES-20250606-1462'
    `)

    console.log(`\n🔍 Reserva RES-20250606-1462: ${reservaProblematica.rows.length} resultados`)
    if (reservaProblematica.rows.length > 0) {
      const r = reservaProblematica.rows[0]
      const fecha = r.fecha_reserva.toISOString().slice(0, 10)
      console.log(
        `   📋 Detalles: ID: ${r.id} | Escenario: ${r.escenario_id} | ${fecha} | ${r.hora_inicio}-${r.hora_fin} | Estado: ${r.estado_id}`,
      )
    }

    // Consulta 3: Ver todas las reservas para el escenario 7 y fecha 2025-06-06
    const reservasEscenarioFecha = await query(`
      SELECT id, fecha_reserva, hora_inicio, hora_fin, estado_id, codigo_reserva
      FROM solicitudes
      WHERE escenario_id = 7 AND DATE(fecha_reserva) = DATE('2025-06-06')
      ORDER BY hora_inicio
    `)

    console.log(`\n📅 Reservas para escenario 7 en fecha 2025-06-06: ${reservasEscenarioFecha.rows.length}`)
    reservasEscenarioFecha.rows.forEach((r, index) => {
      const fecha = r.fecha_reserva.toISOString().slice(0, 10)
      console.log(
        `   ${index + 1}. ID: ${r.id} | ${fecha} | ${r.hora_inicio}-${r.hora_fin} | Estado: ${r.estado_id} | ${r.codigo_reserva}`,
      )
    })

    // Consulta 4: Ver estados de solicitud
    const estados = await query(`
      SELECT id, nombre, descripcion
      FROM estados_solicitud
      ORDER BY id
    `)

    console.log(`\n📋 Estados de solicitud:`)
    estados.rows.forEach((e) => {
      console.log(`   ID: ${e.id} = ${e.nombre} - ${e.descripcion || ""}`)
    })

    return sendResponse(
      res,
      {
        total_solicitudes: todasSolicitudes.rows.length,
        reserva_problematica: reservaProblematica.rows,
        reservas_escenario_fecha: reservasEscenarioFecha.rows,
        estados: estados.rows,
      },
      "Depuración completada",
    )
  } catch (error) {
    console.error("❌ Error en debug-reservas:", error)
    return sendError(res, "Error en el servidor", 500)
  }
})

export default router
