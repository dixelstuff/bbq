// Local Vite development sessions deliberately start like a fresh install.
// import.meta.env.DEV is replaced at build time, so GitHub Pages never runs this.
if (import.meta.env.DEV) {
  try {
    localStorage.clear();
    sessionStorage.clear();
    console.info("[BBQ development] Cleared local and session storage.");
  } catch (error) {
    console.error("[BBQ development] Unable to clear browser storage.", error);
  }
}
