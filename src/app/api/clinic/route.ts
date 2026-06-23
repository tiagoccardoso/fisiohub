import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth, requireRole } from '@/lib/auth-server'
import { queryOne } from '@/lib/db-neon'
import { apiError } from '@/lib/tenant-api'

const schema = z.object({
  name: z.string().trim().min(2, 'Informe o nome da clínica.').max(180),
  legal_name: z.string().trim().max(220).optional().nullable(),
  document_number: z.string().trim().max(30).optional().nullable(),
  phone: z.string().trim().min(8).max(30),
  email: z.string().trim().email(),
  address: z.string().trim().min(3).max(500),
  address_line: z.string().trim().max(250).optional().nullable(),
  address_number: z.string().trim().max(30).optional().nullable(),
  address_complement: z.string().trim().max(120).optional().nullable(),
  neighborhood: z.string().trim().max(120).optional().nullable(),
  city: z.string().trim().max(120).optional().nullable(),
  state: z.string().trim().max(2).optional().nullable(),
  postal_code: z.string().trim().max(12).optional().nullable(),
  responsible_name: z.string().trim().max(180).optional().nullable(),
  logo_url: z.union([z.string().trim().url(), z.literal('')]).optional().nullable(),
})

const select = `select id, name, legal_name, document_number, phone, email, address, address_line,
  address_number, address_complement, neighborhood, city, state, postal_code, responsible_name,
  logo_url, settings, created_at::text, updated_at::text from public.clinics`

export async function GET() {
  try {
    const user = await requireAuth()
    return NextResponse.json(await queryOne(`${select} where id = $1 and is_active = true`, [user.clinic_id]))
  } catch (error) { return apiError(error, 'Erro ao carregar dados da clínica.') }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireRole(['admin'])
    const validation = schema.safeParse(await request.json())
    if (!validation.success) return NextResponse.json({ error: validation.error.issues[0]?.message, fieldErrors: validation.error.flatten().fieldErrors }, { status: 400 })
    const d = validation.data
    const clinic = await queryOne(
      `update public.clinics set name = $2, legal_name = nullif($3, ''), document_number = nullif($4, ''),
         phone = $5, email = $6::citext, address = $7, address_line = nullif($8, ''), address_number = nullif($9, ''),
         address_complement = nullif($10, ''), neighborhood = nullif($11, ''), city = nullif($12, ''),
         state = nullif(upper($13), ''), postal_code = nullif($14, ''), responsible_name = nullif($15, ''),
         logo_url = nullif($16, ''), updated_at = now() where id = $1 and is_active = true
       returning id, name, legal_name, document_number, phone, email, address, address_line, address_number,
         address_complement, neighborhood, city, state, postal_code, responsible_name, logo_url, settings, created_at::text, updated_at::text`,
      [user.clinic_id, d.name, d.legal_name || '', d.document_number || '', d.phone, d.email.toLowerCase(), d.address,
       d.address_line || '', d.address_number || '', d.address_complement || '', d.neighborhood || '', d.city || '', d.state || '',
       d.postal_code || '', d.responsible_name || '', d.logo_url || '']
    )
    return NextResponse.json(clinic)
  } catch (error) {
    const duplicate = (error as { code?: string })?.code === '23505'
    if (duplicate) return NextResponse.json({ error: 'Documento fiscal já utilizado por outra clínica.' }, { status: 409 })
    return apiError(error, 'Erro ao atualizar dados da clínica.')
  }
}
