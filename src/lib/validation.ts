import { z } from 'zod'

// =====================================================================
// Form schemas — Vietnamese error messages, free-form date strings
// (`YYYY` or `YYYY-MM-DD`) because gia phả often only know the year.
// Mirrors SQL CHECK constraints in the init migration.
// =====================================================================

const dateRegex = /^(?:\d{4}|\d{4}-\d{2}-\d{2})$/

export const genderSchema = z.enum(['male', 'female', 'unknown'], {
  errorMap: () => ({ message: 'Giới tính không hợp lệ' }),
})

const optionalDate = z
  .string()
  .trim()
  .max(10, 'Ngày tối đa 10 ký tự')
  .regex(dateRegex, 'Định dạng phải là YYYY hoặc YYYY-MM-DD')
  .or(z.literal(''))
  .optional()
  .transform((v) => (v === '' || v === undefined ? null : v))

export const personFormSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(1, 'Họ tên không được để trống')
    .max(200, 'Họ tên tối đa 200 ký tự'),
  generation_name: z
    .string()
    .trim()
    .max(50, 'Tên đời tối đa 50 ký tự')
    .optional()
    .transform((v) => (v === '' || v === undefined ? null : v)),
  gender: genderSchema,
  birth_date: optionalDate,
  death_date: optionalDate,
  birth_place: z
    .string()
    .trim()
    .max(200, 'Quê quán tối đa 200 ký tự')
    .optional()
    .transform((v) => (v === '' || v === undefined ? null : v)),
  notes: z
    .string()
    .trim()
    .max(4000, 'Ghi chú tối đa 4000 ký tự')
    .optional()
    .transform((v) => (v === '' || v === undefined ? null : v)),
  parent_ids: z
    .array(z.string().uuid())
    .max(2, 'Mỗi người chỉ được khai tối đa 2 cha mẹ')
    .default([]),
  spouse_ids: z.array(z.string().uuid()).default([]),
})

export type PersonFormValues = z.input<typeof personFormSchema>
export type PersonFormParsed = z.output<typeof personFormSchema>

export const familyTreeFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Tên gia phả không được để trống')
    .max(200, 'Tên gia phả tối đa 200 ký tự'),
})

export type FamilyTreeFormValues = z.infer<typeof familyTreeFormSchema>

export const loginFormSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email không được để trống')
    .email('Email không hợp lệ'),
  password: z
    .string()
    .min(6, 'Mật khẩu tối thiểu 6 ký tự')
    .max(128, 'Mật khẩu tối đa 128 ký tự'),
})

export type LoginFormValues = z.infer<typeof loginFormSchema>
