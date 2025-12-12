# Xiruo Web - 现代化漫画阅读平台

基于现有的 Venera Flutter 移动端漫画阅读器项目，重构为现代化的 Web 应用架构。

## 架构概述

- **前端**: Flutter Web (xiruo_web)
- **后端**: Spring Boot (xiruo-backend)
- **数据库**: PostgreSQL
- **缓存**: Redis
- **部署**: Docker & Docker Compose

## 快速开始

### 前置要求

- Docker & Docker Compose
- Flutter SDK (用于本地开发)
- Java 17+ (用于本地开发)
- Maven (用于本地开发)

### 使用 Docker Compose 启动

1. 克隆项目
```bash
git clone <repository-url>
cd xiruo-web-refactor
```

2. 复制环境配置文件
```bash
cp .env.example .env
```

3. 启动所有服务
```bash
docker-compose up -d
```

4. 访问应用
- 前端: http://localhost:3000
- 后端 API: http://localhost:8080/api
- 数据库: localhost:5432
- Redis: localhost:6379

### 本地开发

#### 后端开发

1. 启动数据库和 Redis
```bash
docker-compose up -d postgres redis
```

2. 启动 Spring Boot 应用
```bash
cd xiruo-backend
mvn spring-boot:run
```

#### 前端开发

1. 安装依赖
```bash
cd xiruo_web
flutter pub get
```

2. 生成代码
```bash
dart run build_runner build
```

3. 启动开发服务器
```bash
flutter run -d web-server --web-port 3000
```

## 项目结构

```
├── xiruo_web/                 # Flutter Web 前端
│   ├── lib/
│   │   ├── components/        # UI 组件
│   │   ├── models/           # 数据模型
│   │   ├── pages/            # 页面
│   │   ├── providers/        # 状态管理
│   │   └── services/         # API 服务
│   └── web/
├── xiruo-backend/            # Spring Boot 后端
│   ├── src/main/java/com/xiruo/
│   │   ├── config/           # 配置类
│   │   ├── controller/       # 控制器
│   │   ├── dto/              # 数据传输对象
│   │   ├── entity/           # 实体类
│   │   ├── repository/       # 数据访问层
│   │   └── service/          # 业务逻辑层
│   └── src/main/resources/
├── nginx/                    # Nginx 配置
├── init-scripts/             # 数据库初始化脚本
└── docker-compose.yml        # Docker Compose 配置
```

## API 文档

### 认证 API

- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/logout` - 用户登出
- `POST /api/auth/refresh` - 刷新令牌

### 漫画 API

- `GET /api/comics` - 获取漫画列表
- `GET /api/comics/{id}` - 获取漫画详情
- `GET /api/comics/{id}/chapters` - 获取章节列表
- `GET /api/comics/trending` - 获取热门漫画

## 开发指南

### 添加新功能

1. 在设计文档中定义需求和接口
2. 实现后端 API
3. 实现前端页面和组件
4. 编写测试
5. 更新文档

### 数据库迁移

使用 JPA 的 `ddl-auto: update` 进行自动迁移，生产环境建议使用 Flyway 或 Liquibase。

### 缓存策略

- 用户会话: Redis (TTL: 7天)
- 漫画列表: Redis (TTL: 1小时)
- 漫画详情: Redis (TTL: 30分钟)

## 部署

### 生产环境部署

1. 修改 `docker-compose.yml` 中的环境变量
2. 配置 SSL 证书
3. 设置域名和反向代理
4. 启动服务

```bash
docker-compose -f docker-compose.prod.yml up -d
```

## 监控和日志

- 健康检查: `/actuator/health`
- 应用指标: `/actuator/metrics`
- 日志: Docker logs

## 贡献指南

1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 创建 Pull Request

## 许可证

MIT License