const DISCOURSE_BASE = "https://discuss.octant.app";
const CATEGORY_ID = 8; // epoch-submission category

/**
 * Fetch all project submission threads from the Octant Discourse forum.
 * Uses the public Discourse JSON API — no auth needed.
 */
export async function fetchForumProjects() {
  // 1. Get all topic pages from the epoch-submission category
  let topics = [];
  let page = 0;
  while (true) {
    const url = page === 0
      ? `${DISCOURSE_BASE}/c/epoch-submission/${CATEGORY_ID}.json`
      : `${DISCOURSE_BASE}/c/epoch-submission/${CATEGORY_ID}.json?page=${page}`;
    const listRes = await fetch(url);
    if (!listRes.ok) {
      if (page === 0) console.error("Forum list fetch failed:", listRes.status);
      break;
    }
    const listData = await listRes.json();
    const pageTopics = listData.topic_list?.topics || [];
    if (pageTopics.length === 0) break;
    topics.push(...pageTopics);
    if (!listData.topic_list?.more_topics_url) break;
    page++;
  }

  // Filter out the "About this category" meta topic
  const projectTopics = topics.filter(
    (t) => !t.title.toLowerCase().startsWith("about the")
  );

  // 2. Fetch first post of each topic in parallel (batched to avoid rate limits)
  const BATCH_SIZE = 10;
  const allProjects = [];

  for (let i = 0; i < projectTopics.length; i += BATCH_SIZE) {
    const batch = projectTopics.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map((t) => fetchTopicSummary(t.id, t.title))
    );
    allProjects.push(...results.filter(Boolean));
  }

  return allProjects;
}

async function fetchTopicSummary(topicId, title) {
  try {
    const res = await fetch(`${DISCOURSE_BASE}/t/${topicId}.json`);
    if (!res.ok) return null;

    const data = await res.json();
    const firstPost = data.post_stream?.posts?.[0];
    if (!firstPost) return null;

    const html = firstPost.cooked || "";
    const parsed = parseSubmission(html);

    return {
      name: parsed.projectName || title.split(" - ")[0].split(":")[0].trim(),
      title,
      forumUrl: `${DISCOURSE_BASE}/t/${topicId}`,
      description: parsed.description || "",
      mainGoal: parsed.mainGoal || "",
      fundingRequest: parsed.fundingRequest || "",
      milestones: parsed.milestones || "",
      team: parsed.team || "",
      impactMetrics: parsed.impactMetrics || "",
    };
  } catch (err) {
    console.error(`Failed to fetch topic ${topicId}:`, err.message);
    return null;
  }
}

/**
 * Parse structured submission HTML into sections.
 * Forum posts use varying formats — some use h2 headers, some use inline labels in p tags.
 */
function parseSubmission(html) {
  // Strip HTML tags to get plain text, preserving newlines at block boundaries
  const text = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(?:p|div|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const sections = {};

  // Each entry: key, array of label patterns to try (case-insensitive)
  const sectionDefs = [
    { key: "projectName", labels: ["Project Name"] },
    { key: "description", labels: [
      "Describe your project",
      "Project Description",
      "Description and why",
      "What is",
    ]},
    { key: "mainGoal", labels: [
      "Main Goal",
      "What are the main goals",
      "Goals and vision",
    ]},
    { key: "fundingRequest", labels: [
      "Funding",
      "Budget",
      "Financial",
      "Seeking project-specific funding",
      "Main Project Funding",
    ]},
    { key: "milestones", labels: ["Milestone"] },
    { key: "team", labels: ["Team"] },
    { key: "impactMetrics", labels: ["Impact", "Metrics", "KPI"] },
  ];

  for (const { key, labels } of sectionDefs) {
    for (const label of labels) {
      // Match "Label:" or "Label\n" at start of line, capture until next section-like header
      const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const pattern = new RegExp(
        `${escaped}[^\\n]*?[:\\s]\\s*\\n?((?:(?!\\n(?:Project Name|Describe your project|Project Description|Main Goal|What are the main|Funding|Budget|Seeking project|Main Project Funding|Milestone|Team|Impact|Metrics|KPI|Key links|Website|GitHub)[^\\n]*?[:\\s])[\\s\\S])*?)(?=\\n(?:Project Name|Describe your project|Project Description|Main Goal|What are the main|Funding|Budget|Seeking project|Main Project Funding|Milestone|Team|Impact|Metrics|KPI|Key links|Website|GitHub)|$)`,
        "i"
      );
      const match = text.match(pattern);
      if (match && match[1].trim()) {
        // Clean up preamble like "and why it's classified as a Public Good:"
        let val = match[1].trim();
        val = val.replace(/^and why[^:]*?:\s*/i, "").replace(/^:\s*/, "").trim();
        sections[key] = val.slice(0, 600);
        break;
      }
    }
  }

  return sections;
}
