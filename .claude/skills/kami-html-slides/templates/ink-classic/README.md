# 墨水经典主题 (Ink Classic)

源自 [guizang-ppt-skill](https://github.com/op7418/guizang-ppt-skill) 的"电子杂志 × 电子墨水"风格。

## 主题色

```css
--ink: #0a0a0b;        /* 墨黑 */
--paper: #f1efea;      /* 暖米白 */
--paper-tint: #e8e5de;
--ink-tint: #18181a;
```

## 字体分工

| 类型 | 字体 | 用途 |
|------|------|------|
| 中文衬线 | Noto Serif SC | 标题、金句、数字 |
| 英文衬线 | Playfair Display | Hero 页超大英文 |
| 中文非衬线 | Noto Sans SC | 正文描述 |
| 等宽 | IBM Plex Mono | kicker、meta、标签 |

## 核心特征

- **WebGL 流体背景**：仅 hero 页可见，普通页遮罩较厚
- **横向翻页**：键盘 ← →、滚轮、触屏、底部圆点、ESC 索引
- **Motion One 动效**：5 种 recipe 自动匹配布局
- **主题平滑过渡**：翻到 hero 页时颜色和 shader 柔顺过渡

## 10 种布局

1. 开场封面 (hero dark)
2. 章节幕封 (hero light/dark 交替)
3. 数据大字报 (light)
4. 左文右图 (light/dark 交替)
5. 图片网格 (light)
6. Pipeline 流水线 (light)
7. 问题页 (hero dark)
8. 大引用 (dark 优先)
9. 并列对比 (light)
10. 图文混排 (light/dark 交替)

## 主题节奏规则

- 禁止连续 3 页以上相同主题
- 8 页以上必须有 ≥1 个 hero dark + ≥1 个 hero light
- 每 3-4 页插入 1 个 hero 页

## 使用方式

```bash
# 拷贝模板到项目目录
mkdir -p project/ppt/images
cp template.html project/ppt/index.html

# 浏览器打开预览
open project/ppt/index.html
```

## 设计原则

1. 克制优于炫技 — WebGL 只在 hero 页透出
2. 结构优于装饰 — 靠字号+字体对比+网格留白
3. 图片是第一公民 — 只裁底部，保证顶部和左右完整
4. 节奏靠 hero 页 — hero 和 non-hero 交替
