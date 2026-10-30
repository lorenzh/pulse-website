export const THEME_STORAGE_KEY = "theme";

/**
 * Inline script for the document head. It runs before paint: it marks the page as scripted (`js`
 * class) and applies a stored `light` or `dark` choice. Without a stored choice the
 * `prefers-color-scheme` media query in tokens.css decides.
 */
export const THEME_SCRIPT =
  `(function(){var d=document.documentElement;d.classList.add("js");` +
  `try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");` +
  `if(t==="light"||t==="dark"){d.setAttribute("data-theme",t);}}catch(e){}})();`;
