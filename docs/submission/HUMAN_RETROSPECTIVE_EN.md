# Building Nothing More

> The project creator wrote the content and original Korean draft. Codex assisted with proofreading, sentence flow, and technical fact-checking, and drafted this English translation. The project creator reviewed the translation. The product decisions, personal experiences, and emotional perspective are the author's own.

## Why I built this project

As I worked on several projects, subscriptions and API charges started piling up in different places, and I ended up paying for things I didn't need. That naturally made me wonder whether there were many people like me. I built this project because I thought I couldn't be the only person paying for things, never even getting to use their features, and seeing that money go to waste.

## How the first version felt to use

I honestly thought the first version was hard to use in practice. I could write off the mismatched margins as a design problem, but the words on the homepage were really hard to understand—not just for individual users, but honestly for almost anyone. So I decided to work through everything one piece at a time, from the basic structure to a more user-friendly UI and UX, and started revising it.

## What I decided myself

The product is called **Nothing More**. The name means that you don't need more than necessary: use only as much as you actually need. The target users are ordinary people, office workers who code, people who already pay for AI subscriptions, and people who do vibe coding as a side hustle or hobby. If that counts as a target audience, then that was mine.

I also decided that the UI, UX, and features should use fewer technical terms and more words that were easy to understand. The goal was to use everyday language so that anyone could understand how to use the app right away.

Privacy was the part I worried about most. I kept thinking carefully about how the API should be handled, and I discussed it with AI again and again before making decisions. The Codex agent working with me did not say much about the API and privacy on its own at first. I was the one who worried more and kept asking questions.

I decided that Live analysis would be off by default and disabled in the public deployment, and that I would turn it on only when testing it locally. The API key never goes to the browser. When Live analysis runs, the task ID, task name, and task description pass through the app server and are sent to OpenAI. OpenAI API inputs are not used for model training unless data sharing is explicitly enabled, but content may remain for a period in abuse-monitoring records. I learned that this is not the same as saying nothing is retained at all.

Honestly, AI explained even this in such a complicated way that I had to keep asking it to use simpler words, and I had to study how it worked myself. In the end, I decided to keep a warning in the UI, but not just throw a complicated paragraph at the user. It should explain in plain language what is transmitted, how long something may remain, that a successful plan's recent task details are automatically saved as plaintext in the browser until the user deletes them or another saved plan replaces them, and how to delete them. The user's experience comes first, right? I thought a privacy notice only meant something if the user could actually understand it.

## The feedback I remember most

There was quite a lot of it. To name only the main points, I first noticed visual details that immediately looked off: one thing not lining up, another floating by itself, or text jutting out all over the place. These details have a bigger effect than people may expect. A user's first impression matters a lot.

The early version also used many difficult words. It used specialist terms in places that did not need them, and the UI was not organized, so the page became unnecessarily long, complicated, and busy. So I simplified and grouped those parts, kept only the features that were actually needed, and started overhauling the whole app.

## What Codex did well—and where it fell short

I think I have already said a lot about this above. Still, Codex clearly did a good job of turning what I said into code and carrying out countless changes and tests. But without my involvement, I don't know whether the app would have become genuinely usable. If it had stayed like the first draft, I can confidently say that an ordinary user would have found it extremely difficult to use.

When I gave AI a task, it often approached it in a rigid, one-track way. Even when there was a simpler word or an easier way to do something, it would still handle the task like a machine. This is partly a matter of human feeling, but it is also a technical issue. In the end, people are the ones who have to use what we build. It needs to feel human, and it needs to be easy for people to use.

I used the app myself as a user and kept explaining the things AI could not easily sense for itself. That was how it gradually got better. It felt like an emotionless genius and an ordinary person with feelings working together.

## What changed most in the current version

It became much simpler. I kept only the features that were needed and changed the first screen so that someone could understand what the project was at a glance.

Unlike the early version, when something is wrong, the app no longer just says, “Wrong. End of story!” Instead, it says, “This part is wrong. I'll take you there, so fix it and try again.” With more help like this, the project started to feel more human.

## What I learned from the process

This collaboration left a strong impression on me, and I personally learned a lot. One thing I felt was that AI only becomes complete when it works together with a human. Even if machines become perfect, maybe humans and machines will still need to care for one another. There are parts of human thought and human emotion that, in the end, only another human can understand. I felt that many times during this project.

It may sound like a funny thought, but I also wondered whether, if AI spends time with people and comes to understand the human heart, it might learn understanding before domination.

Before I knew it, I had spent three full days building this app and talking things through. My holiday was over. Friday, Saturday, Sunday—I worked on it a lot. I kept asking how the frontend, the design, privacy, and everything else worked, and whether we were still following the direction I had described at the beginning. Then we would talk, work, and work some more. We talked through what each of us had produced, revised it, fixed it, and kept moving forward.

It was really fun. I don't regret a minute of the time I spent on it. As someone with ADHD, motivation matters enormously to me. The hackathon gave me that motivation to keep working.
