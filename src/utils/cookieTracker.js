export const getCookie = (name) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
};

export const setCookie = (name, value, days = 7) => {
  let expires = "";
  if (days) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    expires = `; expires=${date.toUTCString()}`;
  }
  document.cookie = `${name}=${value || ""}${expires}; path=/`;
};

export const logUserActivity = (path) => {
  const ACTIVITY_COOKIE = 'user_activity_log';
  const currentLogStr = getCookie(ACTIVITY_COOKIE);
  let logs = [];
  
  if (currentLogStr) {
    try {
      logs = JSON.parse(decodeURIComponent(currentLogStr));
    } catch (e) {
      console.error("Failed to parse cookie logs", e);
    }
  }

  // Add the new activity
  logs.push({
    path,
    timestamp: new Date().toISOString()
  });

  // Keep only the last 20 activities to avoid cookie size limits
  if (logs.length > 20) {
    logs = logs.slice(logs.length - 20);
  }

  setCookie(ACTIVITY_COOKIE, encodeURIComponent(JSON.stringify(logs)), 30);
};
