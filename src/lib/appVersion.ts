/**
 * The single source of truth for the app's version number. Bumped by
 * Claude with every meaningful deploy (matches the corresponding entry
 * in CHANGELOG-worthy commits). public/version.json mirrors this exact
 * value — the update-checker in lib/updateCheck.ts compares the two to
 * detect when a newer build has been deployed than what's currently
 * loaded in the browser.
 */
export const APP_VERSION = '1.144.0'
export const BUILD_DATE = '2026-08-22'
