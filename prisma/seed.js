const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Clearing existing data from Supabase...');
  await prisma.callLog.deleteMany();
  await prisma.followUp.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.user.deleteMany();

  console.log('Seeding users into Supabase...');
  const ownerPassword = await bcrypt.hash('Ravi@1122', 10);

  const owner = await prisma.user.create({
    data: {
      name: 'Ravi Kapadia (Owner)',
      email: 'ravikapadia@gmail.com',
      password: ownerPassword,
      role: 'OWNER',
      phone: '+91 98200 11223',
    },
  });

  const employeesData = [
    { name: 'Vaishali Shukla', email: 'vaishalishukla@gmail.com', phone: '+91 98111 22334', targetDaily: 150, pass: 'Vaishali@123' },
    { name: 'Shruti Chavda', email: 'shrutichavda@gmail.com', phone: '+91 98222 33445', targetDaily: 150, pass: 'Shruti@123' },
    { name: 'Riya Vasoya', email: 'riyavasoya@gmail.com', phone: '+91 98333 44556', targetDaily: 150, pass: 'Riya@123' },
    { name: 'Sanjana Amin', email: 'sanjanaamin@gmail.com', phone: '+91 98444 55667', targetDaily: 150, pass: 'Sanjana@123' },
  ];

  const employees = [];
  for (const emp of employeesData) {
    const userPassHash = await bcrypt.hash(emp.pass, 10);
    const created = await prisma.user.create({
      data: {
        name: emp.name,
        email: emp.email,
        phone: emp.phone,
        targetDaily: emp.targetDaily,
        password: userPassHash,
        role: 'EMPLOYEE',
      },
    });
    employees.push(created);
  }

  console.log(`Created Owner and ${employees.length} Employees with clean 0 leads.`);
  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
