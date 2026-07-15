import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { updateTransaction, deleteTransaction } from "@/lib/db";

export async function PUT(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });

  const { type, amount, date, note } = body;
  const amountNum = parseFloat(amount);

  if (!["yatirim", "cekim"].includes(type) || !amountNum || amountNum <= 0 || !date) {
    return NextResponse.json({ error: "Geçersiz veri." }, { status: 400 });
  }

  const updated = updateTransaction(session.user.id, params.id, {
    type,
    amount: amountNum,
    date,
    note: (note || "").trim(),
  });

  if (!updated) return NextResponse.json({ error: "Kayıt bulunamadı." }, { status: 404 });
  return NextResponse.json({ transaction: updated });
}

export async function DELETE(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });

  const ok = deleteTransaction(session.user.id, params.id);
  if (!ok) return NextResponse.json({ error: "Kayıt bulunamadı." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
