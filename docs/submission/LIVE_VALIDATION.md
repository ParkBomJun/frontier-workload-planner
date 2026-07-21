# Locally enabled Live validation record

Status: **Completed on the captured application release**

This record separates the application release that was exercised from any later documentation-only
submission commit. The validation used an intentional, non-confidential project task and does not
publish its raw text, a key, an environment value, or a private URL.

## Recorded result

- Application release SHA: `97c30de29a520e15b6439bb514179418736b9180`
- Release state at capture: clean local checkout matched GitHub `origin/main`
- Validation date: 2026-07-21 UTC
- Execution location: private local environment
- Release configuration: the application defaults to the `gpt-5.6` alias; the exact outbound alias
  for this captured request was not separately logged
- Browser `/api/analyze` requests during the captured action: 1
- Sample-analysis requests during the captured action: 0
- HTTP status: `200`
- Response cache policy: `Cache-Control: no-store`
- Response mode: `live`
- Returned model: `gpt-5.6-sol`
- Analysis contract: `best-fit-analysis-v2`
- Schema validation: passed
- Task identity validation: passed for `task-1`
- Upstream attempts used: not exposed by the captured application evidence
- API key shown in output or screenshots: no
- Raw task text included in this published record: no

## Evidence-backed checks

- [x] The captured checkout was clean, and its SHA matched GitHub `origin/main`.
- [x] One browser action made one same-origin `/api/analyze` request and no sample-analysis request.
- [x] The response reported `mode: live`, passed the versioned schema, and preserved the task ID.
- [x] The published screenshots, video, and response summary contain no API key, raw upstream error,
      private URL, or sensitive content.
- [x] A fresh public production request on 2026-07-21 returned HTTP `403`,
      `LIVE_ANALYSIS_DISABLED`, and `Cache-Control: no-store`.

## Operator confirmations that remain human-owned

- [ ] Confirm the local key is secured or rotated according to the owner's normal key-management
      practice.
- [ ] Confirm any temporary locally enabled Live process is stopped or has Live disabled.

## Published demonstration

The [public 2:40 demo](https://youtu.be/iI3lDYjBCUc) shows both the free instant sample path and the
locally enabled Live path from the captured application release. It is public, playable in an
embedded player, and has a manually published English caption track in addition to the automatic
English track.

This real locally enabled call and the mocked privacy tests prove different boundaries. The mocked
tests verify the exact outbound allowlist and error containment; this record proves that the
locally enabled release path returned a schema-valid Live result.
