import { z } from 'zod'

export const onlyDigits = (value: string) => value.replace(/\D/g, '')

export function formatCpf(value: string) {
  const digits = onlyDigits(value).slice(0, 11)
  return digits
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

export function isValidCpf(value: string) {
  const cpf = onlyDigits(value)
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false

  const calculateDigit = (length: number) => {
    const sum = cpf
      .slice(0, length)
      .split('')
      .reduce((total, digit, index) => total + Number(digit) * (length + 1 - index), 0)
    const remainder = (sum * 10) % 11
    return remainder === 10 ? 0 : remainder
  }

  return calculateDigit(9) === Number(cpf[9]) && calculateDigit(10) === Number(cpf[10])
}

function isValidBirthDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return false

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(year, month - 1, day)
  const isRealDate = date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
  return isRealDate && value <= new Date().toISOString().slice(0, 10)
}

const optionalText = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().trim().optional()
)

const optionalEmail = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().trim().email('E-mail inválido.').optional()
)

export const patientFormSchema = z.object({
  full_name: z.string().trim().min(3, 'O nome completo é obrigatório.'),
  cpf: z.string()
    .min(1, 'O CPF é obrigatório.')
    .refine((value) => onlyDigits(value).length === 11, 'Informe os 11 dígitos do CPF.')
    .refine(isValidCpf, 'CPF inválido.')
    .transform(onlyDigits),
  birth_date: z.string()
    .min(1, 'A data de nascimento é obrigatória.')
    .refine(isValidBirthDate, 'Data de nascimento inválida.'),
  gender: optionalText,
  phone: optionalText,
  email: optionalEmail,
  address: optionalText,
  emergency_contact_name: optionalText,
  emergency_contact_phone: optionalText,
  initial_medical_history: optionalText,
  notes: optionalText,
})

export type PatientFormValues = z.infer<typeof patientFormSchema>

export type CreatedPatient = {
  id: string
  full_name: string
  birth_date: string | null
  cpf: string
}
