# Homepage mobile improvements
- [x] Improve mobile plan, coach, facility and header layouts.
- [x] Add accessible enquiry validation, progress and result feedback; preserve insert-only submissions.
- [x] Verify mobile layouts against live content and enquiry feedback using intercepted writes; no new database write verified.
# Phase 1: auth + owner dashboard
- [x] /login, protected /admin, Overview, Enquiries
- [ ] Owner/staff sign-in test: needs a real owner account (manual setup)
# Phase 2: Members
- [x] /admin/members list, search, filter, paging, add, detail, edit, archive via status
- [ ] Live create/edit test as staff: needs a staff login available to me
# Phase 4: Attendance
- [x] Add attendance directory, filters, QR scanner and manual check-in.
- [x] Add member QR passes and attendance history/actions.
- [x] Add overview attendance metric and run tests/preview checks.
- [ ] Live check-in test as staff: needs a staff login the sandbox can use (external Supabase, no minted session)
