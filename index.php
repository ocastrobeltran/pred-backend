<?php
require 'vendor/autoload.php';

use App\Config\Database;
use App\Middleware\AuthMiddleware;
use App\Utils\ResponseUtil;

// Cargar variables de entorno
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
$dotenv->load();

// Configurar encabezados CORS
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// Manejar solicitudes OPTIONS (preflight)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Obtener la URI solicitada
$request_uri = $_SERVER['REQUEST_URI'];
$base_path = '/pred-backend'; // Ajusta esto según tu configuración
$request_path = str_replace($base_path, '', $request_uri);
$request_path = trim($request_path, '/');
$path_parts = explode('/', $request_path);

// Determinar el controlador y la acción
$api_prefix = 'api';
if (count($path_parts) > 0 && $path_parts[0] === $api_prefix) {
    array_shift($path_parts); // Eliminar 'api' del path
    
    if (count($path_parts) > 0) {
        $controller_name = ucfirst($path_parts[0]) . 'Controller';
        array_shift($path_parts); // Eliminar el nombre del controlador
        
        $action = count($path_parts) > 0 ? $path_parts[0] : 'index';
        array_shift($path_parts); // Eliminar la acción
        
        $params = $path_parts; // Los parámetros restantes
        
        // Construir la ruta del controlador
        $controller_file = "controllers/{$controller_name}.php";
        $controller_class = "App\\Controllers\\{$controller_name}";
        
        if (file_exists($controller_file)) {
            require_once $controller_file;
            
            if (class_exists($controller_class)) {
                $controller = new $controller_class();
                
                if (method_exists($controller, $action)) {
                    // Verificar si la ruta requiere autenticación
                    $auth_middleware = new AuthMiddleware();
                    $protected_routes = [
                        'usuarios' => ['index', 'view', 'update', 'delete'],
                        'escenarios' => ['create', 'update', 'delete'],
                        'solicitudes' => ['create', 'update', 'delete', 'cambiarEstado'],
                        'admin' => ['*']
                    ];
                    
                    $requires_auth = false;
                    if (isset($path_parts[0]) && isset($protected_routes[$path_parts[0]])) {
                        if ($protected_routes[$path_parts[0]][0] === '*' || 
                            in_array($action, $protected_routes[$path_parts[0]])) {
                            $requires_auth = true;
                        }
                    }
                    
                    if ($requires_auth) {
                        $auth_result = $auth_middleware->handleRequest();
                        if (!$auth_result['success']) {
                            ResponseUtil::sendError($auth_result['message'], 401);
                            exit;
                        }
                        // Pasar el usuario autenticado al controlador
                        $controller->user = $auth_result['user'];
                    }
                    
                    // Ejecutar la acción del controlador
                    call_user_func_array([$controller, $action], $params);
                } else {
                    ResponseUtil::sendError("Método no encontrado: {$action}", 404);
                }
            } else {
                ResponseUtil::sendError("Controlador no encontrado: {$controller_class}", 404);
            }
        } else {
            ResponseUtil::sendError("Archivo de controlador no encontrado: {$controller_file}", 404);
        }
    } else {
        ResponseUtil::sendError("Ruta de API inválida", 404);
    }
} else {
    ResponseUtil::sendError("Ruta no encontrada", 404);
}