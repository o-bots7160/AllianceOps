# ADR 024: Apex Domain Redirect to www Canonical Domain

## Status

Accepted. Supersedes the "Apex Domain Behavior" section of ADR-020.

## Context

ADR-020 established that both `allianceops.io` and `www.allianceops.io` would serve the same content directly, without an HTTP redirect. This was noted as a negative consequence and accepted as a trade-off, with the comment: _"Azure SWA does not support host-based routing rules for redirects without Azure Front Door."_

Post-launch, the absence of an apex → www redirect creates issues:

- **SEO**: Search engines index two separate canonical URLs for the same content, splitting page rank.
- **Inconsistency**: Users who bookmark or share `allianceops.io` links reach the same app but through a different URL than users who land on `www.allianceops.io`.
- **Standards**: The `www` subdomain is the conventional canonical form for web applications.

## Decision

Configure Azure Static Web Apps to designate `www.allianceops.io` as the **default domain**. When a default domain is set, Azure SWA automatically issues a **308 Permanent Redirect** from all other registered custom domains — including the apex `allianceops.io` — to the default domain.

### Implementation

Azure SWA exposes a `setDefault` action on the `customDomains` ARM sub-resource. This action is not surfaced as a first-class CLI command but is accessible via `az rest`. The prod deployment workflow includes a **"Set www as Default Domain"** step that calls this action after the `www.allianceops.io` domain is validated:

```bash
az rest --method POST \
  --uri "https://management.azure.com/subscriptions/{sub}/resourceGroups/rg-aops-prod/providers/Microsoft.Web/staticSites/stapp-aops-prod/customDomains/www.allianceops.io/setDefault?api-version=2023-12-01" \
  --body '{}'
```

The step is **non-fatal**: if the `www` domain is not yet in `Ready` status (e.g., on a first-ever deployment before DNS has propagated), or if the REST call fails for any reason, it emits a `::warning::` and exits cleanly. In that case, the operator sets the default domain manually:

> Azure portal → `stapp-aops-prod` → **Custom domains** → `www.allianceops.io` → **Set default**

Once set, the default domain persists across subsequent deployments — the step is idempotent.

## Alternatives Considered

### Azure Front Door

Azure Front Door can issue a proper 301/308 redirect from the apex to `www` via routing rules. This was the primary alternative mentioned in ADR-020 and was deferred due to cost (~$35/month for Front Door Standard) and the complexity of adding a new Azure resource type to the infrastructure for a single URL redirect.

Still rejected for the same reasons: the `setDefault` REST action achieves the same outcome at no additional cost.

### `staticwebapp.config.json` Routing Rules

SWA routing rules in `staticwebapp.config.json` do not support host-based conditions. A redirect rule targeting `https://www.allianceops.io` would apply to all incoming traffic regardless of the request hostname — including traffic already on `www.allianceops.io` — causing an infinite redirect loop (`ERR_TOO_MANY_REDIRECTS`). This approach is not viable.

### Accept Status Quo (Two Domains, No Redirect)

Both domains serving content is functional. Rejected because the SEO and user-experience downsides are tangible and the fix is low-effort.

## Consequences

### Positive

- **Single canonical URL**: All traffic consistently resolves to `www.allianceops.io`.
- **SEO improvement**: Search engines receive a single authoritative URL.
- **No cost increase**: Uses an existing Azure SWA Standard SKU feature.
- **Automatic 308 redirect**: SWA handles the redirect at the platform CDN level, before any `staticwebapp.config.json` routing rules are evaluated — no application code changes required.
- **Idempotent automation**: The deploy step is safe to run on every deployment.

### Negative

- **Undocumented CLI action**: The `setDefault` REST action is not surfaced in the official Azure CLI reference. If Azure changes the API path, the step would need updating and a manual portal fallback would be required until fixed.
- **Manual fallback on first deploy**: If `www.allianceops.io` is not yet validated when the step runs (e.g., on a brand-new environment where DNS hasn't propagated), the operator must set the default domain manually in the Azure portal.
