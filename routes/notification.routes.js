import express from 'express';
import { 
  getNotifications, 
  markAsRead, 
  markAllAsRead, 
  countUnread 
} from '../controllers/notification.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Rutas protegidas por autenticación
router.use(authenticate);

router.get('/', getNotifications);
router.get('/count', countUnread);
router.put('/:id/read', markAsRead);
router.put('/read-all', markAllAsRead);

export default router;