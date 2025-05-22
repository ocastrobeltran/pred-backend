import express from 'express';
import { 
  getAllUsers, 
  getUserById, 
  createUser, 
  updateUser, 
  deleteUser, 
  getRoles 
} from '../controllers/user.controller.js';
import { authenticate, isAdmin } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Rutas protegidas por autenticación
router.use(authenticate);

// Rutas para administradores
router.get('/', isAdmin, getAllUsers);
router.post('/', isAdmin, createUser);
router.delete('/:id', isAdmin, deleteUser);

// Rutas para todos los usuarios autenticados
router.get('/roles', getRoles);
router.get('/:id', getUserById);
router.put('/:id', updateUser);

export default router;