# FINAL REPORT — AI Slot Machine Engineering Experiment

## Overview

Goal: Build an improved slot machine website while maintaining high code quality and following best practices for repository organization. 

Team:  
-Research: 
    -Everyone (contributed raw research)
    -Anlisa (Research overviewer)
-Personas and User Stories: 
    -Miguel (Persona 1)
    -George (Persona 2)
    -Eric (User Stories)
-AI Planning: 
    -Lorenzo
-Website Implementation: 
    -Omar
    -Jennifer
    -Steven
    -Abhay
-Team Leads / Support: 
    -Anand
    -Tybalt

AI Tools Used:  Claude Code, specifically claude sonnet 4.6 

Why we chose this setup:  The majorify of the group is familiar with Claude Code, and we also thought it provided the best balance betwen high quality code and speed. Considering the large amount of prompting we anticipated for this project, we wanted to ensure we weren't sacrificing too much time for marginal returns on quality. 

---

## Initial Strategy

Our plan for using AI:  
We used Claude Code as our primary development tool, relying on it to generate most of the implementation. The goal was to let the AI handle as much of the coding as possible while we focused on guiding it, evaluating outputs, and maintaining software quality.

Prompting approach:  
We used a structured prompting strategy where each prompt focused on a single small feature. And tried to include examples whenever possible or helpful to improve output quality.

Division of work:  
AI was responsible for generating code and suggesting implementations. Team members were responsible for planning, writing prompts, reviewing outputs, testing, and only editing code manually after multiple failed attempts.

What we defined as success:  
Success meant building a functional and improved slot machine that followed good software engineering practices, slot machine improvements include higher quality aesthetics, sound files, and general functionality, while the actual engineering improvements focused on clean and modular code, proper documentation, testing, and a better user experience than the previous project.

---

## Research & Planning

What we researched:  
Slot mechanics (RTP, volatility, RNG, symbol weights), common features (bonus modes, streaks, rewards), UI design, and psychological elements like near-misses and anticipation.

User focus:  
We created personas for multiple different player types such as the competitive user (stats-focused), the casual (simple/relaxing), the beginner (needs to have a very low learning curve, to be able to instantly be entertained by the slot wihtout having to put too much work into understanding it ), and so on.

Key takeaways from research:  
A lot of our users want a variety of different experiences sometimes that contradict one another, but all of them needed a clear UI, fast feedback, and engaging visuals. This led us to prioritize simplicity, responsiveness, and strong visual/audio feedback.

---

## Development Process

How we actually worked:  
We iteratively built the app using Claude, starting with UI structure, then adding logic, and refining through small, focused prompts.

What changed from our original plan:  
We simplified both the UI and mechanics over time, moving from a complex grid + RTP system to a cleaner 3-reel design with simple multipliers and clearer visuals.

Patterns in AI behavior:  
Claude was strong at generating full features quickly, but often overbuilt or misinterpreted details, so we had to guide it with more precise prompts.

---

## Software Engineering Practices

Code quality:  
Clear separation between HTML, CSS, and JS, with reasonably modular structure, though some duplication remained from iterative changes.

Documentation:  
Added comments throughout the code to explain key logic and structure.

Testing:  
Used a mix of manual testing and some automated tests to verify core functionality.

Linting / validation:  
Used linting tools to catch errors and improve code consistency during development.

Repository practices:  
Code was pushed to GitHub throughout the process, with updates reflecting incremental progress and changes.

---

## Final Product

What we built:  
A browser-based slot machine with an Atlantis-themed UI, featuring a 3-reel system, higher risk betting modes, balance tracking, and a dynamic jackpot.

Key features:  
Higher quality animated reels with dynamic stopping, higher quality symbol based payouts with rarity scaling, risk multipliers, live balance updates, and visual/audio feedback using custom assets.

How it improved from before:  
More polished UI, clearer gameplay, better feedback systems, significantly higher code quality and organization, for readability and future expansion. We also added much higher quality image and sound assets, to create a and entertaining and responsive overall experience.

---

## Results & Observations

What worked well:  
Iterative prompting worked well for refining UI and features, and breaking tasks into small steps made outputs more reliable.

What didn’t work:  
Large or vague prompts led to incorrect or overly complex implementations that needed rework.

Where AI helped the most:  
Generating UI structure, styling, and core functionality quickly.

Where AI struggled:  
Following exact specifications and avoiding unnecessary complexity without precise guidance. 

---

## Lessons Learned

About using AI for software: It hasn't reached a point where it is able to completely take over the developmental process, we regularly had to re prompt the AI to fix mistakes, and also had to take full creative control over what output we really wanted from the website, to ensure a high quality result. Leaving the AI to make any of the creative decisions, unless they're insignificant, drastically affected the quality of the resulting slot machine. 

About planning and research: Research is a pivotal part of any development process, the research we put in before starting the implementation phase significantly contributed to the development time, and also allowed the team to have more control over their AI usage, by planning their approach ahead of time. 

---

## Conclusion

Final thoughts:  
This project showed that AI is a powerful tool for accelerating development, especially for quickly building and iterating on features. However, it still requires strong guidance, clear planning, and human oversight to produce high quality results. The combination of structured prompting, solid research, and active decision making from the team was what ultimately led to a successful outcome, rather than relying on the AI alone.

Would we use AI for future projects? 
Absolutely, it remains a very useful tool that speeds up many processes that would otherwise consume a lot of the developers time. So long as it is properly monitered to ensure code quality and organization is maintained, it absolutely contributes postively to the development phase. 