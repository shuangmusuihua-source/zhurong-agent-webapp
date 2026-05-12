import { db } from "./index";
import { digitalBuddy } from "./schema";
import { nanoid } from "nanoid";

const buddies = [
  {
    id: nanoid(),
    name: "归藏",
    avatar: "guizang",
    description: "电子杂志风格演示文稿，WebGL 流体背景，衬线标题，适合发布会与演讲场景",
    skillId: "guizang-ppt-skill",
    tags: JSON.stringify(["PPT", "演示", "杂志风"]),
  },
  {
    id: nanoid(),
    name: "幻境",
    avatar: "frontend-slides",
    description: "零依赖交互式 HTML 演示，动画丰富，适合技术分享与产品展示",
    skillId: "frontend-slides",
    tags: JSON.stringify(["幻灯片", "交互", "动画"]),
  },
  {
    id: nanoid(),
    name: "神纸",
    avatar: "kami-slides",
    description: "交互式 HTML 幻灯片，专注中文内容排版，适合知识分享与教学场景",
    skillId: "kami-html-slides",
    tags: JSON.stringify(["幻灯片", "中文", "教学"]),
  },
];

async function seed() {
  console.log("Seeding digital buddies...");

  for (const buddy of buddies) {
    await db.insert(digitalBuddy).values(buddy).onConflictDoNothing();
  }

  console.log(`Seeded ${buddies.length} digital buddies.`);
}

seed().catch(console.error);
