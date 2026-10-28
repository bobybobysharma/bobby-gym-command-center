/** Consistent private-page metadata; each content page supplies its own title. */
export function adminHead(page: string) {
  const title = `${page} — Bobby Gym`;
  const description = `Manage Bobby Gym ${page.toLowerCase()} in the staff dashboard.`;
  return { meta: [
    { title }, { name: "description", content: description },
    { property: "og:title", content: title }, { property: "og:description", content: description },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] };
}