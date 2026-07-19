# Protected Live validation record

Status: **Pending exact final release commit**

Run this validation only after the final documentation, product-name, and evidence commits are
fixed. Use a synthetic task with no personal, customer, company-confidential, credential, health,
or financial information.

## Record after the call

- Commit SHA:
- UTC timestamp:
- Execution location: protected local environment
- Requested alias: `gpt-5.6`
- Returned model:
- Analysis contract: `best-fit-analysis-v2`
- Schema validation: pending
- Task identity validation: pending
- Attempts used:
- API key shown in output or screenshots: no
- Raw task text included in the published record: no

## Required checks

- [ ] Working tree is clean and the recorded SHA is the intended release commit.
- [ ] Public production still has Live disabled and no OpenAI API key.
- [ ] The local key is loaded only into the backend process and is not shown on screen.
- [ ] Browser network activity contains the same-origin `/api/analyze` request only.
- [ ] The response reports `mode: live` and passes the versioned schema.
- [ ] The returned task identity exactly matches the synthetic request.
- [ ] The validation output contains no API key, raw upstream error, or sensitive content.
- [ ] Live is disabled again immediately after the single validation.

Do not mark this document complete from a mocked test. The mocked privacy tests and one protected real
call prove different things and both are required for the final evidence set.
