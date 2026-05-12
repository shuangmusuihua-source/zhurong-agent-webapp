export interface ParsedProduct {
  type: "slides" | "document" | "code" | "image";
  name: string;
  content: string;
}

function extractTitle(html: string): string {
  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
  if (h1Match) {
    return h1Match[1].replace(/<[^>]+>/g, "").trim();
  }
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/);
  if (titleMatch) {
    return titleMatch[1].trim();
  }
  return "未命名产物";
}

export function parseProductsFromContent(content: string): ParsedProduct[] {
  const products: ParsedProduct[] = [];

  // 提取 ```html 代码块作为 slides 产物
  const htmlRegex = /```html\n([\s\S]*?)```/g;
  let match;
  while ((match = htmlRegex.exec(content)) !== null) {
    const html = match[1].trim();
    if (html.length > 100) {
      products.push({
        type: "slides",
        name: extractTitle(html),
        content: html,
      });
    }
  }

  // 提取 ```tsx / ```jsx / ```ts 代码块作为 code 产物
  const codeRegex = /```(?:tsx|jsx|ts)\n([\s\S]*?)```/g;
  while ((match = codeRegex.exec(content)) !== null) {
    const code = match[1].trim();
    if (code.length > 50) {
      products.push({
        type: "code",
        name: "代码片段",
        content: code,
      });
    }
  }

  return products;
}