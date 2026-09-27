// Shared patient-related utility functions.
// Extracted to eliminate duplicated (and inconsistent) age-calculation logic
// that previously existed independently in Patients.tsx and PatientDetail.tsx.

/**
 * Calculates a person's age in whole years from a birth date string.
 * Returns null for missing/invalid dates or implausible results
 * (negative age, or age >= 150 which almost certainly indicates bad data).
 */
export function calculateAge(birthDate: string | null | undefined): number | null {
  if (!birthDate) return null
  const birth = new Date(birthDate)
  if (isNaN(birth.getTime())) return null

  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }

  return age >= 0 && age < 150 ? age : null
}
