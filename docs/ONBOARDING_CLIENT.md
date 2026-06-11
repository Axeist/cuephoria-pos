# New client onboarding

Repeat for each new tenant.

## Platform admin — before go-live

- [ ] Create organization + plan entitlements
- [ ] Create owner admin user
- [ ] Assign workspace role **Owner** in Settings → Team
- [ ] Send email verification / force password change if needed
- [ ] Configure Razorpay (tenant or platform profile)
- [ ] Register webhook: `https://<domain>/api/razorpay/webhook`
- [ ] Create first location + branding
- [ ] Apply Supabase migrations (RBAC + HR if not already global)

## Owner smoke test (Preview or production)

- [ ] Admin login (password)
- [ ] POS: add item, checkout (cash)
- [ ] Station: start and end session
- [ ] Products: view catalog
- [ ] Reports: bills tab loads
- [ ] Public booking page loads (test mode booking if enabled)
- [ ] Settings → Team: create Employee test user

## Employee role verification

- [ ] Employee login works
- [ ] Cannot delete products / bills (RBAC)
- [ ] Reports: only permitted tabs (Bills + Sessions for default Employee)

## Security defaults

- [ ] Change default admin PIN from `1234` in Settings
- [ ] Confirm `SECURITY_STRICT_PRICING` enabled after soak period
- [ ] Document tenant-specific webhook secret if using ElevenLabs

## Support handoff

- Owner email and org slug recorded
- Plan tier and branch count documented
