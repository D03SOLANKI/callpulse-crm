import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const assignedToId = searchParams.get('assignedToId');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const tab = searchParams.get('tab'); // "overdue" | "today" | "fresh" | "all"

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    const where: any = {};

    if (assignedToId && assignedToId !== 'ALL') {
      where.assignedToId = assignedToId;
    }

    // Strict Role Isolation: If an EMPLOYEE is logged in, lock their query exclusively to their own leads
    const cookieStore = cookies();
    const sessionUserId = cookieStore.get('user_id')?.value;
    if (sessionUserId) {
      const sessionUser = await prisma.user.findUnique({
        where: { id: sessionUserId },
        select: { id: true, role: true },
      });
      if (sessionUser && sessionUser.role === 'EMPLOYEE') {
        where.assignedToId = sessionUser.id;
      }
    }

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { phone: { contains: search } },
        { company: { contains: search } },
        { email: { contains: search } },
      ];
    }

    // Tab-based priority filters
    if (tab === 'overdue') {
      where.status = 'FOLLOW_UP';
      where.nextFollowUpDate = {
        lt: startOfToday,
      };
    } else if (tab === 'today') {
      where.status = 'FOLLOW_UP';
      where.nextFollowUpDate = {
        gte: startOfToday,
        lte: endOfToday,
      };
    } else if (tab === 'fresh') {
      where.status = 'NEW';
    }

    const leads = await prisma.lead.findMany({
      where,
      include: {
        assignedTo: {
          select: { id: true, name: true, email: true },
        },
        callLogs: {
          orderBy: { createdAt: 'desc' },
          take: 3,
        },
        _count: {
          select: { callLogs: true },
        },
      },
      orderBy: [
        { priority: 'desc' },
        { nextFollowUpDate: 'asc' },
        { updatedAt: 'desc' },
      ],
    });

    return NextResponse.json({ leads });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const { name, phone, company, email, priority, assignedToId, source, notes } = data;

    if (!name || !phone) {
      return NextResponse.json({ error: 'Name and phone are required' }, { status: 400 });
    }

    const lead = await prisma.lead.create({
      data: {
        name,
        phone,
        company: company || null,
        email: email || null,
        priority: priority || 'MEDIUM',
        source: source || 'Direct',
        notes: notes || null,
        assignedToId: assignedToId || null,
        status: 'NEW',
      },
      include: {
        assignedTo: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ lead, success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const data = await req.json();
    const { id, name, phone, company, email, priority, assignedToId, status, notes } = data;

    if (!id) {
      return NextResponse.json({ error: 'Lead ID required' }, { status: 400 });
    }

    const updated = await prisma.lead.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(phone && { phone }),
        ...(company !== undefined && { company }),
        ...(email !== undefined && { email }),
        ...(priority && { priority }),
        ...(assignedToId !== undefined && { assignedToId }),
        ...(status && { status }),
        ...(notes !== undefined && { notes }),
      },
      include: {
        assignedTo: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ lead: updated, success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Lead ID required' }, { status: 400 });
    }

    await prisma.lead.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
