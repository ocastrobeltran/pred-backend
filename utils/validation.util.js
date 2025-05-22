import Joi from "joi"

// Función para validar un esquema
export const validateSchema = (schema, data) => {
  return schema.validate(data, { abortEarly: false })
}

// Esquema para validación de login
export const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    "string.email": "El correo electrónico debe tener un formato válido",
    "string.empty": "El correo electrónico es requerido",
    "any.required": "El correo electrónico es requerido",
  }),
  password: Joi.string().required().messages({
    "string.empty": "La contraseña es requerida",
    "any.required": "La contraseña es requerida",
  }),
})

// Esquema para validación de registro
export const registerSchema = Joi.object({
  nombre: Joi.string().required().messages({
    "string.empty": "El nombre es requerido",
    "any.required": "El nombre es requerido",
  }),
  apellido: Joi.string().required().messages({
    "string.empty": "El apellido es requerido",
    "any.required": "El apellido es requerido",
  }),
  email: Joi.string().email().required().messages({
    "string.email": "El correo electrónico debe tener un formato válido",
    "string.empty": "El correo electrónico es requerido",
    "any.required": "El correo electrónico es requerido",
  }),
  password: Joi.string().min(6).required().messages({
    "string.min": "La contraseña debe tener al menos 6 caracteres",
    "string.empty": "La contraseña es requerida",
    "any.required": "La contraseña es requerida",
  }),
  cedula: Joi.string().required().messages({
    "string.empty": "La cédula es requerida",
    "any.required": "La cédula es requerida",
  }),
  telefono: Joi.string().required().messages({
    "string.empty": "El teléfono es requerido",
    "any.required": "El teléfono es requerido",
  }),
  direccion: Joi.string().allow("").optional(),
})

// Esquema para validación de creación de usuario
export const userSchema = Joi.object({
  nombre: Joi.string().required().messages({
    "string.empty": "El nombre es requerido",
    "any.required": "El nombre es requerido",
  }),
  apellido: Joi.string().required().messages({
    "string.empty": "El apellido es requerido",
    "any.required": "El apellido es requerido",
  }),
  email: Joi.string().email().required().messages({
    "string.email": "El correo electrónico debe tener un formato válido",
    "string.empty": "El correo electrónico es requerido",
    "any.required": "El correo electrónico es requerido",
  }),
  password: Joi.string().min(6).required().messages({
    "string.min": "La contraseña debe tener al menos 6 caracteres",
    "string.empty": "La contraseña es requerida",
    "any.required": "La contraseña es requerida",
  }),
  cedula: Joi.string().allow("").optional(),
  telefono: Joi.string().allow("").optional(),
  direccion: Joi.string().allow("").optional(),
  rol_id: Joi.number().required().messages({
    "number.base": "El rol debe ser un número",
    "any.required": "El rol es requerido",
  }),
  estado: Joi.string().valid("activo", "pendiente", "inactivo").default("activo"),
})

// Esquema para validación de actualización de usuario
export const userUpdateSchema = Joi.object({
  nombre: Joi.string().optional(),
  apellido: Joi.string().optional(),
  email: Joi.string().email().optional().messages({
    "string.email": "El correo electrónico debe tener un formato válido",
  }),
  password: Joi.string().min(6).optional().messages({
    "string.min": "La contraseña debe tener al menos 6 caracteres",
  }),
  cedula: Joi.string().allow("").optional(),
  telefono: Joi.string().allow("").optional(),
  direccion: Joi.string().allow("").optional(),
  rol_id: Joi.number().optional(),
  estado: Joi.string().valid("activo", "pendiente", "inactivo").optional(),
})

// Esquema para validación de ID de usuario
export const userIdSchema = Joi.object({
  id: Joi.number().required().messages({
    "number.base": "El ID debe ser un número",
    "any.required": "El ID es requerido",
  }),
})

// Esquema para validación de creación de escenario
export const sceneSchema = Joi.object({
  nombre: Joi.string().required().messages({
    "string.empty": "El nombre es requerido",
    "any.required": "El nombre es requerido",
  }),
  descripcion: Joi.string().required().messages({
    "string.empty": "La descripción es requerida",
    "any.required": "La descripción es requerida",
  }),
  capacidad: Joi.number().required().messages({
    "number.base": "La capacidad debe ser un número",
    "any.required": "La capacidad es requerida",
  }),
  dimensiones: Joi.string().required().messages({
    "string.empty": "Las dimensiones son requeridas",
    "any.required": "Las dimensiones son requeridas",
  }),
  localidad_id: Joi.number().required().messages({
    "number.base": "La localidad debe ser un número",
    "any.required": "La localidad es requerida",
  }),
  deporte_principal_id: Joi.number().required().messages({
    "number.base": "El deporte principal debe ser un número",
    "any.required": "El deporte principal es requerido",
  }),
  direccion: Joi.string().required().messages({
    "string.empty": "La dirección es requerida",
    "any.required": "La dirección es requerida",
  }),
  estado: Joi.string().valid("disponible", "mantenimiento", "inactivo").default("disponible"),
  imagen_principal: Joi.string().allow("").optional(),
  deportes: Joi.array().items(Joi.number()).optional(),
  amenidades: Joi.array().items(Joi.number()).optional(),
  imagenes: Joi.array()
    .items(
      Joi.object({
        url: Joi.string().required(),
        es_principal: Joi.boolean().default(false),
        orden: Joi.number().default(0),
      }),
    )
    .optional(),
  horarios: Joi.array()
    .items(
      Joi.object({
        dia_semana: Joi.string()
          .valid("lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo")
          .required(),
        hora_inicio: Joi.string()
          .pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
          .required(),
        hora_fin: Joi.string()
          .pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
          .required(),
        disponible: Joi.boolean().default(true),
      }),
    )
    .optional(),
})

// Esquema para validación de ID de escenario
export const sceneIdSchema = Joi.object({
  id: Joi.number().required().messages({
    "number.base": "El ID debe ser un número",
    "any.required": "El ID es requerido",
  }),
})

// Esquema para validación de creación de solicitud
export const requestSchema = Joi.object({
  escenario_id: Joi.number().required().messages({
    "number.base": "El escenario debe ser un número",
    "any.required": "El escenario es requerido",
  }),
  fecha_reserva: Joi.date().min("now").required().messages({
    "date.base": "La fecha debe ser válida",
    "date.min": "La fecha debe ser futura",
    "any.required": "La fecha es requerida",
  }),
  hora_inicio: Joi.string()
    .pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .required()
    .messages({
      "string.pattern.base": "La hora de inicio debe tener formato HH:MM",
      "any.required": "La hora de inicio es requerida",
    }),
  hora_fin: Joi.string()
    .pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .required()
    .messages({
      "string.pattern.base": "La hora de fin debe tener formato HH:MM",
      "any.required": "La hora de fin es requerida",
    }),
  proposito_id: Joi.number().required().messages({
    "number.base": "El propósito debe ser un número",
    "any.required": "El propósito es requerido",
  }),
  num_participantes: Joi.number().required().messages({
    "number.base": "El número de participantes debe ser un número",
    "any.required": "El número de participantes es requerido",
  }),
  notas: Joi.string().allow("").optional(),
})

// Esquema para validación de ID de solicitud
export const requestIdSchema = Joi.object({
  id: Joi.number().required().messages({
    "number.base": "El ID debe ser un número",
    "any.required": "El ID es requerido",
  }),
})

// Esquema para validación de cambio de estado de solicitud
export const statusChangeSchema = Joi.object({
  estado: Joi.string().valid("pendiente", "aprobada", "rechazada", "completada", "cancelada").required().messages({
    "string.empty": "El estado es requerido",
    "any.required": "El estado es requerido",
    "any.only": "El estado debe ser uno de los siguientes: pendiente, aprobada, rechazada, completada, cancelada",
  }),
  admin_notas: Joi.string().allow("").optional(),
})

// Esquema para validación de código de reserva
export const reservationCodeSchema = Joi.object({
  codigo: Joi.string().required().messages({
    "string.empty": "El código de reserva es requerido",
    "any.required": "El código de reserva es requerido",
  }),
})

// Esquema para validación de refresh token
export const refreshTokenSchema = Joi.object({
  refresh_token: Joi.string().required().messages({
    "string.empty": "El refresh token es requerido",
    "any.required": "El refresh token es requerido",
  }),
})

// Esquema para validación de reseteo de contraseña
export const passwordResetRequestSchema = Joi.object({
  email: Joi.string().email().required().messages({
    "string.email": "El correo electrónico debe tener un formato válido",
    "string.empty": "El correo electrónico es requerido",
    "any.required": "El correo electrónico es requerido",
  }),
})

// Esquema para validación de nueva contraseña
export const passwordResetSchema = Joi.object({
  token: Joi.string().required().messages({
    "string.empty": "El token es requerido",
    "any.required": "El token es requerido",
  }),
  password: Joi.string().min(6).required().messages({
    "string.min": "La contraseña debe tener al menos 6 caracteres",
    "string.empty": "La contraseña es requerida",
    "any.required": "La contraseña es requerida",
  }),
  password_confirmation: Joi.string().valid(Joi.ref("password")).required().messages({
    "any.only": "Las contraseñas no coinciden",
    "string.empty": "La confirmación de contraseña es requerida",
    "any.required": "La confirmación de contraseña es requerida",
  }),
})
