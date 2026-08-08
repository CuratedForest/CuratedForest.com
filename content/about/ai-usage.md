---
title: AI Usage
weight: 1
type: docs
draft: false
---

With today's technology, it's important to consider how and why AI is utilized. This document outlines all the best practices and lines I've drawn around AI.

# What is AI and how is it useful?

## Linguistic Search
When you get past the verbal fluency of AI responses, what's actually going on is the next generation of search. It handles language _naturally_ rather than _mathematically_. This supports my most frequent AI usage: replacing everything I Googled. Even more though because I can have it search far more complex and nuanced topics and have them summarized at speeds I can't come close to.

Explicitly I use Anthropic's Research functionality primarily with different models depending on the complexity of my query. It gets the most use assisting me in researching technologies, approaches, and architectures, and then troubleshooting when those don't work out.
*** The important thing to keep in mind here is that this is basically a collection of many of the findings on the internet, and these are often wrong!  ***
It's similar to Stack Overflow in that you'll get up to a dozen solutions, but 6 of them are outdated, 3 are outright dangerous, 2 of them are plausible, and 1 really fits well. This is the quality of answers typically returned, and just like Stack Overflow you have to be responsible for picking the solution that fits best.

## Fuzzy Replace
The other way this verbal fluency has been helpful has been as a fuzzy copy/paste. In many ways you can boil the code generation agents down to a loop of fuzzy copy/pasting. With a little structure this can accomplish a TON.

I do utilize Cline as a coding assistant/agent. It's open source and works well enough with my local models, Claude's API, and Open Router. I recognize that Claude Code leads the industry here but fails my need for open source tools.

## Documentation
Most of my queries look like: here is the project context you need, here is the task context, and then where to look and what to find and change.
The thing is, the majority of this context looks just like documentation, because it IS documentation!

The key thing is, I don't use AI to write the documentation from the start. My pattern is to write the documentation or feature's behavior out first, then utilize that as context for planning and implementing said feature.

The one place I will have AI write documentation is when we change a feature it'll update the documentation with the changed or new functionality. It's still reviewed and edited by a person, but full disclosure, it's there.

The other way AI sneaks into documentation is in the code itself. It's a little verbose and while I generally keep production code clean, I think the extra context helps AIs down the road make sense of the code, so when it's helpful I leave it.

## Skills
The accepted way to organize this context into `skills`. I don't utilize Claude Code, but am able to utilize the skills written for them in Cline.

## Visual Designs
I'm not a graphic designer, but sometimes have ideas on visuals I need, like the background and icons on this website! They're much better than anything I could do and can bring a visual theme together, but do lack a human touch.
If you're a graphic designer with some ideas on how to do the background and logo, please reach out to contact@curatedforest.com so we can share thoughts and set up a commission.

# Where is AI _not_ useful?

## Teaching me to write
As far as skills go, I'm seeing writing as more and more important, especially to my career long term. So rather than turn my writing tasks over to AI, I've made the decision to strength my writing skills instead.

## Vibe coding
Leaving all decisions up to the AI and telling it to `make no mistakes` is an approach, but not for me. I've spent decades honing my opinions around software and how it should work and I find the approaches and results _always_ need refinement.

## Leaving information unverified
AI can and will mostly turn up correct information, but I've also seen it return incredibly incorrect responses. Even when in research mode and citing sources! 

# Ownership
At the end of the day I see AI contributions as still owned by the requestor. Whether it was written by AI or not, the quality and results are a direct reflection of the reviewer/requestor's standards, approach, and ability, not their tool use. 
