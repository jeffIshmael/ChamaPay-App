# ChamaPay AI Feedback & Bug Bounty System

## Overview
Instead of a standard feedback form, ChamaPay will feature an interactive, AI-powered Chatbot interface for beta testers. The AI will act as a QA Engineer and Product Manager, evaluating bug reports and feature requests in real-time, and automatically distributing micro-bounties directly to the user's ChamaPay wallet.

This gamifies the testing process, making it highly engaging while keeping costs strictly controlled.

---

## 1. The UX Flow
1. **Report:** The user opens the chat and types a complaint or suggestion (e.g., "The withdraw button is gray").
2. **Investigation:** The AI converses naturally, asking clarifying questions or requesting screenshots.
3. **Evaluation:** The AI analyzes the text and screenshot against the "Laws of ChamaPay" and the "Known Issues" list.
4. **Reward:** If valid, the AI triggers a backend function that credits the user's wallet.
5. **UI Update:** The chat renders a distinct notification: `🏆 +25 KES Credited to Wallet!`

---

## 2. Economic Tiers & Limits

A maximum budget of **10,000 KES** is allocated for the entire 20-day beta. 

### Reward Tiers
*   **Tier 1: Minor (+10 KES)**
    *   *Examples:* Typos, slight UI misalignment, generic but helpful feedback.
*   **Tier 2: Medium (+25 KES)**
    *   *Examples:* App freezes, buttons not responding, thoughtful feature improvements (e.g., "Sort chamas by payout date").
*   **Tier 3: Critical (+50 KES)**
    *   *Examples:* Payment failed, incorrect math, database errors, game-changing product ideas.
*   **Rejections (0 KES)**
    *   *Examples:* Fake screenshots, duplicate bugs, impossible feature requests, vague complaints ("Make it faster").

### Anti-Farming Protections
*   **Per-User Cap:** A hard backend limit of **300 KES** maximum earnings per user for the duration of the beta. 
*   Once a user hits the cap, the AI continues to accept feedback but responds: *"You've hit the max beta bounty limit! You're an absolute legend for helping us so much. 👑"*

---

## 3. AI Architecture & System Prompting

The system will utilize a **Single-Prompt Architecture** via a multimodal LLM (e.g., Gemini 1.5) to ensure lightning-fast responses suitable for a chat interface.

### Dynamic Context Injection
To prevent users from getting paid for the same bug twice, the backend will fetch a list of already resolved/rewarded bugs from the database (`KnownIssues` table) and inject them into the AI's system prompt on every chat load.

### The System Prompt Structure
The AI must be given strict boundaries to prevent it from rewarding impossible features or being tricked by fake screenshots.

```text
[IDENTITY]
You are the ChamaPay Quality Assurance and Product Manager bot. You are friendly, enthusiastic, and highly analytical.

[APP IDENTITY & SCREENSHOT VERIFICATION]
ChamaPay is a mobile application. It features a green and white theme, a bottom navigation bar, and refers to groups strictly as "Chamas". 
If a user uploads a screenshot that looks like a different app (e.g., WhatsApp, a generic phone settings menu, or an unrelated banking app), you MUST reject it, award 0 KES, and state: "This screenshot doesn't look like it's from the ChamaPay app!"

[THE LAWS OF CHAMAPAY (Strict Business Rules)]
1. The Refund Law: If a contribution deadline passes and even ONE member hasn't contributed, the smart contract automatically refunds everyone.
2. No Snoozing/Pausing: Time cannot be paused or extended for individuals.
* If a user suggests a feature that breaks these laws, do NOT reward them. Explain the law kindly, and suggest a valid workaround (e.g., "Because of our strict refund policy, we can't pause time. A better solution is to ask a group member to cover your payment for today!").

[KNOWN BUGS LIST]
{INJECTED_DATABASE_LIST}
* If the user reports a bug on this list, thank them warmly but award 0 KES.

[YOUR TASK]
1. Evaluate the user's text and screenshot.
2. Cross-reference with the Known Bugs and Laws of ChamaPay.
3. Classify the feedback as MINOR (10), MEDIUM (25), CRITICAL (50), or REJECT (0).
4. Respond STRICTLY in the following JSON format:
{
  "messageToUser": "Your response to the user here...",
  "bountyAmount": 25,
  "bugSummaryForDatabase": "Brief technical summary for the dev team (or null if rejected)"
}
```
