// Pulse.mn лого: орон нутгаас цацагдах мэдээний «дохио» — цэг ба хоёр долгион
export function LogoMark({ size = 32, className = '' }) {
  return (
    <svg className={`logo-mark ${className}`} width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="var(--ink)" />
      <path d="M10 14.5a7.5 7.5 0 0 1 7.5 7.5" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M10 8.5A13.5 13.5 0 0 1 23.5 22" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" opacity="0.55" />
      <circle cx="10.5" cy="21.5" r="3" fill="var(--signal)" />
    </svg>
  );
}

export default function Logo({ small = false }) {
  return (
    <span className={`logo ${small ? 'small' : ''}`}>
      <LogoMark size={small ? 26 : 32} />
      <span className="logo-word">
        pulse<span className="logo-tld">.mn</span>
      </span>
    </span>
  );
}
