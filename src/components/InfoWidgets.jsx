// FR-INT-001: цаг агаар, валютын ханшийг эх сурвалж, татсан цагтай нь харуулна
import { Link } from 'react-router-dom';
import { Sun, CloudSun, Cloud, CloudFog, CloudDrizzle, CloudRain, CloudSnow, CloudLightning, AlertTriangle } from 'lucide-react';
import { useDb } from '../lib/useDb';
import { fmtDate, timeAgo } from '../lib/format';

export function WeatherIcon({ code, size = 18 }) {
  let Icon = Cloud;
  if (code === 0) Icon = Sun;
  else if (code <= 2) Icon = CloudSun;
  else if (code === 45 || code === 48) Icon = CloudFog;
  else if (code >= 51 && code <= 57) Icon = CloudDrizzle;
  else if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) Icon = CloudRain;
  else if ((code >= 71 && code <= 77) || code === 85 || code === 86) Icon = CloudSnow;
  else if (code >= 95) Icon = CloudLightning;
  return <Icon size={size} />;
}

const FX_NAMES = { USD: 'Ам.доллар', EUR: 'Евро', CNY: 'Юань', RUB: 'Рубль', KRW: 'Вон', JPY: 'Иен' };

function Stale({ settings, rows }) {
  if (!settings.lastError) return null;
  return (
    <div className="stale">
      <AlertTriangle size={13} />
      {rows.length
        ? `Шинэчлэх боломжгүй байна. Сүүлд ${fmtDate(rows[0].fetchedAt)}-нд татсан өгөгдөл.`
        : 'Мэдээлэл татаж чадсангүй.'}
    </div>
  );
}

export function WeatherCard() {
  const db = useDb();
  const s = db.settings.weather;
  const rows = db.external.filter((r) => r.type === 'weather');
  const w = rows[0];
  return (
    <div className="card widget">
      <div className="widget-head"><h3>Цаг агаар</h3><Link to="/tsag-agaar-hansh" className="link">7 хоног ›</Link></div>
      {w ? (
        <div className="weather">
          <div className="weather-icon"><WeatherIcon code={w.code} size={34} /></div>
          <div>
            <div className="weather-temp">{Math.round(w.temp)}°C</div>
            <div className="muted">{w.condition}</div>
          </div>
        </div>
      ) : (
        <p className="muted small">{s.lastError ? '' : 'Ачаалж байна…'}</p>
      )}
      <Stale settings={s} rows={rows} />
      {w && <div className="widget-foot">Эх сурвалж: {w.source} · {timeAgo(w.fetchedAt)}</div>}
    </div>
  );
}

export function FxCard() {
  const db = useDb();
  const s = db.settings.fx;
  const rows = db.external.filter((r) => r.type === 'fx');
  return (
    <div className="card widget">
      <div className="widget-head"><h3>Валютын ханш</h3><Link to="/tsag-agaar-hansh" className="link">Бүх ханш ›</Link></div>
      {rows.length ? (
        <div className="fx">
          {rows.map((r) => (
            <div key={r.key} className="fx-row">
              <span><strong>{r.key}</strong> <span className="muted small">{FX_NAMES[r.key] || ''}</span></span>
              <span className="fx-val">{Number(r.value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="muted small">{s.lastError ? '' : 'Ачаалж байна…'}</p>
      )}
      <Stale settings={s} rows={rows} />
      {rows[0] && <div className="widget-foot">Эх сурвалж: {rows[0].source} · {timeAgo(rows[0].fetchedAt)}</div>}
    </div>
  );
}
