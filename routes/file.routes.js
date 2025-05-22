import express from 'express';
import { upload, uploadFile, deleteFile } from '../controllers/file.controller.js';
import { authenticate, isAdmin } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Rutas protegidas por autenticación
router.use(authenticate);

router.post('/upload', upload.single('file'), uploadFile);
router.delete('/', isAdmin, deleteFile);

export default router;