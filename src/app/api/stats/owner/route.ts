import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    // Verify caller is OWNER
    const cookieStore = cookies();
    const sessionUserId = cookieStore.get('user_id')?.value;
    if (sessionUserId) {
      const sessionUser = await prisma.user.findUnique({
        where: { id: sessionUserId },
        select: { role: true },
      });
      if (sessionUser && sessionUser.role !== 'OWNER') {
        return NextResponse.json({ error: 'Access denied: Owner privileges required' }, { status: 403 });
      }
    }
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    // 1. All employees
    const employees = await prisma.user.findMany({
      where: { role: 'EMPLOYEE', active: true },
      select: { id: true, name: true, email: true, phone: true, targetDaily: true },
      orderBy: { createdAt: 'asc' },
    });

    // 2. Today's calls
    const todayCalls = await prisma.callLog.findMany({
      where: {
        createdAt: {
          gte: startOfToday,
          lte: endOfToday,
        },
      },
      include: {
        employee: { select: { id: true, name: true } },
        lead: { select: { id: true, name: true, phone: true, company: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 3. Overall Leads count & pipeline
    const totalLeads = await prisma.lead.count();
    const convertedLeads = await prisma.lead.count({ where: { status: 'CONVERTED' } });
    const interestedLeads = await prisma.lead.count({ where: { status: 'INTERESTED' } });
    const overdueFollowUps = await prisma.lead.count({
      where: {
        status: 'FOLLOW_UP',
        nextFollowUpDate: { lt: startOfToday },
      },
    });

    // 4. Per-employee breakdown
    const employeeLeaderboard = await Promise.all(
      employees.map(async (emp) => {
        const empCallsToday = todayCalls.filter((c) => c.employeeId === emp.id);
        const totalCallsToday = empCallsToday.length;

        const connectedCalls = empCallsToday.filter(
          (c) => c.remark !== 'NO_ANSWER' && c.remark !== 'WRONG_NUMBER'
        ).length;

        const interestedToday = empCallsToday.filter((c) => c.remark === 'INTERESTED').length;
        const convertedToday = empCallsToday.filter((c) => c.remark === 'CONVERTED').length;

        const totalAssignedLeads = await prisma.lead.count({
          where: { assignedToId: emp.id },
        });

        const empOverdue = await prisma.lead.count({
          where: {
            assignedToId: emp.id,
            status: 'FOLLOW_UP',
            nextFollowUpDate: { lt: startOfToday },
          },
        });

        const empDueToday = await prisma.lead.count({
          where: {
            assignedToId: emp.id,
            status: 'FOLLOW_UP',
            nextFollowUpDate: {
              gte: startOfToday,
              lte: endOfToday,
            },
          },
        });

        const lastCall = empCallsToday[0] || null;
        const totalTalkTimeSeconds = empCallsToday.reduce((acc, c) => acc + (c.durationSeconds || 0), 0);

        return {
          id: emp.id,
          name: emp.name,
          email: emp.email,
          phone: emp.phone,
          targetDaily: emp.targetDaily,
          callsToday: totalCallsToday,
          connectedCalls,
          connectionRate: totalCallsToday > 0 ? Math.round((connectedCalls / totalCallsToday) * 100) : 0,
          totalTalkTimeSeconds,
          interestedToday,
          convertedToday,
          totalAssignedLeads,
          overdueFollowUps: empOverdue,
          dueTodayFollowUps: empDueToday,
          lastCallAt: lastCall ? lastCall.createdAt : null,
        };
      })
    );

    // 5. Remark distribution
    const remarkDistribution: Record<string, number> = {
      INTERESTED: 0,
      NOT_INTERESTED: 0,
      NO_ANSWER: 0,
      CALL_BACK_LATER: 0,
      FOLLOW_UP: 0,
      CONVERTED: 0,
      WRONG_NUMBER: 0,
    };

    todayCalls.forEach((c) => {
      if (remarkDistribution[c.remark] !== undefined) {
        remarkDistribution[c.remark]++;
      }
    });

    // 6. Recent live activity stream
    const recentActivity = todayCalls.slice(0, 15);

    return NextResponse.json({
      summary: {
        totalCallsToday: todayCalls.length,
        connectedCallsToday: todayCalls.filter(
          (c) => c.remark !== 'NO_ANSWER' && c.remark !== 'WRONG_NUMBER'
        ).length,
        totalTalkTimeSeconds: todayCalls.reduce((acc, c) => acc + (c.durationSeconds || 0), 0),
        totalLeads,
        convertedLeads,
        interestedLeads,
        overdueFollowUps,
      },
      employeeLeaderboard,
      remarkDistribution,
      recentActivity,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
