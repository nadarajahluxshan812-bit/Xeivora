export function ThemeScript() {
  const storageKey = "xeivora-theme";
  const script = `
    (() => {
      try {
        const saved = window.localStorage.getItem(${JSON.stringify(storageKey)});
        const theme =
          saved === "light" || saved === "dark"
            ? saved
            : saved === "system"
              ? (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark")
            : (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
        document.documentElement.dataset.theme = theme;
        document.documentElement.style.colorScheme = theme;
      } catch (error) {
        document.documentElement.dataset.theme = "dark";
        document.documentElement.style.colorScheme = "dark";
      }
    })();
  `;

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
