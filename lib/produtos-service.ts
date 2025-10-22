
import axios from 'axios';

// Serviço de gerenciamento de produtos e estoque
export interface Produto {
  CODPROD: string
  DESCRPROD: string
  ATIVO: string
  LOCAL: string
  MARCA: string
  CARACTERISTICAS: string
  UNIDADE: string
  VLRCOMERC: string
  ESTOQUE?: string
  _id: string
}

export interface Estoque {
  ESTOQUE: string
  CODPROD: string
  ATIVO: string
  CONTROLE: string
  CODLOCAL: string
  _id: string
}

const ENDPOINT_LOGIN = "https://api.sandbox.sankhya.com.br/login";
const URL_CONSULTA_SERVICO = "https://api.sandbox.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json";

const LOGIN_HEADERS = {
  'token': process.env.SANKHYA_TOKEN || "",
  'appkey': process.env.SANKHYA_APPKEY || "",
  'username': process.env.SANKHYA_USERNAME || "",
  'password': process.env.SANKHYA_PASSWORD || ""
};

let cachedToken: string | null = null;

// Obter Token
async function obterToken(retryCount = 0, silent = false): Promise<string> {
  if (cachedToken) {
    return cachedToken;
  }

  const MAX_RETRIES = 3;
  const RETRY_DELAY = 1000;

  try {
    const resposta = await axios.post(ENDPOINT_LOGIN, {}, {
      headers: LOGIN_HEADERS,
      timeout: 10000
    });

    const token = resposta.data.bearerToken || resposta.data.token;

    if (!token) {
      throw new Error("Resposta de login do Sankhya não continha o token esperado.");
    }

    cachedToken = token;
    return token;

  } catch (erro: any) {
    if (erro.response?.status === 500 && retryCount < MAX_RETRIES) {
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (retryCount + 1)));
      return obterToken(retryCount + 1, silent);
    }

    cachedToken = null;

    if (erro.response?.status === 500) {
      throw new Error("Serviço Sankhya temporariamente indisponível. Tente novamente em instantes.");
    }

    throw new Error(`Falha na autenticação Sankhya: ${erro.response?.data?.error || erro.message}`);
  }
}

// Requisição Autenticada Genérica
async function fazerRequisicaoAutenticada(fullUrl: string, method = 'POST', data = {}, retryCount = 0) {
  const MAX_RETRIES = 2;
  const RETRY_DELAY = 1000;

  try {
    const token = await obterToken();

    const config = {
      method: method.toLowerCase(),
      url: fullUrl,
      data: data,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: 15000
    };

    const resposta = await axios(config);
    return resposta.data;

  } catch (erro: any) {
    if (erro.response && (erro.response.status === 401 || erro.response.status === 403)) {
      cachedToken = null;

      if (retryCount < 1) {
        console.log("🔄 Token expirado, obtendo novo token...");
        await new Promise(resolve => setTimeout(resolve, 500));
        return fazerRequisicaoAutenticada(fullUrl, method, data, retryCount + 1);
      }

      throw new Error("Sessão expirada. Tente novamente.");
    }

    if ((erro.code === 'ECONNABORTED' || erro.code === 'ENOTFOUND' || erro.response?.status >= 500) && retryCount < MAX_RETRIES) {
      console.log(`🔄 Tentando novamente requisição (${retryCount + 1}/${MAX_RETRIES})...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (retryCount + 1)));
      return fazerRequisicaoAutenticada(fullUrl, method, data, retryCount + 1);
    }

    const errorDetails = erro.response?.data || erro.message;
    console.error("❌ Erro na requisição Sankhya:", {
      url: fullUrl,
      method,
      error: errorDetails
    });

    if (erro.code === 'ECONNABORTED') {
      throw new Error("Tempo de resposta excedido. Tente novamente.");
    }

    if (erro.response?.status >= 500) {
      throw new Error("Serviço temporariamente indisponível. Tente novamente.");
    }

    throw new Error(erro.response?.data?.statusMessage || erro.message || "Erro na comunicação com o servidor");
  }
}

// Mapeamento genérico de entidades
function mapearEntidades(entities: any) {
  const fieldNames = entities.metadata.fields.field.map((f: any) => f.name);

  const entityArray = Array.isArray(entities.entity) ? entities.entity : [entities.entity];

  return entityArray.map((rawEntity: any, index: number) => {
    const cleanObject: any = {};

    for (let i = 0; i < fieldNames.length; i++) {
      const fieldKey = `f${i}`;
      const fieldName = fieldNames[i];

      if (rawEntity[fieldKey]) {
        cleanObject[fieldName] = rawEntity[fieldKey].$;
      }
    }

    cleanObject._id = cleanObject.CODPROD ? String(cleanObject.CODPROD) : String(index);
    return cleanObject;
  });
}

// Buscar Preço do Produto via API
export async function buscarPrecoProduto(codProd: string, retryCount = 0, silent: boolean = false): Promise<number> {
  const URL_PRECOS = `https://api.sandbox.sankhya.com.br/v1/precos/produto/${codProd}/tabela/0?pagina=1`;
  const MAX_RETRIES = 1;

  try {
    const token = await obterToken();

    const resposta = await axios.get(URL_PRECOS, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: 5000
    });
    
    // Extrair o preço da resposta
    let preco = 0;
    
    if (resposta.data && resposta.data.produtos && Array.isArray(resposta.data.produtos) && resposta.data.produtos.length > 0) {
      const produto = resposta.data.produtos[0];
      preco = parseFloat(produto.valor) || 0;
    }
    
    return preco;

  } catch (erro: any) {
    // Se token expirou, limpar cache e tentar novamente
    if (erro.response && (erro.response.status === 401 || erro.response.status === 403)) {
      cachedToken = null;
      if (retryCount < 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
        return buscarPrecoProduto(codProd, retryCount + 1, silent);
      }
    }

    // Retry para erros temporários
    if ((erro.code === 'ECONNABORTED' || erro.response?.status >= 500) && retryCount < MAX_RETRIES) {
      await new Promise(resolve => setTimeout(resolve, 500));
      return buscarPrecoProduto(codProd, retryCount + 1, silent);
    }

    return 0;
  }
}

// Consultar Produtos com Paginação
export async function consultarProdutos(page: number = 1, pageSize: number = 50, searchName: string = '', searchCode: string = '') {
  const offset = (page - 1) * pageSize;

  let criteriaExpression = "";
  const filters: string[] = [];

  if (searchCode.trim() !== '') {
    const code = searchCode.trim();
    filters.push(`CODPROD = ${code}`);
  }

  if (searchName.trim() !== '') {
    const name = searchName.trim().toUpperCase();
    filters.push(`DESCRPROD LIKE '%${name}%'`);
  }

  if (filters.length > 0) {
    criteriaExpression = filters.join(' AND ');
  }

  const dataSet: any = {
    "rootEntity": "Produto",
    "includePresentationFields": "N",
    "offsetPage": String(offset),
    "limit": String(pageSize),
    "entity": {
      "fieldset": {
        "list": "CODPROD, DESCRPROD, ATIVO, LOCAL, MARCA, CARACTERISTICAS, UNIDADE, VLRCOMERC"
      }
    }
  };

  if (criteriaExpression !== '') {
    dataSet.criteria = {
      "expression": {
        "$": criteriaExpression
      }
    };
  }

  const PRODUTOS_PAYLOAD = {
    "requestBody": {
      "dataSet": dataSet
    }
  };

  try {
    const respostaCompleta = await fazerRequisicaoAutenticada(
      URL_CONSULTA_SERVICO,
      'POST',
      PRODUTOS_PAYLOAD
    );

    // Verificar se a resposta tem a estrutura esperada
    if (!respostaCompleta?.responseBody?.entities) {
      console.log("⚠️ Resposta da API sem estrutura esperada:", JSON.stringify(respostaCompleta));
      
      return {
        produtos: [],
        total: 0,
        page,
        pageSize,
        totalPages: 0
      };
    }

    const entities = respostaCompleta.responseBody.entities;

    if (!entities || !entities.entity) {
      console.log("ℹ️ Nenhum produto encontrado");

      return {
        produtos: [],
        total: 0,
        page,
        pageSize,
        totalPages: 0
      };
    }

    let listaProdutosLimpa = mapearEntidades(entities);
    
    // Limitar ao pageSize solicitado (a API pode retornar mais)
    if (listaProdutosLimpa.length > pageSize) {
      listaProdutosLimpa = listaProdutosLimpa.slice(0, pageSize);
    }

    // Buscar estoque e preço de cada produto SEQUENCIALMENTE
    // A API Sankhya bloqueia QUALQUER requisição simultânea na mesma sessão HTTP
    const produtosComEstoque = [];
    
    // Processar cada produto um por vez para evitar completamente erro de concorrência
    for (let i = 0; i < listaProdutosLimpa.length; i++) {
      const produto = listaProdutosLimpa[i];
      
      try {
        // Buscar estoque
        const resultadoEstoque = await consultarEstoqueProduto(produto.CODPROD, '', true);
        
        // Pequeno delay entre estoque e preço (mínimo necessário)
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // Buscar preço
        const preco = await buscarPrecoProduto(produto.CODPROD, 0, true);
        
        produtosComEstoque.push({
          ...produto,
          ESTOQUE: String(resultadoEstoque.estoqueTotal || 0),
          VLRCOMERC: preco > 0 ? String(preco.toFixed(2)) : (produto.VLRCOMERC || '0')
        });
        
        // Pequeno delay entre produtos (mínimo necessário para evitar concorrência)
        await new Promise(resolve => setTimeout(resolve, 30));
        
      } catch (erro) {
        produtosComEstoque.push({
          ...produto,
          ESTOQUE: '0',
          VLRCOMERC: produto.VLRCOMERC || '0'
        });
      }
    }

    const resultado = {
      produtos: produtosComEstoque,
      total: entities.total ? parseInt(entities.total) : produtosComEstoque.length,
      page,
      pageSize,
      totalPages: entities.total ? Math.ceil(parseInt(entities.total) / pageSize) : 1
    };
    
    return resultado;

  } catch (erro) {
    throw erro;
  }
}

// Consultar Estoque de um Produto
export async function consultarEstoqueProduto(codProd: string, searchLocal: string = '', silent: boolean = false) {
  let criteriaExpression = `CODPROD = ${codProd}`;

  if (searchLocal.trim() !== '') {
    const local = searchLocal.trim();
    criteriaExpression += ` AND CODLOCAL LIKE '%${local}%'`;
  }

  const ESTOQUE_PAYLOAD = {
    "requestBody": {
      "dataSet": {
        "rootEntity": "Estoque",
        "includePresentationFields": "N",
        "offsetPage": "0",
        "entity": {
          "fieldset": {
            "list": "ESTOQUE, CODPROD, ATIVO, CONTROLE, CODLOCAL"
          }
        },
        "criteria": {
          "expression": {
            "$": criteriaExpression
          }
        }
      }
    }
  };

  try {
    const respostaCompleta = await fazerRequisicaoAutenticada(
      URL_CONSULTA_SERVICO,
      'POST',
      ESTOQUE_PAYLOAD
    );

    // Verificar se a resposta tem a estrutura esperada
    if (!respostaCompleta?.responseBody?.entities) {
      return {
        estoques: [],
        total: 0,
        estoqueTotal: 0
      };
    }

    const entities = respostaCompleta.responseBody.entities;

    if (!entities || !entities.entity) {
      return {
        estoques: [],
        total: 0,
        estoqueTotal: 0
      };
    }

    const listaEstoquesLimpa = mapearEntidades(entities);

    // Calcular estoque total
    const estoqueTotal = listaEstoquesLimpa.reduce((acc: number, estoque: any) => {
      const quantidade = parseFloat(estoque.ESTOQUE || '0');
      return acc + quantidade;
    }, 0);

    return {
      estoques: listaEstoquesLimpa,
      total: listaEstoquesLimpa.length,
      estoqueTotal: estoqueTotal
    };

  } catch (erro) {
    throw erro;
  }
}
