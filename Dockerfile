# Imagen base con PHP 8.2 y Composer
FROM php:8.2-cli

# Instalar Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# Crear directorio de la app
WORKDIR /app

# Copiar el contenido del proyecto
COPY . .

# Instalar dependencias con Composer
RUN composer install --no-interaction --prefer-dist --optimize-autoloader

# Exponer el puerto
EXPOSE 8000

# Comando para iniciar el servidor PHP embebido
CMD ["php", "-S", "0.0.0.0:8000", "-t", "public"]