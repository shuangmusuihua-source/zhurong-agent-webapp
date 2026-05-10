---
name: kami-generate
description: 幻灯片生成模块 - 内容类型分析、布局选择、HTML生成、进度提示
---

# Kami Generate - 幻灯片生成模块

## 功能

遍历大纲，分析每页内容类型，选择布局，生成HTML，显示实时进度。

## 输入参数

- `outline`: 确认后的幻灯片大纲
- `theme`: 选中的主题信息
- `output_path`: 输出文件路径

## 输出

生成的HTML文件路径。

## 进度提示规范

**每页生成时必须显示进度面板：**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  幻灯片生成进度                                                              │
│  ─────────────────────────────────────────────────────────────────────────── │
│                                                                              │
│  概览：共 8 页                                                               │
│                                                                              │
│  当前正在生成：第 3 页                                                       │
│  页面标题：平台定位对比                                                      │
│  内容类型：comparison（对比型）                                              │
│                                                                              │
│  待生成：                                                                    │
│  - 第 4 页：用户画像对比                                                     │
│  - 第 5 页：发展历程                                                         │
│  - 第 6 页：京东核心优势                                                     │
│  - 第 7 页：行业观点                                                         │
│  - 第 8 页：尾页                                                             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**进度面板包含：**
1. **概览**：总页数
2. **当前正在生成**：当前页码
3. **页面标题**：正在生成的页面标题
4. **内容类型**：当前页的内容类型
5. **待生成**：剩余待生成的页面列表（显示页码和标题）

**时间预估规则：**
| 页面类型 | 预估时间 |
|----------|----------|
| 封面页 | 3 秒 |
| 尾页 | 3 秒 |
| 数据页（data，含图表） | 20 秒 |
| 对比页（comparison） | 15 秒 |
| 列表页（list） | 10 秒 |
| 时间线页（timeline） | 15 秒 |
| 引用页（quote） | 8 秒 |
| 段落页（paragraph） | 10 秒 |

## 执行步骤

### Step 1: 初始化

1. 加载主题模板文件
2. 读取 theme.json 配置
3. 准备输出文件路径
4. 显示初始进度

```
正在初始化...
主题：商务现代白
总页数：8 页
预估总时间：约 1 分 30 秒

准备开始生成...
```

### Step 2: 遍历生成（每页显示进度）

按顺序处理每页，**每完成一页显示一次进度面板**：

```
for (i, page in outline.slides) {
  // 显示当前进度面板
  showProgressPanel({
    total: totalSlides,
    current: i + 1,
    title: page.title,
    type: page.type,
    remaining: outline.slides.slice(i + 1)  // 待生成列表
  });

  // 分析内容类型
  analyzeContentType(page);

  // 选择布局
  selectLayout(content_type);

  // 生成HTML
  generatePageHTML(page, layout);

  // 配置图表（如有）
  if (hasChart) {
    configureChart(page);
  }

  // 显示完成标记
  print("✓");
}
```

**进度面板函数实现：**

```
function showProgressPanel({ total, current, title, type, remaining }) {
  print("┌─────────────────────────────────────────────────────────────────────────────┐");
  print("│  幻灯片生成进度                                                              │");
  print("│  ─────────────────────────────────────────────────────────────────────────── │");
  print("│                                                                              │");
  print(`│  概览：共 ${total} 页                                                         │`);
  print("│                                                                              │");
  print(`│  当前正在生成：第 ${current} 页                                                │`);
  print(`│  页面标题：${title}                                                           │`);
  print(`│  内容类型：${type}                                                            │`);
  print("│                                                                              │");
  print("│  待生成：                                                                    │");

  if (remaining.length === 0) {
    print("│  （无）                                                                      │");
  } else {
    remaining.forEach((page, idx) => {
      print(`│  - 第 ${current + idx + 1} 页：${page.title}                                   │`);
    });
  }

  print("│                                                                              │");
  print("└─────────────────────────────────────────────────────────────────────────────┘");
}
```

### Step 3: 内容类型与布局映射

| 内容类型 | 布局选择 | 组件 |
|----------|----------|------|
| **data** | 数据卡片 + 图表 | `.data-cards` + ECharts |
| **list** | 纯文本列表 | `.list-content` + `.list-item` |
| **comparison** | 对比布局 | `.feature-compare-layout` 或 `.compare-table` |
| **timeline** | 时间轴 | `.timeline-horizontal` |
| **quote** | 引用块 | `.quote-block` |
| **paragraph** | 段落布局 | `.paragraph-content` |

### Step 4: 页面生成详情

#### 封面页生成

```html
<div class="slide cover-slide active">
  <div class="cover-title">{{TITLE}}</div>
  <div class="cover-subtitle">{{SUBTITLE}}</div>
  <div class="cover-meta">
    <div class="cover-author">{{AUTHOR}}</div>
    <div class="cover-date">{{DATE}}</div>
  </div>
</div>
```

#### 数据页生成

```html
<div class="slide">
  <div class="title-region">
    <div class="title">
      <div class="title-decor"></div>
      <i data-lucide="bar-chart-2"></i>
      {{TITLE}}
    </div>
  </div>
  <div class="summary-region">
    <div class="summary">{{SUMMARY}}</div>
  </div>
  <div class="content-region">
    <div class="data-cards">
      <!-- 数据卡片 -->
    </div>
    <!-- ECharts图表容器 -->
  </div>
  <div class="page-number-region">
    <div class="page-number">{{PAGE_NUM}}</div>
  </div>
</div>
```

#### 对比页生成

根据对比对象数量选择：
- 2个对象：`.feature-compare-layout`（左右卡片）
- 多个对象：`.compare-table`（表格）

#### 时间线页生成

```html
<div class="timeline-horizontal">
  <div class="timeline-track">
    <div class="timeline-line-h"></div>
    <div class="timeline-nodes">
      <!-- 时间节点 -->
    </div>
  </div>
</div>
```

#### 引用页生成

```html
<div class="quote-block">
  <div class="quote-text">{{QUOTE_TEXT}}</div>
  <div class="quote-author">{{AUTHOR}}</div>
</div>
```

#### 列表页生成

```html
<div class="list-content">
  <div class="list-item">
    <div class="list-decor"></div>
    <div class="list-text">{{ITEM_TEXT}}</div>
  </div>
  <!-- 更多列表项 -->
</div>
```

### Step 5: 图表配置

**图表类型选择规则：**

| 数据特征 | 图表类型 | ECharts配置 |
|----------|----------|-------------|
| 单组数据对比 | 柱状图 | `type: 'bar'` |
| 时间序列趋势 | 折线图 | `type: 'line'` |
| 占比分布 | 饼图/环形图 | `type: 'pie'` |
| 多维度评分 | 雷达图 | `type: 'radar'` |

### Step 6: 组装完整HTML

将所有页面HTML组装到模板中：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <!-- 字体、样式、脚本 -->
</head>
<body>
  <div class="webgl-background"></div>
  <div class="slides-container">
    {{ALL_SLIDES_HTML}}
  </div>
  <script>
    // 图表初始化
    // 导航逻辑
    // 数字动画
  </script>
</body>
</html>
```

### Step 7: 完成提示

```
✓ 幻灯片生成完成
文件路径：{output_path}
总页数：8 页
生成耗时：约 1 分 30 秒
```

## 图标使用规范

**禁止使用emoji**，使用 Lucide Icons：

| 场景 | 推荐图标 |
|------|----------|
| 数据页标题 | `bar-chart-2`, `trending-up` |
| 列表页标题 | `list`, `clipboard` |
| 对比页标题 | `git-compare`, `scale` |
| 时间线页标题 | `clock`, `calendar` |
| 引用页标题 | `quote`, `message-circle` |
| 数据卡片-销量 | `car`, `shopping-cart` |
| 数据卡片-金额 | `dollar-sign`, `banknote` |
| 数据卡片-增长率 | `trending-up`, `arrow-up-right` |

## 动画配置

| 动画类型 | CSS类 | 应用元素 |
|----------|-------|----------|
| 入场动画 | `animate__fadeInDown` | 标题 |
| 入场动画 | `animate__fadeInUp` | 内容区 |
| 数字动画 | `t-digit-pop-in` | 数据卡片数字 |
| 列表动画 | `list-item-in` | 列表项逐个入场 |
| 图表动画 | ECharts内置 | 图表生长 |

## 输出文件命名

```
{project-dir}/{topic}-slides.html
```

示例：`造车新势力对比-slides.html`

## 示例进度输出

```
正在初始化...
主题：商务现代白
总页数：8 页

┌─────────────────────────────────────────────────────────────────────────────┐
│  幻灯片生成进度                                                              │
│  ─────────────────────────────────────────────────────────────────────────── │
│                                                                              │
│  概览：共 8 页                                                               │
│                                                                              │
│  当前正在生成：第 1 页                                                       │
│  页面标题：封面页                                                            │
│  内容类型：cover                                                             │
│                                                                              │
│  待生成：                                                                    │
│  - 第 2 页：市场格局                                                         │
│  - 第 3 页：销量对比                                                         │
│  - 第 4 页：技术路线                                                         │
│  - 第 5 页：智能驾驶                                                         │
│  - 第 6 页：财务表现                                                         │
│  - 第 7 页：总结展望                                                         │
│  - 第 8 页：尾页                                                             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
✓

┌─────────────────────────────────────────────────────────────────────────────┐
│  幻灯片生成进度                                                              │
│  ─────────────────────────────────────────────────────────────────────────── │
│                                                                              │
│  概览：共 8 页                                                               │
│                                                                              │
│  当前正在生成：第 2 页                                                       │
│  页面标题：市场格局                                                          │
│  内容类型：data                                                              │
│                                                                              │
│  待生成：                                                                    │
│  - 第 3 页：销量对比                                                         │
│  - 第 4 页：技术路线                                                         │
│  - 第 5 页：智能驾驶                                                         │
│  - 第 6 页：财务表现                                                         │
│  - 第 7 页：总结展望                                                         │
│  - 第 8 页：尾页                                                             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
✓

┌─────────────────────────────────────────────────────────────────────────────┐
│  幻灯片生成进度                                                              │
│  ─────────────────────────────────────────────────────────────────────────── │
│                                                                              │
│  概览：共 8 页                                                               │
│                                                                              │
│  当前正在生成：第 3 页                                                       │
│  页面标题：销量对比                                                          │
│  内容类型：comparison                                                        │
│                                                                              │
│  待生成：                                                                    │
│  - 第 4 页：技术路线                                                         │
│  - 第 5 页：智能驾驶                                                         │
│  - 第 6 页：财务表现                                                         │
│  - 第 7 页：总结展望                                                         │
│  - 第 8 页：尾页                                                             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
✓

... (中间页面省略) ...

┌─────────────────────────────────────────────────────────────────────────────┐
│  幻灯片生成进度                                                              │
│  ─────────────────────────────────────────────────────────────────────────── │
│                                                                              │
│  概览：共 8 页                                                               │
│                                                                              │
│  当前正在生成：第 8 页                                                       │
│  页面标题：尾页                                                              │
│  内容类型：end                                                               │
│                                                                              │
│  待生成：                                                                    │
│  （无）                                                                      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
✓

─────────────────────────────────────────────────────
✓ 幻灯片生成完成
文件：/path/to/造车新势力对比-slides.html
总页数：8 页
```