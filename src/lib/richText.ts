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

const decodeEncodedHtml = (value: string) => {
  if (!/&lt;\/?[a-z]/i.test(value)) return value;

  const template = document.createElement("template");
  template.innerHTML = value;
  return template.textContent || value;
};

export const sanitizeRichText = (value: string) => {
  const decodedValue = decodeEncodedHtml(value);
  const rawHtml = /<\/?[a-z][\s\S]*>/i.test(decodedValue) ? decodedValue : legacyTextToHtml(decodedValue);
  const template = document.createElement("template");
  template.innerHTML = rawHtml;
  const allowedTags = new Set(["A", "B", "BR", "DIV", "EM", "H2", "H3", "I", "LI", "OL", "P", "STRONG", "U", "UL"]);

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

export const htmlToPlainText = (value: string) => {
  if (!/<\/?[a-z][\s\S]*>/i.test(value) && !/&lt;\/?[a-z]/i.test(value)) return value;

  const decoded = decodeEncodedHtml(value);
  const source = /<\/?[a-z][\s\S]*>/i.test(decoded) ? decoded : value;

  const template = document.createElement("template");
  template.innerHTML = source;
  const blockTags = new Set(["DIV", "H1", "H2", "H3", "H4", "H5", "H6", "LI", "P"]);

  const readNode = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent || "";
    if (node.nodeType !== Node.ELEMENT_NODE && node.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) return "";

    const element = node as HTMLElement;
    if (element.tagName === "BR") return "\n";

    const content = Array.from(node.childNodes).map(readNode).join("");
    if (blockTags.has(element.tagName)) return `${content.trim()}\n\n`;
    return content;
  };

  return readNode(template.content)
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};
