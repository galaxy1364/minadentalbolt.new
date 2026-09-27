/**
 * ماژول پشتیبان‌گیری رمزنگاری‌شده کلینیک دندانپزشکی مینادنت
 * MinaDent Dental Clinic - Encrypted Backup & Restore Module
 * 
 * بر پایه استاندارد وب کریپتو (Web Crypto API):
 * - مشتق‌سازی کلید: PBKDF2 با SHA-256 و 100,000 تکرار
 * - رمزنگاری متقارن: AES-GCM (256-bit) با IV تصادفی 12 بایتی
 * - خروجی مستقل امن: فایل فرمت .minasafe حاوی متادیتا، salt، iv و متن رمزنگاری‌شده (Base64)
 */

export interface EncryptedBackupContainer {
  version: string;
  format: 'minasafe-v1';
  createdAt: string;
  cipherAlgorithm: 'AES-256-GCM';
  kdf: 'PBKDF2-SHA256';
  iterations: number;
  saltHex: string;
  ivHex: string;
  ciphertextBase64: string;
  checksumSha256: string;
}

// تبدیل آرایه بایت به Hex
export function bufferToHex(buffer: Uint8Array): string {
  return Array.from(buffer)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// تبدیل Hex به Uint8Array
export function hexToBuffer(hex: string): Uint8Array {
  const cleanHex = hex.replace(/[^0-9a-fA-F]/g, '');
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes[i / 2] = parseInt(cleanHex.substring(i, i + 2), 16);
  }
  return bytes;
}

// تبدیل ArrayBuffer به Base64
export function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// تبدیل Base64 به Uint8Array
export function base64ToBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// محاسبه چکسام SHA-256 متن جهت صحه‌گذاری سلامت داده‌ها
export async function computeSha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return bufferToHex(new Uint8Array(hashBuffer));
}

// مشتق‌سازی کلید متقارن AES-256 از گذرواژه با الگوریتم PBKDF2
async function deriveEncryptionKey(password: string, salt: Uint8Array, iterations = 100000): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as unknown as ArrayBuffer,
      iterations,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * رمزنگاری بسته داده پشتیبان کلینیک با پسورد
 */
export async function encryptClinicBackup(
  payload: unknown,
  password: string
): Promise<EncryptedBackupContainer> {
  if (!password || password.trim().length < 6) {
    throw new Error('رمز عبور باید حداقل ۶ کاراکتر و غیرخالی باشد.');
  }

  const jsonString = typeof payload === 'string' ? payload : JSON.stringify(payload);
  const checksum = await computeSha256(jsonString);

  // تولید Salt و IV امن به صورت تصادفی
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const key = await deriveEncryptionKey(password, salt, 100000);

  const encoder = new TextEncoder();
  const plainBytes = encoder.encode(jsonString);

  const encryptedBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv as unknown as ArrayBuffer,
    },
    key,
    plainBytes
  );

  const container: EncryptedBackupContainer = {
    version: '1.235.5',
    format: 'minasafe-v1',
    createdAt: new Date().toISOString(),
    cipherAlgorithm: 'AES-256-GCM',
    kdf: 'PBKDF2-SHA256',
    iterations: 100000,
    saltHex: bufferToHex(salt),
    ivHex: bufferToHex(iv),
    ciphertextBase64: bufferToBase64(encryptedBuffer),
    checksumSha256: checksum,
  };

  return container;
}

/**
 * رمزگشایی و اعتبارسنجی بسته پشتیبان کلینیک با پسورد
 */
export async function decryptClinicBackup<T = unknown>(
  container: EncryptedBackupContainer,
  password: string
): Promise<T> {
  if (!container || container.format !== 'minasafe-v1') {
    throw new Error('ساختار فایل پشتیبان رمزشده نامعتبر است یا فرمت آن پشتیبانی نمی‌شود.');
  }

  if (!password || password.trim().length < 6) {
    throw new Error('رمز عبور وارد شده نامعتبر است.');
  }

  const salt = hexToBuffer(container.saltHex);
  const iv = hexToBuffer(container.ivHex);
  const ciphertext = base64ToBuffer(container.ciphertextBase64);

  const key = await deriveEncryptionKey(password, salt, container.iterations || 100000);

  try {
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv as unknown as ArrayBuffer,
      },
      key,
      ciphertext as unknown as ArrayBuffer
    );

    const decoder = new TextDecoder();
    const plainJson = decoder.decode(decryptedBuffer);

    // بررسی سلامت یکپارچگی داده‌ها با چکسام
    if (container.checksumSha256) {
      const calculatedChecksum = await computeSha256(plainJson);
      if (calculatedChecksum !== container.checksumSha256) {
        throw new Error('چک‌سام داده‌های رمزشده همخوانی ندارد. احتمال مخدوش بودن فایل.');
      }
    }

    return JSON.parse(plainJson) as T;
  } catch (error) {
    if (error instanceof Error && error.message.includes('چک‌سام')) {
      throw error;
    }
    throw new Error('رمزگشایی ناموفق بود! گذرواژه واردشده نادرست است یا فایل آسیب دیده است.');
  }
}
