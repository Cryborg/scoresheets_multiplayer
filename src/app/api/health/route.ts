import { NextResponse } from 'next/server';

// Endpoint léger pour tester la connectivité
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
}

export async function HEAD() {
  // Pour les tests de ping (plus rapide que GET)
  return new NextResponse(null, { status: 200 });
}