# Imagen base con PHP 8.2 y Composer
FROM php:8.2-cli

# Instalar Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# Instalar extensiones necesarias como mysqli
RUN apt-get update && docker-php-ext-install mysqli

# Crear directorio de la app
WORKDIR /app

# Copiar el contenido del proyecto
COPY . .

# Instalar dependencias con Composer y generar autoload
RUN composer install --no-interaction --prefer-dist --optimize-autoloader \
  && composer dump-autoload

# Ejecutar test de conexión (opcional, cuidado si la DB aún no está activa)
# Puedes comentar esta línea si no quieres que falle el build si no se conecta
# RUN php test_db_connection.php

# Exponer el puerto
EXPOSE 8000

# Comando para iniciar el servidor PHP embebido
CMD php -S 0.0.0.0:8000 index.php && php test_db_connection.php