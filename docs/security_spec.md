# Security Specification — The Champions Club Firestore Rules

## 1. Data Invariants
1. **Default Deny**: Any unmatched path is denied for both read and write (`match /{document=**} { allow read, write: if false; }`).
2. **Role Integrity & No Self-Escalation**: A newly signed-in user may only self-create `/users/{uid}` with `role == 'member'` (except the verified bootstrapped owner email `sahprince4554@gmail.com`). Users cannot modify their own `role` field. Only an authenticated `owner` can assign `owner`, `front_desk`, or `bar_staff` roles.
3. **PII Isolation**:
   - `/users/{userId}` and `/members/{memberId}` contain email/phone PII and are strictly readable only by the owning user, `owner`, or `front_desk` staff.
   - `/enquiries/{enquiryId}` allows unauthenticated public `create` ONLY with `stage == 'new'`, strict schema/length bounds, and `createdAt == request.time`, while `get`/`list`/`update`/`delete` are strictly limited to `owner` and `front_desk`.
   - Public court availability is served via `/publicSchedule/{slotId}` which contains zero member PII.
4. **Atomic Slot Locking & Parent Integrity**:
   - `/slotLocks/{lockId}` cannot be overwritten (`allow update: if false`), guaranteeing zero double-booking on a 30-minute court block.
   - `/bookings/{bookingId}` must bind `userId == request.auth.uid` for members and verify that the referenced `/courts/{courtId}` exists.
5. **Strict Timestamps & Immutability**:
   - `createdAt == request.time` on creation and `incoming().createdAt == existing().createdAt` on updates; `updatedAt == request.time` on updates.
6. **Terminal State Locking**:
   - Cancelled or completed bookings, settled/voided bar orders, closed bar shifts, and approved/rejected leave requests cannot be mutated by non-owners once terminal.
7. **Shadow-Field Prevention & Bounded Sizes**:
   - Every `isValid[Entity]()` helper checks `keys().hasAll(...)` and `keys().hasOnly(...)`, enforces `.size()` limits on every string and array, and enforces numeric lower/upper bounds.

## 2. Blocked Unauthorized Scenarios (Must Return PERMISSION_DENIED)
1. **Self-Role Escalation on Create**: Unprivileged user creates `/users/{theirUid}` with `{ role: "owner", ... }`.
2. **Self-Role Escalation on Update**: Member updates `/users/{theirUid}` changing `role` from `"member"` to `"front_desk"`.
3. **Shadow Field Injection (Enquiry)**: Public visitor submits `/enquiries/enq-1` with an extra ghost key `{ isApproved: true, stage: "new", ... }`.
4. **Enquiry Stage Shortcutting**: Public visitor submits `/enquiries/enq-2` with `{ stage: "converted", quotedAmountInr: 0, ... }`.
5. **PII Scraping (Enquiries List)**: Unauthenticated visitor or regular member calls `list` on `/enquiries`.
6. **PII Cross-Read (Users)**: Member A attempts `get` on `/users/{memberB_uid}`.
7. **Email Spoofing (Unverified Admin)**: Token claims `email: "sahprince4554@gmail.com"` with `email_verified: false` attempting to read `/members`.
8. **ID Poisoning**: Authenticated user attempts to create `/bookings/{1500_char_junk_id}` or ID containing spaces/slashes.
9. **Double-Booking Overwrite**: Member attempts `update` on an existing `/slotLocks/court-t1_2026-11-22_1800` owned by another player.
10. **Terminal State Mutation**: Bar staff attempts to modify `totalInr` on a `/barOrders/{id}` whose `tabStatus == "settled"`.
11. **Backdated Timestamp Forgery**: User submits a booking with `createdAt` set to a client-crafted past timestamp instead of `request.time`.
12. **Client-Side Inventory Tampering**: Regular member attempts direct `update` on `/products/{id}` changing `priceInr` to `1`.
