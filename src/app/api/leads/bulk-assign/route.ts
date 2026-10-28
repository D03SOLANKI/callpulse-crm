import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  try {
    // Only OWNER can bulk assign or reassign leads
    const cookieStore = cookies();
    const sessionUserId = cookieStore.get('user_id')?.value;
    if (sessionUserId) {
      const sessionUser = await prisma.user.findUnique({
        where: { id: sessionUserId },
        select: { role: true },
      });
      if (sessionUser && sessionUser.role !== 'OWNER') {
        return NextResponse.json({ error: 'Access denied: Only Owner can reassign leads' }, { status: 403 });
      }
    }
    const { leadIds, targetEmployeeId, mode } = await req.json();

    // Mode 'SPECIFIC': assign all leadIds to targetEmployeeId
    if (mode === 'SPECIFIC') {
      if (!targetEmployeeId) {
        return NextResponse.json({ error: 'Target employee required' }, { status: 400 });
      }

      await prisma.lead.updateMany({
        where: { id: { in: leadIds } },
        data: { assignedToId: targetEmployeeId },
      });

      return NextResponse.json({ success: true, count: leadIds.length });
    }

    // Mode 'ROUND_ROBIN': distribute leads equally across all 4 active employees
    const employees = await prisma.user.findMany({
      where: { role: 'EMPLOYEE', active: true },
      select: { id: true },
    });

    if (employees.length === 0) {
      return NextResponse.json({ error: 'No active employees found' }, { status: 400 });
    }

    // Target leads (either provided leadIds or all unassigned leads)
    const leadsToDistribute = leadIds && leadIds.length > 0
      ? await prisma.lead.findMany({ where: { id: { in: leadIds } }, select: { id: true } })
      : await prisma.lead.findMany({ where: { assignedToId: null }, select: { id: true } });

    let empIndex = 0;
    for (const lead of leadsToDistribute) {
      const assignedEmp = employees[empIndex % employees.length];
      await prisma.lead.update({
        where: { id: lead.id },
        data: { assignedToId: assignedEmp.id },
      });
      empIndex++;
    }

    return NextResponse.json({
      success: true,
      distributedCount: leadsToDistribute.length,
      employeesCount: employees.length,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
