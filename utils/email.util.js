import nodemailer from "nodemailer"
import dotenv from "dotenv"

dotenv.config()

export const sendEmail = async (to, subject, html) => {
  try {
    // Crear transporter
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: process.env.EMAIL_PORT === "465",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    })

    // Enviar email
    const info = await transporter.sendMail({
      from: `"Sistema de Reservas" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    })

    console.log("Email enviado: %s", info.messageId)
    return true
  } catch (error) {
    console.error("Error al enviar email:", error)
    return false
  }
}

export const getEmailTemplate = (type, data) => {
  switch (type) {
    case "welcome":
      return {
        subject: "Bienvenido al Sistema de Reservas",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Bienvenido, ${data.nombre}!</h2>
            <p>Gracias por registrarte en nuestro Sistema de Reservas.</p>
            <p>Tu cuenta ha sido creada exitosamente y está pendiente de activación.</p>
            <p>Pronto recibirás un correo cuando tu cuenta sea activada.</p>
            <p>Saludos,<br>El equipo del Sistema de Reservas</p>
          </div>
        `,
      }

    case "account_activated":
      return {
        subject: "Tu cuenta ha sido activada",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>¡Buenas noticias, ${data.nombre}!</h2>
            <p>Tu cuenta en el Sistema de Reservas ha sido activada.</p>
            <p>Ya puedes iniciar sesión y comenzar a utilizar nuestros servicios.</p>
            <p>Saludos,<br>El equipo del Sistema de Reservas</p>
          </div>
        `,
      }

    case "request_created":
      return {
        subject: "Solicitud de reserva creada",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Solicitud de reserva creada</h2>
            <p>Hola ${data.nombre},</p>
            <p>Tu solicitud de reserva para el escenario <strong>${data.escenario}</strong> el día <strong>${data.fecha}</strong> ha sido creada exitosamente.</p>
            <p>Código de reserva: <strong>${data.codigo}</strong></p>
            <p>Te notificaremos cuando tu solicitud sea revisada.</p>
            <p>Saludos,<br>El equipo del Sistema de Reservas</p>
          </div>
        `,
      }

    case "request_updated":
      return {
        subject: `Solicitud de reserva ${data.estado}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Solicitud de reserva ${data.estado}</h2>
            <p>Hola ${data.nombre},</p>
            <p>Tu solicitud de reserva para el escenario <strong>${data.escenario}</strong> el día <strong>${data.fecha}</strong> ha sido <strong>${data.estado}</strong>.</p>
            ${data.notas ? `<p>Notas: ${data.notas}</p>` : ""}
            <p>Saludos,<br>El equipo del Sistema de Reservas</p>
          </div>
        `,
      }

    case "password_reset":
      return {
        subject: "Recuperación de contraseña",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Recuperación de contraseña</h2>
            <p>Hola ${data.nombre},</p>
            <p>Has solicitado restablecer tu contraseña. Haz clic en el siguiente enlace para crear una nueva contraseña:</p>
            <p><a href="${data.resetUrl}" style="display: inline-block; background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Restablecer contraseña</a></p>
            <p>Este enlace expirará en 1 hora.</p>
            <p>Si no solicitaste restablecer tu contraseña, puedes ignorar este correo.</p>
            <p>Saludos,<br>El equipo del Sistema de Reservas</p>
          </div>
        `,
      }

    default:
      return {
        subject: "Notificación del Sistema de Reservas",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Notificación</h2>
            <p>${data.mensaje}</p>
            <p>Saludos,<br>El equipo del Sistema de Reservas</p>
          </div>
        `,
      }
  }
}
