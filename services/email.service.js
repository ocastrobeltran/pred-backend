import nodemailer from "nodemailer"
import dotenv from "dotenv"

dotenv.config()

// Crear transporter para enviar emails
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: process.env.EMAIL_PORT === "465",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  })
}

// Servicio para enviar un email
export const sendEmail = async (to, subject, html) => {
  try {
    const transporter = createTransporter()

    const info = await transporter.sendMail({
      from: `"Sistema de Reservas" <${process.env.EMAIL_FROM}>`,
      to,
      subject,
      html,
    })

    console.log("Email enviado: %s", info.messageId)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error("Error al enviar email:", error)
    return { success: false, error: error.message }
  }
}

// Servicio para enviar email de verificación
export const sendVerificationEmail = async (email, token) => {
  const verificationUrl = `${process.env.FRONTEND_URL}/verificar-email/${token}`

  const subject = "Verifica tu cuenta"
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Verifica tu cuenta</h2>
      <p>Gracias por registrarte en nuestro Sistema de Reservas.</p>
      <p>Por favor, haz clic en el siguiente enlace para verificar tu cuenta:</p>
      <p><a href="${verificationUrl}" style="display: inline-block; background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Verificar cuenta</a></p>
      <p>Este enlace expirará en 24 horas.</p>
      <p>Si no solicitaste esta verificación, puedes ignorar este correo.</p>
      <p>Saludos,<br>El equipo del Sistema de Reservas</p>
    </div>
  `

  return await sendEmail(email, subject, html)
}

// Servicio para enviar email de bienvenida
export const sendWelcomeEmail = async (user) => {
  const subject = "Bienvenido al Sistema de Reservas"
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Bienvenido, ${user.nombre}!</h2>
      <p>Gracias por registrarte en nuestro Sistema de Reservas.</p>
      <p>Tu cuenta ha sido creada exitosamente y está pendiente de activación.</p>
      <p>Pronto recibirás un correo cuando tu cuenta sea activada.</p>
      <p>Saludos,<br>El equipo del Sistema de Reservas</p>
    </div>
  `

  return await sendEmail(user.email, subject, html)
}

// Servicio para enviar email de activación de cuenta
export const sendAccountActivatedEmail = async (user) => {
  const subject = "Tu cuenta ha sido activada"
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>¡Buenas noticias, ${user.nombre}!</h2>
      <p>Tu cuenta en el Sistema de Reservas ha sido activada.</p>
      <p>Ya puedes iniciar sesión y comenzar a utilizar nuestros servicios.</p>
      <p>Saludos,<br>El equipo del Sistema de Reservas</p>
    </div>
  `

  return await sendEmail(user.email, subject, html)
}

// Servicio para enviar email de solicitud creada
export const sendRequestCreatedEmail = async (user, request, escenario) => {
  const subject = "Solicitud de reserva creada"
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Solicitud de reserva creada</h2>
      <p>Hola ${user.nombre},</p>
      <p>Tu solicitud de reserva para el escenario <strong>${escenario.nombre}</strong> el día <strong>${new Date(request.fecha_reserva).toLocaleDateString()}</strong> ha sido creada exitosamente.</p>
      <p>Código de reserva: <strong>${request.codigo_reserva}</strong></p>
      <p>Te notificaremos cuando tu solicitud sea revisada.</p>
      <p>Saludos,<br>El equipo del Sistema de Reservas</p>
    </div>
  `

  return await sendEmail(user.email, subject, html)
}

// Servicio para enviar email de actualización de solicitud
export const sendRequestUpdatedEmail = async (user, request, escenario, estado, notas) => {
  const subject = `Solicitud de reserva ${estado}`
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Solicitud de reserva ${estado}</h2>
      <p>Hola ${user.nombre},</p>
      <p>Tu solicitud de reserva para el escenario <strong>${escenario.nombre}</strong> el día <strong>${new Date(request.fecha_reserva).toLocaleDateString()}</strong> ha sido <strong>${estado}</strong>.</p>
      ${notas ? `<p>Notas: ${notas}</p>` : ""}
      <p>Saludos,<br>El equipo del Sistema de Reservas</p>
    </div>
  `

  return await sendEmail(user.email, subject, html)
}

// Servicio para enviar email de recuperación de contraseña
export const sendPasswordResetEmail = async (user, resetToken) => {
  const subject = "Recuperación de contraseña"
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Recuperación de contraseña</h2>
      <p>Hola ${user.nombre},</p>
      <p>Has solicitado restablecer tu contraseña. Haz clic en el siguiente enlace para crear una nueva contraseña:</p>
      <p><a href="${resetUrl}" style="display: inline-block; background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Restablecer contraseña</a></p>
      <p>Este enlace expirará en 1 hora.</p>
      <p>Si no solicitaste restablecer tu contraseña, puedes ignorar este correo.</p>
      <p>Saludos,<br>El equipo del Sistema de Reservas</p>
    </div>
  `

  return await sendEmail(user.email, subject, html)
}

export { createTransporter }
