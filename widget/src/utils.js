export function escHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

export function getFundingBadge(type) {
  const t = (type || "").toLowerCase();
  if (t.includes("epoch") || t.includes("quadratic")) {
    return { bg: "#E6F1FB", text: "#0C447C", border: "#185FA5" };
  }
  if (t.includes("continuous") || t.includes("streaming")) {
    return { bg: "#E1F5EE", text: "#085041", border: "#0F6E56" };
  }
  if (t.includes("one-off") || t.includes("special")) {
    return { bg: "#FAEEDA", text: "#633806", border: "#854F0B" };
  }
  return { bg: "#F1EFE8", text: "#444441", border: "#5F5E5A" };
}

export function autoResize(textarea) {
  textarea.style.height = "auto";
  textarea.style.height = Math.min(textarea.scrollHeight, 120) + "px";
}
