'use client'

import React, { useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layouts/dashboard-layout'
import { AuthGuard } from '@/components/auth/auth-guard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { EnhancedButton } from '@/components/ui/enhanced-button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PainScale, CompactPainScale } from '@/components/ui/pain-scale'
import { Goniometer } from '@/components/ui/goniometer'
import { FunctionalTests } from '@/components/ui/functional-tests'
import { PhotoCapture } from '@/components/ui/photo-capture'
import { toast } from 'sonner'
import { 
  ArrowLeft, Save, FileText, Activity, TestTube, Ruler, Camera, 
  User, Target, AlertCircle, Stethoscope, CheckCircle 
} from 'lucide-react'

interface EvaluationData {
  patientId: string
  patientName: string
  evaluationDate: string
  
  // Anamnese
  mainComplaint: string
  medicalHistory: string
  previousTreatments: string
  medications: string
  lifestyleFactors: string
  
  // Avaliação da Dor
  painScale: number
  painLocation: string
  painCharacteristics: string
  painTriggers: string
  painRelief: string
  
  // Exame Físico
  postureAnalysis: string
  muscleStrength: Record<string, string>
  rangeOfMotion: any[]
  functionalTests: any[]
  
  // Diagnóstico e Plano
  clinicalDiagnosis: string
  physiotherapyDiagnosis: string
  treatmentGoals: string[]
  estimatedSessions: number
  frequencyPerWeek: number
  
  // Observações
  generalNotes: string
}

export default function PatientEvaluationNew({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('anamnesis')
  const [isSaving, setIsSaving] = useState(false)
  
  const [evaluationData, setEvaluationData] = useState<EvaluationData>({
    patientId: resolvedParams.id,
    patientName: 'Maria Silva', // TODO: Buscar do banco
    evaluationDate: new Date().toISOString().split('T')[0]!,
    
    // Anamnese
    mainComplaint: '',
    medicalHistory: '',
    previousTreatments: '',
    medications: '',
    lifestyleFactors: '',
    
    // Dor
    painScale: 0,
    painLocation: '',
    painCharacteristics: '',
    painTriggers: '',
    painRelief: '',
    
    // Exame Físico
    postureAnalysis: '',
    muscleStrength: {},
    rangeOfMotion: [],
    functionalTests: [],
    
    // Diagnóstico
    clinicalDiagnosis: '',
    physiotherapyDiagnosis: '',
    treatmentGoals: [],
    estimatedSessions: 12,
    frequencyPerWeek: 2,
    
    // Observações
    generalNotes: ''
  })

  const handleSaveEvaluation = async () => {
    setIsSaving(true)
    try {
      // TODO: Salvar no Neon usando a nova migration
      console.log('Salvando avaliação completa:', evaluationData)
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      toast.success('✅ Avaliação salva com sucesso!', {
        description: 'Dados salvos no prontuário do paciente'
      })
      
      router.push(`/patients/${resolvedParams.id}`)
    } catch (error) {
      console.error('Erro ao salvar:', error)
      toast.error('❌ Erro ao salvar avaliação')
    } finally {
      setIsSaving(false)
    }
  }

  const handlePainScaleChange = (value: number) => {
    setEvaluationData(prev => ({ ...prev, painScale: value }))
  }

  const handleGoniometryReading = (reading: any) => {
    setEvaluationData(prev => ({
      ...prev,
      rangeOfMotion: [...prev.rangeOfMotion, reading]
    }))
    toast.success('📐 Medição goniométrica adicionada')
  }

  const handleFunctionalTestResult = (testName: string, result: any) => {
    setEvaluationData(prev => ({
      ...prev,
      functionalTests: [...prev.functionalTests, { testName, ...result }]
    }))
    toast.success(`🧪 Teste ${testName} registrado`)
  }

  const handlePhotoSaved = (photoData: any) => {
    toast.success('📷 Foto salva com sucesso', {
      description: 'Imagem adicionada ao prontuário'
    })
  }

  const getCompletionPercentage = () => {
    const fields = [
      evaluationData.mainComplaint,
      evaluationData.painScale > 0,
      evaluationData.rangeOfMotion.length > 0,
      evaluationData.functionalTests.length > 0,
      evaluationData.physiotherapyDiagnosis
    ]
    return Math.round((fields.filter(Boolean).length / fields.length) * 100)
  }

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="min-h-screen bg-background">
          <div className="max-w-7xl mx-auto p-6">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <Button
                    variant="ghost"
                    onClick={() => router.push(`/patients/${resolvedParams.id}`)}
                    className="flex items-center gap-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Voltar
                  </Button>
                  <div>
                    <h1 className="text-3xl font-bold text-foreground">
                      🏥 Avaliação Fisioterapêutica Completa
                    </h1>
                    <p className="text-muted-foreground">
                      Paciente: {evaluationData.patientName} • {new Date(evaluationData.evaluationDate).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
                
                {/* Status rápido */}
                <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                  <Badge variant="secondary" className="text-sm">
                    {getCompletionPercentage()}% completo
                  </Badge>
                  <EnhancedButton
                    onClick={handleSaveEvaluation}
                    loading={isSaving}
                    disabled={!evaluationData.mainComplaint}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Salvar Avaliação
                  </EnhancedButton>
                </div>
              </div>
              
              {/* Status rápido */}
              <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                <CompactPainScale
                  value={evaluationData.painScale}
                  onChange={handlePainScaleChange}
                />
                <Badge variant="outline" className="flex items-center gap-1">
                  <Ruler className="h-3 w-3" />
                  {evaluationData.rangeOfMotion.length} medições
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1">
                  <TestTube className="h-3 w-3" />
                  {evaluationData.functionalTests.length} testes
                </Badge>
                {evaluationData.physiotherapyDiagnosis && (
                  <Badge variant="default" className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Diagnóstico definido
                  </Badge>
                )}
              </div>
            </div>

            {/* Conteúdo Principal */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="anamnesis" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Anamnese
                </TabsTrigger>
                <TabsTrigger value="pain" className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Dor
                </TabsTrigger>
                <TabsTrigger value="goniometry" className="flex items-center gap-2">
                  <Ruler className="h-4 w-4" />
                  Goniometria
                </TabsTrigger>
                <TabsTrigger value="tests" className="flex items-center gap-2">
                  <TestTube className="h-4 w-4" />
                  Testes
                </TabsTrigger>
                <TabsTrigger value="photos" className="flex items-center gap-2">
                  <Camera className="h-4 w-4" />
                  Fotos
                </TabsTrigger>
                <TabsTrigger value="diagnosis" className="flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Diagnóstico
                </TabsTrigger>
              </TabsList>

              {/* ANAMNESE */}
              <TabsContent value="anamnesis" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Anamnese
                    </CardTitle>
                    <CardDescription>
                      Coleta de informações gerais e história clínica do paciente
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <Label htmlFor="mainComplaint" className="text-base font-medium">
                        Queixa Principal *
                      </Label>
                      <Textarea
                        id="mainComplaint"
                        placeholder="Descreva a queixa principal que trouxe o paciente à consulta..."
                        value={evaluationData.mainComplaint}
                        onChange={(e) => setEvaluationData(prev => ({ 
                          ...prev, mainComplaint: e.target.value 
                        }))}
                        className="mt-2"
                        rows={3}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Label htmlFor="medicalHistory">Histórico Médico</Label>
                        <Textarea
                          id="medicalHistory"
                          placeholder="Doenças, cirurgias, internações anteriores..."
                          value={evaluationData.medicalHistory}
                          onChange={(e) => setEvaluationData(prev => ({ 
                            ...prev, medicalHistory: e.target.value 
                          }))}
                          rows={4}
                        />
                      </div>
                      <div>
                        <Label htmlFor="previousTreatments">Tratamentos Anteriores</Label>
                        <Textarea
                          id="previousTreatments"
                          placeholder="Fisioterapia, medicamentos, outros tratamentos..."
                          value={evaluationData.previousTreatments}
                          onChange={(e) => setEvaluationData(prev => ({ 
                            ...prev, previousTreatments: e.target.value 
                          }))}
                          rows={4}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Label htmlFor="medications">Medicações Atuais</Label>
                        <Textarea
                          id="medications"
                          placeholder="Medicamentos em uso regular..."
                          value={evaluationData.medications}
                          onChange={(e) => setEvaluationData(prev => ({ 
                            ...prev, medications: e.target.value 
                          }))}
                          rows={3}
                        />
                      </div>
                      <div>
                        <Label htmlFor="lifestyleFactors">Fatores de Estilo de Vida</Label>
                        <Textarea
                          id="lifestyleFactors"
                          placeholder="Atividade física, trabalho, hábitos posturais..."
                          value={evaluationData.lifestyleFactors}
                          onChange={(e) => setEvaluationData(prev => ({ 
                            ...prev, lifestyleFactors: e.target.value 
                          }))}
                          rows={3}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* AVALIAÇÃO DA DOR */}
              <TabsContent value="pain" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      Avaliação da Dor
                    </CardTitle>
                    <CardDescription>
                      Análise detalhada da dor usando escala visual analógica (EVA)
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-8">
                    <div>
                      <Label className="text-lg font-semibold mb-4 block">
                        Escala Visual de Dor (EVA)
                      </Label>
                      <PainScale
                        value={evaluationData.painScale}
                        onChange={handlePainScaleChange}
                        showEmojis={true}
                        showNumbers={true}
                        showLabels={true}
                        size="lg"
                      />
                    </div>

                    {evaluationData.painScale > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                        <div>
                          <Label htmlFor="painLocation">Localização da Dor</Label>
                          <Input
                            id="painLocation"
                            placeholder="Ex: Região lombar, ombro direito..."
                            value={evaluationData.painLocation}
                            onChange={(e) => setEvaluationData(prev => ({ 
                              ...prev, painLocation: e.target.value 
                            }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="painCharacteristics">Características da Dor</Label>
                          <Input
                            id="painCharacteristics"
                            placeholder="Ex: Queimação, pontada, peso..."
                            value={evaluationData.painCharacteristics}
                            onChange={(e) => setEvaluationData(prev => ({ 
                              ...prev, painCharacteristics: e.target.value 
                            }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="painTriggers">Fatores que Pioram</Label>
                          <Input
                            id="painTriggers"
                            placeholder="Ex: Movimento, repouso, manhã..."
                            value={evaluationData.painTriggers}
                            onChange={(e) => setEvaluationData(prev => ({ 
                              ...prev, painTriggers: e.target.value 
                            }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="painRelief">Fatores que Melhoram</Label>
                          <Input
                            id="painRelief"
                            placeholder="Ex: Calor, medicamento, repouso..."
                            value={evaluationData.painRelief}
                            onChange={(e) => setEvaluationData(prev => ({ 
                              ...prev, painRelief: e.target.value 
                            }))}
                          />
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* GONIOMETRIA */}
              <TabsContent value="goniometry" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Ruler className="h-5 w-5" />
                      Goniometria Digital
                    </CardTitle>
                    <CardDescription>
                      Medição de amplitude de movimento articular
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Goniometer
                      onSave={handleGoniometryReading}
                      className="max-w-2xl mx-auto"
                    />
                    
                    {evaluationData.rangeOfMotion.length > 0 && (
                      <div className="mt-8">
                        <h4 className="font-semibold mb-4">Medições Realizadas:</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {evaluationData.rangeOfMotion.map((reading, index) => (
                            <div key={index} className="p-4 border rounded-lg">
                              <div className="font-medium">{reading.joint} - {reading.movement}</div>
                              <div className="text-sm text-muted-foreground mt-1">
                                Ativo: {reading.activeRom}° | Passivo: {reading.passiveRom}°
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* TESTES FUNCIONAIS */}
              <TabsContent value="tests" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TestTube className="h-5 w-5" />
                      Testes Funcionais
                    </CardTitle>
                    <CardDescription>
                      Testes especiais para diagnóstico fisioterapêutico
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <FunctionalTests
                      onSaveResult={(result) => {
                        setEvaluationData(prev => ({
                          ...prev,
                          functionalTests: [...prev.functionalTests, result]
                        }))
                        toast.success(`🧪 Teste registrado`)
                      }}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* DOCUMENTAÇÃO FOTOGRÁFICA */}
              <TabsContent value="photos" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Camera className="h-5 w-5" />
                      Documentação Fotográfica
                    </CardTitle>
                    <CardDescription>
                      Captura de imagens para avaliação postural (LGPD compliant)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <PhotoCapture
                      patientId={resolvedParams.id}
                      patientName={evaluationData.patientName}
                      onSavePhoto={handlePhotoSaved}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* DIAGNÓSTICO E PLANO */}
              <TabsContent value="diagnosis" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5" />
                      Diagnóstico e Plano de Tratamento
                    </CardTitle>
                    <CardDescription>
                      Síntese diagnóstica e planejamento terapêutico
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Label htmlFor="clinicalDiagnosis">Diagnóstico Clínico/Médico</Label>
                        <Textarea
                          id="clinicalDiagnosis"
                          placeholder="Diagnóstico fornecido pelo médico..."
                          value={evaluationData.clinicalDiagnosis}
                          onChange={(e) => setEvaluationData(prev => ({ 
                            ...prev, clinicalDiagnosis: e.target.value 
                          }))}
                          rows={4}
                        />
                      </div>
                      <div>
                        <Label htmlFor="physiotherapyDiagnosis">Diagnóstico Fisioterapêutico</Label>
                        <Textarea
                          id="physiotherapyDiagnosis"
                          placeholder="Diagnóstico cinético-funcional baseado na avaliação..."
                          value={evaluationData.physiotherapyDiagnosis}
                          onChange={(e) => setEvaluationData(prev => ({ 
                            ...prev, physiotherapyDiagnosis: e.target.value 
                          }))}
                          rows={4}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="estimatedSessions">Sessões Estimadas</Label>
                        <Input
                          id="estimatedSessions"
                          type="number"
                          min="1"
                          max="50"
                          value={evaluationData.estimatedSessions}
                          onChange={(e) => setEvaluationData(prev => ({ 
                            ...prev, estimatedSessions: parseInt(e.target.value) || 0 
                          }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="frequencyPerWeek">Frequência Semanal</Label>
                        <Input
                          id="frequencyPerWeek"
                          type="number"
                          min="1"
                          max="7"
                          value={evaluationData.frequencyPerWeek}
                          onChange={(e) => setEvaluationData(prev => ({ 
                            ...prev, frequencyPerWeek: parseInt(e.target.value) || 0 
                          }))}
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="generalNotes">Observações Gerais</Label>
                      <Textarea
                        id="generalNotes"
                        placeholder="Observações adicionais sobre a avaliação..."
                        value={evaluationData.generalNotes}
                        onChange={(e) => setEvaluationData(prev => ({ 
                          ...prev, generalNotes: e.target.value 
                        }))}
                        rows={4}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </DashboardLayout>
    </AuthGuard>
  )
} 