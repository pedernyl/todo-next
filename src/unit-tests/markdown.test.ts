import { describe, expect, it } from "vitest";
import { renderSanitizedMarkdown } from "../lib/markdown";

describe("renderSanitizedMarkdown", () => {
  it("strips scripts and event handlers", async () => {
    const input = 'Hello <script>alert(1)</script><p onclick="alert(1)">world</p>';

    const html = await renderSanitizedMarkdown(input);

    expect(html).toContain("<p>Hello </p>");
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("onclick");
  });

  it("does not allow links in todo profile", async () => {
    const input = "[example](https://example.com)";

    const html = await renderSanitizedMarkdown(input, "todo");

    expect(html).not.toContain("<a ");
    expect(html).toContain("example");
  });

  it("renders single newlines as hard line breaks in todo profile", async () => {
    const input = "first line\nsecond line";

    const html = await renderSanitizedMarkdown(input, "todo");

    expect(html).toContain("<br />");
    expect(html).toContain("first line");
    expect(html).toContain("second line");
  });

  it("allows safe links in docs profile", async () => {
    const input = "[example](https://example.com)";

    const html = await renderSanitizedMarkdown(input, "docs");

    expect(html).toContain('<a href="https://example.com" rel="noopener noreferrer">example</a>');
  });

  it("strips javascript links in docs profile", async () => {
    const input = "<a href=\"javascript:alert(1)\">x</a>";

    const html = await renderSanitizedMarkdown(input, "docs");

    expect(html).not.toContain("href=");
  });
});
