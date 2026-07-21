# Submission hard gates

This checklist contains human-owned release and eligibility decisions. Nothing in the repository may
mark these items complete automatically. **Do not submit until every applicable box is checked and
the final Devpost preview has been reviewed once more.**

## Identity, eligibility, and track

- [ ] Confirm the entrant is registered for OpenAI Build Week and is eligible under the current
      official rules.
- [ ] Select **Apps for Your Life** in the submission form and verify the final description still
      addresses an individual user.
- [ ] In the Codex thread where the majority of core functionality was built, run `/feedback`.
- [ ] Paste that primary Codex Session ID into the Devpost submission form and verify there are no
      missing or transposed characters.
- [ ] Verify the repository history shows the project was created during the submission period, or
      add an accurate English disclosure of pre-existing work if that fact changes.

## Freeze the application release and submission documentation

- [ ] Run the full local verification suite on a clean working tree.
- [ ] Confirm the current public application release SHA:
      `185ae7a588d3448675a0e16de4f9953b991397f1`.
- [ ] Confirm the protected-Live and video evidence release remains
      `97c30de29a520e15b6439bb514179418736b9180`, and that the documented runtime difference is only
      the fresh-browser default changing from Korean to English.
- [ ] After pushing, record the later submission-documentation SHA in the private submission
      handoff record rather than in this versioned file.
- [ ] Confirm both application SHAs remain reachable from the public GitHub history and
      that the later submission commit changes documentation only.
- [ ] Confirm the repository is publicly accessible and includes the MIT license, or complete the
      official private-repository sharing requirements instead.
- [ ] Confirm README, Devpost text, video, screenshots, and test instructions distinguish the
      evidence release, current public application release, and later documentation-only commit.

## Deploy the current public application SHA

- [ ] Deploy the current public application release SHA without rebuilding from an uncommitted working
      tree.
- [ ] Confirm the hosting provider's deployment metadata resolves to the current public application
      release SHA.
- [ ] Open the public URL in a clean browser profile and verify the current English personal-user UI
      appears, not the earlier stable interface.
- [ ] Verify the public demo is free and will remain available through the complete judging period.
- [ ] Keep `ENABLE_LIVE_ANALYSIS=false` and do not install an OpenAI API key in the unauthenticated
      public deployment.
- [ ] Verify the public **Try a sample** flow succeeds from task loading through results, restore,
      delete, Markdown copy, and JSON export.
- [ ] Verify a public Live attempt fails with the documented sanitized disabled response and does not
      break the sample path.
- [ ] Verify desktop and mobile flows in clean browser sessions, including at least 390px width.

## Locally enabled GPT-5.6 validation

- [ ] From the evidence release SHA, run one private local Live request with a
      server-only key and non-sensitive task text.
- [ ] Confirm the release configuration defaults to the `gpt-5.6` alias. The captured evidence
      proves the returned model and contract but does not separately log the exact outbound alias.
- [ ] Record the validation date and non-secret outcome here:
      `2026-07-21 UTC; HTTP 200; mode live; model gpt-5.6-sol; best-fit-analysis-v2; task-1 matched`.
- [ ] Confirm no API key, environment value, raw provider error, private URL, or confidential task
      text appears in Git history, build output, browser storage, screenshots, or video.
- [ ] Remove or secure the local key after validation according to the owner's normal key-management
      practice.

## English submission materials

Recorded URLs:

- Public demo: <https://frontier-workload-planner.vercel.app>
- Public repository: <https://github.com/ParkBomJun/frontier-workload-planner>
- Public video: <https://youtu.be/iI3lDYjBCUc>

- [ ] Re-read README.md as the judge's setup and testing guide; confirm it is accurate and complete in
      English.
- [ ] Copy the final English DEVPOST.md text into Devpost and compare the rendered version line by
      line.
- [ ] Confirm the chosen track, title, tagline, feature claims, privacy wording, and release status are
      consistent across README, Devpost, and video.
- [ ] Confirm no current submission document describes either the evidence release or current
      public application release as undeployed or pending.
- [ ] Add the final public demo, repository, and YouTube URLs to the submission form.

## Video hard gates

Recorded exported duration: **2:40.37**.

- [ ] Record the exact evidence-release UI in English with an English voiceover.
- [ ] Keep the finished video at or below **2:49** and verify the exported file duration, not only the
      editor timeline.
- [ ] Clearly explain what the product does, how GPT-5.6 is integrated, and the concrete ways Codex
      helped with requirements, implementation, the restore-clock P1, UX iteration, and tests.
- [ ] Show a working user flow centered on the actual UI; do not represent a test fixture as a
      production account or editable product state.
- [ ] Show only the OpenAI reference path and confirm no other provider's product name, trademark,
      logo, model name, website, browser bookmark, or source snippet appears in any frame or
      narration. Plain-text OpenAI, GPT-5.6, and Codex references must match the script.
- [ ] Use no copyrighted music or media without documented permission.
- [ ] Confirm no API key, account identifier, private task, LocalStorage payload, local path, private
      URL, notification, or unrelated browser tab appears.
- [ ] Add accurate English captions and watch the complete exported video with sound.
- [ ] Upload the final video to YouTube as **Public**, open it while signed out, and confirm playback,
      sound, captions, and duration.
- [ ] Paste the public YouTube URL into Devpost.

## Third-party and claim review

- [ ] Confirm no unsupported affiliation, endorsement, benchmark, “best model,” mathematical optimum,
      quote, or guaranteed-savings claim appears in the app or submission materials.
- [ ] Confirm any provider catalog facts retained in the release are factual, source-linked,
      date-stamped, and used within the applicable terms and licensing conditions.
- [ ] Confirm the final video contains no other-provider marks unless written permission has been
      obtained and retained; required plain-text OpenAI, GPT-5.6, and Codex references are factual
      and do not imply endorsement.
- [ ] Confirm unverified subscription access and quota remain conditional and are not shown as a
      confirmed real account.

## Final technical verification

- [ ] `npm test`
- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm run build`
- [ ] `git diff --check`
- [ ] Confirm the final commit contains no secret, `.env.local`, generated private export, or
      accidental recording asset.
- [ ] Confirm the pushed submission commit changes documentation only, both application SHAs remain
      reachable, and the public application behavior is unchanged.
- [ ] Complete a final signed-out Devpost preview, verify every required field, and submit before the
      official deadline with a safe time margin.
