import { sendError } from "../utils/response.util.js"
import { validateSchema } from "../utils/validation.util.js"

// Middleware para validar datos de entrada según un esquema
export const validate = (schema) => {
  return (req, res, next) => {
    try {
      const { error, value } = validateSchema(schema, req.body)

      if (error) {
        const errorMessages = error.details.map((detail) => detail.message)
        return sendError(res, "Error de validación", 400, errorMessages)
      }

      // Reemplazar req.body con los datos validados
      req.body = value
      next()
    } catch (err) {
      return sendError(res, "Error en la validación de datos", 500)
    }
  }
}

// Middleware para validar parámetros de ruta
export const validateParams = (schema) => {
  return (req, res, next) => {
    try {
      const { error, value } = validateSchema(schema, req.params)

      if (error) {
        const errorMessages = error.details.map((detail) => detail.message)
        return sendError(res, "Error de validación en parámetros", 400, errorMessages)
      }

      // Reemplazar req.params con los datos validados
      req.params = value
      next()
    } catch (err) {
      return sendError(res, "Error en la validación de parámetros", 500)
    }
  }
}

// Middleware para validar parámetros de consulta
export const validateQuery = (schema) => {
  return (req, res, next) => {
    try {
      const { error, value } = validateSchema(schema, req.query)

      if (error) {
        const errorMessages = error.details.map((detail) => detail.message)
        return sendError(res, "Error de validación en parámetros de consulta", 400, errorMessages)
      }

      // Reemplazar req.query con los datos validados
      req.query = value
      next()
    } catch (err) {
      return sendError(res, "Error en la validación de parámetros de consulta", 500)
    }
  }
}
