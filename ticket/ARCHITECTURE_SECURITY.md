# TKFILE architecture and security report

Date: 2026-08-27

## Executive summary

TKFILE is a local-first, single-page ticket notebook hosted as static HTML, CSS, and JavaScript on GitHub Pages. The password prompt is a local vault unlock, not a server login: there are no user accounts, server sessions, database, or cloud synchronization. Each browser profile has its own encrypted copy in `localStorage`.

This design is a good fit for a personal ticket notebook on a trusted, patched device when a long, unique password and regular encrypted backups are used. It is not yet an enterprise system of record. It has no central access control, revocation, audit log, managed recovery, multi-device synchronization, or protection from compromised same-origin JavaScript while the vault is unlocked.

## System map

```text
GitHub repository
      |
      v
GitHub Pages (static files over HTTPS)
      |
      v
Browser UI ----> core parser/formatter ----> plain .tk import/export
      |
      +----> Web Crypto: PBKDF2-SHA256 -> non-extractable AES-256-GCM key
      |                                      |
      |                                      v
      +------------------------------ encrypted vault in localStorage
                                             |
                                             v
                                  encrypted backup import/export
```

There is intentionally no outbound application connection. The page's current Content Security Policy contains `connect-src 'none'`.

## Components

### `index.html`

Defines the setup/unlock screen, ticket tree, command toolbar, help, modal dialog, import controls, and a restrictive meta-delivered Content Security Policy. It loads only same-origin scripts and styles and permits no network API connections.

### `theme-init.js`

Reads only the theme preference from `localStorage` and applies it before CSS is painted. It does not read or decrypt ticket data.

### `core.js`

A dependency-free, environment-neutral module. It validates ticket identifiers, parses reminder and duration values, normalizes headings, groups dates, and imports/exports the TKFILE text format. Node tests load this file directly.

### `app.js`

Owns runtime state and all browser capabilities: Web Crypto, encrypted persistence, setup/unlock/lock, rendering, commands, reminders, contacts, deletion, and time tracking. Ticket values are HTML-escaped before template markup is inserted. Dialog fields are built with DOM APIs and use `textContent` or form-control `value`.

### `styles.css`

Provides Catppuccin Mocha/Latte, Doom One, and Emacs Classic palettes. Emacs mode is a true terminal-only layout after unlock: the header, toolbar, help panel, command line, and terminal title bar are removed from layout, leaving the year tree at fullscreen size. Keyboard commands and dialogs remain operational.

## Data and lifecycle

The decrypted state remains version 1 and contains contacts, items, and an update timestamp. Each item contains a generated UID, type, ticket metadata, text fields, optional note checklist, reminder, accumulated `timeMs`, and an optional `timeStartedAt` timestamp. Only one timer is started by the UI at a time. An active timer survives reload or lock and continues until explicitly stopped.

On first use, the browser creates an empty vault. On every save, the application:

1. Serializes the complete state as JSON.
2. Generates a fresh random 96-bit AES-GCM IV.
3. Encrypts the JSON with a non-extractable 256-bit AES-GCM key.
4. Stores only the version, KDF metadata, salt, IV, ciphertext, and update timestamp in `localStorage`.

The AES key is derived from the password with PBKDF2-HMAC-SHA256, a random 128-bit salt, and 600,000 iterations. Existing lower-iteration vaults remain readable and are re-encrypted with the current work factor after a successful unlock. Edits are encrypted after a short debounce; explicit locking flushes pending changes first. Fifteen minutes without pointer, keyboard, or touch activity triggers a lock. Locking clears the decrypted state, ticket DOM, editors, and key references.

Plain `.tk` export is deliberately unencrypted and includes elapsed time as `TIME SPENT HH:MM:SS`. Encrypted `.ticket-vault` backups contain the same encrypted record as browser storage.

## Security assessment

### What is strong

- AES-256-GCM provides authenticated encryption, so modification of ciphertext causes decryption to fail.
- A new random IV is used for each save and a random salt is used for each password-derived key.
- The derived AES key is non-extractable and exists only in page memory while unlocked.
- The current PBKDF2 work factor matches OWASP's published PBKDF2-HMAC-SHA256 recommendation.
- Ticket text is escaped before HTML insertion, substantially reducing stored-XSS risk from titles, notes, contacts, and imported files.
- The Content Security Policy accepts only same-origin code and blocks Fetch/XHR/WebSocket connections.
- The vault auto-locks, and locking now removes plaintext from both application state and the hidden DOM.
- Encrypted backup import validates the record version, algorithms, iteration range, salt size, IV size, and minimum authentication-tag size before use.
- State normalization caps item and contact counts and revalidates reminder/timer timestamps.

### Residual risks

| Risk | Level | Meaning |
|---|---:|---|
| Compromised repository, GitHub account, deployment, or same-origin script | High | First-party JavaScript delivered later can read the unlocked DOM or capture the password. Client-side encryption cannot defend against malicious code running at unlock time. |
| Shared `ana7ol.github.io` origin | High | Browser storage is scoped to the entire origin, not `/ticket/`. Other applications hosted on the same origin increase the trusted code and deployment surface. |
| Unlocked endpoint, malicious extension, malware, or browser developer access | High | Plaintext necessarily exists in memory and the DOM while working. |
| Availability and recovery | Medium | Browser storage can be cleared, corrupted, or lost with the device. There is no server recovery or automatic backup. |
| Password guessing after ciphertext theft | Medium | PBKDF2 slows offline guessing but cannot rescue a weak or reused password. Use a long, unique passphrase. |
| Clickjacking headers | Medium | GitHub Pages does not let this project set arbitrary response headers. `frame-ancestors` must be delivered as an HTTP header and cannot be enforced through the existing meta CSP. |
| Enterprise identity and audit | Medium | The password proves knowledge of a local secret only. There is no Entra/SAP identity, role model, revocation, central audit, retention policy, or legal hold. |
| Large or hostile imports | Low | Imported values are encoded before display, but very large files/fields can still consume browser memory or storage. |

Security level: good encryption-at-rest for a personal local tool on a trusted endpoint; moderate runtime assurance; low enterprise governance and recovery assurance. Do not treat it as the authoritative repository for regulated or uniquely valuable ticket data without organizational approval and additional controls.

## Recommended hardening order

1. Host the vault on a dedicated origin such as `tickets.example.org`, separate from the portfolio and unrelated apps.
2. Protect the repository and deployment path with phishing-resistant MFA, branch protection, required review, and minimal GitHub permissions.
3. Export an encrypted backup regularly and perform a restore drill. Keep at least one copy outside the browser profile.
4. If the data is organizational, add Entra ID authentication, server-side authorization, audit events, retention rules, and centrally managed recovery.
5. Use a host or edge layer that can set response headers including `Content-Security-Policy: frame-ancestors 'none'`, `X-Content-Type-Options: nosniff`, and an appropriate `Permissions-Policy`.
6. Add browser-level integration tests for setup, unlock, create-by-Enter, timer persistence, deletion, locking, import/export, and every theme.

## Outlook integration

Yes. There are two sensible levels:

- A no-permission option can open a prefilled `mailto:` draft with the selected ticket heading and notes. It is simple but cannot read mail or synchronize replies.
- A real integration uses Microsoft Entra ID, MSAL for browser authentication with Authorization Code + PKCE, and Microsoft Graph. Delegated permissions should be kept minimal—for example `Mail.Send` to send a ticket summary; reading/synchronizing mail requires an appropriate read permission. Tenant registration and possibly administrator approval are required.

The current CSP blocks Graph calls. It would need narrowly scoped `connect-src` entries. Authentication tokens must not be stored in the ticket vault's `localStorage`. For organizational data, the preferred design is a backend-for-frontend that holds server credentials/tokens, applies authorization, and emits audit logs.

## SAP ITSM integration

Yes, if the exact SAP product/version exposes an approved interface. SAP Cloud ALM publishes ITSM APIs for managing cases, while SAP Solution Manager installations commonly expose configured SOAP/web-service interfaces for third-party service desks. The correct option depends on whether this installation is Cloud ALM, Solution Manager, or another product branded as SAP ITSM.

A GitHub Pages browser normally cannot call an internal ITSM endpoint directly because of corporate SSO, CORS, private-network reachability, CSRF protections, and the current `connect-src 'none'` policy. Do not embed a SAP technical user's password or API secret in JavaScript. Use an organization-controlled backend gateway on the corporate network:

```text
Ticket browser --Entra user token--> integration gateway
                                      |--approved Graph scope--> Outlook
                                      +--technical/OAuth identity--> SAP ITSM
```

The gateway should validate the signed-in user, allow only required operations, map local ticket IDs to SAP objects, protect secrets in a managed store, rate-limit calls, and keep an audit trail. Before implementation, collect the SAP product and release, API documentation/base URL, authentication method, required actions (read/create/update/time booking), field mappings, network location, and owner/security approval.

## Local solution assistant / RAG proposal

A retrieval-augmented assistant is feasible and is safer than training a model directly on the tickets. The model would not memorize the vault. Instead, each question would retrieve a small number of relevant resolved tickets and provide those excerpts to a replaceable small language model for that one answer.

Recommended flow:

```text
Unlocked vault
    |
    +-- index DONE tickets: ID, title, problem, notes, solution
    |       |
    |       v
    |   local embeddings + encrypted vector index
    |
question --> retrieve top matching old tickets --> small model --> suggested answer
                                                        |
                                                        v
                                             cited ticket IDs / excerpts
```

The first version should be read-only and explicitly invoked on a selected ticket. It should return possible solutions with the source ticket IDs, never write a solution or update SAP automatically. Index updates must add changed tickets and remove deleted tickets. Empty solutions, passwords, tokens, email signatures, and unnecessary personal data should be excluded before indexing.

Three deployment choices are possible:

1. **Local companion service — recommended for a personal vault.** A small embedding model, vector store, and 3–8B-class instruct model run on the workstation. Ticket text stays local, but the service must authenticate requests and allow only the Ticket Forge origin.
2. **In-browser WebGPU.** Maximum local privacy and no service process, but model downloads, memory use, browser compatibility, encrypted index management, and CSP changes make it the most complex client implementation.
3. **Organization-hosted RAG gateway.** Best for Entra access control, SAP/Outlook integration, shared knowledge, audit, backups, and managed models. It also means ticket content leaves the browser and therefore needs data-owner and security approval.

Embeddings and retrieved excerpts are sensitive data, even when they are not readable ticket files. Encrypt the index at rest, bind it to the vault/user, delete vectors when tickets are deleted, log access without logging ticket bodies, defend retrieved text as untrusted input, and keep a human approval step. The existing `connect-src 'none'` CSP intentionally blocks any companion or hosted service until a specific design and allow-list are approved.

## Sources used for the assessment

- [GitHub Pages is static hosting](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)
- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [OWASP HTML5 Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html)
- [MDN AES-GCM IV guidance](https://developer.mozilla.org/en-US/docs/Web/API/AesGcmParams)
- [MDN `frame-ancestors` CSP guidance](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors)
- [Microsoft SPA authentication samples](https://learn.microsoft.com/en-us/entra/identity-platform/sample-v2-code)
- [Microsoft Graph permissions reference](https://learn.microsoft.com/en-us/graph/permissions-reference)
- [SAP Cloud ALM ITSM API](https://help.sap.com/docs/cloud-alm/apis/itsm-api)
- [SAP Solution Manager third-party ITSM interface](https://help.sap.com/docs/SUPPORT_CONTENT/sm/3518047458.html)
