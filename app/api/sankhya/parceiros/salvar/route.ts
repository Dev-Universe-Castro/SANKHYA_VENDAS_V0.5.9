
import { NextResponse } from 'next/server';
import { salvarParceiro } from '@/lib/sankhya-api';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    console.log("🔄 API Route - Recebendo requisição para salvar parceiro:", body);
    
    const resultado = await salvarParceiro(body);
    
    console.log("✅ API Route - Parceiro salvo com sucesso");
    
    return NextResponse.json(resultado);
  } catch (error: any) {
    console.error('❌ API Route - Erro ao salvar parceiro:', {
      message: error.message,
      stack: error.stack
    });
    
    return NextResponse.json(
      { error: error.message || 'Erro ao salvar parceiro' },
      { status: 500 }
    );
  }
}
