<?php
require 'vendor/autoload.php';

echo "Testing autoloader...\n";

// List all model files
$modelFiles = glob('models/*.php');
echo "Model files found: " . implode(", ", $modelFiles) . "\n";

// Check if classes are autoloadable
$classesToCheck = [
    'App\\Models\\Escenario',
    'App\\Models\\Usuario',
    'App\\Models\\Solicitud',
    'App\\Models\\Notificacion'
];

foreach ($classesToCheck as $class) {
    echo "Checking if class exists: $class ... ";
    if (class_exists($class)) {
        echo "✅ Found\n";
    } else {
        echo "❌ Not found\n";
        
        // Try to find the file manually
        $classPath = str_replace('\\', '/', $class) . '.php';
        echo "Looking for file: $classPath\n";
        if (file_exists($classPath)) {
            echo "File exists but class not autoloaded\n";
        } else {
            echo "File does not exist\n";
        }
    }
}

// Check directory structure
echo "\nDirectory structure:\n";
function listDir($dir, $indent = 0) {
    $files = scandir($dir);
    foreach ($files as $file) {
        if ($file != '.' && $file != '..') {
            echo str_repeat('  ', $indent) . $file . "\n";
            if (is_dir("$dir/$file")) {
                listDir("$dir/$file", $indent + 1);
            }
        }
    }
}
listDir('.');