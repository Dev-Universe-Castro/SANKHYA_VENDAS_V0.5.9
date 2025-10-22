import { NextResponse } from 'next/server';
import { consultarAtividades } from '@/lib/lead-atividades-service';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const codLead = searchParams.get('codLead');
    const ativo = searchParams.get('ativo');

    const atividades = await consultarAtividades(codLead || '', ativo || 'S');

    return NextResponse.json(atividades);
  } catch (error: any) {
    console.error('Erro ao consultar atividades:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao consultar atividades' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';