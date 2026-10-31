import type { Face } from "@/contract";

// Numbered marker for a picked face, as a real button so the map stays keyboard reachable.
export function shieldElement(rank: number, face: Face, onClick: () => void): HTMLButtonElement {
  const el = document.createElement("button");
  el.type = "button";
  el.className = "ws-shield";
  el.dataset.testid = `map-pick-${face.id}`;
  el.setAttribute("aria-label", `Pick ${rank}: ${face.name}, ${face.neighbourhood}`);
  el.textContent = String(rank);
  el.addEventListener("click", (e) => {
    e.stopPropagation();
    onClick();
  });
  return el;
}

export function updateShield(el: HTMLButtonElement, selected: boolean) {
  el.dataset.selected = selected ? "true" : "false";
  el.setAttribute("aria-pressed", selected ? "true" : "false");
}
