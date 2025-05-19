// src/commands/create.js
import ora from "ora";
import inquirer from "inquirer";
import downloadTemplate from "../utils/downloader.js";

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
  ]);

  const spinner = ora("Downloading template...").start();

  try {
    const mergeOptions = {
      ...answers,
      ...options,
    };
    await downloadTemplate(projectName, mergeOptions);
    spinner.succeed("Project created successfully!");
  } catch (error) {
    spinner.fail("Creation failed: " + error.message);
    process.exit(1);
  }
}

export default createProject;
