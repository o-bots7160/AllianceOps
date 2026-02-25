# Azure OIDC Setup for GitHub Actions

This guide covers the one-time Azure configuration required for GitHub Actions CI/CD to deploy AllianceOps.

## Prerequisites

- An Azure subscription
- Permission to create App Registrations in Microsoft Entra ID (Azure AD)
- The [Azure CLI](https://learn.microsoft.com/en-us/cli/azure/install-azure-cli) installed locally (or use Azure Cloud Shell)

## 1. Create an App Registration

1. Go to **Azure Portal** → **Microsoft Entra ID** → **App registrations** → **New registration**
2. Name: `O-bots GitHub Deployment` (or similar)
3. Supported account types: **Single tenant**
4. No redirect URI needed
5. Click **Register**
6. Note the **Application (client) ID** and **Directory (tenant) ID** — you'll need these as GitHub secrets

## 2. Add Federated Identity Credentials

The App Registration needs federated credentials so GitHub Actions can authenticate via OIDC (no stored secrets).

### Via Azure Portal

1. Open the App Registration → **Certificates & secrets** → **Federated credentials** → **Add credential**
2. Select scenario: **GitHub Actions deploying Azure resources**
3. Fill in for the **dev** environment:
   - **Organization:** `o-bots7160`
   - **Repository:** `AllianceOps`
   - **Entity type:** Environment
   - **Environment name:** `dev`
   - **Name:** `github-actions-dev`
4. Repeat for **production**:
   - **Entity type:** Environment
   - **Environment name:** `production`
   - **Name:** `github-actions-prod`

### Via Azure CLI

```bash
# Get the App Registration's object ID (NOT the client ID)
APP_OBJECT_ID=$(az ad app list --display-name "O-bots GitHub Deployment" --query "[0].id" -o tsv)

# Add dev environment credential
az ad app federated-credential create --id $APP_OBJECT_ID --parameters '{
  "name": "github-actions-dev",
  "issuer": "https://token.actions.githubusercontent.com",
  "subject": "repo:o-bots7160/AllianceOps:environment:dev",
  "audiences": ["api://AzureADTokenExchange"]
}'

# Add production environment credential
az ad app federated-credential create --id $APP_OBJECT_ID --parameters '{
  "name": "github-actions-prod",
  "issuer": "https://token.actions.githubusercontent.com",
  "subject": "repo:o-bots7160/AllianceOps:environment:production",
  "audiences": ["api://AzureADTokenExchange"]
}'
```

## 3. Assign Subscription Roles

The service principal needs two roles on the Azure subscription:

- **Contributor** — to create and manage Azure resources (Function Apps, Postgres, Key Vault, etc.)
- **User Access Administrator** — to create RBAC role assignments (e.g., granting the Function App's managed identity access to Key Vault secrets)

> **Note:** When adding User Access Administrator, use a condition to restrict it to non-privileged roles only (select "All roles except privileged administrator roles" in the condition picker). This follows least-privilege principles.

### Via Azure Portal

1. Go to **Subscriptions** → select your subscription → **Access control (IAM)**
2. Click **Add** → **Add role assignment**
3. **Role:** `Contributor`
4. **Members:** Select "User, group, or service principal" → search for **"O-bots GitHub Deployment"** → select it
5. **Review + assign**
6. Repeat for **User Access Administrator**:
   - Same member selection
   - On the **Conditions** tab, select **"Allow user to assign all roles except privileged administrator roles"**
   - **Review + assign**

### Via Azure CLI

```bash
# Get the service principal's object ID
SP_OBJECT_ID=$(az ad sp list --display-name "O-bots GitHub Deployment" --query "[0].id" -o tsv)

# Assign Contributor on your subscription
az role assignment create \
  --assignee-object-id $SP_OBJECT_ID \
  --assignee-principal-type ServicePrincipal \
  --role "Contributor" \
  --scope "/subscriptions/<YOUR_SUBSCRIPTION_ID>"

# Assign User Access Administrator (add condition via Portal for least-privilege)
az role assignment create \
  --assignee-object-id $SP_OBJECT_ID \
  --assignee-principal-type ServicePrincipal \
  --role "User Access Administrator" \
  --scope "/subscriptions/<YOUR_SUBSCRIPTION_ID>"
```

> **Portal recommended for User Access Administrator** — the Portal's condition picker makes it easy to restrict to non-privileged roles. The CLI equivalent requires a complex condition expression.

## 4. Create GitHub Environments

The deploy workflows reference GitHub Environments for OIDC subject claims.

1. Go to the GitHub repo → **Settings** → **Environments**
2. Create environment: `dev`
3. Create environment: `production`
   - Optionally add **required reviewers** for manual approval before prod deploys

## 5. Configure GitHub Repository Secrets

Go to the GitHub repo → **Settings** → **Secrets and variables** → **Actions** → **Repository secrets**.

Add the following secrets:

| Secret | Description |
|--------|-------------|
| `AZURE_CLIENT_ID` | App Registration's Application (client) ID |
| `AZURE_TENANT_ID` | Microsoft Entra ID Directory (tenant) ID |
| `AZURE_SUBSCRIPTION_ID` | Azure subscription ID |
| `POSTGRES_ADMIN_PASSWORD` | Password for the Azure PostgreSQL admin user |
| `TBA_API_KEY` | The Blue Alliance API key |

> **Note:** SWA deployment tokens are fetched automatically via `az staticwebapp secrets list` during the deploy — no need to store them as secrets.

## Verification

After completing all steps, push a code change to the `dev` branch. The Deploy Dev workflow should:

1. ✅ Authenticate via OIDC (no "No subscriptions found" error)
2. ✅ Deploy infrastructure via Bicep
3. ✅ Run database migrations
4. ✅ Deploy the Function App
5. ✅ Deploy the Static Web App

## Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| `AADSTS70025: no configured federated identity credentials` | Missing federated credential | Add credential matching the environment name (Step 2) |
| `No subscriptions found` | Service principal has no role on the subscription | Assign Contributor role (Step 3) |
| `Login failed` | Wrong client/tenant ID or missing GitHub Environment | Verify secrets and environments (Steps 4–5) |
| `Authorization failed for roleAssignments/write` | SP lacks permission to assign RBAC roles | Add User Access Administrator role (Step 3) |
| `Resource group not found` | First deploy — RG doesn't exist yet | The deploy workflows now auto-create the resource group. If running manually: `az group create -n rg-aops-dev -l centralus` |
