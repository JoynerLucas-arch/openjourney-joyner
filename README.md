# Openjourney - MidJourney UI Clone (阿里云百炼版)

这是一个基于 Next.js 15 构建的高保真 MidJourney Web 界面克隆版，集成了阿里云百炼（DashScope 通义万相）AI 服务，支持高质量的图像和视频生成。

![openjourney-ui](https://github.com/user-attachments/assets/392da5a8-d121-4f71-83f7-dfca20a267af)

## ✨ 功能特性

### 🎨 **AI 图像生成**
- 集成 **通义万相** (`wan2.6-t2i`) 模型，提供高质量图像生成
- **4图网格布局**，完美复刻 MidJourney 的设计体验
- **实时生成**，带有加载动画反馈

### 🎬 **AI 视频生成**
- **文生视频**：支持 `wan2.6-t2v` 模型
- **图生视频**：支持将生成的图像转化为动态视频
- **视频网格**：支持 2x2 视频展示，悬停自动播放

### 🚀 **交互体验**
- **下载**：一键下载生成的图片和视频
- **图生视频转换**：一键将静态图片转化为视频
- **悬停动画**：流畅的过渡效果和专业的 UI 交互
- **实时加载状态**：带有骨架屏（Skeleton）加载动画
- **画廊浏览**：支持全屏查看、翻阅生成的作品

## 🛠️ 技术栈

- **Next.js 15** (App Router & Turbopack)
- **TypeScript** (类型安全)
- **Tailwind CSS v4** (样式)
- **Framer Motion** (动画)
- **ShadCN UI** (UI 组件库)
- **Alibaba Cloud DashScope** (AI 生成服务)
- **MySQL** (数据存储)
- **Radix UI** (无障碍组件)

## 📋 前置要求

- **Node.js 18+** (推荐 20+)
- **npm** 或 **yarn**
- **MySQL 数据库**
- **阿里云百炼账号** (用于获取 API Key)

## 🚀 快速开始

### 1. 克隆项目并安装依赖

```bash
git clone https://github.com/your-username/openjourney.git
cd openjourney
npm install
```

### 2. 数据库设置

本项目使用 MySQL 存储数据。请确保你已安装并运行 MySQL 服务。

1. 创建数据库 `openjourney`（或其他你喜欢的名字）。
2. 运行 `database/init.sql` 脚本初始化表结构。

### 3. 环境配置

在项目根目录创建 `.env.local` 文件，并填入以下配置：

```env
# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=openjourney

# 阿里云百炼（DashScope）配置
# 用于图像生成
ALIYUN_IMAGE_API_KEY=your_api_key

# 用于视频生成
ALIYUN_VIDEO_API_KEY=your_api_key
```

**获取 API 密钥：**
1. 访问 [阿里云百炼控制台](https://bailian.console.aliyun.com/)
2. 申请并开通通义万相相关服务
3. 获取 API Key

### 4. 启动开发服务器

```bash
npm run dev
```

打开浏览器访问 [http://localhost:3000](http://localhost:3000) 即可查看应用。

## 🎯 使用指南

### **生成图像**
1. 在输入框中输入提示词（Prompt）
2. 点击 **"Image"** 按钮或按回车键
3. 等待 AI 生成 4 张高质量图片
4. 悬停在图片上可选择 **下载**、**放大预览** 或 **生成视频**

### **生成视频**
1. 输入视频提示词
2. 点击 **"Video"** 按钮
3. 等待视频生成（通常需要几十秒）
4. 悬停在视频上可预览播放

### **图生视频**
1. 生成或选择一张已有的图片
2. 悬停在图片上
3. 点击 **"Animate"** (生成视频) 按钮
4. 观看图片转化为动态视频

## 🏗️ 项目结构

```
openjourney/
├── src/
│   ├── app/
│   │   ├── api/                 # API 路由
│   │   │   ├── generate-images/ # 图片生成 (Wanx T2I)
│   │   │   ├── generate-videos/ # 视频生成 (Wanx T2V)
│   │   │   └── image-to-video/  # 图生视频 (Wanx I2V)
│   │   ├── globals.css          # 全局样式
│   │   ├── layout.tsx           # 根布局
│   │   └── page.tsx             # 主页面
│   ├── components/              # React 组件
│   └── lib/
│       ├── database.ts          # 数据库连接工具
│       └── utils.ts             # 通用工具函数
├── public/
│   ├── generated-images/        # 生成的图片保存位置
│   ├── generated-videos/        # 生成的视频保存位置
│   └── sample-images/           # 示例资源
├── database/
│   └── init.sql                 # 数据库初始化脚本
├── next.config.js               # Next.js 配置
└── package.json                 # 项目依赖
```

## 🎨 AI 模型说明

### **通义万相 T2I** (图像生成)
- **模型版本**: `wan2.6-t2i`
- **输出**: 高质量图片
- **能力**: 优秀的中文理解能力，高保真图像生成

### **通义万相 T2V/I2V** (视频生成)
- **模型版本**: `wan2.6-t2v`, `wan2.6-i2v`
- **输出**: 高清视频片段
- **能力**: 支持文生视频和图生视频，动作流畅

## 🤝 贡献

1. Fork 本仓库
2. 创建特性分支: `git checkout -b feature/amazing-feature`
3. 提交更改: `git commit -m 'Add amazing feature'`
4. 推送到分支: `git push origin feature/amazing-feature`
5. 提交 Pull Request

## 📝 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件。

## 🙏 致谢

- **MidJourney** - 原创界面灵感
- **阿里云百炼 (DashScope)** - 通义万相 AI 生成模型
- **ShadCN UI** - 精美的 UI 组件库
