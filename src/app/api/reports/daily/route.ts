import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

export async function GET(req: Request) {
  try {
    // Only OWNER can generate and export company-wide daily reports
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
    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get('date');
    const format = searchParams.get('format'); // "json" | "csv"

    const targetDate = dateParam ? new Date(dateParam) : new Date();
    const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0);
    const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59);

    const employees = await prisma.user.findMany({
      where: { role: 'EMPLOYEE', active: true },
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
    });

    const calls = await prisma.callLog.findMany({
      where: {
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        employee: { select: { name: true } },
        lead: { select: { name: true, phone: true, company: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const reportRows = employees.map((emp) => {
      const empCalls = calls.filter((c) => c.employee.name === emp.name);
      const totalCalls = empCalls.length;
      const connected = empCalls.filter(
        (c) => c.remark !== 'NO_ANSWER' && c.remark !== 'WRONG_NUMBER'
      ).length;
      const interested = empCalls.filter((c) => c.remark === 'INTERESTED').length;
      const converted = empCalls.filter((c) => c.remark === 'CONVERTED').length;
      const followUps = empCalls.filter(
        (c) => c.remark === 'FOLLOW_UP' || c.remark === 'CALL_BACK_LATER'
      ).length;
      const noAnswer = empCalls.filter((c) => c.remark === 'NO_ANSWER').length;

      return {
        employeeName: emp.name,
        totalCalls,
        connected,
        connectionRate: totalCalls > 0 ? `${Math.round((connected / totalCalls) * 100)}%` : '0%',
        interested,
        converted,
        followUps,
        noAnswer,
      };
    });

    if (format === 'csv') {
      const headers = ['Employee Name', 'Total Calls', 'Connected', 'Connection Rate', 'Interested', 'Converted', 'Follow-Ups', 'No Answer'];
      const csvLines = [headers.join(',')];

      reportRows.forEach((r) => {
        csvLines.push(
          `"${r.employeeName}",${r.totalCalls},${r.connected},"${r.connectionRate}",${r.interested},${r.converted},${r.followUps},${r.noAnswer}`
        );
      });

      // Add summary totals
      const totalCallsSum = reportRows.reduce((a, b) => a + b.totalCalls, 0);
      const connectedSum = reportRows.reduce((a, b) => a + b.connected, 0);
      const interestedSum = reportRows.reduce((a, b) => a + b.interested, 0);
      const convertedSum = reportRows.reduce((a, b) => a + b.converted, 0);
      csvLines.push('');
      csvLines.push(`"TOTAL",${totalCallsSum},${connectedSum},"",${interestedSum},${convertedSum},,""`);

      return new NextResponse(csvLines.join('\n'), {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="call-report-${startOfDay.toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    return NextResponse.json({
      date: startOfDay.toISOString().split('T')[0],
      totalCalls: calls.length,
      rows: reportRows,
      callsDetail: calls,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
