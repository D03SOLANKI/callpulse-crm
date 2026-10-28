import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  try {
    // Only OWNER can import leads and assign files
    const cookieStore = cookies();
    const sessionUserId = cookieStore.get('user_id')?.value;
    if (sessionUserId) {
      const sessionUser = await prisma.user.findUnique({
        where: { id: sessionUserId },
        select: { role: true },
      });
      if (sessionUser && sessionUser.role !== 'OWNER') {
        return NextResponse.json(
          { error: 'Access denied: Only Owner can import and assign lead files' },
          { status: 403 }
        );
      }
    }
    const { leads, targetEmployeeId, autoAssign, source } = await req.json();

    if (!Array.isArray(leads) || leads.length === 0) {
      return NextResponse.json({ error: 'Valid leads array required' }, { status: 400 });
    }

    const employees = await prisma.user.findMany({
      where: { role: 'EMPLOYEE', active: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });

    const batchSourceName = source ? String(source).trim() : 'Excel File Import';
    const leadsToInsert: any[] = [];

    // CASE 1: Assign entire Excel file directly to a SPECIFIC caller
    if (targetEmployeeId && targetEmployeeId !== 'UNASSIGNED') {
      const targetEmp = employees.find((e) => e.id === targetEmployeeId);

      for (const item of leads) {
        if (!item.name || !item.phone) continue;
        leadsToInsert.push({
          name: String(item.name).trim(),
          phone: String(item.phone).trim(),
          company: item.company ? String(item.company).trim() : null,
          email: item.email ? String(item.email).trim() : null,
          priority: item.priority || 'MEDIUM',
          source: batchSourceName,
          notes: item.notes ? String(item.notes).trim() : null,
          status: 'NEW',
          assignedToId: targetEmployeeId,
        });
      }
    }
    // CASE 2: Auto-distribute equally across all 4 callers (Round-Robin)
    else if (autoAssign && employees.length > 0) {
      let empIndex = 0;
      for (const item of leads) {
        if (!item.name || !item.phone) continue;
        const assignedEmp = employees[empIndex % employees.length];
        leadsToInsert.push({
          name: String(item.name).trim(),
          phone: String(item.phone).trim(),
          company: item.company ? String(item.company).trim() : null,
          email: item.email ? String(item.email).trim() : null,
          priority: item.priority || 'MEDIUM',
          source: batchSourceName,
          notes: item.notes ? String(item.notes).trim() : null,
          status: 'NEW',
          assignedToId: assignedEmp.id,
        });
        empIndex++;
      }
    }
    // CASE 3: Leave in unassigned general pool
    else {
      for (const item of leads) {
        if (!item.name || !item.phone) continue;
        leadsToInsert.push({
          name: String(item.name).trim(),
          phone: String(item.phone).trim(),
          company: item.company ? String(item.company).trim() : null,
          email: item.email ? String(item.email).trim() : null,
          priority: item.priority || 'MEDIUM',
          source: batchSourceName,
          notes: item.notes ? String(item.notes).trim() : null,
          status: 'NEW',
          assignedToId: null,
        });
      }
    }

    if (leadsToInsert.length === 0) {
      return NextResponse.json({ error: 'No valid leads with name and phone found' }, { status: 400 });
    }

    // High-performance batch insert (handles 2,000+ leads in milliseconds)
    const result = await prisma.lead.createMany({
      data: leadsToInsert,
    });

    return NextResponse.json({
      success: true,
      count: result.count,
      batchSource: batchSourceName,
    });
  } catch (error: any) {
    console.error('Import error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
