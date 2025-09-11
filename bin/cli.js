#!/usr/bin/env node
// bin/cli.js

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { program } from "commander";
import createProject from "../src/commands/create.js";
import devService from "../src/commands/dev.js";
import addController from "../src/commands/add.js";
import build from "../src/commands/build.js";
import GenerateDoc from "../src/commands/doc.js";

// 获取当前模块的路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 读取 package.json 文件
const packageJsonPath = join(__dirname, "../package.json");
// 模板代码路径
const templatePath = join(__dirname, "../src/template");
const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));

program
  .version(packageJson.version)
  .description("A custom CLI tool for project scaffolding");

program
  .command("dev")
  .description("Start development server")
  .action(async () => {
    await devService();
  });

program
  .command("build")
  .description("Build project")
  .option("-c, --copy_env", "Copy .env to build")
  .action((options) => {
    build(options);
  });

program
  .command("doc")
  .description("Generate api documentation")
  .action(() => {
    GenerateDoc();
  });

program
  .command("create <project-name>")
  .description("Create new project")
  .option("-n, --npm_type <npm_type>", "Specify npm type")
  .option("-r, --registry <registry>", "Specify registry type")
  .option("-t, --template <template>", "Specify project template")
  .action((name, options) => {
    createProject(name, options);
  });

program
  .command("add <controller-path>")
  .description("Add controller & validate")
  .option("-c, --controller <controller_path>", "Specify controller path")
  .option("-v, --validate <validate_path>", "Specify validate path")
  .action(async (inputName, options) => {
    await addController(inputName, options, templatePath);
  });

program.parse(process.argv);
