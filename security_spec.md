# Security Specification: Obra Fácil

## Data Invariants
1. A user can only access, create, modify, and delete their own expenses under `/users/{userId}/expenses/{expenseId}`.
2. A user can only access, create, modify, and delete their own obras under `/users/{userId}/obras/{obraId}`.
3. The `userId` field inside both expense and obra documents must strictly equal `request.auth.uid`.
4. Obra names must be strings between 1 and 100 characters.
5. Expense amounts must be a positive number greater than 0.
6. Category must be strictly either `'material'` or `'mao_de_obra'`.
7. Description must be a non-empty string with maximum length of 300 characters.
8. The `createdAt` and `userId` fields are immutable on updates.
9. Unauthenticated requests are completely rejected (default deny).
10. Path variable `{userId}` must strictly match `request.auth.uid`.

## The "Dirty Dozen" Payloads
1. **Unauthenticated Read**: Attempting to read `/users/user123/expenses/exp1` or `/users/user123/obras/obra1` without auth -> PERMISSION_DENIED.
2. **Cross-User Snooping**: User A authenticated attempting to read `/users/userB/expenses/exp1` or `/users/userB/obras/obra1` -> PERMISSION_DENIED.
3. **Identity Spoofing on Create**: User A attempting to write an expense or obra with `userId: "userB"` -> PERMISSION_DENIED.
4. **ID Poisoning Attack**: Writing an expense or obra with document ID containing 200 junk characters -> PERMISSION_DENIED.
5. **Negative Amount Exploit**: Writing an expense with `amount: -500.00` -> PERMISSION_DENIED.
6. **Zero Amount Exploit**: Writing an expense with `amount: 0` -> PERMISSION_DENIED.
7. **Invalid Category Injection**: Writing an expense with `category: "crypto"` -> PERMISSION_DENIED.
8. **Oversized Obra Name Attack**: Writing an obra with name > 100 characters -> PERMISSION_DENIED.
9. **Ghost Field Injection (Shadow Update)**: Attempting to update an obra or expense with unauthorized field `isAdmin: true` -> PERMISSION_DENIED.
10. **Immutability Breach**: Updating `userId` or `createdAt` on an existing obra or expense -> PERMISSION_DENIED.
11. **Blanket Query Scraping**: Attempting to query `/users` or arbitrary subcollections without parent user scoping -> PERMISSION_DENIED.
12. **Malformed Types**: Writing `budgetLimit: "mil"` or `name: 12345` on an obra -> PERMISSION_DENIED.
