import React from "react";
import type { SSROptions } from "https://deno.land/x/aleph/types.d.ts";
import { Client } from "https://deno.land/x/notion_sdk/src/mod.ts";
import { slugify } from "../lib/slugify.ts";

interface Post {
  id: string;
  title: string;
}

export const ssr: SSROptions<{ posts: Array<Post> }> = {
  props: async () => {
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

    const posts = data.results.reduce<Array<Post>>((result, block) => {
      if (block.type === "child_page") {
        result.push({
          id: block.id,
          title: block.child_page.title,
        });
      }
      return result;
    }, []);

    return {
      posts,
    };
  },
};

export default function Home(props: { posts: Array<Post> }) {
  return (
    <div>
      {props.posts.map(({ id, title }) => (
        <p key={id}>
          <a href={`/post/${slugify(title)}`}>{title}</a>
        </p>
      ))}
    </div>
  );
}
