(function () {
  "use strict";

  const storageKey = "tkfile.theme.v1";
  const themes = ["mocha", "latte", "emacs", "doom"];
  const themeColors = {
    mocha: "#11111b",
    latte: "#eff1f5",
    emacs: "#f7f7f7",
    doom: "#282c34"
  };
  let theme = "mocha";

  try {
    const saved = localStorage.getItem(storageKey);
    if (themes.includes(saved)) theme = saved;
  } catch (error) {
    // The default theme still works when browser storage is unavailable.
  }

  document.documentElement.dataset.theme = theme;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = themeColors[theme];

  window.TicketThemes = { storageKey, themes, themeColors };
}());
