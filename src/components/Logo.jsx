// News Freshest лого: халфтон (цэгэн хэвлэлийн) мегафон, шар дууны долгион.
// Сонины хайчилбар маягийн «стикер» — цагаан хүрээ, зөөлөн сүүдэр.
import { useId } from 'react';

const YELLOW = '#f2c230';

/** Мегафоны дүрс (64×64 талбарт). Favicon-д ч ижил дүрсийг ашигладаг. */
export function LogoMark({ size = 32, className = '' }) {
  const id = useId().replace(/:/g, '');
  const dots = `nf-dots-${id}`;
  const shade = `nf-shade-${id}`;
  const shadow = `nf-shadow-${id}`;
  // Мегафоны хэлбэр (эргүүлэхээс өмнө, хэвтээ байрлалаар)
  const body = 'M16 27 L41 17 L41 47 L16 37 Z';
  const handle = 'M22 36 L29 38 L27.5 53 Q24 55.5 20.5 53 Z';
  return (
    <svg className={`logo-mark ${className}`} width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <pattern id={dots} width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <circle cx="1.5" cy="1.5" r="1.05" fill="#15171c" />
        </pattern>
        {/* Гэрэл сүүдэр: дээд тал нь цайвар (цэг жижиг харагдана) */}
        <linearGradient id={shade} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.72" />
          <stop offset="0.55" stopColor="#fff" stopOpacity="0.15" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <filter id={shadow} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="0.9" floodColor="#000" floodOpacity="0.22" />
        </filter>
      </defs>

      {/* Дууны гурван долгион (дусал хэлбэр) */}
      <g fill="none" stroke={YELLOW} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round">
        <path d="M45 15 L55.5 4.5 Q60 2 60.5 6.5 Q60 10 47 16.5 Z" />
        <path d="M47.5 23.5 L60.5 19.5 Q63.5 21 61.5 24.5 L48 25.5 Z" />
        <path d="M47 31 L58.5 34 Q61 37 57.5 38.5 Z" />
      </g>

      <g transform="rotate(-24 32 34)">
        {/* Стикерийн цагаан хүрээ */}
        <g filter={`url(#${shadow})`} fill="#fff" stroke="#fff" strokeWidth="5" strokeLinejoin="round">
          <rect x="8" y="27" width="10" height="10" rx="2.5" />
          <path d={body} />
          <path d={handle} />
          <ellipse cx="41" cy="32" rx="4.5" ry="15.5" />
        </g>
        {/* Бариул ба их бие — цэгэн дүүргэлт */}
        <path d={handle} fill={`url(#${dots})`} />
        <path d={handle} fill={`url(#${shade})`} />
        <path d={body} fill={`url(#${dots})`} />
        <path d={body} fill={`url(#${shade})`} />
        {/* Амсар (хар) */}
        <rect x="8" y="27" width="9" height="10" rx="2.5" fill="#15171c" />
        {/* Хоншоор: хар хүрээтэй, дотор нь цэгтэй */}
        <ellipse cx="41" cy="32" rx="4.2" ry="15" fill={`url(#${dots})`} stroke="#15171c" strokeWidth="2.4" />
      </g>
    </svg>
  );
}

export default function Logo({ small = false }) {
  return (
    <span className={`logo ${small ? 'small' : ''}`}>
      <LogoMark size={small ? 34 : 46} />
      <span className="logo-word">
        News <span className="logo-fresh">Freshest</span>
      </span>
    </span>
  );
}
