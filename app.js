document.documentElement.classList.add("js");

const menuButton = document.querySelector(".menu-button");
const primaryNavigation = document.querySelector("#primary-navigation");

function setMenu(open) {
  if (!menuButton || !primaryNavigation) return;
  menuButton.setAttribute("aria-expanded", String(open));
  primaryNavigation.toggleAttribute("data-open", open);
}

menuButton?.addEventListener("click", () => {
  setMenu(menuButton.getAttribute("aria-expanded") !== "true");
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    setMenu(false);
    menuButton?.focus();
  }
});

document.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof Node) || !menuButton || !primaryNavigation) return;
  if (!menuButton.contains(target) && !primaryNavigation.contains(target)) setMenu(false);
});

const currentPage = document.body.dataset.page;
for (const link of document.querySelectorAll("[data-nav]")) {
  if (link.dataset.nav === currentPage) link.setAttribute("aria-current", "page");
}

for (const year of document.querySelectorAll("[data-current-year]")) {
  year.textContent = String(new Date().getFullYear());
}

if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    }
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });

  for (const element of document.querySelectorAll(".reveal")) observer.observe(element);
} else {
  for (const element of document.querySelectorAll(".reveal")) element.classList.add("is-visible");
}
