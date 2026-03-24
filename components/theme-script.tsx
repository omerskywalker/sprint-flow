// Inline script to set dark/light class on <html> before first paint — prevents flash
export function ThemeScript() {
  const script = `
    (function() {
      try {
        var stored = localStorage.getItem('sprintflow-store');
        var theme = 'dark';
        if (stored) {
          var parsed = JSON.parse(stored);
          if (parsed && parsed.state && parsed.state.theme) {
            theme = parsed.state.theme;
          }
        }
        document.documentElement.classList.toggle('dark', theme === 'dark');
      } catch(e) {
        document.documentElement.classList.add('dark');
      }
    })();
  `
  return <script dangerouslySetInnerHTML={{ __html: script }} />
}
