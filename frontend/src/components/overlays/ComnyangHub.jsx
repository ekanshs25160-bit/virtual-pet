import React, { useState } from 'react';
import './Overlays.css';

export const CAT_PATTERNS = [
  { id: 'black', label: 'Tuxedo Black', filter: 'none' },
  {
    id: 'orange',
    label: 'Orange Tabby',
    filter: 'sepia(1) saturate(4.2) hue-rotate(-15deg) brightness(1.12)',
  },
  {
    id: 'calico',
    label: 'Warm Calico',
    filter: 'sepia(0.85) saturate(3) hue-rotate(-25deg) contrast(1.1)',
  },
  {
    id: 'white',
    label: 'Snow Marshmallow',
    filter: 'invert(0.88) sepia(0.12) saturate(0.6) brightness(1.18)',
  },
  {
    id: 'blue',
    label: 'Russian Blue',
    filter: 'sepia(0.4) saturate(1.8) hue-rotate(165deg) brightness(1.08)',
  },
  {
    id: 'sakura',
    label: 'Sakura Mochi',
    filter: 'sepia(0.9) saturate(3.2) hue-rotate(285deg) brightness(1.15)',
  },
];

export default function ComnyangHub({
  settings,
  onUpdateSettings,
  activeAppName,
  inferredActivity,
  onTriggerTestReminder,
  onSimulateAiAgent,
  onClose,
}) {
  const [tab, setTab] = useState('pattern'); // 'pattern' | 'notes' | 'reminders' | 'brain'
  const [newRemTime, setNewRemTime] = useState('17:00');
  const [newRemText, setNewRemText] = useState('Stand up & check posture!');
  const [copiedSync, setCopiedSync] = useState(false);

  const update = (patch) => {
    onUpdateSettings({ ...settings, ...patch });
  };

  const toggleMarking = (key) => {
    update({
      markings: {
        ...settings.markings,
        [key]: !settings.markings?.[key],
      },
    });
  };

  const addReminder = (e) => {
    e.preventDefault();
    if (!newRemText.trim()) return;
    const nextList = [
      ...(settings.reminders || []),
      {
        id: Date.now().toString(),
        time: newRemTime,
        text: newRemText.trim(),
      },
    ];
    update({ reminders: nextList });
    setNewRemText('');
  };

  const removeReminder = (id) => {
    update({
      reminders: (settings.reminders || []).filter((r) => r.id !== id),
    });
  };

  const copySyncCode = () => {
    try {
      navigator.clipboard.writeText(JSON.stringify(settings));
      setCopiedSync(true);
      setTimeout(() => setCopiedSync(false), 2000);
    } catch (_) {}
  };

  return (
    <div
      className="comnyang-hub"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="hub-header">
        <span className="hub-title">🐾 COMNYANG STUDIO</span>
        <button className="pomo-close-btn" onClick={onClose}>
          ×
        </button>
      </div>

      <div className="hub-tabs">
        <button
          className={`hub-tab ${tab === 'pattern' ? 'active' : ''}`}
          onClick={() => setTab('pattern')}
        >
          🎨 Fur
        </button>
        <button
          className={`hub-tab ${tab === 'notes' ? 'active' : ''}`}
          onClick={() => setTab('notes')}
        >
          📌 Note
        </button>
        <button
          className={`hub-tab ${tab === 'reminders' ? 'active' : ''}`}
          onClick={() => setTab('reminders')}
        >
          ⏰ Timers
        </button>
        <button
          className={`hub-tab ${tab === 'brain' ? 'active' : ''}`}
          onClick={() => setTab('brain')}
        >
          🧠 Brain
        </button>
      </div>

      {tab === 'pattern' && (
        <div className="hub-body">
          <div className="hub-label">Cat Coat Pattern:</div>
          <div className="pattern-grid">
            {CAT_PATTERNS.map((p) => (
              <button
                key={p.id}
                className={`pattern-chip ${
                  settings.patternId === p.id ? 'active' : ''
                }`}
                onClick={() => update({ patternId: p.id })}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="hub-label" style={{ marginTop: 6 }}>
            Custom Markings & Eyes:
          </div>
          <div className="markings-row">
            <label className="hub-check">
              <input
                type="checkbox"
                checked={Boolean(settings.markings?.stripes)}
                onChange={() => toggleMarking('stripes')}
              />
              Tabby Stripes
            </label>
            <label className="hub-check">
              <input
                type="checkbox"
                checked={Boolean(settings.markings?.bib)}
                onChange={() => toggleMarking('bib')}
              />
              Chest Bib
            </label>
            <label className="hub-check">
              <input
                type="checkbox"
                checked={Boolean(settings.markings?.blush)}
                onChange={() => toggleMarking('blush')}
              />
              Cheek Blush
            </label>
            <label className="hub-check">
              <input
                type="checkbox"
                checked={Boolean(settings.markings?.calicoPatch)}
                onChange={() => toggleMarking('calicoPatch')}
              />
              Calico Spot
            </label>
          </div>

          <div className="eye-color-row">
            <span>Eyes:</span>
            {['#facc15', '#4ade80', '#38bdf8', '#f472b6'].map((color) => (
              <button
                key={color}
                className={`eye-swatch ${
                  settings.eyeColor === color ? 'active' : ''
                }`}
                style={{ background: color }}
                onClick={() => update({ eyeColor: color })}
              />
            ))}
          </div>
        </div>
      )}

      {tab === 'notes' && (
        <div className="hub-body">
          <div className="hub-label">Tell Your Name:</div>
          <input
            className="hub-input"
            type="text"
            placeholder="Your name (e.g. Ekansh)"
            value={settings.userName || ''}
            onChange={(e) => update({ userName: e.target.value })}
          />

          <div className="hub-label" style={{ marginTop: 6 }}>
            Fixed Message (Pinned Above Head):
          </div>
          <input
            className="hub-input"
            type="text"
            placeholder="Pin an important note..."
            value={settings.fixedMessage || ''}
            onChange={(e) => update({ fixedMessage: e.target.value })}
          />
          {settings.fixedMessage && (
            <button
              className="hub-action-btn"
              onClick={() => update({ fixedMessage: '' })}
            >
              Clear Pinned Note
            </button>
          )}
        </div>
      )}

      {tab === 'reminders' && (
        <div className="hub-body">
          <div className="reminder-row">
            <span>🧘 Stretch (mins):</span>
            <input
              className="hub-num-input"
              type="number"
              min="1"
              max="180"
              value={settings.stretchIntervalMin}
              onChange={(e) =>
                update({ stretchIntervalMin: Number(e.target.value) || 20 })
              }
            />
            <button
              className="pomo-btn"
              onClick={() => onTriggerTestReminder('STRETCH')}
            >
              Test
            </button>
          </div>

          <div className="reminder-row">
            <span>💧 Water (mins):</span>
            <input
              className="hub-num-input"
              type="number"
              min="1"
              max="180"
              value={settings.waterIntervalMin}
              onChange={(e) =>
                update({ waterIntervalMin: Number(e.target.value) || 30 })
              }
            />
            <button
              className="pomo-btn"
              onClick={() => onTriggerTestReminder('WATER')}
            >
              Test
            </button>
          </div>

          <div className="hub-label" style={{ marginTop: 6 }}>
            Add Time Reminder:
          </div>
          <form className="reminder-form" onSubmit={addReminder}>
            <input
              className="hub-time-input"
              type="time"
              value={newRemTime}
              onChange={(e) => setNewRemTime(e.target.value)}
            />
            <input
              className="hub-input"
              type="text"
              placeholder="Message..."
              value={newRemText}
              onChange={(e) => setNewRemText(e.target.value)}
            />
            <button type="submit" className="pomo-btn active">
              +
            </button>
          </form>

          <div className="reminder-list">
            {(settings.reminders || []).map((r) => (
              <div key={r.id} className="reminder-item">
                <span>
                  <b>{r.time}</b> {r.text}
                </span>
                <div>
                  <button
                    className="pomo-btn"
                    onClick={() => onTriggerTestReminder('CUSTOM', r.text)}
                  >
                    ▶
                  </button>
                  <button
                    className="pomo-close-btn"
                    onClick={() => removeReminder(r.id)}
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'brain' && (
        <div className="hub-body">
          <div className="brain-status-box">
            <div>
              <b>Active App:</b> {activeAppName || 'Desktop'}
            </div>
            <div>
              <b>Brain State:</b> {inferredActivity}
            </div>
            <div className="brain-agents">
              Auto-detects: Claude Code · Codex · Cursor · Antigravity · Kiro ·
              Copilot · Devin · OpenCode
            </div>
          </div>

          <div className="hub-row-btns" style={{ gridTemplateColumns: '1fr' }}>
            <button className="hub-action-btn" onClick={onSimulateAiAgent}>
              🤖 Simulate AI Agent Task
            </button>
          </div>

          <div className="hub-label" style={{ marginTop: 6 }}>
            Multi-Device License Key:
          </div>
          <div className="license-row">
            <input
              className="hub-input"
              type="text"
              value={settings.licenseKey || 'COMNYANG-MULTI-2026-PRO'}
              onChange={(e) => update({ licenseKey: e.target.value })}
            />
            <button className="pomo-btn active" onClick={copySyncCode}>
              {copiedSync ? 'Copied!' : 'Sync'}
            </button>
          </div>
          <div className="license-Badge">
            ✓ Active across MacBook & Desktop (No Telemetry)
          </div>
        </div>
      )}
    </div>
  );
}
