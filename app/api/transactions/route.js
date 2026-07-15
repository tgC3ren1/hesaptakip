import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import crypto from "crypto";
import { authOptions } from "@/lib/auth";
import { getTransactions, addTransaction } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });

  const txs = getTransactions(session.user.id);
  return NextResponse.json({ transactions: txs });
}

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });

  const { type, amount, date, note } = body;
  const amountNum = parseFloat(amount);

  if (!["yatirim", "cekim"].includes(type)) {
    return NextResponse.json({ error: "Geçersiz işlem türü." }, { status: 400 });
  }
  if (!amountNum || amountNum <= 0) {
    return NextResponse.json({ error: "Tutar 0'dan büyük olmalı." }, { status: 400 });
  }
  if (!date) {
    return NextResponse.json({ error: "Tarih zorunludur." }, { status: 400 });
  }

  const tx = {
    id: crypto.randomUUID(),
    userId: session.user.id,
    type,
    amount: amountNum,
    date,
    note: (note || "").trim(),
    createdAt: Date.now(),
  };
  addTransaction(tx);

  return NextResponse.json({ transaction: tx }, { status: 201 });
}
