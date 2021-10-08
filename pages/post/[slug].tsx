import React from "react";
import { Client } from "https://deno.land/x/notion_sdk/src/mod.ts";
import type { SSROptions } from "https://deno.land/x/aleph/types.d.ts";
import { slugify } from "../../lib/slugify.ts";

interface Page {
  title: string;
  ingress: string;
  paragraphs: Array<string>;
}

export const ssr: SSROptions<{ page?: Page | null }> = {
  paths: async () => {
    const pageId = Deno.env.get("PAGE_ID");
    const notion = new Client({
      auth: Deno.env.get("NOTION_SECRET"),
    });

    const data = await notion.blocks.children.list({
      block_id: pageId!,
    });

    const paths = data.results.reduce<Array<string>>((result, block) => {
      if (block.type === "child_page") {
        result.push(`/post/${slugify(block.child_page.title)}`);
      }
      return result;
    }, []);

    return paths;
  },
  props: async (request) => {
    const { slug } = request.params;
    const pageId = Deno.env.get("PAGE_ID");
    const notion = new Client({
      auth: Deno.env.get("NOTION_SECRET"),
    });

    if (!pageId) {
      throw new Error("PAGE_ID env is missing");
    }

    const data = await notion.blocks.children.list({
      block_id: pageId,
    });

    const rawPage = data.results.find((result) => {
      if (result.type === "child_page") {
        const { title } = result.child_page;
        return slugify(title) === slug;
      }
      return false;
    });

    if (!rawPage) return { page: null };

    const blocks = await notion.blocks.children.list({
      block_id: rawPage.id,
    });

    const page: Page = {
      title: rawPage.type === "child_page" ? rawPage.child_page.title : "",
      ingress: "",
      paragraphs: [],
    };
    blocks.results.forEach((block) => {
      if (block.type === "heading_2") {
        page.ingress = block.heading_2.text[0].plain_text;
      }
      if (block.type === "paragraph") {
        page.paragraphs.push(block.paragraph.text[0].plain_text);
      }
    });

    return { page, blocks };
  },
};

export default function Post({ page }: { page?: Page | null }) {
  if (!page) return null;

  return (
    <div>
      <pre>{JSON.stringify(page, null, 2)}</pre>
      <h2>{page.title}</h2>
      <i>{page.ingress}</i>
      {page.paragraphs.map((p, index) => (
        <p key={`paragraph-${index}`}>{p}</p>
      ))}
    </div>
  );
}
