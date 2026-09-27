import { describe, it, expect } from 'vitest';
import {
  encryptClinicBackup,
  decryptClinicBackup,
  bufferToHex,
  hexToBuffer,
  computeSha256,
  type EncryptedBackupContainer,
} from './encryptedBackup';

describe('Encrypted Backup & Restore Module (AES-256-GCM / PBKDF2)', () => {
  it('converts buffer to hex and back accurately', () => {
    const original = new Uint8Array([0, 15, 255, 128, 42]);
    const hex = bufferToHex(original);
    expect(hex).toBe('000fff802a');
    const recovered = hexToBuffer(hex);
    expect(recovered).toEqual(original);
  });

  it('computes sha256 checksum correctly', async () => {
    const text = 'MinaDent-Secure-Backup-2026';
    const hash = await computeSha256(text);
    expect(hash).toHaveLength(64);
    expect(typeof hash).toBe('string');
  });

  it('encrypts and decrypts a dental clinic backup payload successfully with correct password', async () => {
    const clinicPayload = {
      patients: [{ id: 'p1', name: 'علی حسینی', medicalHistory: 'فشار خون' }],
      appointments: [{ id: 'a1', date: '1405-02-10', doctor: 'دکتر مینا' }],
      finances: { balance: 145000000 },
    };

    const password = 'ClinicSecret@Pass123';
    const encrypted = await encryptClinicBackup(clinicPayload, password);

    expect(encrypted.format).toBe('minasafe-v1');
    expect(encrypted.cipherAlgorithm).toBe('AES-256-GCM');
    expect(encrypted.kdf).toBe('PBKDF2-SHA256');
    expect(encrypted.saltHex).toHaveLength(32); // 16 bytes = 32 hex chars
    expect(encrypted.ivHex).toHaveLength(24); // 12 bytes = 24 hex chars
    expect(encrypted.ciphertextBase64.length).toBeGreaterThan(20);
    expect(encrypted.checksumSha256).toHaveLength(64);

    const decrypted = await decryptClinicBackup<typeof clinicPayload>(encrypted, password);
    expect(decrypted).toEqual(clinicPayload);
    expect(decrypted.patients[0].name).toBe('علی حسینی');
  });

  it('fails decryption with wrong password', async () => {
    const payload = { secret: 'اطلاعات محرمانه پرونده' };
    const password = 'CorrectPassword#456';
    const wrongPassword = 'WrongPassword#999';

    const encrypted = await encryptClinicBackup(payload, password);

    await expect(decryptClinicBackup(encrypted, wrongPassword)).rejects.toThrow(
      /رمزگشایی ناموفق بود! گذرواژه واردشده نادرست است/
    );
  });

  it('validates password length on encryption and decryption', async () => {
    const payload = { data: 'test' };
    await expect(encryptClinicBackup(payload, '123')).rejects.toThrow(/حداقل ۶ کاراکتر/);
    await expect(
      decryptClinicBackup({} as EncryptedBackupContainer, '123')
    ).rejects.toThrow(/ساختار فایل پشتیبان رمزشده نامعتبر است/);
  });
});
