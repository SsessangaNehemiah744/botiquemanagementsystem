export const isElectron =
  typeof window !== "undefined" &&
  (window as any).electron?.isDesktop === true;

export const electronAPI =
  typeof window !== "undefined" ? (window as any).electron : null;

export function quitApp() {
  if (electronAPI?.quit) {
    electronAPI.quit();
  }
}

export function minimizeApp() {
  if (electronAPI?.minimize) {
    electronAPI.minimize();
  }
}

export function maximizeApp() {
  if (electronAPI?.maximize) {
    electronAPI.maximize();
  }
}