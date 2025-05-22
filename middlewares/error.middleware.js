import { sendError } from "../utils/response.util.js"

export const errorHandler = (err, req, res, next) => {
  console.error(err.stack)

  // Errores de base de datos PostgreSQL
  if (err.code && err.code.startsWith("P")) {
    return sendError(res, "Error en la base de datos", 400, err.message)
  }

  // Errores de validación
  if (err.name === "ValidationError") {
    return sendError(res, "Error de validación", 400, err.message)
  }

  // Errores de JWT
  if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
    return sendError(res, "Error de autenticación", 401, err.message)
  }

  // Error genérico
  return sendError(res, "Error interno del servidor", 500, err.message)
}
