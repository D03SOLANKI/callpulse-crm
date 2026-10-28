import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const leadId = searchParams.get('leadId');
    const employeeId = searchParams.get('employeeId');
    const remark = searchParams.get('remark');
    const search = searchParams.get('search');
    const dateRange = searchParams.get('dateRange'); // 'today' | 'yesterday' | 'week' | 'all'
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    const where: any = {};

    if (leadId) where.leadId = leadId;

    if (employeeId && employeeId !== 'ALL') {
      where.employeeId = employeeId;
    }

    // Strict Role Isolation: If an EMPLOYEE is logged in, they can ONLY view their own call logs
    const cookieStore = cookies();
    const sessionUserId = cookieStore.get('user_id')?.value;
    if (sessionUserId) {
      const sessionUser = await prisma.user.findUnique({
        where: { id: sessionUserId },
        select: { id: true, role: true },
      });
      if (sessionUser && sessionUser.role === 'EMPLOYEE') {
        where.employeeId = sessionUser.id;
      }
    }

    if (remark && remark !== 'ALL') {
      where.remark = remark;
    }

    // Date range filter
    const now = new Date();
    if (dateRange === 'today') {
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      where.createdAt = { gte: startOfToday, lte: endOfToday };
    } else if (dateRange === 'yesterday') {
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      const startOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 0, 0, 0);
      const endOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59);
      where.createdAt = { gte: startOfYesterday, lte: endOfYesterday };
    } else if (dateRange === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      where.createdAt = { gte: weekAgo };
    }

    // Search filter
    if (search) {
      where.OR = [
        { notes: { contains: search } },
        { lead: { name: { contains: search } } },
        { lead: { phone: { contains: search } } },
        { lead: { company: { contains: search } } },
        { employee: { name: { contains: search } } },
      ];
    }

    const calls = await prisma.callLog.findMany({
      where,
      include: {
        employee: { select: { id: true, name: true, email: true } },
        lead: { select: { id: true, name: true, phone: true, company: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    // Compute duration metrics
    const totalDurationSeconds = calls.reduce((acc, c) => acc + (c.durationSeconds || 0), 0);
    const avgDurationSeconds = calls.length > 0 ? Math.round(totalDurationSeconds / calls.length) : 0;

    return NextResponse.json({
      calls,
      totalCount: calls.length,
      metrics: {
        totalDurationSeconds,
        avgDurationSeconds,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { leadId, employeeId, remark, notes, durationSeconds, followUpDate } = body;

    if (!leadId || !employeeId || !remark) {
      return NextResponse.json(
        { error: 'leadId, employeeId, and remark are required' },
        { status: 400 }
      );
    }

    // Determine new status for the lead
    let newStatus = 'IN_PROGRESS';
    let followUpDateTime: Date | null = followUpDate ? new Date(followUpDate) : null;

    switch (remark) {
      case 'INTERESTED':
        newStatus = 'INTERESTED';
        break;
      case 'CONVERTED':
        newStatus = 'CONVERTED';
        break;
      case 'NOT_INTERESTED':
        newStatus = 'NOT_INTERESTED';
        break;
      case 'WRONG_NUMBER':
        newStatus = 'LOST';
        break;
      case 'FOLLOW_UP':
      case 'CALL_BACK_LATER':
        newStatus = 'FOLLOW_UP';
        break;
      case 'NO_ANSWER':
        newStatus = 'IN_PROGRESS';
        break;
      default:
        newStatus = 'IN_PROGRESS';
    }

    // Create the CallLog with exact duration in seconds
    const callLog = await prisma.callLog.create({
      data: {
        leadId,
        employeeId,
        remark,
        notes: notes || null,
        durationSeconds: durationSeconds ? parseInt(String(durationSeconds), 10) : 0,
        followUpDate: followUpDateTime,
      },
      include: {
        employee: { select: { id: true, name: true } },
        lead: { select: { id: true, name: true, phone: true, company: true } },
      },
    });

    // Update Lead info
    const updatedLead = await prisma.lead.update({
      where: { id: leadId },
      data: {
        status: newStatus,
        callCount: { increment: 1 },
        lastContactedAt: new Date(),
        nextFollowUpDate: followUpDateTime,
      },
      include: {
        assignedTo: { select: { id: true, name: true } },
      },
    });

    // If follow-up date specified, schedule a FollowUp record
    if (followUpDateTime) {
      await prisma.followUp.updateMany({
        where: {
          leadId,
          status: 'PENDING',
        },
        data: {
          status: 'RESCHEDULED',
        },
      });

      await prisma.followUp.create({
        data: {
          leadId,
          employeeId,
          scheduledDate: followUpDateTime,
          status: 'PENDING',
          notes: notes || `Follow-up set after call (${remark})`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      call: callLog,
      lead: updatedLead,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
