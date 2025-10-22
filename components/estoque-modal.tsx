
"use client"

import { useState, useEffect } from "react"
import { X, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"

interface Estoque {
  ESTOQUE: string
  CODPROD: string
  ATIVO: string
  CONTROLE: string
  CODLOCAL: string
  _id: string
}

interface EstoqueModalProps {
  isOpen: boolean
  onClose: () => void
  product: {
    _id: string
    CODPROD: string
    DESCRPROD: string
    ATIVO: string
    LOCAL?: string
    MARCA?: string
    CARACTERISTICAS?: string
    UNIDADE?: string
    VLRCOMERC?: string
  } | null
}

export function EstoqueModal({ isOpen, onClose, product }: EstoqueModalProps) {
  const [estoques, setEstoques] = useState<Estoque[]>([])
  const [estoqueTotal, setEstoqueTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [searchLocal, setSearchLocal] = useState("")
  const [appliedSearchLocal, setAppliedSearchLocal] = useState("")
  const { toast } = useToast()

  useEffect(() => {
    if (isOpen && product) {
      loadEstoque()
    }
  }, [isOpen, product, appliedSearchLocal])

  const loadEstoque = async () => {
    if (!product) return

    try {
      setIsLoading(true)
      const url = `/api/sankhya/produtos/estoque?codProd=${product.CODPROD}&searchLocal=${encodeURIComponent(appliedSearchLocal)}`
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error('Falha ao carregar estoque')
      }

      const data = await response.json()
      setEstoques(data.estoques)
      setEstoqueTotal(data.estoqueTotal)

      toast({
        title: "Sucesso",
        description: `${data.total} locais de estoque encontrados`,
      })
    } catch (error) {
      console.error("Erro ao carregar estoque:", error)
      toast({
        title: "Erro",
        description: "Falha ao carregar estoque",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = () => {
    setAppliedSearchLocal(searchLocal)
  }

  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const formatQuantity = (value: string) => {
    const numValue = parseFloat(value || '0')
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(numValue)
  }

  if (!isOpen || !product) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-[110] flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 p-6 bg-card rounded-lg shadow-lg border">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-medium text-foreground">Carregando estoque...</p>
          </div>
        </div>
      )}

      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={!isLoading ? onClose : undefined} />

      {/* Modal */}
      <div className="relative bg-card rounded-lg shadow-xl w-full max-w-4xl mx-2 md:mx-4 p-3 md:p-6 space-y-4 md:space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg md:text-xl font-bold text-foreground">Estoque do Produto</h2>
            <p className="text-xs md:text-sm text-muted-foreground mt-1 truncate">
              {product.CODPROD} - {product.DESCRPROD}
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Informações do Produto */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 p-3 md:p-4 bg-muted/50 rounded-lg">
          <div>
            <p className="text-[10px] md:text-xs text-muted-foreground">Marca</p>
            <p className="text-xs md:text-sm font-medium text-foreground truncate">{product.MARCA || '-'}</p>
          </div>
          <div>
            <p className="text-[10px] md:text-xs text-muted-foreground">Unidade</p>
            <p className="text-xs md:text-sm font-medium text-foreground">{product.UNIDADE || '-'}</p>
          </div>
          <div>
            <p className="text-[10px] md:text-xs text-muted-foreground">Ativo</p>
            <p className="text-xs md:text-sm font-medium text-foreground">{product.ATIVO === 'S' ? 'Sim' : 'Não'}</p>
          </div>
          <div>
            <p className="text-[10px] md:text-xs text-muted-foreground">Estoque Total</p>
            <p className="text-xs md:text-sm font-bold text-primary">{formatQuantity(estoqueTotal.toString())}</p>
          </div>
        </div>

        {/* Search */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar por local de estoque"
              value={searchLocal}
              onChange={(e) => setSearchLocal(e.target.value)}
              onKeyPress={handleSearchKeyPress}
              className="pl-10 bg-background text-sm h-9"
            />
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleSearch}
              className="flex-1 sm:flex-initial bg-primary hover:bg-primary/90 text-primary-foreground font-medium uppercase text-xs h-9"
            >
              Buscar
            </Button>
            {appliedSearchLocal && (
              <Button
                onClick={() => {
                  setSearchLocal("")
                  setAppliedSearchLocal("")
                }}
                variant="outline"
                className="flex-1 sm:flex-initial font-medium uppercase text-xs h-9"
              >
                Limpar
              </Button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="bg-background rounded-lg border overflow-hidden">
          <div className="max-h-[400px] overflow-y-auto scrollbar-hide">
            <table className="w-full">
              <thead className="sticky top-0 z-10" style={{ backgroundColor: 'rgb(35, 55, 79)' }}>
                <tr>
                  <th className="px-3 md:px-6 py-3 text-left text-xs md:text-sm font-semibold text-white uppercase tracking-wider">
                    Local
                  </th>
                  <th className="px-3 md:px-6 py-3 text-left text-xs md:text-sm font-semibold text-white uppercase tracking-wider hidden sm:table-cell">
                    Controle
                  </th>
                  <th className="px-3 md:px-6 py-3 text-left text-xs md:text-sm font-semibold text-white uppercase tracking-wider hidden lg:table-cell">
                    Ativo
                  </th>
                  <th className="px-3 md:px-6 py-3 text-right text-xs md:text-sm font-semibold text-white uppercase tracking-wider">
                    Quantidade
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {estoques.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 md:px-6 py-4 text-center text-sm text-muted-foreground">
                      Nenhum estoque encontrado
                    </td>
                  </tr>
                ) : (
                  estoques.map((estoque) => (
                    <tr key={estoque._id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-3 md:px-6 py-3 text-xs md:text-sm text-foreground">{estoque.CODLOCAL}</td>
                      <td className="px-3 md:px-6 py-3 text-xs md:text-sm text-foreground hidden sm:table-cell">{estoque.CONTROLE || '-'}</td>
                      <td className="px-3 md:px-6 py-3 text-xs md:text-sm text-foreground hidden lg:table-cell">
                        {estoque.ATIVO === 'S' ? 'Sim' : 'Não'}
                      </td>
                      <td className="px-3 md:px-6 py-3 text-xs md:text-sm text-right font-medium text-foreground">
                        {formatQuantity(estoque.ESTOQUE)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {estoques.length > 0 && (
                <tfoot style={{ backgroundColor: 'rgb(35, 55, 79)' }}>
                  <tr>
                    <td colSpan={3} className="px-3 md:px-6 py-3 text-xs md:text-sm font-semibold text-white text-right">
                      TOTAL:
                    </td>
                    <td className="px-3 md:px-6 py-3 text-xs md:text-sm font-bold text-primary text-right">
                      {formatQuantity(estoqueTotal.toString())}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end pt-3 md:pt-4 border-t">
          <Button
            onClick={onClose}
            variant="outline"
            className="bg-transparent text-sm h-9 w-full sm:w-auto"
          >
            Fechar
          </Button>
        </div>
      </div>
    </div>
  )
}
