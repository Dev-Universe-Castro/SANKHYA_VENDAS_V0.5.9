"use client"

import { useState, useEffect } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Download, Search } from "lucide-react"
import { format } from "date-fns"
import { toast } from "sonner"

interface Titulo {
  nroTitulo: string
  parceiro: string
  codParceiro: string
  valor: number
  dataVencimento: string
  dataNegociacao: string
  status: "Aberto" | "Vencido" | "Baixado"
  tipoFinanceiro: "Real" | "Provisão"
  tipoTitulo: string
  contaBancaria?: string
  historico?: string
  numeroParcela: number
  origemFinanceiro: string
  codigoEmpresa: number
  codigoNatureza: number
  boleto: {
    codigoBarras: string | null
    nossoNumero: string | null
    linhaDigitavel: string | null
    numeroRemessa: string | null
  }
}

interface Pagination {
  page: string
  offset: string
  total: string
  hasMore: string
}

interface Partner {
  CODPARC: string
  NOMEPARC: string
  CGC_CPF: string
}

export default function TitulosReceberTable() {
  const [titulos, setTitulos] = useState<Titulo[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedTitulo, setSelectedTitulo] = useState<Titulo | null>(null)
  const [showDetalhes, setShowDetalhes] = useState(false)
  const [pagination, setPagination] = useState<Pagination>({
    page: "1",
    offset: "0",
    total: "0",
    hasMore: "false"
  })
  const [currentPage, setCurrentPage] = useState(1)
  
  // Filtros obrigatórios
  const [parceiros, setParceiros] = useState<Partner[]>([])
  const [parceiroSelecionado, setParceiroSelecionado] = useState<string>("")
  const [tipoMovimento, setTipoMovimento] = useState<string>("")
  const [partnerSearch, setPartnerSearch] = useState("")
  const [isLoadingPartners, setIsLoadingPartners] = useState(false)

  const carregarTitulos = async () => {
    // Validar filtros obrigatórios
    if (!parceiroSelecionado) {
      toast.error('Selecione um parceiro antes de buscar os títulos')
      return
    }
    
    if (!tipoMovimento) {
      toast.error('Selecione o tipo de movimento antes de buscar os títulos')
      return
    }

    setLoading(true)
    try {
      const params = new URLSearchParams({
        pagina: currentPage.toString(),
        codigoEmpresa: '1',
        codigoParceiro: parceiroSelecionado,
        statusFinanceiro: '3',
        tipoFinanceiro: tipoMovimento // 1 = Real, 2 = Provisão, 3 = Todos
      })

      const response = await fetch(`/api/sankhya/titulos-receber?${params.toString()}`)

      if (!response.ok) throw new Error('Erro ao carregar títulos')

      const data = await response.json()
      
      // Ordenar títulos por nroTitulo em ordem decrescente
      const titulosOrdenados = (data.titulos || []).sort((a: Titulo, b: Titulo) => {
        return parseInt(b.nroTitulo) - parseInt(a.nroTitulo)
      })
      
      setTitulos(titulosOrdenados)
      setPagination(data.pagination || {
        page: "1",
        offset: "0",
        total: "0",
        hasMore: "false"
      })
      
      toast.success(`${titulosOrdenados.length} título(s) encontrado(s)`)
    } catch (error) {
      console.error('Erro ao carregar títulos:', error)
      toast.error('Erro ao carregar títulos a receber')
      setTitulos([])
    } finally {
      setLoading(false)
    }
  }

  const loadPartners = async (searchTerm: string = '') => {
    setIsLoadingPartners(true)
    try {
      const searchParam = searchTerm 
        ? `searchName=${encodeURIComponent(searchTerm)}`
        : ''

      const url = `/api/sankhya/parceiros?page=1&pageSize=50${searchParam ? '&' + searchParam : ''}`
      const response = await fetch(url)
      if (!response.ok) throw new Error('Falha ao carregar parceiros')
      const data = await response.json()
      setParceiros(data.parceiros || [])
    } catch (error: any) {
      console.error('❌ Erro ao carregar parceiros:', error)
      setParceiros([])
    } finally {
      setIsLoadingPartners(false)
    }
  }

  const handlePartnerSearch = (value: string) => {
    setPartnerSearch(value)
    if (value.length >= 2) {
      loadPartners(value)
    } else if (value.length === 0) {
      loadPartners()
    }
  }

  useEffect(() => {
    // Não carregar títulos automaticamente
    setTitulos([])
  }, [currentPage])

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", className: string }> = {
      Aberto: { variant: "outline", className: "bg-yellow-50 text-yellow-700 border-yellow-300" },
      Vencido: { variant: "destructive", className: "" },
      Baixado: { variant: "default", className: "bg-green-50 text-green-700 border-green-300" }
    }
    return variants[status] || variants.Aberto
  }

  const baixarBoleto = async (titulo: Titulo) => {
    if (titulo.tipoTitulo !== "Boleto") {
      toast.error("Este título não é um boleto")
      return
    }

    if (titulo.status === "Baixado") {
      toast.error("Este título já foi baixado")
      return
    }

    try {
      toast.info("Preparando download do boleto...")
      const response = await fetch(`/api/sankhya/boleto/${titulo.nroTitulo}`)

      if (!response.ok) throw new Error('Erro ao baixar boleto')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `boleto_${titulo.nroTitulo}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success("Boleto baixado com sucesso!")
    } catch (error) {
      console.error('Erro ao baixar boleto:', error)
      toast.error('Erro ao baixar boleto. Tente novamente.')
    }
  }

  const abrirDetalhes = (titulo: Titulo) => {
    setSelectedTitulo(titulo)
    setShowDetalhes(true)
  }

  return (
    <div className="space-y-4">
      {/* Filtros Obrigatórios */}
      <div className="bg-white border rounded-lg p-4 space-y-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Filtros (Obrigatórios)</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Parceiro */}
          <div className="space-y-2">
            <Label htmlFor="parceiro" className="text-sm font-medium">Parceiro *</Label>
            <Select
              value={parceiroSelecionado}
              onValueChange={(value) => {
                setParceiroSelecionado(value)
                const parceiro = parceiros.find(p => p.CODPARC === value)
                if (parceiro) {
                  setPartnerSearch(parceiro.NOMEPARC)
                }
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione um parceiro" />
              </SelectTrigger>
              <SelectContent>
                <div className="p-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar parceiro..."
                      value={partnerSearch}
                      onChange={(e) => handlePartnerSearch(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
                {isLoadingPartners ? (
                  <SelectItem value="loading" disabled>Carregando...</SelectItem>
                ) : parceiros.length === 0 ? (
                  <SelectItem value="empty" disabled>
                    {partnerSearch ? "Nenhum parceiro encontrado" : "Digite para buscar"}
                  </SelectItem>
                ) : (
                  parceiros.map((partner) => (
                    <SelectItem key={partner.CODPARC} value={partner.CODPARC}>
                      <div className="truncate max-w-[300px]">
                        {partner.NOMEPARC} - {partner.CGC_CPF}
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Tipo de Movimento */}
          <div className="space-y-2">
            <Label htmlFor="tipoMovimento" className="text-sm font-medium">Tipo de Movimento *</Label>
            <Select
              value={tipoMovimento}
              onValueChange={setTipoMovimento}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Real</SelectItem>
                <SelectItem value="2">Provisão</SelectItem>
                <SelectItem value="3">Todos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Botão de Buscar */}
          <div className="space-y-2">
            <Label className="text-sm font-medium opacity-0">Ação</Label>
            <Button 
              onClick={carregarTitulos}
              disabled={!parceiroSelecionado || !tipoMovimento || loading}
              className="w-full"
            >
              <Search className="w-4 h-4 mr-2" />
              {loading ? 'Buscando...' : 'Buscar Títulos'}
            </Button>
          </div>
        </div>
      </div>

      {/* Tabela */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead>Nro Título</TableHead>
              <TableHead>Parceiro</TableHead>
              <TableHead className="text-right">Valor (R$)</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-center">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  Carregando títulos...
                </TableCell>
              </TableRow>
            ) : titulos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                  {!parceiroSelecionado || !tipoMovimento 
                    ? "Selecione um parceiro e tipo de movimento para buscar os títulos" 
                    : "Nenhum título encontrado para os filtros selecionados"}
                </TableCell>
              </TableRow>
            ) : (
              titulos.map((titulo) => (
                <TableRow 
                  key={titulo.nroTitulo}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => abrirDetalhes(titulo)}
                >
                  <TableCell className="font-medium">{titulo.nroTitulo}</TableCell>
                  <TableCell>{titulo.parceiro}</TableCell>
                  <TableCell className="text-right font-semibold">
                    {titulo.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </TableCell>
                  <TableCell>
                    {format(new Date(titulo.dataVencimento), "dd/MM/yyyy")}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      className={
                        titulo.tipoFinanceiro === "Provisão" 
                          ? "bg-purple-50 text-purple-700 border-purple-300" 
                          : "bg-blue-50 text-blue-700 border-blue-300"
                      }
                    >
                      {titulo.tipoFinanceiro}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadge(titulo.status).variant} className={getStatusBadge(titulo.status).className}>
                      {titulo.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {titulo.tipoTitulo === "Boleto" && titulo.status !== "Baixado" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          baixarBoleto(titulo)
                        }}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      >
                        <Download className="w-4 h-4 mr-1" />
                        Boleto
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Paginação */}
      {pagination && parseInt(pagination.total) > 0 && (
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t rounded-b-lg">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>Total de registros: <strong>{pagination.total}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Anterior
            </Button>
            <span className="text-sm text-gray-600">
              Página {currentPage}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={pagination.hasMore === "false"}
            >
              Próxima
            </Button>
          </div>
        </div>
      )}

      {/* Modal de Detalhes */}
      <Dialog open={showDetalhes} onOpenChange={setShowDetalhes}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Detalhes do Título</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Informações completas sobre o título selecionado
            </DialogDescription>
          </DialogHeader>

          {selectedTitulo && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Número do Título</label>
                  <p className="text-base font-semibold">{selectedTitulo.nroTitulo}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</label>
                  <div className="mt-1">
                    <Badge variant={getStatusBadge(selectedTitulo.status).variant} className={getStatusBadge(selectedTitulo.status).className}>
                      {selectedTitulo.status}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tipo Financeiro</label>
                <div className="mt-1">
                  <Badge variant="outline" className={selectedTitulo.tipoFinanceiro === "Real" ? "bg-blue-50 text-blue-700 border-blue-300" : "bg-purple-50 text-purple-700 border-purple-300"}>
                    {selectedTitulo.tipoFinanceiro}
                  </Badge>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Parceiro</label>
                <p className="text-base font-semibold">{selectedTitulo.parceiro}</p>
                <p className="text-sm text-muted-foreground">Cód: {selectedTitulo.codParceiro}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Valor</label>
                  <p className="text-2xl font-bold text-primary">
                    {selectedTitulo.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Data de Vencimento</label>
                  <p className="text-base font-semibold">
                    {format(new Date(selectedTitulo.dataVencimento), "dd/MM/yyyy")}
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tipo de Título</label>
                <p className="text-base font-semibold">{selectedTitulo.tipoTitulo}</p>
              </div>

              {selectedTitulo.contaBancaria && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Conta Bancária</label>
                  <p className="text-base font-medium">{selectedTitulo.contaBancaria}</p>
                </div>
              )}

              {selectedTitulo.historico && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Histórico</label>
                  <p className="text-base font-medium">{selectedTitulo.historico}</p>
                </div>
              )}

              {selectedTitulo.boleto.nossoNumero && (
                <div className="space-y-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="text-sm font-semibold text-blue-900">Informações do Boleto</h4>

                  {selectedTitulo.boleto.nossoNumero && (
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-blue-700 uppercase tracking-wide">Nosso Número</label>
                      <p className="text-sm font-mono">{selectedTitulo.boleto.nossoNumero}</p>
                    </div>
                  )}

                  {selectedTitulo.boleto.linhaDigitavel && (
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-blue-700 uppercase tracking-wide">Linha Digitável</label>
                      <p className="text-sm font-mono break-all">{selectedTitulo.boleto.linhaDigitavel}</p>
                    </div>
                  )}

                  {selectedTitulo.boleto.codigoBarras && (
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-blue-700 uppercase tracking-wide">Código de Barras</label>
                      <p className="text-sm font-mono break-all">{selectedTitulo.boleto.codigoBarras}</p>
                    </div>
                  )}
                </div>
              )}

              {selectedTitulo.tipoTitulo === "Boleto" && selectedTitulo.status !== "Baixado" && (
                <Button 
                  onClick={() => baixarBoleto(selectedTitulo)} 
                  className="w-full"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Baixar Boleto
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}