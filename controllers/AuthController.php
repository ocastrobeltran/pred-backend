<?php
namespace App\Controllers;

use App\Models\Usuario ;
use App\Utils\ResponseUtil;
use Firebase\JWT\JWT;

class AuthController {
    private $usuario_model;
    
    public function __construct() {
        $this->usuario_model = new Usuario();
    }
    
    public function login() {
        // Verificar método de solicitud
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            ResponseUtil::sendError("Método no permitido", 405);
            return;
        }
        
        // Obtener datos de la solicitud
        $data = json_decode(file_get_contents("php://input"), true);
        
        // Validar datos
        if (!isset($data['email']) || !isset($data['password'])) {
            ResponseUtil::sendError("Correo electrónico y contraseña son requeridos", 400);
            return;
        }
        
        // Buscar usuario por correo electrónico
        $usuario = $this->usuario_model->findByEmail($data['email']);
        
        // Verificar si el usuario existe
        if (!$usuario) {
            ResponseUtil::sendError("Credenciales inválidas", 401);
            return;
        }
        
        // Verificar contraseña
        if (!password_verify($data['password'], $usuario['password'])) {
            ResponseUtil::sendError("Credenciales inválidas", 401);
            return;
        }
        
        // Verificar estado del usuario
        if ($usuario['estado'] !== 'activo') {
            ResponseUtil::sendError("Usuario inactivo o pendiente de activación", 401);
            return;
        }
        
        // Actualizar último login
        $this->usuario_model->update($usuario['id'], ['ultimo_login' => date('Y-m-d H:i:s')]);
        
        // Generar token JWT
        $token_payload = [
            'user_id' => $usuario['id'],
            'email' => $usuario['email'],
            'rol' => $usuario['rol_nombre'],
            'iat' => time(),
            'exp' => time() + $_ENV['JWT_EXPIRY']
        ];
        
        $token = JWT::encode($token_payload, $_ENV['JWT_SECRET'], 'HS256');
        
        // Preparar respuesta
        $response = [
            'token' => $token,
            'user' => [
                'id' => $usuario['id'],
                'nombre' => $usuario['nombre'],
                'apellido' => $usuario['apellido'],
                'email' => $usuario['email'],
                'rol' => $usuario['rol_nombre'],
                'rol_id' => $usuario['rol_id']
            ]
        ];
        
        ResponseUtil::sendResponse($response, "Inicio de sesión exitoso");
    }
    
    public function register() {
        // Verificar método de solicitud
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            ResponseUtil::sendError("Método no permitido", 405);
            return;
        }
        
        // Obtener datos de la solicitud
        $data = json_decode(file_get_contents("php://input"), true);
        
        // Validar datos
        $required_fields = ['nombre', 'apellido', 'email', 'password', 'cedula', 'telefono'];
        $errors = [];
        
        foreach ($required_fields as $field) {
            if (!isset($data[$field]) || empty($data[$field])) {
                $errors[] = "El campo {$field} es requerido";
            }
        }
        
        if (!empty($errors)) {
            ResponseUtil::sendError("Datos incompletos", 400, $errors);
            return;
        }
        
        // Verificar si el correo ya está registrado
        $existing_user = $this->usuario_model->findByEmail($data['email']);
        
        if ($existing_user) {
            ResponseUtil::sendError("El correo electrónico ya está registrado", 400);
            return;
        }
        
        // Crear usuario
        try {
            $user_id = $this->usuario_model->create($data);
            
            if ($user_id) {
                ResponseUtil::sendResponse(['user_id' => $user_id], "Usuario registrado exitosamente");
            } else {
                ResponseUtil::sendError("Error al registrar usuario", 500);
            }
        } catch (\Exception $e) {
            ResponseUtil::sendError("Error: " . $e->getMessage(), 500);
        }
    }
    
    public function me() {
        // Verificar método de solicitud
        if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
            ResponseUtil::sendError("Método no permitido", 405);
            return;
        }
        
        // Obtener token de autorización
        $headers = getallheaders();
        
        if (!isset($headers['Authorization'])) {
            ResponseUtil::sendError("Token de autorización no proporcionado", 401);
            return;
        }
        
        $auth_header = $headers['Authorization'];
        $token = str_replace('Bearer ', '', $auth_header);
        
        try {
            // Decodificar el token
            $decoded = JWT::decode($token, new \Firebase\JWT\Key($_ENV['JWT_SECRET'], 'HS256'));
            
            // Buscar usuario por ID
            $usuario = $this->usuario_model->findById($decoded->user_id);
            
            if (!$usuario) {
                ResponseUtil::sendError("Usuario no encontrado", 404);
                return;
            }
            
            // Preparar respuesta
            $response = [
                'id' => $usuario['id'],
                'nombre' => $usuario['nombre'],
                'apellido' => $usuario['apellido'],
                'email' => $usuario['email'],
                'cedula' => $usuario['cedula'],
                'telefono' => $usuario['telefono'],
                'direccion' => $usuario['direccion'],
                'rol' => $usuario['rol_nombre'],
                'rol_id' => $usuario['rol_id'],
                'estado' => $usuario['estado'],
                'ultimo_login' => $usuario['ultimo_login']
            ];
            
            ResponseUtil::sendResponse($response, "Información del usuario");
            
        } catch (\Exception $e) {
            ResponseUtil::sendError("Token inválido o expirado: " . $e->getMessage(), 401);
        }
    }
}