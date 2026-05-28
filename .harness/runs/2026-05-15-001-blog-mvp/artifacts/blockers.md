# 待确认和阻塞项

## 当前无硬阻塞

本轮可以完成规划产物，不需要额外权限，也不需要启动子 agent。

## 下一轮实现前建议确认

- 是否确认 SQLite + Drizzle 作为 MVP 数据库方案。
- 已确认后台 admin 使用 React + Vite 独立应用；不放入 Next.js App Router。
- 是否确认 GEO 指 Generative Engine Optimization；如果是地理位置/地图能力，需要重新调整前台和数据模型。
- 管理员认证第一版是否允许开发态默认账号，还是必须首轮就做密码哈希和持久化 session。
- 包管理器是否统一为 npm，还是切换到 pnpm；当前仓库同时存在 `package-lock.json` 与 `pnpm-workspace.yaml`。
