import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { logUserActivity } from '../utils/cookieTracker';

export default function CookieTracker() {
  const location = useLocation();

  useEffect(() => {
    logUserActivity(location.pathname);
  }, [location.pathname]);

  return null; // This component does not render any UI
}
