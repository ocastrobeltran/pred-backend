# Base image with PHP 8.2 and Composer
FROM php:8.2-cli

# Install Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# Install required extensions
RUN apt-get update && \
    apt-get install -y git zip unzip && \
    docker-php-ext-install mysqli pdo pdo_mysql

# Create app directory
WORKDIR /app

# Copy composer files first for better caching
COPY composer.json composer.lock* ./

# Install dependencies
RUN composer install --no-interaction --prefer-dist --optimize-autoloader

# Copy the rest of the application
COPY . .

# Make sure the models directory is properly recognized
RUN mkdir -p models && \
    # Regenerate autoloader to ensure all classes are found
    composer dump-autoload -o

# Expose port
EXPOSE 8000

# Command to start the server
CMD php -S 0.0.0.0:8000 index.php