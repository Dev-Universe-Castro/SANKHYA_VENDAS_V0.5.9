
import DashboardLayout from "@/components/dashboard-layout"
import TitulosReceberTable from "@/components/titulos-receber-table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function FinanceiroPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-full overflow-hidden">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Financeiro</h1>
          <p className="text-muted-foreground">
            Consulta e gerenciamento de títulos a receber
          </p>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Títulos a Receber</CardTitle>
            <CardDescription>
              Acompanhe os títulos em aberto, vencidos e pagos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TitulosReceberTable />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
