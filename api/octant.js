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

  // 3. Fetch project details and rewards in parallel
  const [detailsRes, ...rewardsResults] = await Promise.all([
    fetch(`${OCTANT_API}/projects/details?epochs=${epochParam}&searchPhrases=`),
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

  return { currentEpoch, projects };
}

function weiToEth(wei) {
  return parseFloat((BigInt(wei) * 10000n / BigInt(1e18)).toString()) / 10000;
}

export function buildSystemPrompt(octantData) {
  const { currentEpoch, projects } = octantData;

  const projectList = projects
    .map((p) => {
      let line = `- ${p.name} (Epoch ${p.epoch})`;
      if (p.matched !== null) {
        line += ` | Matched: ${p.matched.toFixed(2)} ETH, Allocated: ${p.allocated.toFixed(2)} ETH`;
      }
      line += ` | URL: ${p.url}`;
      return line;
    })
    .join("\n");

  return `You are an Octant donation copilot. Octant (octant.app) is a platform for funding Ethereum public goods using quadratic funding across epoch-based rounds.

The current epoch is ${currentEpoch}. Below is a REAL list of projects from recent Octant epochs with their actual funding data. Use ONLY this data to make recommendations — do not invent or guess project names.

ACTIVE OCTANT PROJECTS:
${projectList}

When a user describes their interests, recommend 3-5 projects from the list above that best match. Be conversational and warm. For follow-ups, refine based on conversation history.

Always respond with a raw JSON object (no markdown, no backticks) with:
- "reply": short friendly message (1-2 sentences)
- "projects": array of 3-5 project objects, each with:
    - "name": exact project name from the list above
    - "description": 1-2 sentence description based on what the project name suggests
    - "fundingType": "Epoch round"
    - "round": "Epoch N" where N is the epoch number
    - "matchReason": one sentence on why it matches the user's interests
    - "url": the exact URL from the list above
    - "allocated": allocated amount in ETH (number)
    - "matched": matched amount in ETH (number)

Return ONLY raw JSON. No markdown, no backticks, no preamble.`;
}
