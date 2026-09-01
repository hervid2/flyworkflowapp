import AppLayout from '@/components/layout/AppLayout';
import AuthBootstrap from '@/components/providers/AuthBootstrap';

/**
 * Layout for the authenticated `(app)` route group. Wraps the protected pages
 * (dashboard, map) in the shared chrome (sidebar + top bar) via {@link AppLayout}.
 */
export default function AppGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AuthBootstrap />
      <AppLayout>{children}</AppLayout>
    </>
  );
}
