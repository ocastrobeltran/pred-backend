import express from 'express';
import {
  getAllScenes,
  getSceneById,
  createScene,
  updateScene,
  deleteScene,
  getLocations,
  getSports,
  getAmenities,
  checkAvailability,
  getReservedHours
} from '../controllers/scene.controller.js';
import { authenticate, isAdmin } from '../middlewares/auth.middleware.js';
import { validate, validateParams } from '../middlewares/validation.middleware.js';
import { sceneSchema, sceneIdSchema } from '../utils/validation.util.js';

const router = express.Router();

// Rutas públicas
router.get('/', getAllScenes);
router.get('/locations', getLocations);
router.get('/sports', getSports);
router.get('/amenities', getAmenities);
router.get('/:id', validateParams(sceneIdSchema), getSceneById);
router.get('/:id/reserved-hours', validateParams(sceneIdSchema), getReservedHours);

// Alias para compatibilidad con el frontend
router.get('/localidades', getLocations);
router.get('/deportes', getSports);
router.get('/amenidades', getAmenities);
router.get('/view/:id', validateParams(sceneIdSchema), getSceneById);

// Rutas protegidas por autenticación
router.use(authenticate);

// Verificar disponibilidad
router.post('/check-availability', checkAvailability);
router.post('/verificar-disponibilidad', checkAvailability); // Alias en español

// Rutas para administradores
router.post('/', isAdmin, validate(sceneSchema), createScene);
router.put('/:id', isAdmin, validateParams(sceneIdSchema), updateScene);
router.delete('/:id', isAdmin, validateParams(sceneIdSchema), deleteScene);

export default router;