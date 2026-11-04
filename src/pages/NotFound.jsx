import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { Empty } from '../components/ui';

export default function NotFound({ text = 'Таны хайсан хуудас олдсонгүй.' }) {
  return (
    <div className="container page">
      <div className="card">
        <Empty icon={Search} title="Олдсонгүй" text={text} action={<Link to="/" className="btn btn-secondary">Нүүр хуудас руу</Link>} />
      </div>
    </div>
  );
}
