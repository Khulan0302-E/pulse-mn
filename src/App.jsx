import { useEffect } from 'react';
import { Routes, Route, useParams } from 'react-router-dom';
import { useToast } from './context/ToastContext';
import { maybeAutoBackup, reloadRemote, isRemote } from './lib/db';
import { flushOutbox } from './lib/outbox';
import { runScheduler, processOutboxItem } from './api/news';
import { refreshExternal } from './api/external';
import { ROLES } from './lib/constants';

import Layout from './components/Layout';
import { RequireAuth, WorkspaceLayout } from './components/Guards';
import Home from './pages/Home';
import Article from './pages/Article';
import Login from './pages/Login';
import Register from './pages/Register';
import Notifications from './pages/Notifications';
import NotFound from './pages/NotFound';
import JournalistDashboard from './pages/journalist/Dashboard';
import DraftEditor from './pages/journalist/DraftEditor';
import DraftDetail from './pages/journalist/DraftDetail';
import Verification from './pages/journalist/Verification';
import { ReviewQueue, ScheduledList } from './pages/editor/Queue';
import Review from './pages/editor/Review';
import Published from './pages/editor/Published';
import EditPublished from './pages/editor/EditPublished';
import Verifications from './pages/admin/Verifications';
import Users from './pages/admin/Users';
import Integrations from './pages/admin/Integrations';
import System from './pages/admin/System';

// Маршрут солигдоход маягтын төлөв цэвэрлэгдэхийн тулд key өгнө
function Keyed({ Component }) {
  const { id = 'new' } = useParams();
  return <Component key={id} />;
}

function useBackgroundJobs() {
  const toast = useToast();

  // Товлосон нийтлэл, гадаад API, өдөр тутмын нөөц
  useEffect(() => {
    let n = 0;
    const tick = () => {
      // Supabase горимд бусад хэрэглэгчийн өөрчлөлтийг 30 секунд тутам татна
      if (isRemote && n++ > 0) reloadRemote().catch(() => {});
      runScheduler().catch(() => {}); // дараагийн удаа дахин оролдоно
      refreshExternal('weather');
      refreshExternal('fx');
      maybeAutoBackup();
    };
    tick();
    const t = setInterval(tick, 30000);
    const onFocus = () => isRemote && reloadRemote().catch(() => {});
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(t);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  // NFR-PERF-002: холболт сэргэхэд түр хадгалсныг илгээнэ
  useEffect(() => {
    const flush = async () => {
      const { sent, failed } = await flushOutbox(processOutboxItem);
      if (sent) toast.success(`Холболт сэргэлээ — түр хадгалсан ${sent} ноорог илгээгдлээ.`);
      failed.forEach((f) => toast.error(`Түр хадгалсан ноорог илгээгдсэнгүй: ${f.error}`));
    };
    window.addEventListener('online', flush);
    if (navigator.onLine) flush();
    return () => window.removeEventListener('online', flush);
  }, [toast]);
}

export default function App() {
  useBackgroundJobs();
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="category/:slug" element={<Home />} />
        <Route path="news/:id" element={<Article />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="notifications" element={<RequireAuth><Notifications /></RequireAuth>} />

        <Route path="j" element={<RequireAuth roles={[ROLES.JOURNALIST]}><WorkspaceLayout /></RequireAuth>}>
          <Route index element={<JournalistDashboard />} />
          <Route path="new" element={<Keyed Component={DraftEditor} />} />
          <Route path="edit/:id" element={<Keyed Component={DraftEditor} />} />
          <Route path="news/:id" element={<DraftDetail />} />
          <Route path="verification" element={<Verification />} />
          <Route path="notifications" element={<Notifications embedded />} />
        </Route>

        <Route path="e" element={<RequireAuth roles={[ROLES.EDITOR]}><WorkspaceLayout /></RequireAuth>}>
          <Route index element={<ReviewQueue />} />
          <Route path="review/:id" element={<Keyed Component={Review} />} />
          <Route path="scheduled" element={<ScheduledList />} />
          <Route path="published" element={<Published />} />
          <Route path="published/:id/edit" element={<Keyed Component={EditPublished} />} />
          <Route path="verifications" element={<Verifications />} />
          <Route path="notifications" element={<Notifications embedded />} />
        </Route>

        <Route path="a" element={<RequireAuth roles={[ROLES.ADMIN]}><WorkspaceLayout /></RequireAuth>}>
          <Route index element={<Users />} />
          <Route path="users" element={<Users />} />
          <Route path="integrations" element={<Integrations />} />
          <Route path="system" element={<System />} />
          <Route path="notifications" element={<Notifications embedded />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
