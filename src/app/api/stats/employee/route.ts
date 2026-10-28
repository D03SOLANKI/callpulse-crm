import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    let employeeId = searchParams.get('employeeId');

    // Strict Role Isolation: Employees can ONLY view their own performance metrics
    const cookieStore = cookies();
    const sessionUserId = cookieStore.get('user_id')?.value;
    if (sessionUserId) {
      const sessionUser = await prisma.user.findUnique({
        where: { id: sessionUserId },
        select: { id: true, role: true },
      });
      if (sessionUser && sessionUser.role === 'EMPLOYEE') {
        employeeId = sessionUser.id;
      }
    }

    if (!employeeId) {
      return NextResponse.json({ error: 'employeeId required' }, { status: 400 });
    }

    const employee = await prisma.user.findUnique({
      where: { id: employeeId },
      select: { id: true, name: true, email: true, targetDaily: true },
    });

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    const callsToday = await prisma.callLog.findMany({
      where: {
        employeeId,
        createdAt: {
          gte: startOfToday,
          lte: endOfToday,
        },
      },
      include: {
        lead: { select: { id: true, name: true, company: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalCallsToday = callsToday.length;
    const connectedCalls = callsToday.filter(
      (c) => c.remark !== 'NO_ANSWER' && c.remark !== 'WRONG_NUMBER'
    ).length;

    const overdueCount = await prisma.lead.count({
      where: {
        assignedToId: employeeId,
        status: 'FOLLOW_UP',
        nextFollowUpDate: { lt: startOfToday },
      },
    });

    const dueTodayCount = await prisma.lead.count({
      where: {
        assignedToId: employeeId,
        status: 'FOLLOW_UP',
        nextFollowUpDate: {
          gte: startOfToday,
          lte: endOfToday,
        },
      },
    });

    const freshCount = await prisma.lead.count({
      where: {
        assignedToId: employeeId,
        status: 'NEW',
      },
    });

    const convertedTotal = await prisma.lead.count({
      where: {
        assignedToId: employeeId,
        status: 'CONVERTED',
      },
    });

    const totalAssigned = await prisma.lead.count({
      where: { assignedToId: employeeId },
    });

    return NextResponse.json({
      employee,
      metrics: {
        callsToday: totalCallsToday,
        targetDaily: employee.targetDaily,
        targetPercentage: Math.min(100, Math.round((totalCallsToday / employee.targetDaily) * 100)),
        connectedCalls,
        connectionRate: totalCallsToday > 0 ? Math.round((connectedCalls / totalCallsToday) * 100) : 0,
        overdueCount,
        dueTodayCount,
        freshCount,
        convertedTotal,
        totalAssigned,
      },
      recentCalls: callsToday.slice(0, 10),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
