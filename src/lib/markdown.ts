import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

export type MarkdownSanitizeProfile = "todo" | "docs";

type ProfileConfig = {
  allowedTags: string[];
  allowedAttributes: sanitizeHtml.IOptions["allowedAttributes"];
  transformTags?: sanitizeHtml.IOptions["transformTags"];
};

const baseTags = [
  "p",
  "br",
  "strong",
  "em",
  "code",
  "pre",
  "blockquote",
  "ul",
  "ol",
  "li",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "hr",
];

const profileConfigs: Record<MarkdownSanitizeProfile, ProfileConfig> = {
  // Default profile for user-generated content such as todo descriptions.
  // Links are intentionally excluded to avoid clickable untrusted URLs.
  todo: {
    allowedTags: baseTags,
    allowedAttributes: {},
  },
  // Trusted documentation profile for admin/help content.
  docs: {
    allowedTags: [...baseTags, "a"],
    allowedAttributes: {
      a: ["href", "name", "target", "rel"],
    },
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", {
        rel: "noopener noreferrer",
      }),
    },
  },
};

export async function renderSanitizedMarkdown(
  markdown: string,
  profile: MarkdownSanitizeProfile = "todo"
): Promise<string> {
  const rendered = await marked(markdown);
  const config = profileConfigs[profile];

  return sanitizeHtml(rendered, {
    allowedTags: config.allowedTags,
    allowedAttributes: config.allowedAttributes,
    transformTags: config.transformTags,
    allowedSchemes: ["http", "https", "mailto"],
    disallowedTagsMode: "discard",
  });
}
