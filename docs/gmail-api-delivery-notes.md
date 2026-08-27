# Gmail API Buyer Delivery Notes

The buyer delivery sender uses the Gmail API with the minimum `https://www.googleapis.com/auth/gmail.send` scope. This scope permits sending email on behalf of the authorized Gmail account and does not request inbox read or modify access.

The Worker exchanges an owner-authorized refresh token at `https://oauth2.googleapis.com/token` for a short-lived access token, then submits an RFC 2822 MIME email, base64url encoded in the `raw` field, to `POST https://gmail.googleapis.com/gmail/v1/users/me/messages/send`. The email intentionally contains one-time download links only; it includes no file attachment and no direct Cloudinary URL.

For OAuth Playground setup using the owner’s OAuth client credentials, add `https://developers.google.com/oauthplayground` as an authorized redirect URI, enable offline access, and request the send-only scope.

## Testing mode and buyer recipients

This implementation authorizes only the owner’s Gmail account. Google OAuth Testing mode controls which Google Accounts may grant that authorization, so the owner sender must be a listed test user. It does not turn buyer recipients into OAuth users: after the owner has authorized the sender and Gmail API is enabled, the Worker sends the delivery email to the checkout email stored in D1. Google notes that Testing mode has a tester warning, a user cap, and a limited refresh-token lifetime, so production publishing/verification is a resilience consideration for the owner authorization—not a requirement for sending a delivery email to a buyer address.

## Official references

- [Create and send email messages — Gmail API](https://developers.google.com/workspace/gmail/api/guides/sending)
- [Choose Gmail API scopes](https://developers.google.com/workspace/gmail/api/auth/scopes)
- [OAuth 2.0 for web server applications](https://developers.google.com/identity/protocols/oauth2/web-server)
- [Google OAuth 2.0 Playground](https://developers.google.com/oauthplayground)
