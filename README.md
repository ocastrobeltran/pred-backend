# PRED Backend

Backend para la Plataforma de Prestación de Escenarios Deportivos.

## Requisitos Previos

Antes de comenzar, asegúrate de tener instalados los siguientes requisitos:

1. **PHP**: Versión 7.4 o superior.
   - En macOS, puedes instalarlo usando [Homebrew](https://brew.sh/):
     ```bash
     brew install php
     ```
   - Verifica la versión instalada:
     ```bash
     php -v
     ```

2. **Composer**: Gestor de dependencias para PHP.
   - Instálalo siguiendo las instrucciones en [getcomposer.org](https://getcomposer.org/download/).
   - Verifica la instalación:
     ```bash
     composer -v
     ```

3. **Servidor Web**: Puedes usar Apache, Nginx o el servidor embebido de PHP.

4. **Base de Datos**: MySQL o MariaDB.

---

## Instalación

Sigue estos pasos para instalar y configurar el proyecto:

### 1. Clonar el Repositorio
Clona el repositorio en tu máquina local:
```bash
git clone <URL_DEL_REPOSITORIO>
cd pred-backend 
```


GitHub Copilot
Aquí tienes un archivo README.md generado con la información proporcionada:

2. Instalar Dependencias
Ejecuta el siguiente comando para instalar las dependencias definidas en composer.json:
```bash
composer install
```
3. Configurar el Autoload
Genera el archivo de autoload para que las clases puedan cargarse automáticamente:
```bash
composer dump-autoload -o
```

4. Configurar Variables de Entorno
Crea un archivo .env en la raíz del proyecto (si no existe).
Copia el contenido del archivo .env.example (si está disponible) y ajusta las variables según tu entorno. Por ejemplo:
```bash
DB_HOST=localhost
DB_NAME=nombre_base_datos
DB_USER=usuario
DB_PASS=contraseña
```

6. Iniciar el Servidor
Puedes usar el servidor embebido de PHP para ejecutar el proyecto:
```bash
php -S localhost:8000 -t public
```
Asegúrate de que el directorio public sea el punto de entrada del proyecto.

7. Probar el Proyecto
Abre tu navegador y accede a:
```bash
http://localhost:8000
```
Dependencias
El proyecto utiliza las siguientes dependencias:

firebase/php-jwt: Manejo de JSON Web Tokens (JWT).
vlucas/phpdotenv: Manejo de variables de entorno.
phpmailer/phpmailer: Envío de correos electrónicos.
Scripts de Composer
post-install-cmd: Ejecuta automáticamente composer dump-autoload -o después de instalar las dependencias.
