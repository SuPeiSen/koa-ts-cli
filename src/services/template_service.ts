import { execSync } from "child_process";
import { mkdirSync, existsSync, rmSync } from "fs";
import { join } from "path";
import simpleGit from "simple-git";
import { Logger } from "../core/logger.js";

const git = (simpleGit as any)();

const TEMPLATE_REPO =
  "http://openwrt.hellosu.top:3000/supeisen/koa-ts-template.git";
const X_GWT_TEMPLATE_REPO =
  "https://xget.xi-xu.me/gh/SuPeiSen/koa-ts-template.git";

export interface DownloadOptions {
  npm_type?: "npm" | "yarn" | "pnpm";
  registry?: string;
  x_get?: boolean;
}

export class TemplateService {
  /**
   * 下载并初始化模板
   */
  static async downloadTemplate(projectName: string, options: DownloadOptions) {
    const projectPath = join(process.cwd(), projectName);
    if (!existsSync(projectPath)) {
      mkdirSync(projectPath);
    }

    const {
      npm_type = "npm",
      registry = "https://registry.npmjs.org/",
      x_get = false,
    } = options;
    const repoUrl = x_get ? X_GWT_TEMPLATE_REPO : TEMPLATE_REPO;

    try {
      await this.cloneRepo(repoUrl, projectName);
      this.removeGitFolder(projectPath);
      this.initializeGit(projectPath);
      this.installDependencies(projectPath, npm_type, registry);
    } catch (error) {
      Logger.error(error as Error);
      throw error;
    }
  }

  /**
   * 克隆 Git 仓库到指定目录。
   */
  private static async cloneRepo(repo: string, projectName: string) {
    Logger.info(`Cloning repository from ${repo} into ${projectName}...`);
    try {
      await git.clone(repo, projectName);
      return join(process.cwd(), projectName);
    } catch (error) {
      throw new Error(`Failed to clone repository: ${error}`);
    }
  }

  /**
   * 移除 .git 目录，断开与模板仓库的关联。
   */
  private static removeGitFolder(projectPath: string) {
    const gitPath = join(projectPath, ".git");
    if (existsSync(gitPath)) {
      rmSync(gitPath, { recursive: true, force: true });
      Logger.success("Removed .git folder");
    }
  }

  /**
   * 初始化新的 Git 仓库。
   */
  private static initializeGit(projectPath: string) {
    Logger.info("Initializing new git repository...");
    try {
      execSync("git init --initial-branch=main", {
        cwd: projectPath,
        stdio: "ignore",
      });
      Logger.success("Git initialized");
    } catch (error) {
      Logger.warn("Failed to initialize git repository");
    }
  }

  /**
   * 安装项目依赖。
   */
  private static installDependencies(
    projectPath: string,
    npmType: string,
    registry: string,
  ) {
    Logger.info(`Installing dependencies using ${npmType}...`);

    try {
      execSync(`${npmType} install --registry ${registry}`, {
        cwd: projectPath,
        stdio: "inherit",
      });
      Logger.success("Dependencies installed successfully!");
    } catch (err) {
      Logger.error(`Failed to install dependencies using ${npmType}.`);
      Logger.info(
        `You can try manually running:\ncd ${projectPath} && ${npmType} install --registry ${registry}`,
      );
    }
  }
}
