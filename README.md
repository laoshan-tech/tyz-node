# TYZ Node - GOST 配置转换服务

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-1.1.14-orange)](https://bun.sh/)
[![GOST](https://img.shields.io/badge/GOST-v3.2.6-green)](https://github.com/go-gost/gost)
[![Tests](https://img.shields.io/badge/Tests-Passing-brightgreen)]()

基于 Bun + Hono + Supabase 的 GOST 隧道节点封装服务。

## ⚡ 快速开始

```bash
# 安装依赖
bun install

# 配置环境变量
cp .env.example .env
# 编辑 .env 填写你的配置

# 运行测试
bun run test:config          # 配置转换测试
bun run test                 # 完整集成测试（需要 GOST 二进制）

# 启动开发服务器
bun run dev

# 生产运行
bun run start
```

## 🎯 项目功能

- ✅ **数据库配置转换** - 将 Supabase 数据库记录转换为 GOST JSON 配置
- ✅ **Realtime 监听** - 监听数据库变更并自动应用配置
- ✅ **GOST API 集成** - 与 GOST 通信获取统计和配置
- ✅ **HTTP API** - 提供配置查询和 Observer 回调接口

## 🏗️ 架构

```
Supabase Database (schema=node)
    ↓
Edge Function (数据聚合)
    ↓
本服务 (配置转换)
    ↓
生成 GOST JSON 配置
    ↓
写入文件 → 重启 GOST
```

### 核心组件

- **Transport Mapper** - Transport 类型映射 (raw→tcp, tls→tls, wss→ws, etc.)
- **Limiter Parser** - 限速器配置解析 (traffic/request/connection)
- **Port Allocator** - 自动端口分配 (hash 算法)
- **Config Builder** - GOST 配置构建 (services/chains/limiters)
