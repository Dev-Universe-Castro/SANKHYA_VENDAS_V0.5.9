
import { NextRequest } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { cookies } from 'next/headers';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

async function buscarDadosDoSistema(userId: number) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:5000';
    
    const [leadsRes, parceirosRes, produtosRes, pedidosRes] = await Promise.all([
      fetch(`${baseUrl}/api/leads`, { headers: { 'Cookie': `user=${JSON.stringify({ id: userId })}` } }),
      fetch(`${baseUrl}/api/sankhya/parceiros?page=1&pageSize=100`),
      fetch(`${baseUrl}/api/sankhya/produtos?page=1&pageSize=100`),
      fetch(`${baseUrl}/api/sankhya/pedidos/listar?userId=${userId}`)
    ]);

    const leads = leadsRes.ok ? await leadsRes.json() : [];
    const parceirosData = parceirosRes.ok ? await parceirosRes.json() : { parceiros: [] };
    const produtosData = produtosRes.ok ? await produtosRes.json() : { produtos: [] };
    const pedidos = pedidosRes.ok ? await pedidosRes.json() : [];

    return {
      leads: Array.isArray(leads) ? leads : [],
      parceiros: Array.isArray(parceirosData.parceiros) ? parceirosData.parceiros : [],
      produtos: Array.isArray(produtosData.produtos) ? produtosData.produtos : [],
      pedidos: Array.isArray(pedidos) ? pedidos : []
    };
  } catch (error) {
    console.error('Erro ao buscar dados:', error);
    return { leads: [], parceiros: [], produtos: [], pedidos: [] };
  }
}

const SYSTEM_PROMPT = `Você é um Assistente de Análise de Dados especializado em gerar visualizações inteligentes.

SEU PAPEL:
- Analisar dados de vendas, leads, produtos e clientes
- Gerar widgets de visualização (cards, gráficos, tabelas) baseados nos dados
- Retornar SEMPRE um JSON estruturado no formato especificado
- Trabalhar com dados temporais e séries históricas

FORMATO DE RESPOSTA OBRIGATÓRIO:
Você DEVE retornar um JSON válido com a seguinte estrutura:

{
  "widgets": [
    {
      "tipo": "explicacao",
      "titulo": "Análise Realizada",
      "dados": {
        "texto": "Analisei os dados de vendas dos últimos 6 meses e identifiquei os top 5 produtos. A análise mostra um crescimento de 15% no período."
      }
    },
    {
      "tipo": "card",
      "titulo": "Total de Vendas",
      "dados": {
        "valor": "R$ 150.000",
        "variacao": "+15%",
        "subtitulo": "vs mês anterior"
      }
    },
    {
      "tipo": "grafico_linha",
      "titulo": "Evolução Mensal de Vendas",
      "dados": {
        "labels": ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun"],
        "values": [25000, 28000, 32000, 30000, 35000, 40000]
      },
      "metadados": {
        "formatoMonetario": true
      }
    }
  ]
}

TIPOS DE WIDGETS DISPONÍVEIS:

1. explicacao: OBRIGATÓRIO como primeiro widget - explica o que foi analisado
   - texto: Descrição clara da análise realizada

2. card: Para métricas principais
   - valor: Valor principal (use formatação R$ para valores monetários)
   - variacao: Percentual de mudança (ex: "+15%", "-5%")
   - subtitulo: Contexto adicional

3. grafico_barras: Para comparações
   - labels: Array de rótulos
   - values: Array de valores
   - metadados.formatoMonetario: true (para valores em R$)

4. grafico_linha: Para tendências temporais (use para dados com tempo)
   - labels: Array de períodos (ex: meses, dias, anos)
   - values: Array de valores correspondentes
   - metadados.formatoMonetario: true (para valores em R$)

5. grafico_area: Para visualizar volume ao longo do tempo
   - labels: Array de períodos
   - values: Array de valores
   - metadados.formatoMonetario: true (para valores em R$)

6. grafico_pizza: Para distribuições percentuais
   - labels: Array de categorias
   - values: Array de valores

7. grafico_scatter: Para correlações entre variáveis
   - pontos: Array de objetos {x, y, nome}
   - labelX: Rótulo do eixo X
   - labelY: Rótulo do eixo Y

8. grafico_radar: Para comparar múltiplas métricas
   - labels: Array de dimensões
   - values: Array de valores (0-100)

9. tabela: Para dados detalhados
   - colunas: Array de nomes das colunas
   - linhas: Array de arrays com dados

REGRAS IMPORTANTES:
1. O PRIMEIRO widget SEMPRE deve ser do tipo "explicacao" descrevendo a análise
2. SEMPRE retorne JSON válido, nunca texto livre
3. Use gráficos de linha/área para dados temporais (vendas por mês, evolução, etc)
4. Use scatter para correlações (ex: preço vs quantidade vendida)
5. Use radar para comparar métricas múltiplas (ex: performance de vendedores)
6. Escolha os widgets mais adequados para responder a pergunta
7. Use dados reais fornecidos no contexto
8. Seja visual e informativo
9. Priorize insights acionáveis
10. Organize widgets de forma lógica: explicação → métricas principais → gráficos → detalhes
11. SEMPRE adicione metadados.formatoMonetario: true quando os valores forem monetários (vendas, receita, preço, etc)
12. Valores em cards devem ser formatados como "R$ 150.000,00" quando forem monetários`;

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();

    const cookieStore = await cookies();
    const userCookie = cookieStore.get('user');
    let userId = 0;
    
    if (userCookie) {
      try {
        const user = JSON.parse(userCookie.value);
        userId = user.id;
      } catch (e) {
        console.error('Erro ao parsear cookie:', e);
      }
    }

    const dadosSistema = await buscarDadosDoSistema(userId);

    const contextPrompt = `DADOS DO SISTEMA:

LEADS (${dadosSistema.leads.length} total):
${JSON.stringify(dadosSistema.leads.slice(0, 50), null, 2)}

PARCEIROS/CLIENTES (${dadosSistema.parceiros.length} total):
${JSON.stringify(dadosSistema.parceiros.slice(0, 50), null, 2)}

PRODUTOS (${dadosSistema.produtos.length} total):
${JSON.stringify(dadosSistema.produtos.slice(0, 50), null, 2)}

PEDIDOS (${dadosSistema.pedidos.length} total):
${JSON.stringify(dadosSistema.pedidos.slice(0, 50), null, 2)}

PERGUNTA DO USUÁRIO:
${prompt}

IMPORTANTE: Retorne APENAS o JSON estruturado com os widgets. Não adicione texto explicativo antes ou depois do JSON.`;

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    const result = await model.generateContent([
      { text: SYSTEM_PROMPT },
      { text: contextPrompt }
    ]);

    const responseText = result.response.text();
    
    // Extrair JSON da resposta (remover markdown se houver)
    let jsonText = responseText.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/g, '');
    }

    const parsedResponse = JSON.parse(jsonText);

    return new Response(JSON.stringify(parsedResponse), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Erro na análise Gemini:', error);
    return new Response(JSON.stringify({ 
      error: 'Erro ao processar análise',
      widgets: []
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
