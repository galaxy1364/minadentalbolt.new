-- MOD-DATA-003 | یکسان‌سازی واژگان نقش پرسنل
-- اعمال‌شده روی دیتابیس زنده در ۱۴۰۵/۰۶/۱۰
--
-- staff.role held 'admin', which is not in the app's staffRoles list
-- (Staff.tsx:19). That list supplies the Persian label and badge colour,
-- so a value outside it renders as a raw English string — and the edit
-- form's role dropdown has nothing to select, so opening that person and
-- saving would silently rewrite their role to whatever is first.
--
-- 'manager' («مدیر») is the list's equivalent. This column is unrelated
-- to users.role, which governs permissions and uses a different
-- vocabulary entirely (owner/doctor/receptionist/…).

update staff set role = 'manager', updated_at = now() where role = 'admin';
