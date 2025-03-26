# Usar una imagen base con PHP 8.2 y Apache
FROM php:8.2-apache

# Instalar dependencias del sistema
RUN apt-get update && apt-get install -y \
    git \
    unzip \
    libpng-dev \
    libonig-dev \
    libxml2-dev \
    zip \
    && docker-php-ext-install mysqli mbstring

# Instalar Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# Configurar directorio de trabajo
WORKDIR /var/www/html

# Copiar archivos del proyecto
COPY . .

# Instalar dependencias de Composer
RUN composer install --no-interaction --prefer-dist --optimize-autoloader

# Generar autoload de manera explícita
RUN composer dump-autoload -o

# Configurar permisos
RUN chown -R www-data:www-data /var/www/html

# Habilitar módulos de Apache
RUN a2enmod rewrite \
    && a2enmod headers

# Configurar ServerName para suprimir la advertencia
RUN echo "ServerName localhost" >> /etc/apache2/apache2.conf

# Exponer puerto
EXPOSE 80

# Comando para iniciar Apache
CMD ["apache2-foreground"]