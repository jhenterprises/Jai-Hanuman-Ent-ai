# Firestore Security Specification

## Data Invariants
1. A user can only read and write their own profile (private fields).
2. Users can only see services that are enabled and visible.
3. Applications must belong to a user. Users can only see their own applications.
4. Staff can see all applications assigned to them or all in general (depending on role).
5. Ledger entries cannot be modified once created (immutable).
6. Wallet balance can only be updated by the system or admin (enforced via rules).

## The Dirty Dozen Payloads (Rejection Tests)

1. **Identity Spoofing**: User `A` tries to create an application with `userId: 'User B'`.
2. **Privilege Escalation**: User `A` tries to update their own `role` to `admin`.
3. **Ghost Field Injection**: User `A` tries to add `is_verified: true` to their application.
4. **ID Poisoning**: User `A` tries to create a custom document with a 1MB string as ID.
5. **PII Leak**: User `A` tries to list all documents in `users` collection.
6. **State Shortcutting**: User `A` tries to update application status from `Pending` directly to `Approved`.
7. **Orphaned Write**: Creating an application for a `service_id` that does not exist.
8. **Wallet Drainage**: User `A` tries to subtract ₹1,000,000 from another user's wallet.
9. **Ledger Forgery**: User `A` tries to update an existing ledger entry's amount.
10. **Shadow Service Injection**: User `A` tries to create a new service in `services` collection.
11. **Config Hijacking**: User `A` tries to update `settings/portal` config.
12. **Draft Scraping**: User `A` tries to list `application_drafts` belonging to User `B`.

## Test Runner (Logic Mapping)

- `allow create: if isValidApplication(incoming()) && incoming().userId == request.auth.uid`
- `allow update: if isAdmin() || (isOwner() && incoming().diff(existing()).affectedKeys().hasOnly(['field1']))`
- `allow delete: if isAdmin()`
