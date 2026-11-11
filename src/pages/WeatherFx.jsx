// FR-INT-001: цаг агаар (өнөөдөр, 24 цаг, 7 хоног) ба валютын ханшийн дэлгэрэнгүй хуудас.
// Өгөгдлийг Open-Meteo, ExchangeRate-API-аас шууд татна; амжилтгүй бол сайтын хадгалсан өгөгдлийг харуулна.
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeftRight, Droplets, Wind, Thermometer, Sunrise, Sunset, RefreshCw, ChevronRight, Search } from 'lucide-react';
import { useDb } from '../lib/useDb';
import { weatherLabel } from '../api/external';
import { WeatherIcon } from '../components/InfoWidgets';
import { Alert, Spinner } from '../components/ui';
import { fmtDate } from '../lib/format';

const CITIES = [
  { name: 'Улаанбаатар', lat: 47.92, lon: 106.92 },
  { name: 'Дархан', lat: 49.49, lon: 105.97 },
  { name: 'Эрдэнэт', lat: 49.03, lon: 104.08 },
  { name: 'Чойбалсан', lat: 48.07, lon: 114.53 },
  { name: 'Мөрөн', lat: 49.64, lon: 100.16 },
  { name: 'Улаангом', lat: 49.98, lon: 92.07 },
  { name: 'Ховд', lat: 48.01, lon: 91.64 },
  { name: 'Даланзадгад', lat: 43.57, lon: 104.42 },
  { name: 'Замын-Үүд', lat: 43.72, lon: 111.9 },
];

const CURRENCIES = [
  ['USD', 'Ам.доллар', '🇺🇸'], ['EUR', 'Евро', '🇪🇺'], ['CNY', 'Хятад юань', '🇨🇳'], ['RUB', 'Орос рубль', '🇷🇺'],
  ['KRW', 'Солонгос вон', '🇰🇷'], ['JPY', 'Япон иен', '🇯🇵'], ['GBP', 'Англи фунт', '🇬🇧'], ['CHF', 'Швейцарь франк', '🇨🇭'],
  ['HKD', 'Хонконг доллар', '🇭🇰'], ['SGD', 'Сингапур доллар', '🇸🇬'], ['AUD', 'Австрали доллар', '🇦🇺'], ['CAD', 'Канад доллар', '🇨🇦'],
  ['KZT', 'Казах тэнгэ', '🇰🇿'], ['TRY', 'Турк лир', '🇹🇷'], ['THB', 'Тай бат', '🇹🇭'], ['INR', 'Энэтхэг рупи', '🇮🇳'],
  ['AED', 'АНЭУ дирхам', '🇦🇪'], ['TWD', 'Тайвань доллар', '🇹🇼'], ['SEK', 'Швед крон', '🇸🇪'], ['PLN', 'Польш злот', '🇵🇱'],
];

const WEEKDAYS = ['Ням', 'Даваа', 'Мягмар', 'Лхагва', 'Пүрэв', 'Баасан', 'Бямба'];
const hhmm = (iso) => iso.slice(11, 16);
const num = (v, d = 2) => Number(v).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });

function useJson(url) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    const ctrl = new AbortController();
    setState((s) => ({ ...s, loading: true, error: null }));
    fetch(url, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data) => alive && setState({ data, error: null, loading: false }))
      .catch((e) => alive && e.name !== 'AbortError' && setState((s) => ({ ...s, error: e.message, loading: false })));
    return () => {
      alive = false;
      ctrl.abort();
    };
  }, [url, tick]);
  return { ...state, reload: () => setTick((t) => t + 1) };
}

function WeatherSection() {
  const db = useDb();
  const [city, setCity] = useState(CITIES[0]);
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}` +
    '&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code' +
    '&hourly=temperature_2m,weather_code,precipitation_probability&forecast_hours=24' +
    '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset' +
    '&forecast_days=7&wind_speed_unit=ms&timezone=Asia%2FUlaanbaatar';
  const { data, error, loading, reload } = useJson(url);
  const saved = db.external.find((r) => r.type === 'weather');
  const c = data?.current;
  const d = data?.daily;
  const range = d ? [Math.min(...d.temperature_2m_min), Math.max(...d.temperature_2m_max)] : [0, 1];
  const pct = (t) => ((t - range[0]) / (range[1] - range[0] || 1)) * 100;

  return (
    <section className="card info-section" aria-labelledby="wx-title">
      <div className="card-head row between">
        <h2 id="wx-title" className="h-title">Цаг агаар</h2>
        <div className="row nowrap">
          <select className="select auto sm" value={city.name} onChange={(e) => setCity(CITIES.find((x) => x.name === e.target.value))} aria-label="Хот сонгох">
            {CITIES.map((x) => <option key={x.name}>{x.name}</option>)}
          </select>
          <button className="icon-btn sm" onClick={reload} title="Шинэчлэх" aria-label="Шинэчлэх"><RefreshCw size={15} /></button>
        </div>
      </div>
      <div className="card-body">
        {loading && !data && <div className="center"><Spinner /></div>}
        {error && !data && (
          <Alert tone="warn" title="Цаг агаарын мэдээлэл татаж чадсангүй.">
            {saved && city.name === CITIES[0].name ? `Сүүлд хадгалсан: ${saved.value} (${fmtDate(saved.fetchedAt)})` : 'Дараа дахин оролдоно уу.'}
          </Alert>
        )}
        {c && (
          <>
            <div className="wx-now">
              <div className="wx-now-main">
                <span className="wx-now-icon"><WeatherIcon code={c.weather_code} size={52} /></span>
                <div>
                  <div className="wx-now-temp">{Math.round(c.temperature_2m)}°C</div>
                  <div className="muted">{weatherLabel(c.weather_code)} · {city.name}</div>
                </div>
              </div>
              <dl className="wx-facts">
                <div><dt><Thermometer size={14} /> Мэдрэгдэх</dt><dd>{Math.round(c.apparent_temperature)}°C</dd></div>
                <div><dt><Droplets size={14} /> Чийгшил</dt><dd>{c.relative_humidity_2m}%</dd></div>
                <div><dt><Wind size={14} /> Салхи</dt><dd>{Math.round(c.wind_speed_10m)} м/с</dd></div>
                {d && <div><dt><Sunrise size={14} /> Нар мандах</dt><dd>{hhmm(d.sunrise[0])}</dd></div>}
                {d && <div><dt><Sunset size={14} /> Нар жаргах</dt><dd>{hhmm(d.sunset[0])}</dd></div>}
              </dl>
            </div>

            <h3 className="info-sub">Ойрын 24 цаг</h3>
            <div className="wx-hours" role="list">
              {data.hourly.time.map((t, i) => (
                <div key={t} className="wx-hour" role="listitem">
                  <span className="muted small">{hhmm(t)}</span>
                  <WeatherIcon code={data.hourly.weather_code[i]} size={20} />
                  <strong>{Math.round(data.hourly.temperature_2m[i])}°</strong>
                  <span className="wx-rain small">{data.hourly.precipitation_probability[i] ?? 0}%</span>
                </div>
              ))}
            </div>

            <h3 className="info-sub">7 хоногийн урьдчилсан мэдээ</h3>
            <div className="wx-days">
              {d.time.map((t, i) => {
                const lo = d.temperature_2m_min[i];
                const hi = d.temperature_2m_max[i];
                return (
                  <div key={t} className="wx-day">
                    <span className="wx-day-name">{i === 0 ? 'Өнөөдөр' : WEEKDAYS[new Date(`${t}T12:00:00`).getDay()]}</span>
                    <span className="wx-day-icon" title={weatherLabel(d.weather_code[i])}><WeatherIcon code={d.weather_code[i]} size={20} /></span>
                    <span className="wx-rain small">{d.precipitation_probability_max[i] ?? 0}%</span>
                    <span className="wx-lo">{Math.round(lo)}°</span>
                    <span className="wx-bar" aria-hidden="true">
                      <span style={{ left: `${pct(lo)}%`, width: `${Math.max(pct(hi) - pct(lo), 4)}%` }} />
                    </span>
                    <span className="wx-hi">{Math.round(hi)}°</span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
      <div className="widget-foot card-foot">Эх сурвалж: <a className="link" href="https://open-meteo.com" target="_blank" rel="noreferrer">Open-Meteo</a> · бороо/цасны магадлал %</div>
    </section>
  );
}

function FxSection() {
  const db = useDb();
  const { data, error, loading, reload } = useJson('https://open.er-api.com/v6/latest/USD');
  const [q, setQ] = useState('');
  const [amount, setAmount] = useState('100');
  const [cur, setCur] = useState('USD');
  const [toMnt, setToMnt] = useState(true);

  // ₮ / 1 нэгж. API амжилтгүй бол сайтын хадгалсан ханшийг ашиглана.
  const rates = useMemo(() => {
    if (data?.rates?.MNT) {
      return CURRENCIES.filter(([k]) => data.rates[k]).map(([k, name, flag]) => ({ k, name, flag, v: data.rates.MNT / data.rates[k] }));
    }
    return db.external
      .filter((r) => r.type === 'fx')
      .map((r) => {
        const meta = CURRENCIES.find(([k]) => k === r.key) || [r.key, '', ''];
        return { k: r.key, name: meta[1], flag: meta[2], v: Number(r.value) };
      });
  }, [data, db.external]);
  const savedAt = db.external.find((r) => r.type === 'fx')?.fetchedAt;
  const list = rates.filter((r) => !q.trim() || `${r.k} ${r.name}`.toLowerCase().includes(q.trim().toLowerCase()));
  const rate = rates.find((r) => r.k === cur)?.v;
  const amt = Number(String(amount).replace(/,/g, '')) || 0;
  const result = rate ? (toMnt ? amt * rate : amt / rate) : 0;

  return (
    <section className="card info-section" aria-labelledby="fx-title">
      <div className="card-head row between">
        <h2 id="fx-title" className="h-title">Валютын ханш</h2>
        <div className="row nowrap">
          <span className="muted small">₮ / 1 нэгж</span>
          <button className="icon-btn sm" onClick={reload} title="Шинэчлэх" aria-label="Шинэчлэх"><RefreshCw size={15} /></button>
        </div>
      </div>
      <div className="card-body">
        {error && !data && (
          <Alert tone="warn" title="Шинэ ханш татаж чадсангүй.">
            {rates.length ? `Сайтын хадгалсан ханшийг харуулж байна${savedAt ? ` (${fmtDate(savedAt)})` : ''}.` : 'Дараа дахин оролдоно уу.'}
          </Alert>
        )}

        {rates.length > 0 && (
          <div className="fx-convert">
            <input className="input" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ''))} aria-label="Дүн" />
            <select className="select auto" value={cur} onChange={(e) => setCur(e.target.value)} aria-label="Валют">
              {rates.map((r) => <option key={r.k} value={r.k}>{r.k}</option>)}
            </select>
            <button type="button" className="icon-btn" onClick={() => setToMnt((x) => !x)} title="Чиглэл солих" aria-label="Чиглэл солих"><ArrowLeftRight size={16} /></button>
            <div className="fx-result">
              {toMnt ? <>{num(amt)} {cur} = <strong>₮{num(result)}</strong></> : <>₮{num(amt)} = <strong>{num(result, 4)} {cur}</strong></>}
            </div>
          </div>
        )}

        <div className="search mt-16">
          <Search size={16} />
          <input className="input" placeholder="Валют хайх (USD, юань…)" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {loading && !rates.length ? (
          <div className="center mt-16"><Spinner /></div>
        ) : (
          <div className="table-wrap mt-8">
            <table className="table fx-table">
              <thead><tr><th>Валют</th><th className="num">1 нэгж (₮)</th><th className="num">₮1,000 =</th></tr></thead>
              <tbody>
                {list.map((r) => (
                  <tr key={r.k}>
                    <td><span className="fx-flag" aria-hidden="true">{r.flag}</span> <strong>{r.k}</strong> <span className="muted small">{r.name}</span></td>
                    <td className="num">{num(r.v, r.v < 10 ? 4 : 2)}</td>
                    <td className="num muted">{num(1000 / r.v, 2)} {r.k}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div className="widget-foot card-foot">
        Эх сурвалж: <a className="link" href="https://www.exchangerate-api.com" target="_blank" rel="noreferrer">ExchangeRate-API</a>
        {data?.time_last_update_utc && <> · шинэчилсэн {fmtDate(data.time_last_update_unix * 1000)}</>}
        {' '}· Монголбанкны албан ханшаас бага зэрэг зөрж болно
      </div>
    </section>
  );
}

export default function WeatherFx() {
  return (
    <div className="container page">
      <nav className="crumbs">
        <Link to="/">Нүүр</Link>
        <ChevronRight size={14} />
        <span>Цаг агаар, валютын ханш</span>
      </nav>
      <h1 className="page-title">Цаг агаар, валютын ханш</h1>
      <div className="info-grid">
        <WeatherSection />
        <FxSection />
      </div>
    </div>
  );
}
