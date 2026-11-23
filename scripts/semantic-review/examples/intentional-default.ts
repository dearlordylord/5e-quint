type DisplayPreferences = { readonly showGrid: boolean };

/** The display contract hides the optional grid unless explicitly enabled. */
export function gridIsVisible(preferences: DisplayPreferences | undefined) {
  return preferences?.showGrid ?? false;
}
