<?php
namespace App\Controllers;

use App\Config\Database;
use App\Utils\ResponseUtil;

class TestController {
    public function testDbConnection() {
        // Verificar método de solicitud
        if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
            ResponseUtil::sendError("Método no permitido", 405);
            return;
        }

        try {
            // Intentar conectar a la base de datos
            $database = new Database();
            $connection = $database->getConnection();

            if ($connection) {
                ResponseUtil::sendSuccess("Conexión a la base de datos exitosa");
            } else {
                ResponseUtil::sendError("No se pudo conectar a la base de datos", 500);
            }
        } catch (\Exception $e) {
            ResponseUtil::sendError("Error al conectar a la base de datos: " . $e->getMessage(), 500);
        }
    }
}