# koa-ts-cli

基于 `koa-ts-core` 的 TypeScript + Koa 项目脚手架 CLI 工具，提供：

- 一键创建 Koa + TypeScript 项目
- 内置集成 `koa-ts-core`（路由装饰器、错误处理、日志等）
- 启动开发服务器（支持热重载）
- 自动生成控制器和参数校验器模板
- 根据控制器自动生成接口文档

---

## 安装

需要提前安装 Node.js 与 npm / yarn。

```bash
npm install -g koa-typescript-cli
# 或
yarn global add koa-typescript-cli
```

安装完成后会获得全局命令：`koa-ts-cli`。

---

## 快速上手

### 1. 创建新项目

```bash
koa-ts-cli create <project-name> [options]
```

**可选参数：**

- `-n, --npm_type <npm_type>`：指定包管理器类型，例如：
  - `npm`
  - `yarn`
  - `pnpm`
- `-r, --registry <registry>`：指定 npm 源地址，例如：
  - `https://registry.npmjs.org`
  - `https://registry.npmmirror.com`

**示例：**

```bash
koa-ts-cli create my-new-project -n npm -r https://registry.npmjs.org
```

执行后将自动：

- 初始化一个 TypeScript + Koa 项目
- 安装依赖（包括 `koa-ts-core`）
- 创建约定的目录结构：
  - `src/controller`：控制器
  - `src/validate`：参数校验器
  - `env`：环境变量配置
  - 等其他基础脚手架文件

---

### 2. 启动开发服务器

进入项目目录后：

```bash
cd my-new-project
koa-ts-cli dev
```

CLI 会：

- 使用合适的方式运行 TypeScript 源码（通常是 `ts-node-dev` 或类似工具）
- 监听代码变更，并在变更时自动重启服务
- 自动加载 `env` 目录下对应的环境变量配置

一般你可以在 `http://localhost:<APP_PORT>` 访问服务（默认从 `.env` 文件或 `process.env.APP_PORT` 中读取）。

---

### 3. 添加控制器和校验器

在项目目录下执行：

```bash
koa-ts-cli add <name> [options]
```

用于一键生成控制器和校验器模板。

**可选参数：**

- `-c, --controller <controller_path>`：控制器相对路径
- `-v, --validate <validate_path>`：校验器相对路径

路径通常相对于 `src/controller` 和 `src/validate`，具体以脚手架实际生成约定为准。

**示例：**

```bash
# 生成 user 控制器和校验器
koa-ts-cli add user -c controller/api/v1/user -v validate/api/v1/user
```

生成后你将获得：

- `src/controller/api/v1/user.ts`：已包含 `@Router` 的基础控制器模板
- `src/validate/api/v1/user.ts`：对应的参数校验器模板

你只需要填充具体的业务逻辑和校验规则。

---

### 4. 生成接口文档

在项目根目录执行：

```bash
koa-ts-cli doc
```

CLI 会：

1. 扫描 `src/controller` 目录下所有使用 `@Router` / `@AuthRouter` 装饰器的控制器。
2. 提取路由定义（方法、路径、请求参数结构等）。
3. 在项目根目录生成 `doc` 目录及对应的文档配置文件。

生成的文档文件示例：

```ts
// src/controller/test.ts
import Koa from "koa";
import { successRsp, Router } from "koa-ts-core";

class Test {
  @Router("get")
  async get_test(ctx: Koa.Context) {
    successRsp();
  }
}

export default Test;
```

```ts
// 生成的 doc/test.ts
export default class Test {
  static desc = "";

  get_test() {
    return {
      method: "get",
      description: "",
      path: "/get_test",
      request: {
        header: {
          "Content-Type": "application/json",
          Authorization: "",
        },
        body: {},
        query: {},
      },
      response: {
        body: {},
      },
    };
  }
}
```

启动服务后访问 `/doc` 路由，即可查看渲染后的接口文档页面（依赖 `koa-ts-core` 的文档渲染实现）。

---

## 其他命令

### 查看版本

```bash
koa-ts-cli --version
```

### 查看帮助

```bash
koa-ts-cli --help
```

会展示所有支持的命令及其参数说明。

---

## 与 koa-ts-core 的关系

- `koa-ts-cli` 负责项目搭建与开发体验：
  - 创建项目、生成模板、启动开发服务、自动生成文档等。
- `koa-ts-core` 负责运行时能力：
  - 初始化 Koa 应用、装饰器路由、权限与参数校验、统一错误处理、日志、环境变量加载等。

通常推荐：

1. 用 `koa-ts-cli` 创建项目；
2. 在项目中通过 `koa-ts-core` 提供的 API 编写业务代码。

详细的[koa-ts-core](https://www.npmjs.com/package/koa-ts-core)使用说明，请查看对应仓库的 README。

---

## 示例工作流

```bash
# 1. 创建项目
koa-ts-cli create my-api -n pnpm

# 2. 进入项目并启动开发服务器
cd my-api
koa-ts-cli dev

# 3. 新增一个 user 控制器及其校验器
koa-ts-cli add user -c controller/api/v1/user -v validate/api/v1/user

# 4. 编写控制器与校验逻辑（编辑 src/controller/... & src/validate/...）

# 5. 生成接口文档
koa-ts-cli doc

# 6. 浏览器访问接口文档
# 例如：http://localhost:<APP_PORT>/doc
```
