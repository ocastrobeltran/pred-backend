import express from "express"
import { getNotifications, markAsRead, markAllAsRead, countUnread } from "../controllers/notification.controller.js"
import { authenticate } from "../middlewares/auth.middleware.js"

const router = express.Router()

console.log("🔧 NOTIFICATION ROUTES - Configurando rutas...")

// Rutas en inglés (las que busca el frontend)
router.get("/", authenticate, getNotifications)
router.get("/unread-count", authenticate, countUnread)
router.put("/:id/read", authenticate, markAsRead)
router.put("/mark-all-read", authenticate, markAllAsRead)

// Rutas en español (para compatibilidad)
router.get("/contar-no-leidas", authenticate, countUnread)
router.put("/:id/marcar-leida", authenticate, markAsRead)
router.put("/marcar-todas-leidas", authenticate, markAllAsRead)

console.log("✅ NOTIFICATION ROUTES - Todas las rutas configuradas")

export default router
