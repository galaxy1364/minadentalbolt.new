import { describe, it, expect } from 'vitest'
import {
  analyzeOverjet,
  analyzeOverbite,
  calculateOrthoComplexity,
  calculateIotnGrade,
  parseOrthoVoiceExam,
  createEmptyOrthoExam,
  generateOrthoReportHtml,
  ANGLE_MOLAR_LABELS,
  ANGLE_CANINE_LABELS,
} from './orthodontic'
import { OrthoExam, Patient, Doctor } from '../types'

describe('orthodontic.ts — Clinical Orthodontic & Occlusal Bite Analysis Engine', () => {
  describe('analyzeOverjet', () => {
    it('correctly categorizes negative overjet as anterior crossbite / reverse', () => {
      const res = analyzeOverjet(-3)
      expect(res.category).toBe('reverse')
      expect(res.isCrossbite).toBe(true)
      expect(res.isIncreased).toBe(false)
      expect(res.label).toContain('کراس‌بایت قدامی معکوس')
    })

    it('correctly categorizes 0mm overjet as edge-to-edge', () => {
      const res = analyzeOverjet(0)
      expect(res.category).toBe('edge_to_edge')
      expect(res.isCrossbite).toBe(false)
      expect(res.isIncreased).toBe(false)
      expect(res.label).toContain('لبه به لبه')
    })

    it('correctly categorizes 2mm overjet as normal', () => {
      const res = analyzeOverjet(2)
      expect(res.category).toBe('normal')
      expect(res.isCrossbite).toBe(false)
      expect(res.isIncreased).toBe(false)
      expect(res.label).toContain('نرمال')
    })

    it('correctly categorizes 5mm overjet as increased', () => {
      const res = analyzeOverjet(5)
      expect(res.category).toBe('increased')
      expect(res.isIncreased).toBe(true)
    })

    it('correctly categorizes 8mm overjet as excessive', () => {
      const res = analyzeOverjet(8)
      expect(res.category).toBe('excessive')
      expect(res.isIncreased).toBe(true)
      expect(res.label).toContain('خطر ترومای دندانی')
    })
  })

  describe('analyzeOverbite', () => {
    it('correctly categorizes negative overbite as anterior open bite', () => {
      const res = analyzeOverbite(-20)
      expect(res.category).toBe('open_bite')
      expect(res.isOpenBite).toBe(true)
      expect(res.isDeepBite).toBe(false)
      expect(res.label).toContain('اپن بایت')
    })

    it('correctly categorizes 0% overbite as edge-to-edge', () => {
      const res = analyzeOverbite(0)
      expect(res.category).toBe('edge_to_edge')
      expect(res.isOpenBite).toBe(false)
    })

    it('correctly categorizes 25% overbite as normal', () => {
      const res = analyzeOverbite(25)
      expect(res.category).toBe('normal')
      expect(res.isOpenBite).toBe(false)
      expect(res.isDeepBite).toBe(false)
    })

    it('correctly categorizes 55% overbite as moderate deep bite', () => {
      const res = analyzeOverbite(55)
      expect(res.category).toBe('deep_bite')
      expect(res.isDeepBite).toBe(true)
    })

    it('correctly categorizes 85% overbite as severe deep bite', () => {
      const res = analyzeOverbite(85)
      expect(res.category).toBe('severe_deep')
      expect(res.isDeepBite).toBe(true)
    })
  })

  describe('calculateOrthoComplexity & Malocclusion Severity Index', () => {
    it('scores a physiological Class I case as mild complexity', () => {
      const emptyExam = createEmptyOrthoExam('pat-1')
      const patient: Patient = {
        id: 'pat-1',
        clinic_id: 'default',
        first_name: 'علی',
        last_name: 'رضایی',
        birth_date: '2010-05-15',
        is_active: true,
        national_id: null,
        phone: null,
        phone2: null,
        email: null,
        gender: null,
        address: null,
        medical_history: null,
        allergies: null,
        insurance_info: null,
        notes: null,
        avatar_url: null,
        created_at: '',
        updated_at: '',
        sync_version: 1,
        file_number: '1001',
        file_number_manual: false,
        file_number_assigned_at: null,
        blood_type: null,
        medications: null,
        medical_conditions: null,
        credit_limit: null,
        referral_source: null,
        vip_level: null,
        tags: null,
        city: null,
        province: null,
        postal_code: null,
        insurance_number: null,
        primary_doctor_id: null,
      }

      const comp = calculateOrthoComplexity(emptyExam, patient)
      expect(comp.score).toBeLessThan(20)
      expect(comp.tier).toBe('mild')
      expect(comp.primaryCdtCode).toBe('D8080') // adolescent
    })

    it('scores a severe Class III skeletal case with crossbites as severe complexity', () => {
      const severeExam: Partial<OrthoExam> = {
        molar_class_right: 'class_3',
        molar_class_left: 'class_3',
        canine_class_right: 'class_3',
        canine_class_left: 'class_3',
        overjet_mm: -4,
        overbite_percent: -30,
        crossbite_anterior: true,
        crossbite_posterior_right: true,
        crossbite_posterior_left: true,
        crowding_upper: 'severe',
        crowding_lower: 'severe',
        facial_profile: 'concave',
        tmj_status: 'clicking_bilateral',
        habits: ['tongue_thrust', 'mouth_breathing'],
      }

      const comp = calculateOrthoComplexity(severeExam, null)
      expect(comp.score).toBeGreaterThanOrEqual(70)
      expect(comp.tier).toBe('severe')
      expect(comp.riskFactors.length).toBeGreaterThan(5)
      expect(comp.recommendedDurationMonths).toBe(24)
    })

    it('assigns D8010 for primary dentition (age < 7)', () => {
      const patient: Partial<Patient> = {
        birth_date: new Date(Date.now() - 5 * 365.25 * 86400000).toISOString().slice(0, 10),
      }
      const comp = calculateOrthoComplexity({}, patient as Patient)
      expect(comp.primaryCdtCode).toBe('D8010')
    })

    it('assigns D8090 for adult dentition (age >= 19)', () => {
      const patient: Partial<Patient> = {
        birth_date: '1995-01-01',
      }
      const comp = calculateOrthoComplexity({}, patient as Patient)
      expect(comp.primaryCdtCode).toBe('D8090')
    })
  })

  describe('createEmptyOrthoExam factory', () => {
    it('creates an initialized valid OrthoExamInput structure', () => {
      const input = createEmptyOrthoExam('pat-99')
      expect(input.patient_id).toBe('pat-99')
      expect(input.molar_class_right).toBe('class_1')
      expect(input.overjet_mm).toBe(2)
      expect(input.overbite_percent).toBe(25)
      expect(input.crossbite_anterior).toBe(false)
      expect(input.appliance_type).toBe('fixed_metal')
    })
  })

  describe('generateOrthoReportHtml', () => {
    it('generates rich, valid HTML case consultation report', () => {
      const patient: Patient = {
        id: 'pat-1',
        clinic_id: 'default',
        first_name: 'سارا',
        last_name: 'احمدی',
        birth_date: '2008-01-01',
        file_number: '5501',
        is_active: true,
        national_id: null,
        phone: null,
        phone2: null,
        email: null,
        gender: null,
        address: null,
        medical_history: null,
        allergies: null,
        insurance_info: null,
        notes: null,
        avatar_url: null,
        created_at: '',
        updated_at: '',
        sync_version: 1,
        file_number_manual: false,
        file_number_assigned_at: null,
        blood_type: null,
        medications: null,
        medical_conditions: null,
        credit_limit: null,
        referral_source: null,
        vip_level: null,
        tags: null,
        city: null,
        province: null,
        postal_code: null,
        insurance_number: null,
        primary_doctor_id: null,
      }

      const doctor: Doctor = {
        id: 'doc-1',
        name: 'کاظمی',
        specialty: 'متخصص ارتودنسی',
        clinic_id: 'default',
        user_id: null,
        staff_id: null,
        license_number: '12345',
        color: '#4f46e5',
        is_active: true,
        created_at: '',
        updated_at: '',
        sync_version: 1,
      }

      const exam: OrthoExam = {
        id: 'exam-1',
        clinic_id: 'default',
        patient_id: 'pat-1',
        doctor_id: 'doc-1',
        exam_date: '2026-09-13',
        molar_class_right: 'class_2_div_1',
        molar_class_left: 'class_2_div_1',
        canine_class_right: 'class_2',
        canine_class_left: 'class_2',
        overjet_mm: 6,
        overbite_percent: 60,
        midline_shift_upper_mm: 1,
        midline_shift_lower_mm: 0,
        crossbite_anterior: false,
        crossbite_posterior_right: true,
        crossbite_posterior_left: false,
        crowding_upper: 'moderate',
        crowding_lower: 'mild',
        spacing_upper: 'none',
        spacing_lower: 'none',
        diastema_mm: 0,
        facial_profile: 'convex',
        lip_competence: 'incompetent',
        habits: ['mouth_breathing'],
        tmj_status: 'clicking_right',
        treatment_stage: 'in_treatment',
        appliance_type: 'fixed_metal',
        estimated_duration_months: 20,
        notes: 'بیمار نیازمند الاستیک کلاس ۲ و بررسی راه‌های هوایی',
        created_at: '2026-09-13T10:00:00Z',
        updated_at: '2026-09-13T10:00:00Z',
      }

      const html = generateOrthoReportHtml(exam, patient, doctor)
      expect(html).toContain('سارا احمدی')
      expect(html).toContain('دکتر کاظمی')
      expect(html).toContain('گزارش ارزیابی تخصصی ارتودنسی و آنالیز بایت')
      expect(html).toContain(ANGLE_MOLAR_LABELS.class_2_div_1.label)
      expect(html).toContain(ANGLE_CANINE_LABELS.class_2.label)
      expect(html).toContain('D8080')
      expect(html).toContain('الاستیک کلاس ۲')
    })
  })

  describe('calculateIotnGrade (Index of Orthodontic Treatment Need)', () => {
    it('rates excessive overjet > 9mm as IOTN Grade 5 (Very Great Need)', () => {
      const iotn = calculateIotnGrade({ overjet_mm: 10 })
      expect(iotn.grade).toBe(5)
      expect(iotn.needLevel).toBe('very_great')
      expect(iotn.color).toBe('error')
      expect(iotn.rationales[0]).toContain('Grade 5a')
    })

    it('rates severe anterior reverse crossbite < -3.5mm as IOTN Grade 5', () => {
      const iotn = calculateIotnGrade({ overjet_mm: -4.5 })
      expect(iotn.grade).toBe(5)
      expect(iotn.needLevel).toBe('very_great')
      expect(iotn.rationales[0]).toContain('Grade 5m')
    })

    it('rates severe crowding or overjet 7mm as IOTN Grade 4 (Great Need)', () => {
      const iotn = calculateIotnGrade({ overjet_mm: 7, crowding_upper: 'severe' })
      expect(iotn.grade).toBe(4)
      expect(iotn.needLevel).toBe('great')
      expect(iotn.color).toBe('error')
    })

    it('rates borderline overjet 5mm or crossbite as IOTN Grade 3', () => {
      const iotn = calculateIotnGrade({ overjet_mm: 5, crossbite_anterior: true })
      expect(iotn.grade).toBe(3)
      expect(iotn.needLevel).toBe('moderate')
      expect(iotn.color).toBe('warning')
    })

    it('rates physiological normal occlusion as IOTN Grade 1 (No Need)', () => {
      const iotn = calculateIotnGrade({ overjet_mm: 2, overbite_percent: 25 })
      expect(iotn.grade).toBe(1)
      expect(iotn.needLevel).toBe('none')
      expect(iotn.color).toBe('success')
    })
  })

  describe('parseOrthoVoiceExam (Hands-free Voice NLP)', () => {
    it('parses Class II Div 1 with overjet and overbite from spoken speech', () => {
      const parsed = parseOrthoVoiceExam('کلاس دو دیویژن یک اورجت ۵ میلی‌متر اوربایت ۶۰ درصد')
      expect(parsed.molar_class_right).toBe('class_2_div_1')
      expect(parsed.molar_class_left).toBe('class_2_div_1')
      expect(parsed.overjet_mm).toBe(5)
      expect(parsed.overbite_percent).toBe(60)
    })

    it('parses Class III with anterior crossbite and negative overjet', () => {
      const parsed = parseOrthoVoiceExam('کلاس سه کراس بایت قدامی اورجت منفی ۳')
      expect(parsed.molar_class_right).toBe('class_3')
      expect(parsed.crossbite_anterior).toBe(true)
      expect(parsed.overjet_mm).toBe(-3)
    })

    it('parses open bite and severe upper crowding', () => {
      const parsed = parseOrthoVoiceExam('اپن بایت کراس بایت خلفی راست کراویدینگ شدید بالا پروفایل محدب')
      expect(parsed.overbite_percent).toBe(-30)
      expect(parsed.crossbite_posterior_right).toBe(true)
      expect(parsed.crowding_upper).toBe('severe')
      expect(parsed.facial_profile).toBe('convex')
    })
  })
})
