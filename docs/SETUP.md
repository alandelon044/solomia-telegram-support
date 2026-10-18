# Import and setup

These are inactive, sanitized n8n workflow templates. Importing the JSON does not import credentials, create a Data Table, or connect the error handler automatically.

## Prerequisites

- An n8n instance with Data Tables and the exported node versions available.
- A Telegram bot credential and a Gemini API credential that can access the selected model.
- A staff Telegram user ID and staff chat ID. Use a separate customer account for a realistic demonstration.

## 1. Import both workflows

Import `workflow.json` and `error-workflow.json` through n8n's **Import → From file** action. Keep both unpublished while configuring them.

The main template contains 17 nodes. The independent n8n chat experiment from the original canvas is omitted because it is not part of the demonstrated Telegram ticket flow. No ticket-flow connections are removed.

## 2. Reconnect credentials and staff settings

| Location | Required action |
|---|---|
| Telegram Trigger and Telegram send nodes, in both workflows | Select your Telegram bot credential. |
| Google Gemini Chat Model1 | Select your Gemini credential and a model available to your account. The observed final model was `models/gemini-3.5-flash-lite`. |
| Send a text message → Chat ID | Replace `YOUR_ADMIN_CHAT_ID` with the staff chat ID. |
| If4 → right value | Replace `YOUR_ADMIN_TELEGRAM_USER_ID` with the staff user's Telegram ID. This is a user ID, not a group chat ID. |
| Notify owner in Telegram → Chat ID | Replace `YOUR_ADMIN_CHAT_ID` with the owner's notification chat ID. |
| Notify owner in Telegram → text expression | Replace `https://YOUR_N8N_HOST` and `YOUR_SUPPORT_WORKFLOW_ID` for the fallback link used when n8n provides no execution URL. |

Do not paste API keys into workflow parameters. Store them in n8n credentials. The public exports deliberately remove credential references and pinned execution data.

## 3. Create the tickets table

Create an n8n Data Table named `tickets`. The included `tickets_schema.csv` supplies column names only, with no data rows. Configure the following fields as **String** to match the exported mappings:

| Field | Purpose |
|---|---|
| `ticket_id` | Telegram update ID used to identify the ticket. |
| `client_chat_id` | Destination for the approved reply. |
| `client_message_id` | Original message ID. |
| `category` | AI category or fallback `other`. |
| `priority` | AI priority or fallback `normal`. |
| `original_text` | Incoming customer text. |
| `summary` | Short staff summary. |
| `draft` | Reply for human review. |
| `status` | `pending`, `sent`, or `human`. |
| `created_at` | ISO timestamp on creation. |
| `updated_at` | ISO timestamp on the latest transition. |

The table's own `id`, `createdAt`, and `updatedAt` fields are managed by n8n; do not add duplicate custom columns for them.

Select this table in all five Data Table nodes: Insert row, Get row(s), Get row(s)1, Update row(s), Update row(s)1. Replace the `YOUR_TICKETS_DATA_TABLE_ID` resource selection with your actual table using the UI.

## 4. Link the error workflow

Publish the error handler after configuring its Telegram node. In the main workflow, open **Workflow settings → Error Workflow**, select **SOLOMIA — Error Alerts**, and save. Keep failed-execution saving enabled so notifications can include execution links.

Error workflows handle executions that actually fail. The classifier is configured to continue via its error output, so its handled failures produce fallback review tickets rather than triggering the separate failure handler. See [n8n's error-handling documentation](https://docs.n8n.io/flow-logic/error-handling/).

## 5. Validate before publication

1. Use a non-sensitive test message and confirm category, summary, draft and a `pending` table row.
2. Approve the draft; verify delivery and `sent`. Repeat the button sequentially and verify no second message.
3. Create another ticket; take over and verify the acknowledgement and `human` status.
4. Use a separate account to test customer delivery and callback authorization.
5. Test the notifier with n8n's Error Trigger sample; expect a **ТЕСТ** notification in the owner's chat. This synthetic test does not prove production error-trigger dispatch.
6. Review the [unverified cases](../TEST_RESULTS.md) before using the workflow outside a controlled demonstration.

Publish the main workflow only after connecting your own bot and completing the checks relevant to your deployment. Telegram has one webhook per bot: use a dedicated demo bot to avoid replacing another workflow's webhook.
