// src/commands/create.js
import ora from "ora";
import inquirer from "inquirer";
import downloadTemplate from "../utils/downloader.js";
import { appendFileSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { execSync } from "child_process";

const IGNORE_FILES = ["env", ".vscode"];

/**
 * 创建项目
 * @param {*} projectName 项目名
 * @param {*} options 配置项
 */
async function createProject(projectName, options) {
  const answers = await inquirer.prompt([
    {
      type: "list",
      name: "npm_type",
      message: "Choose npm type:",
      choices: ["npm", "pnpm", "yarn"],
      default: "npm",
      when: !options.npm_type,
    },
    {
      type: "list",
      name: "registry",
      message: "Choose registry type:",
      default: "https://registry.npmjs.org/",
      choices: [
        {
          name: "default (https://registry.npmjs.org/)",
          value: "https://registry.npmjs.org/",
        },
        {
          name: "alibaba (https://registry.npmmirror.com/)",
          value: "https://registry.npmmirror.com/",
        },
        {
          name: "tsinghua (https://mirrors.tuna.tsinghua.edu.cn/npm/)",
          value: "https://mirrors.tuna.tsinghua.edu.cn/npm/",
        },
      ],
      when: !options.registry,
    },
    {
      type: "confirm",
      name: "x_get",
      // 是否使用Xget
      message: "use Xget, https://github.com/xixu-me/Xget",
      default: false,
      when: !options.x_get,
    },
    {
      type: "confirm",
      name: "docker",
      // 是否添加docker初始化配置
      message: "add docker initial configuration",
      default: false,
      when: !options.docker,
    },
  ]);


  if (answers.npm_type === "pnpm") {
    console.log("\n⚠️  提示: pnpm 建议在 Node.js 18 及以上版本使用，以获得更好的性能与兼容性。\n");
  }

  const spinner = ora("Downloading template...").start();

  try {
    const mergeOptions = {
      ...answers,
      ...options,
    };
    await downloadTemplate(projectName, mergeOptions);
    spinner.succeed("Project created successfully!");

    const projectPath = path.join(process.cwd(), projectName);
    const gitignorePath = path.join(projectPath, ".gitignore");
    // 修改项目根目录下的.gitignore 增加忽略env文件和.vscode目录
    appendFileSync(
      gitignorePath,
      IGNORE_FILES.map((file) => `\n${file}`).join("")
    );

    // 使用指令 进入项目目录 执行 git status
    execSync("git status", {
      cwd: projectPath,
    });

    if (options.docker) {
      // 删除Dockerfile，docker-compose.yml，.dockerignore src/ecosystem.config.ts
      execSync("rm -rf Dockerfile docker-compose.yml .dockerignore src/ecosystem.config.ts", {
        cwd: projectPath,
      });
    } else {
      // 修改Dockerfile里面的容器名
      const dockerComposePath = path.join(projectPath, "docker-compose.yml");
      const dockerfileContent = readFileSync(dockerComposePath, "utf-8");
      writeFileSync(
        dockerComposePath,
        dockerfileContent.replace(
          /{{template_container_name}}/g,
          projectName
        ),
        "utf-8"
      );
    }

    console.log(`\ncd ${projectName}`);
  } catch (error) {
    spinner.fail("Creation failed: " + error.message);
    process.exit(1);
  }
}

export default createProject;
