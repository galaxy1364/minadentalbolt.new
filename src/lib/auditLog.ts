import { db, AuditLogEntry } from './db'

/**
 * Tracks the signed-in user's name/role so non-React modules (like
 * sync.ts) can attribute an audit-log entry without needing React
 * context. AuthProvider updates this whenever the session/profile
 * changes; it stays null while login is disabled (REQUIRE_LOGIN=false),
 * in which case entries are attributed to 'کاربر سیستم'.
 */
export const currentActor: { name: string | null; role: string | null } = { name: null, role: null }

const TABLE_LABELS: Record<string, string> = {
  patients: 'بیمار', doctors: 'پزشک', units: 'یونیت', appointments: 'نوبت',
  encounters: 'ویزیت', treatments: 'درمان', payments: 'پرداخت', procedures: 'رویه درمانی',
  laboratories: 'لابراتوار', lab_orders: 'سفارش لابراتوار', insurance_companies: 'شرکت بیمه',
  insurance_claims: 'ادعای بیمه', prescriptions: 'نسخه', radiology_images: 'تصویر رادیولوژی',
  treatment_phases: 'فاز درمان', waiting_list: 'لیست انتظار', staff: 'پرسنل', expenses: 'هزینه',
  treatment_packages: 'پکیج درمان', consent_forms: 'فرم رضایت', tooth_records: 'رکورد دندان',
  inventory_items: 'قلم انبار', inventory_categories: 'دسته‌بندی انبار', payment_plans: 'طرح قسطی',
  installments: 'قسط', cheques: 'چک', doctor_schedules: 'برنامه پزشک', implant_cases: 'مورد ایمپلنت',
  implant_components: 'کامپوننت ایمپلنت', sms_templates: 'قالب پیامک',
}

const OPERATION_LABELS: Record<'insert' | 'update' | 'delete', string> = {
  insert: 'ثبت', update: 'ویرایش', delete: 'حذف',
}

export async function logAudit(
  tableName: string,
  operation: 'insert' | 'update' | 'delete',
  recordId: string,
): Promise<void> {
  try {
    const tableLabel = TABLE_LABELS[tableName] || tableName
    const entry: AuditLogEntry = {
      table_name: tableName,
      operation,
      record_id: recordId,
      summary: `${OPERATION_LABELS[operation]} ${tableLabel}`,
      actor_name: currentActor.name || 'کاربر سیستم',
      actor_role: currentActor.role,
      created_at: new Date().toISOString(),
    }
    await db.audit_log.add(entry)
    // Keep the log bounded — trim anything beyond the most recent 500 entries.
    const count = await db.audit_log.count()
    if (count > 500) {
      const oldest = await db.audit_log.orderBy('id').limit(count - 500).toArray()
      await db.audit_log.bulkDelete(oldest.map((o) => o.id!).filter(Boolean))
    }
  } catch {
    // Audit logging must never block or crash the actual save operation.
  }
}

export async function fetchAuditLog(limit = 100): Promise<AuditLogEntry[]> {
  return db.audit_log.orderBy('id').reverse().limit(limit).toArray()
}

export async function clearAuditLog(): Promise<void> {
  await db.audit_log.clear()
}
