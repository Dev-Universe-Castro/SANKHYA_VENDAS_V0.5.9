
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { consultarLeads } from '@/lib/leads-service';

export async function GET(request: Request) {
  try {
    console.log('📡 API - Iniciando consulta de leads...');
    
    // Obter usuário autenticado do cookie
    const cookieStore = await cookies();
    const userCookie = cookieStore.get('user');
    
    if (!userCookie) {
      console.error('❌ Cookie de usuário não encontrado');
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    let currentUser;
    try {
      currentUser = JSON.parse(userCookie.value);
      console.log('👤 Dados do usuário do cookie:', currentUser);
    } catch (e) {
      console.error('❌ Erro ao parsear cookie de usuário:', e);
      return NextResponse.json({ error: 'Sessão inválida' }, { status: 401 });
    }

    const isAdmin = currentUser.role === 'Administrador';
    const codUsuario = currentUser.id;

    console.log(`👤 Usuário autenticado: ${currentUser.name} (ID: ${codUsuario}, Admin: ${isAdmin})`);

    const leads = await consultarLeads(codUsuario, isAdmin);
    console.log(`✅ API - ${leads.length} leads retornados`);
    console.log('📊 Leads encontrados:', leads.map(l => ({ 
      CODLEAD: l.CODLEAD, 
      NOME: l.NOME, 
      CODUSUARIO: l.CODUSUARIO,
      CODFUNIL: l.CODFUNIL,
      CODESTAGIO: l.CODESTAGIO 
    })));
    
    return NextResponse.json(leads);
  } catch (error: any) {
    console.error('❌ API - Erro ao consultar leads:', error.message);
    console.error('Stack trace:', error.stack);
    return NextResponse.json(
      { 
        error: error.message || 'Erro ao consultar leads',
        details: 'Verifique a conexão com a API Sankhya'
      },
      { status: 500 }
    );
  }
}

// Desabilitar cache para esta rota
export const dynamic = 'force-dynamic';
export const revalidate = 0;
