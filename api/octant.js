import { fetchForumProjects } from "./forum.js";

const OCTANT_API = "https://backend.mainnet.octant.app";

export async function fetchOctantData() {
  // 1. Get current epoch
  const epochRes = await fetch(`${OCTANT_API}/epochs/current`);
  const { currentEpoch } = await epochRes.json();

  // 2. Build epoch range to query (current + last few with real activity)
  // Fetch projects for recent epochs in parallel
  const epochsToFetch = [];
  for (let e = Math.max(1, currentEpoch - 3); e <= currentEpoch; e++) {
    epochsToFetch.push(e);
  }

  const epochParam = epochsToFetch.join(",");

  // 3. Fetch project details, rewards, and forum data in parallel
  const [detailsRes, forumProjects, ...rewardsResults] = await Promise.all([
    fetch(`${OCTANT_API}/projects/details?epochs=${epochParam}&searchPhrases=`),
    fetchForumProjects().catch((err) => {
      console.error("Forum fetch failed:", err.message);
      return [];
    }),
    ...epochsToFetch.map((e) =>
      fetch(`${OCTANT_API}/rewards/projects/epoch/${e}`)
        .then((r) => (r.ok ? r.json() : { rewards: [] }))
        .catch(() => ({ rewards: [] }))
    ),
  ]);

  const { projectsDetails } = await detailsRes.json();

  // 4. Build rewards lookup: address -> { allocated, matched, epoch }
  const rewardsMap = {};
  for (let i = 0; i < epochsToFetch.length; i++) {
    const epoch = epochsToFetch[i];
    const rewards = rewardsResults[i].rewards || [];
    for (const r of rewards) {
      const key = `${r.address}-${epoch}`;
      rewardsMap[key] = {
        allocated: weiToEth(r.allocated),
        matched: weiToEth(r.matched),
      };
    }
  }

  // 5. Merge into a clean project list
  const projects = projectsDetails.map((p) => {
    const key = `${p.address}-${p.epoch}`;
    const rewards = rewardsMap[key];
    return {
      name: p.name,
      epoch: parseInt(p.epoch),
      address: p.address,
      url: `https://octant.app/project/${p.address}`,
      allocated: rewards ? rewards.allocated : null,
      matched: rewards ? rewards.matched : null,
    };
  });

  // Sort: current epoch first, then by matched funding descending
  projects.sort((a, b) => {
    if (a.epoch !== b.epoch) return b.epoch - a.epoch;
    return (b.matched || 0) - (a.matched || 0);
  });

  // 6. Match forum submissions to API projects by name (fuzzy)
  const normalize = (s) =>
    s.toLowerCase().replace(/[^a-z0-9]/g, "");

  const forumByNorm = {};
  for (const fp of forumProjects) {
    forumByNorm[normalize(fp.name)] = fp;
  }

  const matchedForumKeys = new Set();

  for (const p of projects) {
    const pNorm = normalize(p.name);
    // Try exact normalized match first, then check if either contains the other
    let forum = forumByNorm[pNorm];
    if (!forum) {
      for (const [key, fp] of Object.entries(forumByNorm)) {
        if (key.includes(pNorm) || pNorm.includes(key)) {
          forum = fp;
          break;
        }
      }
    }
    if (forum) {
      p.forumDescription = forum.description;
      p.forumGoal = forum.mainGoal;
      p.forumMilestones = forum.milestones;
      p.forumTeam = forum.team;
      p.forumUrl = forum.forumUrl;
      matchedForumKeys.add(normalize(forum.name));
    }
  }

  // Include forum-only projects not matched to any API project
  const apiNames = new Set(projects.map((p) => normalize(p.name)));
  const forumOnly = forumProjects
    .filter((fp) => !matchedForumKeys.has(normalize(fp.name)))
    .map((fp) => ({
      name: fp.name,
      epoch: null,
      address: null,
      url: "https://octant.app/explore",
      allocated: null,
      matched: null,
      forumDescription: fp.description,
      forumGoal: fp.mainGoal,
      forumMilestones: fp.milestones,
      forumTeam: fp.team,
      forumUrl: fp.forumUrl,
    }));

  return { currentEpoch, projects, forumOnly };
}

function weiToEth(wei) {
  return parseFloat((BigInt(wei) * 10000n / BigInt(1e18)).toString()) / 10000;
}

export function buildSystemPrompt(octantData) {
  const { currentEpoch, projects, forumOnly } = octantData;

  const projectList = projects
    .map((p) => {
      let line = `\n### ${p.name} (Epoch ${p.epoch})`;
      if (p.matched !== null) {
        line += `\nFunding: Matched ${p.matched.toFixed(2)} ETH, Allocated ${p.allocated.toFixed(2)} ETH`;
      }
      line += `\nURL: ${p.url}`;
      if (p.forumDescription) line += `\nAbout: ${p.forumDescription}`;
      if (p.forumGoal) line += `\nGoals: ${p.forumGoal}`;
      if (p.forumTeam) line += `\nTeam: ${p.forumTeam}`;
      if (p.forumMilestones) line += `\nMilestones: ${p.forumMilestones}`;
      if (p.forumUrl) line += `\nForum: ${p.forumUrl}`;
      return line;
    })
    .join("\n");

  const forumOnlyList = forumOnly
    .map((p) => {
      let line = `\n### ${p.name}`;
      line += `\nURL: ${p.url}`;
      if (p.forumDescription) line += `\nAbout: ${p.forumDescription}`;
      if (p.forumGoal) line += `\nGoals: ${p.forumGoal}`;
      if (p.forumUrl) line += `\nForum: ${p.forumUrl}`;
      return line;
    })
    .join("\n");

  return `You are an Octant donation copilot. Octant (octant.app) is a platform for funding Ethereum public goods using quadratic funding across epoch-based rounds.

The current epoch is ${currentEpoch}. Below is REAL data about Octant projects — including their descriptions, goals, team info, and milestones from their official forum submissions, plus live funding data from the Octant API. Use ONLY this data to make recommendations — do not invent or guess project names.

ACTIVE OCTANT PROJECTS (with funding data):
${projectList}
${forumOnly.length ? `\nADDITIONAL PROJECTS (from forum submissions):\n${forumOnlyList}` : ""}

When a user describes their interests, recommend 3-5 projects from the lists above that best match. Use the project descriptions, goals, and milestones to explain WHY each project is a good match — not just the project name. Be conversational and warm. For follow-ups, refine based on conversation history.

Always respond with a raw JSON object (no markdown, no backticks) with:
- "reply": short friendly message (1-2 sentences)
- "projects": array of 3-5 project objects, each with:
    - "name": exact project name from the list above
    - "description": 1-2 sentence description using the real project info above
    - "fundingType": "Epoch round"
    - "round": "Epoch N" where N is the epoch number (or null if unknown)
    - "matchReason": one sentence on why it matches the user's interests, referencing specific project details
    - "url": the exact URL from the list above
    - "allocated": allocated amount in ETH (number or null)
    - "matched": matched amount in ETH (number or null)

Return ONLY raw JSON. No markdown, no backticks, no preamble.`;
}
