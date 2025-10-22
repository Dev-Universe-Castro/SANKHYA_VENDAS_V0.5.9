
import { NextResponse } from 'next/server';

const SANKHYA_BASE_URL = "https://api.sandbox.sankhya.com.br";
const LOGIN_ENDPOINT = `${SANKHYA_BASE_URL}/login`;
const RECEITAS_ENDPOINT = `${SANKHYA_BASE_URL}/v1/financeiros/receitas`;

const LOGIN_HEADERS = {
  'token': process.env.SANKHYA_TOKEN || "",
  'appkey': process.env.SANKHYA_APPKEY || "",
  'username': process.env.SANKHYA_USERNAME || "",
  'password': process.env.SANKHYA_PASSWORD || ""
};

let cachedToken: string | null = null;

async function obterToken(): Promise<string> {
  if (cachedToken) {
    return cachedToken;
  }

  try {
    const resposta = await fetch(LOGIN_ENDPOINT, {
      method: 'POST',
      headers: LOGIN_HEADERS,
      body: JSON.stringify({})
    });

    if (!resposta.ok) {
      throw new Error('Erro ao autenticar no Sankhya');
    }

    const data = await resposta.json();
    const token = data.bearerToken || data.token;

    if (!token) {
      throw new Error('Token não encontrado na resposta');
    }

    cachedToken = token;
    return token;

  } catch (erro: any) {
    console.error('Erro no login Sankhya:', erro);
    cachedToken = null;
    throw erro;
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    
    const pagina = parseInt(searchParams.get('pagina') || '1');
    const codigoEmpresa = searchParams.get('codigoEmpresa') || '1';
    const codigoParceiro = searchParams.get('codigoParceiro') || '';
    const statusFinanceiro = searchParams.get('statusFinanceiro') || '3'; // 3 = Todos
    const tipoFinanceiro = searchParams.get('tipoFinanceiro') || '3'; // 3 = Todos
    const dataNegociacaoInicio = searchParams.get('dataNegociacaoInicio') || '';
    const dataNegociacaoFinal = searchParams.get('dataNegociacaoFinal') || '';

    const token = await obterToken();

    // Construir URL com query params
    const params = new URLSearchParams({
      pagina: pagina.toString(),
      codigoEmpresa,
      statusFinanceiro,
      tipoFinanceiro
    });

    if (codigoParceiro) {
      params.append('codigoParceiro', codigoParceiro);
    }

    if (dataNegociacaoInicio) {
      params.append('dataNegociacaoInicio', dataNegociacaoInicio);
    }

    if (dataNegociacaoFinal) {
      params.append('dataNegociacaoFinal', dataNegociacaoFinal);
    }

    const url = `${RECEITAS_ENDPOINT}?${params.toString()}`;

    console.log('🔍 Buscando receitas:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        cachedToken = null;
        throw new Error('Sessão expirada');
      }
      throw new Error(`Erro ao buscar receitas: ${response.status}`);
    }

    const data = await response.json();

    // Buscar nomes dos parceiros
    const codigosParceiros = [...new Set(data.financeiros.map((item: any) => item.codigoParceiro))];
    const parceirosMap = new Map();

    // Buscar cada parceiro pela API
    for (const codParceiro of codigosParceiros) {
      try {
        const parceiroResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/sankhya/parceiros?searchCode=${codParceiro}&pageSize=1`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          }
        });
        
        if (parceiroResponse.ok) {
          const parceiroData = await parceiroResponse.json();
          if (parceiroData.parceiros && parceiroData.parceiros.length > 0) {
            const parceiro = parceiroData.parceiros[0];
            parceirosMap.set(codParceiro, parceiro.NOMEPARC || parceiro.RAZAOSOCIAL || `Parceiro ${codParceiro}`);
          }
        }
      } catch (error) {
        console.error(`Erro ao buscar parceiro ${codParceiro}:`, error);
      }
    }

    // Mapear os dados para o formato esperado pelo front
    const titulos = data.financeiros.map((item: any) => {
      const nomeParceiro = parceirosMap.get(item.codigoParceiro) || `Parceiro ${item.codigoParceiro}`;
      
      // Determinar tipo financeiro individual do título baseado no campo provisao da API
      // Será sempre "Real" ou "Provisão", nunca "Todos"
      const tipoFinanceiroItem: "Real" | "Provisão" = 
        (item.provisao === true || item.provisao === "S" || item.provisao === 1 || item.provisao === "1")
          ? "Provisão"
          : "Real";
      
      // Log para debug quando for provisão
      if (tipoFinanceiroItem === "Provisão") {
        console.log(`📋 Título ${item.codigoFinanceiro}: PROVISÃO detectada (provisao=${item.provisao})`);
      }
      
      return {
        nroTitulo: item.codigoFinanceiro.toString(),
        parceiro: nomeParceiro,
        codParceiro: item.codigoParceiro.toString(),
        valor: item.valorParcela, // Valor já vem correto da API
        dataVencimento: item.dataVencimento.split(' ')[0],
        dataNegociacao: item.dataNegociacao.split(' ')[0],
        status: determinarStatusPorAPI(statusFinanceiro, item.dataVencimento),
        tipoFinanceiro: tipoFinanceiroItem,
        tipoTitulo: item.boleto.nossoNumero ? "Boleto" : "Duplicata",
        contaBancaria: item.codigoContaBancaria ? `Conta ${item.codigoContaBancaria}` : null,
        historico: item.observacao,
        numeroParcela: item.numeroParcela,
        origemFinanceiro: item.origemFinanceiro,
        codigoEmpresa: item.codigoEmpresa,
        codigoNatureza: item.codigoNatureza,
        boleto: item.boleto
      };
    });

    return NextResponse.json({
      titulos,
      pagination: data.pagination
    });

  } catch (error: any) {
    console.error('Erro ao buscar títulos a receber:', error);
    
    return NextResponse.json(
      { 
        error: 'Erro ao buscar títulos a receber',
        details: error.message
      },
      { status: 500 }
    );
  }
}

function determinarStatusPorAPI(statusAPI: string, dataVencimento: string): "Aberto" | "Vencido" | "Baixado" {
  // Status da API: 1 = Aberto, 2 = Baixado, 3 = Todos
  if (statusAPI === "2") {
    return "Baixado";
  }
  
  if (statusAPI === "1" || statusAPI === "3") {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    const vencimento = new Date(dataVencimento);
    vencimento.setHours(0, 0, 0, 0);
    
    if (vencimento < hoje) {
      return "Vencido";
    }
    
    return "Aberto";
  }
  
  return "Aberto";
}


