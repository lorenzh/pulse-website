export const THEME_STORAGE_KEY = "theme";

/**
 * Inline script for the document head. It runs before paint: it marks the page as scripted (`js`
 * class), adds `js-reveal` only when IntersectionObserver exists and motion is not reduced (the
 * scroll-in hides its items only then; otherwise all content stays visible), and applies a stored
 * `light` or `dark` choice. Without a stored choice the
 * `prefers-color-scheme` media query in tokens.css decides.
 */
export const THEME_SCRIPT =
  `(function(){var d=document.documentElement;d.classList.add("js");` +
  `try{if("IntersectionObserver"in window&&!matchMedia("(prefers-reduced-motion: reduce)").matches)` +
  `{d.classList.add("js-reveal");}}catch(e){}` +
  `try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");` +
  `if(t==="light"||t==="dark"){d.setAttribute("data-theme",t);}}catch(e){}})();`;
