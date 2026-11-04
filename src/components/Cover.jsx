import { useDb } from '../lib/useDb';
import { CATEGORIES } from '../lib/constants';
import { MediaView } from './ui';

/** Мэдээний нүүр зураг: эхний зураг байхгүй бол ангиллын өнгөт дэвсгэр */
export default function Cover({ news, className = '' }) {
  const db = useDb();
  const img = db.media.find((m) => m.newsId === news.id && m.type === 'image');
  const cat = CATEGORIES.find((c) => c.id === news.categoryId);
  return (
    <div className={`cover ${className}`}>
      {img ? (
        <MediaView media={img} />
      ) : (
        <div className="cover-ph" style={{ '--c': cat?.color || '#334155' }}>
          <svg viewBox="0 0 200 200" className="cover-waves" aria-hidden="true">
            {[40, 75, 110, 145, 180].map((r) => (
              <circle key={r} cx="0" cy="200" r={r} fill="none" stroke="currentColor" strokeWidth="1.5" />
            ))}
            <circle cx="0" cy="200" r="12" fill="currentColor" />
          </svg>
          <span className="cover-label">{cat?.name}</span>
        </div>
      )}
    </div>
  );
}
