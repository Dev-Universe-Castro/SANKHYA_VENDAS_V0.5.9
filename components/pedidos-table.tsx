'use client'

import { useState, useEffect } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Search, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { authService } from '@/lib/auth-service'

interface Pedido {
  NUNOTA: string
  CODPARC: string
  NOMEPARC: string
  CODVEND: string
  NOMEVEND: string
  VLRNOTA: number
  DTNEG: string
}

export default function PedidosTable() {
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [parceiroSearch, setParceiroSearch] = useState(''); // Estado para o campo de busca de parceiro

  useEffect(() => {
    carregarPedidos()
  }, [])

  const carregarPedidos = async (filtroDataInicio?: string, filtroDataFim?: string) => {
    try {
      setLoading(true);
      const user = authService.getCurrentUser();

      if (!user) {
        console.error('❌ Usuário não autenticado no fetchPedidos');
        toast.error("Usuário não autenticado. Faça login novamente.");
        return;
      }

      console.log('🔍 Buscando pedidos para usuário:', { id: user.id, name: user.name });

      const params = new URLSearchParams({
        userId: user.id.toString(),
      });

      if (filtroDataInicio) {
        params.append('dataInicio', filtroDataInicio);
      }

      if (filtroDataFim) {
        params.append('dataFim', filtroDataFim);
      }

      const response = await fetch(`/api/sankhya/pedidos/listar?${params.toString()}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao buscar pedidos');
      }

      const data = await response.json();
      console.log('✅ Pedidos carregados:', data.length);
      setPedidos(data);
    } catch (error: any) {
      console.error('❌ Erro ao buscar pedidos:', error);
      toast.error(error.message || "Erro ao carregar pedidos");
    } finally {
      setLoading(false);
    }
  };

  const handleBuscar = () => {
    carregarPedidos(dataInicio, dataFim)
  }

  const formatarData = (data: string) => {
    if (!data) return 'N/A'
    // Se vier no formato DD/MM/YYYY, retorna como está
    if (data.includes('/')) return data
    // Se vier no formato YYYY-MM-DD, converte
    const [ano, mes, dia] = data.split('-')
    return `${dia}/${mes}/${ano}`
  }

  const formatarValor = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor)
  }

  const pedidosFiltrados = pedidos.filter(pedido => {
    const termo = searchTerm.toLowerCase()
    return (
      pedido.NUNOTA?.toLowerCase().includes(termo) ||
      pedido.NOMEPARC?.toLowerCase().includes(termo) ||
      pedido.NOMEVEND?.toLowerCase().includes(termo) ||
      pedido.CODPARC?.toLowerCase().includes(termo) ||
      pedido.CODVEND?.toLowerCase().includes(termo)
    )
  })

  return (
    <div className="space-y-6">
      <Card className="border-green-200 shadow-sm">
        <CardHeader className="bg-gradient-to-r from-green-50 to-green-100 border-b border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-green-800 flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Pedidos de Venda
              </CardTitle>
              <CardDescription className="text-green-700">
                Lista de pedidos registrados no sistema
              </CardDescription>
            </div>
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              {pedidosFiltrados.length} pedido(s)
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div className="mb-4 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar por número, parceiro ou vendedor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-gray-300 focus:border-green-500 focus:ring-green-500"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
              <div className="flex-1">
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  Data de Negociação - Início
                </label>
                <Input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  className="border-gray-300 focus:border-green-500 focus:ring-green-500"
                />
              </div>

              <div className="flex-1">
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  Data de Negociação - Fim
                </label>
                <Input
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                  className="border-gray-300 focus:border-green-500 focus:ring-green-500"
                />
              </div>

              <Button
                onClick={handleBuscar}
                className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto"
              >
                <Search className="h-4 w-4 mr-2" />
                Buscar
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-green-500 border-t-transparent"></div>
              <p className="mt-4 text-gray-600">Carregando pedidos...</p>
            </div>
          ) : pedidosFiltrados.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-4 text-gray-600">
                {searchTerm ? 'Nenhum pedido encontrado com os critérios de busca' : 'Nenhum pedido registrado'}
              </p>
            </div>
          ) : (
            <div className="w-full overflow-x-auto scrollbar-hide -mx-4 sm:-mx-6">
              <div className="inline-block min-w-full align-middle">
                <div className="border rounded-lg overflow-hidden mx-4 sm:mx-6">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-green-50">
                        <TableHead className="font-semibold text-green-800 whitespace-nowrap">NUNOTA</TableHead>
                        <TableHead className="font-semibold text-green-800 whitespace-nowrap min-w-[200px]">Parceiro</TableHead>
                        <TableHead className="font-semibold text-green-800 whitespace-nowrap min-w-[180px]">Vendedor</TableHead>
                        <TableHead className="font-semibold text-green-800 whitespace-nowrap">Data Negociação</TableHead>
                        <TableHead className="font-semibold text-green-800 text-right whitespace-nowrap">Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pedidosFiltrados.map((pedido) => (
                        <TableRow key={pedido.NUNOTA} className="hover:bg-green-50/50">
                          <TableCell className="font-medium whitespace-nowrap">
                            <Badge variant="outline" className="border-green-300 text-green-700">
                              {pedido.NUNOTA}
                            </Badge>
                          </TableCell>
                          <TableCell className="min-w-[200px]">
                            <div>
                              <div className="font-medium text-gray-900 whitespace-nowrap">{pedido.NOMEPARC}</div>
                              <div className="text-xs text-gray-500 whitespace-nowrap">Cód: {pedido.CODPARC}</div>
                            </div>
                          </TableCell>
                          <TableCell className="min-w-[180px]">
                            <div>
                              <div className="font-medium text-gray-900 whitespace-nowrap">{pedido.NOMEVEND}</div>
                              <div className="text-xs text-gray-500 whitespace-nowrap">Cód: {pedido.CODVEND}</div>
                            </div>
                          </TableCell>
                          <TableCell className="text-gray-700 whitespace-nowrap">
                            {formatarData(pedido.DTNEG)}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-green-700 whitespace-nowrap">
                            {formatarValor(pedido.VLRNOTA)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}