import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const employees = await prisma.user.findMany({
      where: { role: 'EMPLOYEE', active: true },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        targetDaily: true,
        _count: {
          select: {
            leads: true,
            callLogs: true,
            followUps: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const owner = await prisma.user.findFirst({
      where: { role: 'OWNER' },
      select: { id: true, name: true, email: true, phone: true, role: true },
    });

    return NextResponse.json({ employees, owner });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    // Only OWNER can add callers
    const cookieStore = cookies();
    const sessionUserId = cookieStore.get('user_id')?.value;
    if (sessionUserId) {
      const sessionUser = await prisma.user.findUnique({
        where: { id: sessionUserId },
        select: { role: true },
      });
      if (sessionUser && sessionUser.role !== 'OWNER') {
        return NextResponse.json({ error: 'Access denied: Only Owner can create callers' }, { status: 403 });
      }
    }

    const { name, email, phone, password, targetDaily } = await req.json();

    if (!name || !email) {
      return NextResponse.json({ error: 'Caller name and email are required' }, { status: 400 });
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Check if email already exists
    const existing = await prisma.user.findUnique({
      where: { email: trimmedEmail },
    });

    if (existing) {
      return NextResponse.json(
        { error: `A user with email "${trimmedEmail}" already exists` },
        { status: 400 }
      );
    }

    const plainPassword = password && password.trim() ? password.trim() : 'Password@123';
    const hashedPassword = await bcrypt.hash(plainPassword, 10);
    const parsedTarget = targetDaily ? parseInt(targetDaily, 10) : 150;

    const newCaller = await prisma.user.create({
      data: {
        name: name.trim(),
        email: trimmedEmail,
        phone: phone ? phone.trim() : null,
        password: hashedPassword,
        role: 'EMPLOYEE',
        targetDaily: isNaN(parsedTarget) || parsedTarget <= 0 ? 150 : parsedTarget,
        active: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        targetDaily: true,
      },
    });

    return NextResponse.json({
      success: true,
      caller: newCaller,
      defaultPassword: plainPassword,
      message: `Caller ${newCaller.name} created successfully!`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
