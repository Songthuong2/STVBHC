# Security Specification - Administrative Document Generator

## Data Invariants
1. A document must have an owner (`userId`).
2. Only the owner can read, update, or delete their documents.
3. Users can only create documents where `userId` matches their own UID.
4. Timestamps (`createdAt`, `updatedAt`) must be validated using `request.time`.
5. User profile data is restricted to the owner.

## The Dirty Dozen Payloads

1. **Identity Theft (Create)**: Attempt to create a document with someone else's `userId`.
2. **Access Violation (Read)**: Attempt to read another user's document.
3. **Ghost Edit (Update)**: Attempt to update another user's document.
4. **Illegal Deletion (Delete)**: Attempt to delete another user's document.
5. **Schema Poisoning (Create)**: Attempt to create a document with a 1MB string in `docNumber`.
6. **Immutability Breach (Update)**: Attempt to change `createdAt` during an update.
7. **Privilege Escalation (Update)**: Attempt to change `userId` of a document.
8. **System Field Injection (Create)**: Attempt to add arbitrary fields not in the schema.
9. **Timestamp Spoofing (Create)**: Use a client-side timestamp instead of `request.time`.
10. **PII Leak (Read)**: Anonymous user attempting to read the `users` collection.
11. **Negative Margin (Create)**: Setting a negative value for margins.
12. **Type Mismatch (Update)**: Setting `boldLevel` to a boolean instead of a number.

## Rules Draft Strategy
Using Phase 4 "Fortress" rules with `isValidDocument` and `isValidUser` helpers.
