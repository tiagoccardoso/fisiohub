import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { query, queryOne } from '@/lib/db-neon'

function toJson(value: unknown) {
  return JSON.stringify(value ?? {})
}

export async function GET(request: Request) {
  try {
    await requireAuth()
    const { searchParams } = new URL(request.url)
    const patientId = searchParams.get('patientId')

    if (!patientId) {
      return NextResponse.json({ error: 'patientId é obrigatório' }, { status: 400 })
    }

    const evaluations = await query(
      `select pe.*,
              json_build_object('full_name', u.full_name, 'email', u.email) as evaluator,
              json_build_object('full_name', p.full_name, 'email', p.email) as patient
         from public.physiotherapy_evaluations pe
         left join public.users u on u.id = pe.evaluator_id
         left join public.patients p on p.id = pe.patient_id
        where pe.patient_id = $1
        order by pe.evaluation_date desc`,
      [patientId]
    )

    return NextResponse.json({ success: true, data: evaluations })
  } catch (error) {
    const unauthorized = error instanceof Error && error.message === 'Não autorizado'
    return NextResponse.json(
      { error: unauthorized ? 'Não autorizado' : 'Erro ao buscar avaliações' },
      { status: unauthorized ? 401 : 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    const body = await request.json()

    const patientId = body.patientId
    const mainComplaint = body.mainComplaint
    const evaluatorId = body.evaluatorId || user.id

    if (!patientId || !mainComplaint) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: patientId e mainComplaint' },
        { status: 400 }
      )
    }

    const evaluation = await queryOne(
      `insert into public.physiotherapy_evaluations
        (patient_id, evaluator_id, evaluation_date, main_complaint, pain_scale_initial,
         pain_location, pain_characteristics, medical_history, previous_treatments,
         medications, lifestyle_factors, posture_analysis, muscle_strength, range_of_motion,
         functional_tests, clinical_diagnosis, physiotherapy_diagnosis, treatment_goals,
         estimated_sessions, frequency_per_week)
       values
        ($1, $2, coalesce(nullif($3, '')::date, current_date), $4, $5,
         $6, $7, $8, $9,
         $10, $11, $12, $13::jsonb, $14::jsonb,
         $15::jsonb, $16, $17, $18::text[],
         $19, $20)
       returning *`,
      [
        patientId,
        evaluatorId,
        body.evaluationDate || '',
        mainComplaint,
        body.painScale ?? 0,
        body.painLocation || null,
        body.painCharacteristics || null,
        body.medicalHistory || null,
        body.previousTreatments || null,
        body.medications || null,
        body.lifestyleFactors || null,
        body.postureAnalysis || null,
        toJson(body.muscleStrength),
        toJson(body.rangeOfMotion),
        toJson(body.functionalTests),
        body.clinicalDiagnosis || null,
        body.physiotherapyDiagnosis || null,
        body.treatmentGoals || [],
        body.estimatedSessions || null,
        body.frequencyPerWeek || null,
      ]
    )

    return NextResponse.json({ success: true, message: '✅ Avaliação fisioterapêutica criada com sucesso!', data: evaluation }, { status: 201 })
  } catch (error) {
    const unauthorized = error instanceof Error && error.message === 'Não autorizado'
    console.error('[physiotherapy/evaluations/post] error', error)
    return NextResponse.json(
      { error: unauthorized ? 'Não autorizado' : 'Erro ao criar avaliação' },
      { status: unauthorized ? 401 : 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    await requireAuth()
    const body = await request.json()
    const { evaluationId } = body

    if (!evaluationId) {
      return NextResponse.json({ error: 'evaluationId é obrigatório' }, { status: 400 })
    }

    const evaluation = await queryOne(
      `update public.physiotherapy_evaluations set
          main_complaint = coalesce($2, main_complaint),
          pain_scale_initial = coalesce($3, pain_scale_initial),
          pain_location = coalesce($4, pain_location),
          pain_characteristics = coalesce($5, pain_characteristics),
          medical_history = coalesce($6, medical_history),
          previous_treatments = coalesce($7, previous_treatments),
          medications = coalesce($8, medications),
          lifestyle_factors = coalesce($9, lifestyle_factors),
          posture_analysis = coalesce($10, posture_analysis),
          muscle_strength = coalesce($11::jsonb, muscle_strength),
          range_of_motion = coalesce($12::jsonb, range_of_motion),
          functional_tests = coalesce($13::jsonb, functional_tests),
          clinical_diagnosis = coalesce($14, clinical_diagnosis),
          physiotherapy_diagnosis = coalesce($15, physiotherapy_diagnosis),
          treatment_goals = coalesce($16::text[], treatment_goals),
          estimated_sessions = coalesce($17, estimated_sessions),
          frequency_per_week = coalesce($18, frequency_per_week),
          updated_at = now()
        where id = $1
        returning *`,
      [
        evaluationId,
        body.mainComplaint ?? null,
        body.painScale ?? null,
        body.painLocation ?? null,
        body.painCharacteristics ?? null,
        body.medicalHistory ?? null,
        body.previousTreatments ?? null,
        body.medications ?? null,
        body.lifestyleFactors ?? null,
        body.postureAnalysis ?? null,
        body.muscleStrength ? toJson(body.muscleStrength) : null,
        body.rangeOfMotion ? toJson(body.rangeOfMotion) : null,
        body.functionalTests ? toJson(body.functionalTests) : null,
        body.clinicalDiagnosis ?? null,
        body.physiotherapyDiagnosis ?? null,
        body.treatmentGoals ?? null,
        body.estimatedSessions ?? null,
        body.frequencyPerWeek ?? null,
      ]
    )

    if (!evaluation) return NextResponse.json({ error: 'Avaliação não encontrada' }, { status: 404 })
    return NextResponse.json({ success: true, message: '✅ Avaliação atualizada com sucesso!', data: evaluation })
  } catch (error) {
    const unauthorized = error instanceof Error && error.message === 'Não autorizado'
    return NextResponse.json(
      { error: unauthorized ? 'Não autorizado' : 'Erro ao atualizar avaliação' },
      { status: unauthorized ? 401 : 500 }
    )
  }
}
