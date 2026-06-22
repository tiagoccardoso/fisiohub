import { Heart } from 'lucide-react'

export function Loading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <div className="animate-pulse">
          <Heart className="h-12 w-12 text-medical-500 mx-auto" />
        </div>
        <h2 className="font-display text-xl font-semibold text-primary">FisioSys</h2>
        <p className="text-muted-foreground">Carregando sistema...</p>
        <div className="mx-auto h-1 w-8 animate-pulse rounded-full bg-primary"></div>
      </div>
    </div>
  )
}
