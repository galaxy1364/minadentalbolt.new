---
name: Generating a real signed Android APK from a PWA
description: How to produce an installable, signed .apk from a live PWA URL without an Android SDK/Gradle, and how to keep the signing key out of git.
---

A PWA can be packaged into a genuinely signed, installable `.apk` without any local Android SDK/Gradle, as long as it's already deployed at a stable HTTPS URL with a working manifest — POST the manifest fields to PWABuilder's cloud packaging API and it returns a signed APK/AAB plus a keystore.

**Why this matters:** the returned `signing.keystore` + password must be treated as a real secret. Committing it to git (even a private repo) lets anyone who gets repo access sign a package that looks like a legitimate update to the app. Any future rebuild of the same app must reuse that same key, or already-installed devices can't receive it as an update.

**How to apply:** gitignore the keystore directory before the first commit that touches it; never let the password or `.keystore` file land in git history. If it's already been committed, amend/rewrite the commit and force-update every local ref that reaches it (branches, remote-tracking refs) before treating it as removed — a single amend is not enough if other refs still point at the old commit.
