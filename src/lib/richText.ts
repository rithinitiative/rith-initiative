const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const legacyTextToHtml = (value: string) =>
  value
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br />")}</p>`)
    .join("")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/__([^_]+)__/g, "<u>$1</u>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

export const sanitizeRichText = (value: string) => {
  const rawHtml = /<\/?[a-z][\s\S]*>/i.test(value) ? value : legacyTextToHtml(value);
  const template = document.createElement("template");
  template.innerHTML = rawHtml;
  const allowedTags = new Set(["A", "B", "BR", "DIV", "EM", "I", "LI", "OL", "P", "STRONG", "U", "UL"]);

  const cleanNode = (node: Node) => {
    Array.from(node.childNodes).forEach((child) => {
      if (child.nodeType !== Node.ELEMENT_NODE) return;

      const element = child as HTMLElement;
      if (!allowedTags.has(element.tagName)) {
        element.replaceWith(...Array.from(element.childNodes));
        return;
      }

      Array.from(element.attributes).forEach((attribute) => {
        if (element.tagName === "A" && attribute.name === "href") return;
        element.removeAttribute(attribute.name);
      });

      if (element.tagName === "A") {
        const href = element.getAttribute("href") || "";
        if (!/^(https?:|mailto:|tel:|\/)/i.test(href)) {
          element.removeAttribute("href");
        }
        element.setAttribute("target", "_blank");
        element.setAttribute("rel", "noopener noreferrer");
      }

      cleanNode(element);
    });
  };

  cleanNode(template.content);
  return template.innerHTML;
};

export const getEditableRichText = (value: string) =>
  /<\/?[a-z][\s\S]*>/i.test(value) ? value : legacyTextToHtml(value);
