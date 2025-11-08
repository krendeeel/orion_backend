import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.position.create({
    data: { name: 'Администратор' },
  });

  const users = await prisma.user.findMany();
  const adminPosition = await prisma.position.findFirst({
    where: { name: 'Администратор' },
  });

  if (!adminPosition) {
    throw new Error('Не найдена созданная должность');
  }

  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    await prisma.user.update({
      where: { id: user.id },
      data: {
        firstName: 'Пользователь',
        lastName: 'Тестовый',
        middleName: `Т${i + 1}`,
        age: Math.floor(Math.random() * 41) + 20, // 20-60
        positionId: adminPosition.id,
      },
    });
  }

  console.log('Seeding completed');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  .finally(async () => {
    await prisma.$disconnect();
  });
