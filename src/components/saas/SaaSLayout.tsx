import { SaaSNavbar } from './SaaSNavbar';
import { SaaSFooter } from './SaaSFooter';

export function SaaSLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SaaSNavbar />
      <main className="flex-1">{children}</main>
      <SaaSFooter />
    </div>
  );
}
