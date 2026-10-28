const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Clearing existing data...');
  await prisma.callLog.deleteMany();
  await prisma.followUp.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.user.deleteMany();

  console.log('Seeding users...');
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

  console.log(`Created Owner and ${employees.length} Employees.`);

  const sampleLeads = [
    // Rahul's leads
    {
      name: 'Rajesh Verma',
      phone: '+91 98765 43210',
      company: 'Apex Logistics Pvt Ltd',
      email: 'rajesh@apexlogistics.in',
      status: 'FOLLOW_UP',
      priority: 'HIGH',
      assignedToId: employees[0].id,
      notes: 'Interested in bulk GPS tracker contract. Decision maker.',
      nextFollowUpDate: new Date(Date.now() + 2 * 60 * 60 * 1000), // Due today in 2 hours
    },
    {
      name: 'Kavita Patel',
      phone: '+91 98989 12345',
      company: 'Surat Textiles Hub',
      email: 'kavita@surattextiles.com',
      status: 'FOLLOW_UP',
      priority: 'HIGH',
      assignedToId: employees[0].id,
      notes: 'Asked to call yesterday afternoon. Urgent follow-up needed.',
      nextFollowUpDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Overdue from yesterday!
    },
    {
      name: 'Sandeep Joshi',
      phone: '+91 97654 32109',
      company: 'FastTrack Courier',
      email: 'sandeep@fasttrack.in',
      status: 'NEW',
      priority: 'MEDIUM',
      assignedToId: employees[0].id,
      notes: 'Fresh inquiry from website form.',
    },
    {
      name: 'Ananya Deshmukh',
      phone: '+91 96543 21098',
      company: 'Green Valley Exports',
      email: 'ananya@greenvalley.co',
      status: 'INTERESTED',
      priority: 'HIGH',
      assignedToId: employees[0].id,
      notes: 'Demo completed. Waiting on management signoff.',
    },

    // Priya's leads
    {
      name: 'Manoj Tiwari',
      phone: '+91 98123 45678',
      company: 'Tiwari Building Solutions',
      email: 'manoj@tiwarigroup.com',
      status: 'FOLLOW_UP',
      priority: 'MEDIUM',
      assignedToId: employees[1].id,
      notes: 'Call back at 4 PM today.',
      nextFollowUpDate: new Date(Date.now() + 3 * 60 * 60 * 1000),
    },
    {
      name: 'Deepak Singhal',
      phone: '+91 98234 56789',
      company: 'Singhal Steels',
      email: 'deepak@singhalsteels.com',
      status: 'CONVERTED',
      priority: 'HIGH',
      assignedToId: employees[1].id,
      notes: 'Closed quarterly enterprise subscription!',
    },
    {
      name: 'Pooja Hegde',
      phone: '+91 98345 67890',
      company: 'Zenith Retail Chain',
      email: 'pooja@zenithretail.in',
      status: 'NEW',
      priority: 'MEDIUM',
      assignedToId: employees[1].id,
      notes: 'Cold list prospect.',
    },

    // Amit's leads
    {
      name: 'Rohan Gupta',
      phone: '+91 98456 78901',
      company: 'Gupta Motors',
      email: 'rohan@guptamotors.com',
      status: 'FOLLOW_UP',
      priority: 'HIGH',
      assignedToId: employees[2].id,
      notes: 'Missed callback 2 days ago!',
      nextFollowUpDate: new Date(Date.now() - 48 * 60 * 60 * 1000), // Overdue!
    },
    {
      name: 'Sunil Rao',
      phone: '+91 98567 89012',
      company: 'Rao Cold Storage',
      email: 'sunil@raocold.com',
      status: 'NEW',
      priority: 'LOW',
      assignedToId: employees[2].id,
      notes: 'General lead.',
    },
    {
      name: 'Harish Mehta',
      phone: '+91 98678 90123',
      company: 'Mehta Pharmachem',
      email: 'harish@mehtapharma.com',
      status: 'INTERESTED',
      priority: 'HIGH',
      assignedToId: employees[2].id,
      notes: 'Pricing quote sent via email.',
    },

    // Sneha's leads
    {
      name: 'Vikas Nambiar',
      phone: '+91 98789 01234',
      company: 'Kochi Sea Foods',
      email: 'vikas@kochisea.com',
      status: 'FOLLOW_UP',
      priority: 'MEDIUM',
      assignedToId: employees[3].id,
      notes: 'Requested brochure, follow-up scheduled today.',
      nextFollowUpDate: new Date(Date.now() + 1 * 60 * 60 * 1000),
    },
    {
      name: 'Neha Saxena',
      phone: '+91 98890 12345',
      company: 'Saxena Educational Academy',
      email: 'neha@saxenaacademy.edu',
      status: 'NEW',
      priority: 'MEDIUM',
      assignedToId: employees[3].id,
      notes: 'Fresh list imported.',
    },
  ];

  for (const leadData of sampleLeads) {
    const lead = await prisma.lead.create({
      data: leadData,
    });

    // Add some call logs to demonstrate history
    if (lead.status === 'FOLLOW_UP' || lead.status === 'INTERESTED' || lead.status === 'CONVERTED') {
      await prisma.callLog.create({
        data: {
          leadId: lead.id,
          employeeId: lead.assignedToId,
          remark: lead.status === 'CONVERTED' ? 'CONVERTED' : (lead.status === 'INTERESTED' ? 'INTERESTED' : 'CALL_BACK_LATER'),
          notes: lead.notes,
          durationSeconds: 145,
          followUpDate: lead.nextFollowUpDate,
          createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
        },
      });

      if (lead.nextFollowUpDate) {
        await prisma.followUp.create({
          data: {
            leadId: lead.id,
            employeeId: lead.assignedToId,
            scheduledDate: lead.nextFollowUpDate,
            status: lead.nextFollowUpDate < new Date() ? 'OVERDUE' : 'PENDING',
            notes: lead.notes,
          },
        });
      }
    }
  }

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
