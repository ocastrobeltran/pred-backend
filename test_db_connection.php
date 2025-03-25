<?php
require 'vendor/autoload.php';

// Cargar variables de entorno - asegúrate de que la ruta sea correcta
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
try {
    $dotenv->load();
} catch (Exception $e) {
    echo "Error cargando .env: " . $e->getMessage() . "\n";
    echo "Ruta actual: " . __DIR__ . "\n";
    exit;
}

// Verificar que las variables existan y tengan valores
$host = $_ENV['MYSQLHOST'] ?? null;
$db_name = $_ENV['MYSQLDATABASE'] ?? null;
$username = $_ENV['MYSQLUSER'] ?? null;
$password = $_ENV['MYSQLPASSWORD'] ?? null;
$port = $_ENV['MYSQLPORT'] ?? null;

// Verificar que ninguna variable esté vacía
if (!$host || !$db_name || !$username || !$password || !$port) {
    echo "Error: Faltan variables de entorno o están vacías\n";
    echo "Host: " . ($host ? "configurado" : "vacío") . "\n";
    echo "Database: " . ($db_name ? "configurado" : "vacío") . "\n";
    echo "User: " . ($username ? "configurado" : "vacío") . "\n";
    echo "Password: " . ($password ? "configurado" : "vacío") . "\n";
    echo "Port: " . ($port ? "configurado" : "vacío") . "\n";
    exit;
}

try {
    // Mostrar los valores que estamos usando (para depuración)
    echo "Intentando conectar con:\n";
    echo "Host: $host\n";
    echo "Database: $db_name\n";
    echo "User: $username\n";
    echo "Port: $port\n";
    
    // Conexión con mysqli
    $conn = new mysqli($host, $username, $password, $db_name, intval($port));
    
    if ($conn->connect_error) {
        throw new Exception("Error de conexión: " . $conn->connect_error);
    }
    
    echo "Conexión exitosa a la base de datos.\n";
    
    // Verificar la conexión con una consulta simple
    $result = $conn->query("SELECT 1 as test");
    $row = $result->fetch_assoc();
    echo "Consulta de prueba exitosa: " . print_r($row, true) . "\n";
    
    $conn->close();
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}