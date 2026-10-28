<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep homepage enquiry validation and submission feedback in the dedicated enquiry form module so insert-only behaviour can be tested independently.
- Dashboard access is resolved client-side in src/lib/admin-access.ts from the user's own user_roles rows confirmed by can_manage_gym(); RLS remains the real data guard.
- Attendance rules (staff-only check-in, active pass, active member, 60-minute duplicate window) live in the Postgres function record_qr_check_in(); the frontend only translates its reply, so a QR scan and any future kiosk enforce one rule and cannot drift.

