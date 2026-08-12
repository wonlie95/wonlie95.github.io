# Notion 文章同步

本博客会同步 Notion 数据库 `81e7a5d6-c649-47f9-83fa-a0954480c65f` 的全部非归档文章。

## 首次授权

1. 在 [Notion Integrations](https://www.notion.so/my-integrations) 创建一个 Internal Integration，并复制 `Internal Integration Secret`。
2. 打开博客文章数据库，在右上角 `…` → `Connections` → 添加刚创建的 Integration；必须共享**数据库本身**，不是只共享外层页面。
3. 打开 GitHub 仓库的 `Settings` → `Secrets and variables` → `Actions` → `New repository secret`。
4. 名称填写 `NOTION_BLOG`，值粘贴该 Secret。
5. 在 GitHub 的 `Actions` 页面运行 `Sync Notion articles` 工作流一次。

之后该工作流每 6 小时运行一次；Notion 有新增或编辑时，它会将 Markdown、图片下载到仓库并自动提交，随后 `Deploy Hexo site to GitHub Pages` 会自动重新发布。

本地手动同步可运行：

```powershell
$env:NOTION_TOKEN = 'ntn_你的密钥'
npm run sync:notion
```

不要将 Token 写入 `_config.yml`、Markdown 文件或 Git 提交记录。
