---
name: koa-ts-cli-usage
description: A guide for using the koa-ts-cli tool to create, develop, build, and document Koa projects.
---

# Koa-TS CLI Usage Guide

`koa-ts-cli` is the official CLI tool for the Koa-TS framework. Use it to manage the lifecycle of your application.

## 1. Project Initialization

To create a new project:
```bash
koa-ts-cli create <project_name>
```
OPTIONS:
- `-n, --npm_type <type>`: Package manager (npm/yarn/pnpm).
- `-r, --registry <url>`: Custom registry.

## 2. Development

Start the development server with hot-reload and environment loading:
```bash
koa-ts-cli dev
```
- Smartly watches `src` and `env` directories.
- Loads `.development.env`.

## 3. Code Generation (Templates)

Quickly generate controllers and validators:
```bash
koa-ts-cli add <module_name> -c <controller_path> -v <validator_path>
```
EXAMPLE:
```bash
# Generates src/controller/api/v1/user.ts and src/validate/api/v1/user.ts
koa-ts-cli add user -c controller/api/v1/user -v validate/api/v1/user
```

## 4. Documentation Generation

Generate `doc/*.ts` configuration files for Swagger UI:
```bash
koa-ts-cli doc
```
- Scans `src/controller` for methods decorated with `@Router` or `@AuthRouter`.
- Generates OpenAPI 3.0 compatible configuration.
- **Note**: Requires the project to use `koa-ts-core`.
- **Note**: If a file has NO router decorators, it will be skipped.

## 5. Building for Production

Compile TypeScript and bundle assets:
```bash
koa-ts-cli build [options]
```
OPTIONS:
- `-D, --doc`: Bundle generated documentation (from `doc/` folder) into the build artifacts.
- `-c, --copy_env`: Copy `env/` directory to `dist/`.

## Common Issues

- **Undefined Error in Doc Gen**: Ensure you are using the latest version of `koa-ts-cli` which includes `jiti` for ESM support.
- **Duplicate Routes**: If you rename a method or route, delete the corresponding file in `doc/` to allow regeneration, otherwise `doc` command preserves old configurations which may lead to duplicates.
