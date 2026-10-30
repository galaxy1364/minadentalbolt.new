/**
 * Clinic Patient File Number Sequence Manager
 * Handles auto-incrementation, custom prefixes, manual edits, and persistence.
 */

export interface ParsedFileNumber {
  prefix: string;
  num: number;
  suffix: string;
}

/**
 * Parses any file number format (e.g. "D-1051", "1052", "P-300-A")
 */
export function parseFileNumber(val: string): ParsedFileNumber {
  if (!val || typeof val !== 'string') {
    return { prefix: 'D-', num: 1052, suffix: '' };
  }

  // Look for any continuous digits sequence
  const match = val.match(/^(.*?)(\d+)(.*?)$/);
  if (match) {
    return {
      prefix: match[1],
      num: parseInt(match[2], 10),
      suffix: match[3]
    };
  }

  const fallbackNum = parseInt(val.replace(/\D/g, ''), 10);
  return {
    prefix: val.startsWith('D-') ? 'D-' : '',
    num: isNaN(fallbackNum) ? 1000 : fallbackNum,
    suffix: ''
  };
}

/**
 * Increments the given file number by 1, preserving prefix/suffix
 */
export function getNextFileNumber(currentOrLastVal?: string): string {
  let valToUse = currentOrLastVal;
  if (!valToUse) {
    try {
      valToUse = localStorage.getItem('minadental_last_file_number') || 'D-1051';
    } catch {
      valToUse = 'D-1051';
    }
  }
  const { prefix, num, suffix } = parseFileNumber(valToUse);
  const nextNum = num + 1;
  return `${prefix}${nextNum}${suffix}`;
}

const STORAGE_KEY = 'minadental_last_file_number';

/**
 * Gets the latest recorded file number from localStorage or from the patients list
 */
export function getLatestFileNumber(patients: { fileNumber: string }[]): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && saved.trim()) {
      return saved.trim();
    }
  } catch (e) {
    console.error(e);
  }

  // Fallback: calculate the highest number currently in the patients list
  if (!patients || patients.length === 0) {
    return 'D-1051';
  }

  let maxNum = 1000;
  let detectedPrefix = 'D-';

  for (const p of patients) {
    if (p.fileNumber) {
      const parsed = parseFileNumber(p.fileNumber);
      if (parsed.num > maxNum) {
        maxNum = parsed.num;
        detectedPrefix = parsed.prefix || 'D-';
      }
    }
  }

  return `${detectedPrefix}${maxNum}`;
}

/**
 * Updates the recorded last file number so subsequent creations increment from here
 */
export function recordLastFileNumber(fileNumber: string): void {
  try {
    if (fileNumber && fileNumber.trim()) {
      localStorage.setItem(STORAGE_KEY, fileNumber.trim());
    }
  } catch (e) {
    console.error(e);
  }
}
