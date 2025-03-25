<?php
namespace App\Middleware;

use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use App\Models\Usuario;
use App\Utils\ResponseUtil;

class AuthMiddleware {
    public function handleRequest() {
        $headers = getallheaders();
        
        // Verificar si existe el encabezado de autorización
        if (!isset($headers['Authorization'])) {
            return [
                'success' => false,
                'message' => 'Token de autorización no proporcionado'
            ];
        }
        
        $auth_header = $headers['Authorization'];
        $token = str_replace('Bearer ', '', $auth_header);
        
        try {
            // Decodificar el token
            $decoded = JWT::decode($token, new Key($_ENV['JWT_SECRET'], 'HS256'));
            
            // Verificar si el usuario existe en la base de datos
            $usuario_model = new Usuario();
            $user = $usuario_model->findById($decoded->user_id);
            
            if (!$user) {
                return [
                    'success' => false,
                    'message' => 'Usuario no encontrado'
                ];
            }
            
            // Verificar si el usuario está activo
            if ($user['estado'] !== 'activo') {
                return [
                    'success' => false,
                    'message' => 'Usuario inactivo o pendiente de activación'
                ];
            }
            
            return [
                'success' => true,
                'user' => $user
            ];
            
        } catch (\Exception $e) {
            return [
                'success' => false,
                'message' => 'Token inválido o expirado: ' . $e->getMessage()
            ];
        }
    }
    
    public function isAdmin($user) {
        return isset($user['rol_id']) && $user['rol_id'] == 1;
    }
    
    public function isSupervisor($user) {
        return isset($user['rol_id']) && $user['rol_id'] == 3;
    }
}