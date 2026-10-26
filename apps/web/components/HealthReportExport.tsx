'use client';

/**
 * HealthReportExport
 * ------------------
 * Generates a print-ready / PDF-exportable health & progress report
 * entirely in the browser — no server round-trip, no extra npm packages.
 *
 * The component opens a hidden <iframe>, writes a styled HTML document into
 * it, then calls window.print() inside that frame so the user gets the
 * browser "Save as PDF" dialog. Works on every modern browser/OS.
 */

import React, { useRef, useState } from 'react';
import { FileText, Download, Loader2 } from 'lucide-react';
import type { UserProfile, NutritionTargets, WaterLog, FastingSession } from '@thali/types';
import type { LocalFoodLogEntry } from '@/lib/db/db';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface WeightLogEntry {
  id: string;
  weight_kg: number;
  loggedOn: string;
}

interface ReportProps {
  profile: UserProfile | null;
  nutrition: NutritionTargets | null;
  dailyLogs: LocalFoodLogEntry[];
  weightLogs: WeightLogEntry[];
  waterLog: WaterLog | null;
  fastingSession: FastingSession | null;
  streak: number;
  adherencePercent: number;
}

// ─── SVG Macro Ring (inline for print) ───────────────────────────────────────

function macroRingSVG(protein: number, carbs: number, fat: number): string {
  const total = protein + carbs + fat || 1;
  const R = 48;
  const cx = 60;
  const cy = 60;
  const circumference = 2 * Math.PI * R;

  function arc(value: number, offset: number, color: string): string {
    const dash = (value / total) * circumference;
    return `<circle
      cx="${cx}" cy="${cy}" r="${R}"
      fill="none" stroke="${color}" stroke-width="14"
      stroke-dasharray="${dash.toFixed(2)} ${(circumference - dash).toFixed(2)}"
      stroke-dashoffset="${(-offset).toFixed(2)}"
      stroke-linecap="butt"
    />`;
  }

  const p = (protein / total) * circumference;
  const c = (carbs / total) * circumference;

  return `
    <svg width="120" height="120" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
      <circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="#e5e7eb" stroke-width="14"/>
      ${arc(protein, 0, '#a855f7')}
      ${arc(carbs, p, '#34d399')}
      ${arc(fat, p + c, '#fbbf24')}
      <text x="${cx}" y="${cy - 6}" text-anchor="middle" font-size="11" fill="#1f2937" font-family="Inter,sans-serif" font-weight="600">${Math.round(total)}g</text>
      <text x="${cx}" y="${cy + 10}" text-anchor="middle" font-size="8" fill="#6b7280" font-family="Inter,sans-serif">macros</text>
    </svg>
  `;
}

// ─── Weight Sparkline SVG ─────────────────────────────────────────────────────

function weightSparklineSVG(logs: WeightLogEntry[], target: number): string {
  if (logs.length === 0) return '<p style="color:#9ca3af;font-size:12px">No weight entries yet.</p>';

  const W = 400;
  const H = 100;
  const PAD = { top: 12, right: 12, bottom: 22, left: 36 };

  const weights = logs.map((l) => l.weight_kg);
  const allVals = [...weights, target];
  const minW = Math.min(...allVals) - 1;
  const maxW = Math.max(...allVals) + 1;

  const toX = (i: number) =>
    PAD.left + (i / Math.max(logs.length - 1, 1)) * (W - PAD.left - PAD.right);
  const toY = (w: number) =>
    PAD.top + ((maxW - w) / (maxW - minW)) * (H - PAD.top - PAD.bottom);

  const polyline = logs.map((l, i) => `${toX(i).toFixed(1)},${toY(l.weight_kg).toFixed(1)}`).join(' ');
  const targetY = toY(target).toFixed(1);

  const ticks = [minW + 0.5, (minW + maxW) / 2, maxW - 0.5];

  return `
    <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
      ${ticks
        .map(
          (v) => `
        <line x1="${PAD.left}" x2="${W - PAD.right}" y1="${toY(v).toFixed(1)}" y2="${toY(v).toFixed(1)}" stroke="#e5e7eb" stroke-width="1" stroke-dasharray="3 3"/>
        <text x="${PAD.left - 4}" y="${(toY(v) + 4).toFixed(1)}" text-anchor="end" font-size="8" fill="#9ca3af" font-family="Inter,sans-serif">${Math.round(v * 10) / 10}</text>
      `,
        )
        .join('')}
      <line x1="${PAD.left}" x2="${W - PAD.right}" y1="${targetY}" y2="${targetY}" stroke="#06b6d4" stroke-width="1.5" stroke-dasharray="5 3"/>
      <text x="${W - PAD.right + 2}" y="${(parseFloat(targetY) + 4).toFixed(1)}" font-size="7" fill="#06b6d4" font-family="Inter,sans-serif">Goal</text>
      <polyline points="${polyline}" fill="none" stroke="#a855f7" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
      ${logs
        .map(
          (l, i) =>
            `<circle cx="${toX(i).toFixed(1)}" cy="${toY(l.weight_kg).toFixed(1)}" r="3" fill="#a855f7" stroke="white" stroke-width="1.5"/>`,
        )
        .join('')}
      ${[0, Math.floor((logs.length - 1) / 2), logs.length - 1]
        .filter((v, i, a) => a.indexOf(v) === i && logs[v])
        .map(
          (i) =>
            `<text x="${toX(i).toFixed(1)}" y="${H - 4}" text-anchor="middle" font-size="8" fill="#9ca3af" font-family="Inter,sans-serif">${logs[i].loggedOn.slice(5)}</text>`,
        )
        .join('')}
    </svg>
  `;
}

// ─── HTML Report Builder ──────────────────────────────────────────────────────

function buildReportHTML(props: ReportProps): string {
  const {
    profile,
    nutrition,
    dailyLogs,
    weightLogs,
    waterLog,
    fastingSession,
    streak,
    adherencePercent,
  } = props;

  const now = new Date();
  const reportDate = now.toLocaleDateString('en-GB', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const startingWeight = weightLogs.length > 0 ? weightLogs[0].weight_kg : profile?.weight_kg ?? 0;
  const currentWeight =
    weightLogs.length > 0 ? weightLogs[weightLogs.length - 1].weight_kg : profile?.weight_kg ?? 0;
  const targetWeight = profile?.target_weight_kg ?? (profile?.weight_kg ? profile.weight_kg - 4 : 0);
  const weightDelta = Math.round((currentWeight - startingWeight) * 10) / 10;

  const macros = dailyLogs.reduce(
    (acc, e) => ({
      protein: acc.protein + e.calculatedNutrition.protein,
      carbs: acc.carbs + e.calculatedNutrition.carbs,
      fat: acc.fat + e.calculatedNutrition.fat,
      calories: acc.calories + e.calculatedNutrition.calories,
      fiber: acc.fiber + (e.calculatedNutrition.fiber || 0),
    }),
    { protein: 0, carbs: 0, fat: 0, calories: 0, fiber: 0 },
  );

  const calTarget = nutrition?.calorieTarget ?? 2000;
  const protTarget = nutrition?.macros.protein_g ?? 140;
  const carbTarget = nutrition?.macros.carbs_g ?? 200;
  const fatTarget = nutrition?.macros.fat_g ?? 55;

  const calPct = Math.min(100, Math.round((macros.calories / calTarget) * 100));
  const protPct = Math.min(100, Math.round((macros.protein / protTarget) * 100));
  const carbPct = Math.min(100, Math.round((macros.carbs / carbTarget) * 100));
  const fatPct = Math.min(100, Math.round((macros.fat / fatTarget) * 100));

  const waterMl = waterLog?.amount_ml ?? 0;
  const waterTargetMl = waterLog?.target_ml ?? 2500;
  const waterPct = Math.min(100, Math.round((waterMl / waterTargetMl) * 100));

  const ringSVG = macroRingSVG(
    Math.round(macros.protein),
    Math.round(macros.carbs),
    Math.round(macros.fat),
  );

  const sparkSVG = weightSparklineSVG(weightLogs, targetWeight);

  function bar(pct: number, color: string): string {
    return `
      <div style="background:#f3f4f6;border-radius:4px;height:8px;overflow:hidden;margin-top:4px;">
        <div style="height:100%;width:${pct}%;background:${color};border-radius:4px;"></div>
      </div>
    `;
  }

  const mealRows = dailyLogs
    .map(
      (e) => `
      <tr>
        <td style="padding:5px 8px;border-bottom:1px solid #f3f4f6;">${e.mealSlot}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #f3f4f6;">${e.foodName}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #f3f4f6;text-align:right;">${e.quantity}${e.unit}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #f3f4f6;text-align:right;">${Math.round(e.calculatedNutrition.calories)}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #f3f4f6;text-align:right;">${Math.round(e.calculatedNutrition.protein)}g</td>
        <td style="padding:5px 8px;border-bottom:1px solid #f3f4f6;text-align:right;">${Math.round(e.calculatedNutrition.carbs)}g</td>
        <td style="padding:5px 8px;border-bottom:1px solid #f3f4f6;text-align:right;">${Math.round(e.calculatedNutrition.fat)}g</td>
      </tr>
    `,
    )
    .join('');

  const weightRows = weightLogs
    .slice()
    .reverse()
    .slice(0, 10)
    .map(
      (l) => `
      <tr>
        <td style="padding:4px 8px;border-bottom:1px solid #f3f4f6;">${l.loggedOn}</td>
        <td style="padding:4px 8px;border-bottom:1px solid #f3f4f6;text-align:right;font-weight:600;color:#7c3aed;">${l.weight_kg} kg</td>
      </tr>
    `,
    )
    .join('');

  const fastingInfo = fastingSession?.isActive
    ? `${fastingSession.mode} \u00B7 started ${fastingSession.startTime?.slice(0, 5) ?? '\u2014'} \u00B7 target ${fastingSession.targetHours}h`
    : 'No active fasting window';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>AmarDiet Health Report \u00B7 ${reportDate}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', Arial, sans-serif; color: #111827; background: #ffffff; font-size: 12px; line-height: 1.5; }
    .cover { background: linear-gradient(135deg, #7c3aed 0%, #0891b2 100%); color: white; padding: 32px 40px 28px; display: flex; align-items: center; justify-content: space-between; }
    .cover-title { font-size: 28px; font-weight: 800; letter-spacing: -0.5px; }
    .cover-sub { font-size: 13px; opacity: 0.85; margin-top: 4px; }
    .cover-badge { background: rgba(255,255,255,0.18); border: 1px solid rgba(255,255,255,0.3); border-radius: 12px; padding: 8px 18px; text-align: center; }
    .cover-badge .label { font-size: 10px; opacity: 0.8; text-transform: uppercase; letter-spacing: 0.5px; }
    .cover-badge .value { font-size: 20px; font-weight: 700; }
    .page { padding: 28px 40px; }
    .section { margin-bottom: 28px; }
    .section-title { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #7c3aed; border-bottom: 2px solid #ede9fe; padding-bottom: 6px; margin-bottom: 14px; }
    .grid4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
    .stat-card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 14px 16px; }
    .stat-label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.6px; color: #9ca3af; font-weight: 600; }
    .stat-value { font-size: 22px; font-weight: 800; color: #111827; margin-top: 2px; }
    .stat-unit { font-size: 11px; color: #6b7280; font-weight: 500; }
    .macro-row { display: flex; gap: 20px; align-items: flex-start; }
    .macro-details { flex: 1; }
    .macro-item { margin-bottom: 10px; }
    .macro-item-label { display: flex; justify-content: space-between; font-size: 11px; color: #374151; font-weight: 500; margin-bottom: 3px; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th { background: #f3f4f6; padding: 7px 8px; text-align: left; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280; }
    th:not(:first-child) { text-align: right; }
    .info-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
    .info-item { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px 12px; }
    .info-item .k { font-size: 9px; text-transform: uppercase; color: #9ca3af; font-weight: 600; letter-spacing: 0.5px; }
    .info-item .v { font-size: 14px; font-weight: 700; color: #111827; margin-top: 2px; }
    .footer { margin-top: 32px; padding-top: 14px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; font-size: 9px; color: #d1d5db; text-transform: uppercase; letter-spacing: 0.5px; }
    .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } .cover { -webkit-print-color-adjust: exact; } }
  </style>
</head>
<body>
  <div class="cover">
    <div>
      <div class="cover-title">&#x1F957; AmarDiet</div>
      <div class="cover-sub">Personal Health &amp; Nutrition Report</div>
      <div style="margin-top:10px;font-size:11px;opacity:0.8;">${reportDate}</div>
      ${profile ? `<div style="margin-top:4px;font-size:12px;opacity:0.9;font-weight:600;">${profile.sex === 'male' ? '&#9794;' : '&#9792;'} ${profile.age} yrs &middot; ${profile.height_cm} cm &middot; ${(profile.goal ?? '').replace(/_/g,' ')}</div>` : ''}
    </div>
    <div style="display:flex;gap:16px;">
      <div class="cover-badge"><div class="label">&#x1F525; Streak</div><div class="value">${streak}d</div></div>
      <div class="cover-badge"><div class="label">&#x1F4C5; Adherence</div><div class="value">${adherencePercent}%</div></div>
      <div class="cover-badge"><div class="label">&#x1F4A7; Water</div><div class="value">${(waterMl / 1000).toFixed(1)}L</div></div>
    </div>
  </div>
  <div class="page">
    ${profile ? `
    <div class="section">
      <div class="section-title">Profile Summary</div>
      <div class="info-grid">
        <div class="info-item"><div class="k">Age</div><div class="v">${profile.age} yrs</div></div>
        <div class="info-item"><div class="k">Height</div><div class="v">${profile.height_cm} cm</div></div>
        <div class="info-item"><div class="k">Weight</div><div class="v">${currentWeight} kg</div></div>
        <div class="info-item"><div class="k">Goal weight</div><div class="v">${targetWeight} kg</div></div>
        <div class="info-item"><div class="k">Activity</div><div class="v">${(profile.activity_level ?? '').replace(/_/g,' ')}</div></div>
        <div class="info-item"><div class="k">Goal</div><div class="v">${(profile.goal ?? '').replace(/_/g,' ')}</div></div>
        <div class="info-item"><div class="k">BMR</div><div class="v">${Math.round(nutrition?.bmr ?? 0)} kcal</div></div>
        <div class="info-item"><div class="k">TDEE</div><div class="v">${Math.round(nutrition?.tdee ?? 0)} kcal</div></div>
      </div>
    </div>` : ''}
    <div class="section">
      <div class="section-title">Today's Calorie Summary</div>
      <div class="grid4">
        <div class="stat-card"><div class="stat-label">Target</div><div class="stat-value">${Math.round(calTarget)}</div><div class="stat-unit">kcal/day</div></div>
        <div class="stat-card"><div class="stat-label">Consumed</div><div class="stat-value">${Math.round(macros.calories)}</div><div class="stat-unit">kcal</div></div>
        <div class="stat-card"><div class="stat-label">Remaining</div><div class="stat-value">${Math.max(0, Math.round(calTarget - macros.calories))}</div><div class="stat-unit">kcal</div></div>
        <div class="stat-card"><div class="stat-label">Goal %</div><div class="stat-value">${calPct}<span style="font-size:14px">%</span></div><div class="stat-unit">of target</div></div>
      </div>
    </div>
    <div class="section">
      <div class="section-title">Macro Breakdown</div>
      <div class="macro-row">
        <div>${ringSVG}</div>
        <div class="macro-details">
          <div class="macro-item"><div class="macro-item-label"><span style="color:#a855f7;font-weight:600;">&#11044; Protein</span><span>${Math.round(macros.protein)}g / ${Math.round(protTarget)}g (${protPct}%)</span></div>${bar(protPct,'#a855f7')}</div>
          <div class="macro-item"><div class="macro-item-label"><span style="color:#34d399;font-weight:600;">&#11044; Carbohydrates</span><span>${Math.round(macros.carbs)}g / ${Math.round(carbTarget)}g (${carbPct}%)</span></div>${bar(carbPct,'#34d399')}</div>
          <div class="macro-item"><div class="macro-item-label"><span style="color:#fbbf24;font-weight:600;">&#11044; Fat</span><span>${Math.round(macros.fat)}g / ${Math.round(fatTarget)}g (${fatPct}%)</span></div>${bar(fatPct,'#fbbf24')}</div>
          <div class="macro-item"><div class="macro-item-label"><span style="color:#6b7280;font-weight:600;">&#11044; Fibre</span><span>${Math.round(macros.fiber)}g</span></div></div>
        </div>
      </div>
    </div>
    <div class="section">
      <div class="section-title">Weight Trend</div>
      <div style="display:flex;gap:20px;align-items:flex-start;">
        <div>${sparkSVG}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;min-width:200px;">
          <div class="stat-card"><div class="stat-label">Starting</div><div class="stat-value" style="font-size:17px;">${startingWeight}</div><div class="stat-unit">kg</div></div>
          <div class="stat-card"><div class="stat-label">Current</div><div class="stat-value" style="font-size:17px;color:#7c3aed;">${currentWeight}</div><div class="stat-unit">kg</div></div>
          <div class="stat-card"><div class="stat-label">Change</div><div style="font-size:17px;font-weight:800;color:${weightDelta < 0 ? '#059669' : weightDelta > 0 ? '#dc2626' : '#6b7280'}">${weightDelta > 0 ? '+' : ''}${weightDelta} kg</div></div>
          <div class="stat-card"><div class="stat-label">Goal</div><div class="stat-value" style="font-size:17px;color:#0891b2;">${targetWeight}</div><div class="stat-unit">kg</div></div>
        </div>
      </div>
      ${weightLogs.length > 0 ? `<div style="margin-top:14px;"><table><thead><tr><th>Date</th><th style="text-align:right;">Weight</th></tr></thead><tbody>${weightRows}</tbody></table></div>` : ''}
    </div>
    <div class="section">
      <div class="section-title">Hydration &amp; Fasting</div>
      <div class="grid2">
        <div class="stat-card">
          <div class="stat-label">&#x1F4A7; Water Intake</div>
          <div style="margin-top:8px;">
            <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:4px;"><span>${(waterMl / 1000).toFixed(2)} L consumed</span><span style="color:#9ca3af;">${(waterTargetMl / 1000).toFixed(1)} L target</span></div>
            ${bar(waterPct,'#06b6d4')}
            <div style="text-align:right;font-size:10px;color:#9ca3af;margin-top:2px;">${waterPct}% of daily target</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-label">&#x23F1; Fasting Window</div>
          <div style="margin-top:10px;font-size:13px;font-weight:600;color:${fastingSession?.isActive ? '#7c3aed' : '#9ca3af'};">${fastingInfo}</div>
        </div>
      </div>
    </div>
    ${dailyLogs.length > 0 ? `
    <div class="section">
      <div class="section-title">Today's Food Log (${dailyLogs.length} entries)</div>
      <table>
        <thead><tr><th>Meal</th><th>Food</th><th style="text-align:right;">Amount</th><th style="text-align:right;">Kcal</th><th style="text-align:right;">Protein</th><th style="text-align:right;">Carbs</th><th style="text-align:right;">Fat</th></tr></thead>
        <tbody>
          ${mealRows}
          <tr style="background:#f9fafb;font-weight:700;">
            <td colspan="3" style="padding:6px 8px;border-top:2px solid #e5e7eb;">Total</td>
            <td style="padding:6px 8px;border-top:2px solid #e5e7eb;text-align:right;">${Math.round(macros.calories)}</td>
            <td style="padding:6px 8px;border-top:2px solid #e5e7eb;text-align:right;">${Math.round(macros.protein)}g</td>
            <td style="padding:6px 8px;border-top:2px solid #e5e7eb;text-align:right;">${Math.round(macros.carbs)}g</td>
            <td style="padding:6px 8px;border-top:2px solid #e5e7eb;text-align:right;">${Math.round(macros.fat)}g</td>
          </tr>
        </tbody>
      </table>
    </div>` : ''}
    <div class="footer">
      <span>AmarDiet &middot; Personalized Nutrition Platform</span>
      <span>Generated ${now.toISOString().replace('T',' ').slice(0,19)} UTC</span>
      <span>Confidential &middot; For personal use only</span>
    </div>
  </div>
</body>
</html>`;
}

// ─── Export Button Component ──────────────────────────────────────────────────

export default function HealthReportExport(props: ReportProps) {
  const [loading, setLoading] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleExport = () => {
    setLoading(true);
    try {
      const html = buildReportHTML(props);
      const iframe = iframeRef.current!;
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!doc) { setLoading(false); return; }
      doc.open();
      doc.write(html);
      doc.close();
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setLoading(false);
      }, 800);
    } catch (err) {
      console.error('Report generation failed:', err);
      setLoading(false);
    }
  };

  return (
    <>
      <iframe
        ref={iframeRef}
        aria-hidden="true"
        style={{ position: 'absolute', top: -9999, left: -9999, width: 1, height: 1, border: 0 }}
        title="Health Report Print Frame"
      />
      <button
        id="export-health-report-btn"
        onClick={handleExport}
        disabled={loading}
        className="flex items-center space-x-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white text-sm font-bold rounded-xl transition min-h-[44px] shadow-lg shadow-violet-900/30"
        aria-label="Download PDF health report"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
        <span>{loading ? 'Preparing\u2026' : 'Export PDF Report'}</span>
        <FileText className="w-4 h-4 opacity-70" />
      </button>
    </>
  );
}
