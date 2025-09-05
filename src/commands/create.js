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
    // 添加多一个bool类型选项
    {
      type: "confirm",
      name: "x_get",
      // 是否使用Xget
      message: "use Xget, https://github.com/xixu-me/Xget",
      default: false,
      when: !options.x_get,
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
    console.log(mergeOptions);
    spinner.succeed("Project created successfully!");
  } catch (error) {
    spinner.fail("Creation failed: " + error.message);
    process.exit(1);
  }
}

export default createProject;
