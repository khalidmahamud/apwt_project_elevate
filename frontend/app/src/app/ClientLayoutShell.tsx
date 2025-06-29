'use client';

import AppSidebar from '@/components/AppSidebar';
import Navbar from '@/components/Navbar';
import { ThemeProvider } from '@/components/Providers/ThemeProvider';
import { AuthProvider } from '@/context/AuthContext';
import { SidebarProvider } from '@/components/ui/sidebar';
import { usePathname } from 'next/navigation';

export default function ClientLayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showLayout = pathname !== '/login' && pathname !== '/customer-profile';
  const defaultOpen = true; 

  return (
    <AuthProvider>
      <ThemeProvider
        attribute='class'
        defaultTheme='system'
        enableSystem
        disableTransitionOnChange
      >
        {showLayout ? (
          <SidebarProvider defaultOpen={defaultOpen}>
            <AppSidebar />
            <main className='w-full'>
              <Navbar />
              <div className='px-4'>{children}</div>
            </main>
          </SidebarProvider>
        ) : (
          <main className='w-full'>
            {children}
          </main>
        )}
      </ThemeProvider>
    </AuthProvider>
  );
} 