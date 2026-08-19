import { describe, expect, it } from 'vitest';
import { KPI, type Sifat, holat } from '../src/sifat.js';

const BOSH: Sifat = {
  platform: 'uzum', last_sweep_at: null, coverage_percent: null, error_percent: null,
  requested: null, found: null, missing: null, errors: null, stopped_reason: null,
  measured_today: 0, has_data: false,
};

const YAXSHI: Sifat = {
  ...BOSH, has_data: true, last_sweep_at: '2026-08-19T09:00:00Z',
  coverage_percent: 98, error_percent: 0.5, requested: 1000, found: 980,
  missing: 15, errors: 5, measured_today: 980,
};

describe('sifat holati', () => {
  it('oʻlchov yoʻq boʻlsa "yaxshi" ham, "yomon" ham demaydi', () => {
    // Ishga tushmagan yigʻuvchi "hammasi joyida" boʻlib koʻrinmasligi kerak.
    expect(holat(BOSH)).toBe('olchov_yoq');
  });

  it('qamrov yuqori, xato past — yaxshi', () => {
    expect(holat(YAXSHI)).toBe('yaxshi');
  });

  it('qamrov pasaysa — ogohlantirish', () => {
    expect(holat({ ...YAXSHI, coverage_percent: KPI.minCoveragePercent - 1 })).toBe('ogohlantirish');
  });

  it('xato chegaradan oshsa — yomon', () => {
    expect(holat({ ...YAXSHI, error_percent: KPI.maxErrorPercent + 0.1 })).toBe('yomon');
  });

  it('kill-switch ishlagan boʻlsa — yomon, qamrov yuqori boʻlsa ham', () => {
    // Yarim yoʻlda toʻxtagan aylanish qamrovi yuqori koʻrinishi mumkin,
    // chunki u soʻralganlarning faqat bir qismiga ulgurgan.
    expect(holat({ ...YAXSHI, stopped_reason: "xato ulushi 30% — to'xtatildi" })).toBe('yomon');
  });
});
