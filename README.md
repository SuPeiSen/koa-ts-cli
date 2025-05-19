# Koa TS CLI

这是一个用于项目脚手架的自定义 CLI 工具。

## 安装

确保你已经安装了 Node.js 和 npm 或 yarn。

```sh
npm install -g koa-typescript-cli
# 或者
yarn global add koa-typescript-cli
```

## 使用

### 查看版本

```sh
koa-ts-cli --version
```

### 查看帮助

```sh
koa-ts-cli --help
```

### 创建新项目

```sh
koa-ts-cli create <project-name> [options]
```

#### 可选参数

- `-n, --npm_type <npm_type>`: 指定 npm 类型
- `-r, --registry <registry>`: 指定注册表类型

### 启动开发服务器

```sh
koa-ts-cli dev
```

### 添加控制器和验证

```sh
koa-ts-cli add <controller-path> [options]
```

#### 可选参数

- `-c, --controller <controller_path>`: 指定控制器路径
- `-v, --validate <validate_path>`: 指定验证路径

## 示例

### 创建新项目

```sh
koa-ts-cli create my-new-project -n npm -r https://registry.npmjs.org
```

### 启动开发服务器

```sh
cd my-new-project
koa-ts-cli dev
```

### 添加控制器和验证器

```sh
koa-ts-cli add user -c controllers/userController -v validators/userValidator
```

### 生成文档

```sh
# 在项目目录下执行
koa-ts-cli doc
```
