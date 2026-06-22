'use client'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from './button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card'
import { Badge } from './badge'
import { Database, Settings, AlertTriangle } from 'lucide-react'
import { useState } from 'react'

export function SetupNotice() {
  const [dismissed, setDismissed] = useState(false)
  const hasDatabaseUrl = !!process.env.DATABASE_URL

  if (hasDatabaseUrl || dismissed) {
    return null
  }

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md">
      <Card className="border-yellow-500/20 bg-yellow-500/5">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-yellow-500" />
              <CardTitle className="text-lg">Configuração necessária</CardTitle>
            </div>
            <Badge variant="outline" className="border-yellow-500/30 text-yellow-600">
              Banco de dados
            </Badge>
          </div>
          <CardDescription>
            Defina a conexão real com o banco para habilitar login e área administrativa.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3">
          <Alert className="mb-6 border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <AlertTitle className="text-amber-800 dark:text-amber-200">DATABASE_URL ausente</AlertTitle>
            <AlertDescription className="text-amber-700 dark:text-amber-300">
              <p>
                <Database className="inline h-4 w-4 mr-1" />
                Configure <code>DATABASE_URL</code> no ambiente para conectar o FisioHub ao Neon/PostgreSQL.
              </p>
            </AlertDescription>
          </Alert>

          <Button size="sm" variant="outline" onClick={() => setDismissed(true)}>
            Entendi
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
