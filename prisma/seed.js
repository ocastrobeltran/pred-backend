import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Crear roles
  const roles = [
    { nombre: 'administrador' },
    { nombre: 'supervisor' },
    { nombre: 'usuario' }
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { nombre: role.nombre },
      update: {},
      create: role
    });
  }

  // Crear estados de solicitud
  const requestStatuses = [
    { nombre: 'creada', color: '#3498db' },
    { nombre: 'en_proceso', color: '#f39c12' },
    { nombre: 'aprobada', color: '#2ecc71' },
    { nombre: 'rechazada', color: '#e74c3c' },
    { nombre: 'cancelada', color: '#95a5a6' }
  ];

  for (const status of requestStatuses) {
    await prisma.requestStatus.upsert({
      where: { nombre: status.nombre },
      update: {},
      create: status
    });
  }

  // Crear propósitos de reserva
  const purposes = [
    { nombre: 'entrenamiento' },
    { nombre: 'competencia' },
    { nombre: 'recreación' },
    { nombre: 'evento' },
    { nombre: 'otro' }
  ];

  for (const purpose of purposes) {
    await prisma.purpose.upsert({
      where: { nombre: purpose.nombre },
      update: {},
      create: purpose
    });
  }

  // Crear localidades
  const locations = [
    { nombre: 'Norte' },
    { nombre: 'Sur' },
    { nombre: 'Este' },
    { nombre: 'Oeste' },
    { nombre: 'Centro' }
  ];

  for (const location of locations) {
    await prisma.location.upsert({
      where: { nombre: location.nombre },
      update: {},
      create: location
    });
  }

  // Crear deportes
  const sports = [
    { nombre: 'Fútbol', icono: 'football' },
    { nombre: 'Baloncesto', icono: 'basketball' },
    { nombre: 'Voleibol', icono: 'volleyball' },
    { nombre: 'Tenis', icono: 'tennis' },
    { nombre: 'Natación', icono: 'swimming' }
  ];

  for (const sport of sports) {
    await prisma.sport.upsert({
      where: { nombre: sport.nombre },
      update: {},
      create: sport
    });
  }

  // Crear amenidades
  const amenities = [
    { nombre: 'Vestuarios', icono: 'locker' },
    { nombre: 'Duchas', icono: 'shower' },
    { nombre: 'Iluminación', icono: 'light' },
    { nombre: 'Parqueadero', icono: 'parking' },
    { nombre: 'Cafetería', icono: 'coffee' }
  ];

  for (const amenity of amenities) {
    await prisma.amenity.upsert({
      where: { nombre: amenity.nombre },
      update: {},
      create: amenity
    });
  }

  // Crear usuario administrador por defecto
  const adminRole = await prisma.role.findUnique({
    where: { nombre: 'administrador' }
  });

  const hashedPassword = await bcrypt.hash('admin123', 10);

  await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      nombre: 'Admin',
      apellido: 'Sistema',
      email: 'oscar@test.com',
      password: 'admin123',
      cedula: '1234567890',
      telefono: '1234567890',
      direccion: 'Dirección del administrador',
      rolId: adminRole.id,
      estado: 'activo'
    }
  });

  console.log('Base de datos poblada con datos iniciales');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });