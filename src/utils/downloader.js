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
  execSync("git init --initial-branch=main", { cwd: projectPath, stdio: "inherit" });
}


/**
 * 安装依赖
 * @param {string} projectPath 项目路径
 * @param {string} npmType 包管理工具(npm|pnpm|yarn)
 * @param {string} registry 包镜像地址
 */
function installDependencies(projectPath, npmType, registry) {
  console.log(
    chalk.blue(`\n📦 Installing dependencies using ${npmType}...\n`)
  );

  try {
    // 执行安装命令
    execSync(`${npmType} install --registry ${registry}`, {
      cwd: projectPath,
      stdio: "inherit",
    });

    console.log(chalk.green("\n✅ Dependencies installed successfully!\n"));
  } catch (err) {
    console.error(
      chalk.red(`\n❌ Failed to install dependencies using ${npmType}.\n`)
    );
    console.error(chalk.yellow("💡 You can try manually running:"));
    console.error(
      chalk.cyan(`   cd ${projectPath} && ${npmType} install --registry ${registry}\n`)
    );
  }
}

export default downloadTemplate;
