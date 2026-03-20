/**
 * Qwilr-style engagement speedometer: Unmonitored (arc + plus), Neutral (needle up), Highly engaged (needle right, colored).
 */
import React from 'react';
import { Tooltip } from 'antd';
import './EngagementGaugeIcon.css';

const TOOLTIP_LABELS = {
  unmonitored: 'Unmonitored',
  low: 'Neutral',
  medium: 'Neutral',
  high: 'Highly engaged',
};

function EngagementGaugeIcon({ level = 'unmonitored', className, size = 22 }) {
  const tip = TOOLTIP_LABELS[level] || TOOLTIP_LABELS.unmonitored;

  if (level === 'unmonitored') {
    return (
      <Tooltip title={tip}>
        <span className={`engagement-gauge-btn engagement-gauge-unmonitored ${className || ''}`} style={{ width: size, height: size }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 14 A 7 7 0 0 1 19 14" className="engagement-gauge-arc" strokeDasharray="2 1.5" />
            <path d="M12 12.8v4.4M9.8 15h4.4" strokeLinecap="round" strokeDasharray="none" />
          </svg>
        </span>
      </Tooltip>
    );
  }

  const isHigh = level === 'high';
  const needleAngle = isHigh ? 0 : 90;
  const angleRad = (needleAngle * Math.PI) / 180;
  const needleLength = 5.5;
  const cx = 12;
  const cy = 15;
  const needleX = cx + needleLength * Math.cos(angleRad);
  const needleY = cy - needleLength * Math.sin(angleRad);

  return (
    <Tooltip title={tip}>
      <span
        className={`engagement-gauge-btn ${isHigh ? 'engagement-gauge-high' : 'engagement-gauge-neutral'} ${className || ''}`}
        style={{ width: size, height: size }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M5 14 A 7 7 0 0 1 19 14" fill="none" className="engagement-gauge-arc" />
          <line x1={cx} y1={cy} x2={needleX} y2={needleY} strokeLinecap="round" className="engagement-gauge-needle" strokeWidth="2.2" />
        </svg>
      </span>
    </Tooltip>
  );
}

export default EngagementGaugeIcon;
