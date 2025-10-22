
import { NextRequest } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { cookies } from 'next/headers';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Função para buscar dados do sistema
async function analisarDadosDoSistema(userId: number, userName: string) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:5000';
    
    // Buscar leads
    const leadsResponse = await fetch(`${baseUrl}/api/leads`, {
      headers: {
        'Cookie': `user=${JSON.stringify({ id: userId })}`
      }
    });
    const leadsData = leadsResponse.ok ? await leadsResponse.json() : [];
    const leads = Array.isArray(leadsData) ? leadsData : [];

    // Buscar parceiros
    const parceirosResponse = await fetch(`${baseUrl}/api/sankhya/parceiros?page=1&pageSize=50`);
    const parceirosData = parceirosResponse.ok ? await parceirosResponse.json() : { parceiros: [] };
    const parceiros = Array.isArray(parceirosData.parceiros) ? parceirosData.parceiros : [];

    // Buscar produtos com estoque
    console.log('🔍 Buscando produtos da API...');
    const produtosResponse = await fetch(`${baseUrl}/api/sankhya/produtos?page=1&pageSize=100`);
    const produtosData = produtosResponse.ok ? await produtosResponse.json() : { produtos: [] };
    console.log('📦 Dados recebidos da API produtos:', JSON.stringify(produtosData, null, 2));
    const produtos = Array.isArray(produtosData.produtos) ? produtosData.produtos : [];
    console.log(`✅ Total de produtos encontrados: ${produtos.length}`);

    // Buscar pedidos
    const pedidosResponse = await fetch(`${baseUrl}/api/sankhya/pedidos/listar?userId=${userId}`);
    const pedidosData = pedidosResponse.ok ? await pedidosResponse.json() : [];
    const pedidos = Array.isArray(pedidosData) ? pedidosData : [];

    // Buscar atividades
    const atividadesResponse = await fetch(`${baseUrl}/api/leads/atividades`);
    const atividadesData = atividadesResponse.ok ? await atividadesResponse.json() : [];
    const atividades = Array.isArray(atividadesData) ? atividadesData : [];

    return {
      userName,
      leads: leads.slice(0, 20), // Limitar para não sobrecarregar
      parceiros: parceiros.slice(0, 20),
      produtos: produtos.slice(0, 20),
      pedidos: pedidos.slice(0, 20),
      atividades: atividades.slice(0, 20),
      totalLeads: leads.length,
      totalParceiros: parceirosData.total || parceiros.length,
      totalProdutos: produtosData.total || produtos.length,
      totalPedidos: pedidos.length,
      totalAtividades: atividades.length
    };
  } catch (error) {
    console.error('Erro ao analisar dados:', error);
    return null;
  }
}

const SYSTEM_PROMPT = `Você é um Assistente de Vendas Inteligente integrado em uma ferramenta de CRM/Força de Vendas chamada Sankhya CRM.

SEU PAPEL E RESPONSABILIDADES:
- Ajudar vendedores a identificar oportunidades de vendas
- Sugerir ações estratégicas para fechar negócios
- Analisar leads e recomendar próximos passos
- Identificar clientes potenciais com maior chance de conversão
- Sugerir produtos que podem interessar aos clientes
- Alertar sobre leads em risco ou oportunidades urgentes

DADOS QUE VOCÊ TEM ACESSO:
- Leads: oportunidades de vendas com informações sobre valor, estágio, parceiro associado
- Parceiros: clientes e prospects cadastrados no sistema
- Produtos: catálogo REAL de produtos com estoque atual (USE APENAS OS PRODUTOS FORNECIDOS NO CONTEXTO)
- Atividades: histórico de interações com leads

⚠️ REGRA IMPORTANTE SOBRE PRODUTOS:
Você receberá uma lista completa de produtos com suas quantidades em estoque.
NUNCA mencione produtos que não estejam explicitamente listados nos dados fornecidos.
Se não houver produtos na lista, informe que não há produtos cadastrados no momento.

COMO VOCÊ DEVE AGIR:
1. Sempre analise os dados fornecidos antes de responder
2. Seja proativo em sugerir vendas e ações comerciais
3. Identifique padrões e oportunidades nos dados
4. Use métricas e números concretos em suas análises
5. Seja direto e focado em resultados de vendas
6. Priorize leads com maior valor e urgência
7. Sugira próximos passos claros e acionáveis

FORMATO DAS RESPOSTAS:
- Use emojis para destacar informações importantes (📊 💰 🎯 ⚠️ ✅)
- Organize informações em listas quando relevante
- Destaque valores monetários e datas importantes
- Seja conciso mas informativo

Sempre que o usuário fizer uma pergunta, considere os dados do sistema disponíveis para dar respostas contextualizadas e acionáveis.`;

export async function POST(request: NextRequest) {
  try {
    const { message, history } = await request.json();

    // Obter usuário autenticado
    const cookieStore = await cookies();
    const userCookie = cookieStore.get('user');
    let userId = 0;
    let userName = 'Usuário';
    
    if (userCookie) {
      try {
        const user = JSON.parse(userCookie.value);
        userId = user.id;
        userName = user.name || 'Usuário';
      } catch (e) {
        console.error('Erro ao parsear cookie:', e);
      }
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // Montar histórico com prompt de sistema
    const chatHistory = [
      {
        role: 'user',
        parts: [{ text: SYSTEM_PROMPT }],
      },
      {
        role: 'model',
        parts: [{ text: 'Entendido! Sou seu Assistente de Vendas no Sankhya CRM. Estou pronto para analisar seus dados e ajudar você a vender mais. Como posso ajudar?' }],
      },
      ...history.map((msg: any) => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      }))
    ];

    // Adicionar contexto de dados APENAS no primeiro prompt do usuário
    let messageWithContext = message;
    if (history.length === 0) {
      console.log('🔍 Primeiro prompt detectado - Buscando dados do sistema...');
      const dadosSistema = await analisarDadosDoSistema(userId, userName);
      
      if (dadosSistema) {
        messageWithContext = `DADOS DO SISTEMA (para contexto da sua análise):

👤 USUÁRIO LOGADO: ${dadosSistema.userName}

📊 RESUMO GERAL:
- Total de Leads Ativos: ${dadosSistema.totalLeads}
- Total de Parceiros/Clientes: ${dadosSistema.totalParceiros}
- Total de Produtos: ${dadosSistema.totalProdutos}
- Total de Pedidos: ${dadosSistema.totalPedidos}
- Total de Atividades: ${dadosSistema.totalAtividades}

💰 LEADS (${dadosSistema.leads.length} mais recentes):
${dadosSistema.leads.map((l: any) => `- ${l.NOME} | Valor: R$ ${l.VALOR?.toLocaleString('pt-BR') || 0} | Estágio: ${l.CODESTAGIO || 'N/A'} | Status: ${l.STATUS_LEAD || 'EM_ANDAMENTO'}`).join('\n')}

👥 PARCEIROS/CLIENTES (${dadosSistema.parceiros.length} primeiros):
${dadosSistema.parceiros.map((p: any) => `- ${p.NOMEPARC} | CPF/CNPJ: ${p.CGC_CPF || 'N/A'} | Cidade: ${p.NOMECID || 'N/A'}`).join('\n')}

📦 PRODUTOS DISPONÍVEIS (${dadosSistema.produtos.length} produtos cadastrados):
${dadosSistema.produtos.map((p: any) => {
  const estoque = parseFloat(p.ESTOQUE || '0');
  const statusEstoque = estoque > 0 ? '✅' : '⚠️';
  return `- ${p.DESCRPROD} | Estoque: ${estoque.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} unidades ${statusEstoque}`;
}).join('\n')}

IMPORTANTE: Use APENAS os produtos listados acima. Não invente ou mencione produtos que não estão nesta lista.

🛒 PEDIDOS (${dadosSistema.pedidos.length} mais recentes):
${dadosSistema.pedidos.map((ped: any) => `- Pedido #${ped.NUNOTA} | Cliente: ${ped.NOMEPARC} | Valor: R$ ${ped.VLRNOTA?.toLocaleString('pt-BR') || 0} | Data: ${ped.DTNEG || 'N/A'}`).join('\n')}

📅 ATIVIDADES (${dadosSistema.atividades.length} mais recentes):
${dadosSistema.atividades.map((a: any) => `- ${a.TIPO}: ${a.DESCRICAO?.split('|')[0] || a.DESCRICAO} | Status: ${a.STATUS || 'AGUARDANDO'} | Data: ${a.DATA_INICIO ? new Date(a.DATA_INICIO).toLocaleDateString('pt-BR') : 'N/A'}`).join('\n')}

PERGUNTA DO USUÁRIO:
${message}`;
        console.log('✅ Dados do sistema carregados e anexados ao primeiro prompt');
      }
    } else {
      console.log('💬 Prompt subsequente - Usando dados já carregados no histórico');
    }

    const chat = model.startChat({
      history: chatHistory,
      generationConfig: {
        maxOutputTokens: 2000,
      },
    });

    // Usar streaming com contexto
    const result = await chat.sendMessageStream(messageWithContext);

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.stream) {
            const text = chunk.text();
            const data = `data: ${JSON.stringify({ text })}\n\n`;
            controller.enqueue(encoder.encode(data));
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Erro no chat Gemini:', error);
    return new Response(JSON.stringify({ error: 'Erro ao processar mensagem' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
