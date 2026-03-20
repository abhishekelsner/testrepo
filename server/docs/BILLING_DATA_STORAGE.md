# Where subscription & payment data is saved (MongoDB)

After a **successful payment**, data is stored in **two MongoDB collections**:

---

## 1. `workspaces` (Workspace model)

**Path:** `server/src/models/Workspace.js`

| Field | Description |
|-------|-------------|
| `plan` | `"single"` or `"team"` |
| `subscriptionStatus` | `"active"` \| `"inactive"` \| `"trialing"` \| `"past_due"` |
| `stripeCustomerId` | Stripe customer ID (e.g. `cus_...`) |
| `stripeSubscriptionId` | Stripe subscription ID (e.g. `sub_...`) |
| `currentPeriodStart` | Start of current billing period |
| `currentPeriodEnd` | End of current billing period |
| `cancelAtPeriodEnd` | Whether subscription will cancel at period end |
| `paymentMethodBrand` | Card brand (e.g. `visa`, `mastercard`) |
| `paymentMethodLast4` | Last 4 digits of card |
| `billingEmail` | Email used for billing (from Stripe) |
| `organizationId` | Links to your Organization |
| `ownerId` | Workspace owner (User) |

**When it’s updated:** Stripe webhooks (`checkout.session.completed`, `invoice.payment_succeeded`, `customer.subscription.updated`, `customer.subscription.deleted`).

---

## 2. `subscriptionpayments` (SubscriptionPayment model)

**Path:** `server/src/models/SubscriptionPayment.js`

One document **per successful payment** (each invoice).

| Field | Description |
|-------|-------------|
| `workspaceId` | Links to Workspace |
| `stripeInvoiceId` | Stripe invoice ID (e.g. `in_...`) |
| `amount` | Amount paid (in main currency unit, e.g. dollars) |
| `currency` | e.g. `"usd"` |
| `status` | e.g. `"paid"` |
| `paidAt` | When the payment was made |
| `periodStart` | Start of the paid period |
| `periodEnd` | End of the paid period |
| `description` | Optional description from Stripe |

**When it’s created:** Stripe webhook `invoice.payment_succeeded`.

---

## How to view the data

- **In the app:** After payment, use **Manage subscription** on the success page, or go to **Settings → Subscription** in the sidebar. Plan, payment method, period, and payment history are loaded from these collections via `GET /api/billing/status`.
- **In MongoDB:** Inspect the `workspaces` and `subscriptionpayments` collections (e.g. in MongoDB Compass or shell).
