
"use client"

import { useState, useEffect, useRef } from "react"
import { Search, ChevronLeft, ChevronRight, Package } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { EstoqueModal } from "@/components/estoque-modal"
import { useToast } from "@/hooks/use-toast"

interface Produto {
  _id: string
  CODPROD: string
  DESCRPROD: string
  ATIVO: string
  LOCAL?: string
  MARCA?: string
  CARACTERISTICAS?: string
  UNIDADE?: string
  VLRCOMERC?: string
  ESTOQUE?: string
}

interface PaginatedResponse {
  produtos: Produto[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

const ITEMS_PER_PAGE = 20

export default function ProductsTable() {
  const [searchName, setSearchName] = useState("")
  const [searchCode, setSearchCode] = useState("")
  const [appliedSearchName, setAppliedSearchName] = useState("")
  const [appliedSearchCode, setAppliedSearchCode] = useState("")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Produto | null>(null)
  const [products, setProducts] = useState<Produto[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalRecords, setTotalRecords] = useState(0)
  const { toast } = useToast()
  const loadingRef = useRef(false)

  useEffect(() => {
    // Prevenir double-invocation do React Strict Mode
    if (loadingRef.current) {
      console.log('⏭️ Pulando requisição duplicada (Strict Mode)')
      return
    }
    
    loadingRef.current = true
    loadProducts().finally(() => {
      loadingRef.current = false
    })
  }, [currentPage, appliedSearchName, appliedSearchCode])

  const handleSearch = () => {
    setAppliedSearchName(searchName)
    setAppliedSearchCode(searchCode)
    setCurrentPage(1)
  }

  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1)
    }
  }

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, totalRecords)

  const loadProducts = async () => {
    console.log('📍 loadProducts chamado - início')
    try {
      setIsLoading(true)
      const timestamp = Date.now()
      const url = `/api/sankhya/produtos?page=${currentPage}&pageSize=${ITEMS_PER_PAGE}&searchName=${encodeURIComponent(appliedSearchName)}&searchCode=${encodeURIComponent(appliedSearchCode)}&_t=${timestamp}`
      console.log('🔄 Iniciando busca de produtos:', url)
      
      const controller = new AbortController()
      const timeoutId = setTimeout(() => {
        console.log('⏰ Timeout alcançado após 60s')
        controller.abort()
      }, 60000)
      
      console.log('📡 Fazendo fetch...')
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        }
      })
      console.log('📥 Fetch completado!')
      clearTimeout(timeoutId)

      console.log('✅ Resposta recebida:', response.status, response.statusText)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Erro HTTP:', response.status, errorText)
        throw new Error(`Falha ao carregar produtos: ${response.status}`)
      }

      const responseText = await response.text()
      console.log('📄 Resposta raw (primeiros 200 chars):', responseText.substring(0, 200))
      
      const data: PaginatedResponse = JSON.parse(responseText)
      console.log('📦 Produtos carregados:', data.produtos?.length || 0, 'Total:', data.total)
      
      setProducts(data.produtos)
      setTotalPages(data.totalPages)
      setTotalRecords(data.total)

      if (currentPage === 1) {
        toast({
          title: "Sucesso",
          description: `${data.total} produtos encontrados`,
        })
      }
    } catch (error) {
      console.error("❌ Erro ao carregar produtos:", error)
      toast({
        title: "Erro",
        description: error instanceof Error && error.name === 'AbortError' 
          ? "Tempo de carregamento excedido. Tente novamente."
          : "Falha ao carregar produtos",
        variant: "destructive",
      })
      setProducts([])
    } finally {
      setIsLoading(false)
      console.log('✅ Carregamento finalizado')
    }
  }

  const handleViewStock = (product: Produto) => {
    setSelectedProduct(product)
    setIsModalOpen(true)
  }

  const formatCurrency = (value: string | undefined) => {
    if (!value) return 'R$ 0,00'
    const numValue = parseFloat(value)
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(numValue)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Produtos</h1>
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar por código do produto"
            value={searchCode}
            onChange={(e) => setSearchCode(e.target.value)}
            onKeyPress={handleSearchKeyPress}
            className="pl-10 bg-card"
          />
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar por descrição do produto"
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            onKeyPress={handleSearchKeyPress}
            className="pl-10 bg-card"
          />
        </div>
        <Button
          onClick={handleSearch}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium uppercase"
        >
          Buscar
        </Button>
        {(appliedSearchName || appliedSearchCode) && (
          <Button
            onClick={() => {
              setSearchName("")
              setSearchCode("")
              setAppliedSearchName("")
              setAppliedSearchCode("")
              setCurrentPage(1)
            }}
            variant="outline"
            className="font-medium uppercase"
          >
            Limpar
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="bg-card rounded-lg shadow overflow-hidden">
        <div className="overflow-y-auto max-h-[600px] scrollbar-hide">
          <table className="w-full">
            <thead className="sticky top-0 z-10" style={{ backgroundColor: 'rgb(35, 55, 79)' }}>
              <tr>
                <th className="px-3 md:px-6 py-4 text-left text-xs md:text-sm font-semibold text-white uppercase tracking-wider">
                  Código
                </th>
                <th className="px-3 md:px-6 py-4 text-left text-xs md:text-sm font-semibold text-white uppercase tracking-wider">
                  Descrição
                </th>
                <th className="px-3 md:px-6 py-4 text-left text-xs md:text-sm font-semibold text-white uppercase tracking-wider hidden lg:table-cell">
                  Marca
                </th>
                <th className="px-3 md:px-6 py-4 text-left text-xs md:text-sm font-semibold text-white uppercase tracking-wider hidden xl:table-cell">
                  Unidade
                </th>
                <th className="px-3 md:px-6 py-4 text-left text-xs md:text-sm font-semibold text-white uppercase tracking-wider hidden lg:table-cell">
                  Valor
                </th>
                <th className="px-3 md:px-6 py-4 text-left text-xs md:text-sm font-semibold text-white uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-3 md:px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                      <p className="text-sm font-medium text-muted-foreground">Carregando produtos e valores...</p>
                      <p className="text-xs text-muted-foreground">Por favor, aguarde</p>
                    </div>
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 md:px-6 py-4 text-center text-sm text-muted-foreground">
                    Nenhum produto encontrado
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr key={product._id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-3 md:px-6 py-4 text-xs md:text-sm text-foreground">{product.CODPROD}</td>
                    <td className="px-3 md:px-6 py-4 text-xs md:text-sm text-foreground">{product.DESCRPROD}</td>
                    <td className="px-3 md:px-6 py-4 text-xs md:text-sm text-foreground hidden lg:table-cell">{product.MARCA || '-'}</td>
                    <td className="px-3 md:px-6 py-4 text-xs md:text-sm text-foreground hidden xl:table-cell">{product.UNIDADE || '-'}</td>
                    <td className="px-3 md:px-6 py-4 text-xs md:text-sm text-foreground hidden lg:table-cell">{formatCurrency(product.VLRCOMERC)}</td>
                    <td className="px-3 md:px-6 py-4">
                      <div className="flex gap-1 md:gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleViewStock(product)}
                          className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium uppercase text-[10px] md:text-xs flex items-center gap-1 px-2 md:px-3"
                        >
                          <Package className="w-3 h-3" />
                          <span className="hidden sm:inline">Ver Estoque</span>
                          <span className="sm:hidden">Estoque</span>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {!isLoading && products.length > 0 && (
        <div className="flex items-center justify-between bg-card rounded-lg shadow px-6 py-4">
          <div className="text-sm text-muted-foreground">
            Mostrando {startIndex + 1} a {endIndex} de {totalRecords} produtos
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePreviousPage}
              disabled={currentPage === 1}
              className="flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              Anterior
            </Button>
            <div className="text-sm text-muted-foreground">
              Página {currentPage} de {totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              className="flex items-center gap-1"
            >
              Próxima
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      <EstoqueModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        product={selectedProduct}
      />
    </div>
  )
}
