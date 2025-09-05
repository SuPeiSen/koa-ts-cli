import { execSync } from "child_process";
import { mkdirSync, existsSync, rmSync } from "fs";
import chalk from "chalk";
import { join } from "path";
import simpleGit from "simple-git";

const git = simpleGit();

const TEMPLATE_REPO = "https://github.com/SuPeiSen/koa-ts-template.git";
const X_GWT_TEMPLATE_REPO = "https://xget.xi-xu.me/gh/SuPeiSen/koa-ts-template.git";

/**
 * 下载模板
 * @param {string} projectName
 * @param {object} options
 */
const downloadTemplate = async (projectName, options) => {
  const projectPath = join(process.cwd(), projectName);
  mkdirSync(projectPath);

  const npmType = options.npm_type;
  const registry = options.registry;
  const xGet = options.x_get;

  const path = xGet ? X_GWT_TEMPLATE_REPO : TEMPLATE_REPO;

  try {
    const projectPath = await cloneRepo(path, projectName);
    removeGitFolder(projectPath);
    initializeGit(projectPath);
    installDependencies(projectPath, npmType, registry);
  } catch (error) {
    console.error("Error cloning template:", error);
  }
};

// 克隆模板
async function cloneRepo(repo, projectName) {
  console.log(
    chalk.blue(`Cloning repository from ${repo} into ${projectName}...`)
  );
  await git.clone(repo, projectName);

  const projectPath = join(process.cwd(), projectName);
  return projectPath;
}

// 删除模板.git
function removeGitFolder(projectPath) {
  const gitPath = join(projectPath, ".git");
  if (existsSync(gitPath)) {
    rmSync(gitPath, { recursive: true, force: true });
    console.log(chalk.green("Removed .git folder"));
  }
}

// 模板git初始化
function initializeGit(projectPath) {
  console.log(chalk.blue("Initializing new git repository..."));
  execSync("git init", { cwd: projectPath, stdio: "inherit" });
}

// 执行依赖安装
function installDependencies(projectPath, npmType, registry) {
  console.log(chalk.blue("Installing dependencies using pnpm..."));
  execSync(`${npmType} install --registry ${registry}`, {
    cwd: projectPath,
    stdio: "inherit",
  });
}

export default downloadTemplate;
