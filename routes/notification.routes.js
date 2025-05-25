import express from "express"
import { getNotifications, markAsRead, markAllAsRead, countUnread } from "../controllers/notification.controller.js"
import { authenticate } from "../middlewares/auth.middleware.js"

const router = express.Router()

// Rutas protegidas
router.get("/", authenticate, getNotifications)
router.put("/:id/marcar-leida", authenticate, markAsRead)
router.put("/marcar-todas-leidas", authenticate, markAllAsRead)
router.get("/contar-no-leidas", authenticate, countUnread)

export default router
