
import { NextResponse } from 'next/server';
import { criarAtividade } from '@/lib/lead-atividades-service';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { CODLEAD, TIPO, DESCRICAO, DADOS_COMPLEMENTARES, COR, DATA_INICIO, DATA_FIM } = body;

    if (!TIPO || !DESCRICAO) {
      return NextResponse.json(
        { error: 'TIPO e DESCRICAO são obrigatórios' },
        { status: 400 }
      );
    }

    // Obter código do usuário (em produção, pegar do token/sessão)
    const CODUSUARIO = 1;

    const atividadeCriada = await criarAtividade({
      CODLEAD: CODLEAD || null, // Permitir null para tarefas independentes
      TIPO,
      DESCRICAO,
      DADOS_COMPLEMENTARES: DADOS_COMPLEMENTARES || "",
      CODUSUARIO,
      COR,
      DATA_INICIO: DATA_INICIO || new Date().toISOString(),
      DATA_FIM: DATA_FIM || new Date().toISOString()
    });

    // Retornar apenas dados serializáveis
    const response = {
      CODATIVIDADE: atividadeCriada?.CODATIVIDADE || '',
      CODLEAD: atividadeCriada?.CODLEAD || CODLEAD,
      TIPO: atividadeCriada?.TIPO || TIPO,
      DESCRICAO: atividadeCriada?.DESCRICAO || DESCRICAO
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Erro ao criar atividade:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao criar atividade' },
      { status: 500 }
    );
  }
}
