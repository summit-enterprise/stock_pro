'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface EmailLoginHandlerProps {
  onOpenLogin: () => void;
}

export default function EmailLoginHandler({ onOpenLogin }: EmailLoginHandlerProps) {
  const router = useRouter();

  useEffect(() => {
    // Check for email parameter in URL
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const emailParam = urlParams.get('email');
      
      if (emailParam) {
        // Open login modal
        onOpenLogin();
        
        // Clean up URL (remove email parameter)
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      }
    }
  }, [onOpenLogin]);

  return null;
}

