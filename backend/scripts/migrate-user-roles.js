import { prisma } from '../src/lib/prisma.js';

async function main() {
  console.log('بدء ترحيل الأدوار للمستخدمين...\n');

  const roles = await prisma.role.findMany();
  const roleMap = Object.fromEntries(roles.map(r => [r.name, r.id]));

  const users = await prisma.user.findMany({
    where: { role_id: null, deleted_at: null },
    select: { id: true, name: true, username: true, role: true },
  });

  console.log(`المستخدمون بدون role_id: ${users.length}`);

  if (users.length === 0) {
    console.log('لا يوجد مستخدمون بحاجة للترحيل.');
    return;
  }

  let updated = 0;
  let skipped = 0;

  for (const user of users) {
    const roleId = roleMap[user.role];
    if (!roleId) {
      console.log(`  ⚠️  لم يتم العثور على دور للمستخدم ${user.username} (role: ${user.role})`);
      skipped++;
      continue;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { role_id: roleId },
    });

    console.log(`  ✅ ${user.username} (${user.name}) ← ${user.role}`);
    updated++;
  }

  console.log(`\nتم التحديث: ${updated} مستخدم`);
  if (skipped > 0) console.log(`تم التخطي: ${skipped} مستخدم`);
  console.log('اكتمل ترحيل الأدوار.');
}

main()
  .catch((e) => {
    console.error('خطأ في ترحيل الأدوار:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
