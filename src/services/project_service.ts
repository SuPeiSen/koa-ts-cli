import { execSync } from "child_process";
import { appendFileSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { Logger } from "../core/logger.js";
import { IGNORE_FILES } from "../constants/index.js";

export interface ProjectSetupOptions {
  projectName: string;
  npm_type: string;
  sql: "none" | "prisma";
  docker: boolean;
}

export class ProjectService {
  /**
   * 项目生成后的设置工作
   * 包括数据库初始化、Gitignore 更新、Docker 配置等
   */
  static setupProject(projectPath: string, options: ProjectSetupOptions) {
    const { npm_type, sql, docker, projectName } = options;

    // Database Setup
    if (sql === "prisma") {
      this.setupPrisma(projectPath, npm_type);
    }

    // Gitignore
    this.updateGitignore(projectPath);

    // Docker
    this.setupDocker(projectPath, docker, projectName);

    // Final Status
    try {
      execSync("git status", { cwd: projectPath, stdio: "inherit" });
    } catch {
      // Ignore git errors here
    }
  }

  /**
   * 初始化 Prisma
   * 1. 检查 Node 版本
   * 2. 安装依赖
   * 3. 初始化配置
   */
  private static setupPrisma(projectPath: string, npmType: string) {
    this.checkPrismaNodeVersion();

    Logger.info("Installing prisma...");
    execSync(`${npmType} install @prisma/client @prisma/adapter-pg`, {
      cwd: projectPath,
      stdio: "ignore",
    });

    Logger.info("Initializing prisma...");
    execSync("npx prisma init", { cwd: projectPath, stdio: "ignore" });
  }

  /**
   * 检查 Prisma 运行所需的 Node 版本
   * Prisma v7 需要 Node.js v20.19+
   */
  private static checkPrismaNodeVersion() {
    Logger.info(
      "Prisma v7 requires Node.js v20.19+.\n" +
      "See: https://www.prisma.io/docs/getting-started/prisma-orm/quickstart/prisma-postgres",
    );

    const nodeVersion = process.versions.node; // e.g. "20.19.1"
    const [major, minor] = nodeVersion.split(".").map(Number);

    const ok = major > 20 || (major === 20 && minor >= 19);
    if (!ok) {
      Logger.error(
        `Current Node.js version is v${nodeVersion}. Prisma v7 requires v20.19+. Exiting.`,
      );
      process.exit(1);
    }
  }

  /**
   * 更新 .gitignore 文件
   * 追加一些默认要忽略的文件
   */
  private static updateGitignore(projectPath: string) {
    const gitignorePath = path.join(projectPath, ".gitignore");
    try {
      appendFileSync(
        gitignorePath,
        IGNORE_FILES.map((file) => `\n${file}`).join(""),
      );
    } catch (e) {
      Logger.warn("Failed to update .gitignore");
    }
  }

  /**
   * 配置 Docker
   * @param useDocker 是否使用 Docker
   * @param projectName 项目名称
   */
  private static setupDocker(
    projectPath: string,
    useDocker: boolean,
    projectName: string,
  ) {
    if (!useDocker) {
      // Remove docker files if not needed
      // 移除不需要的 docker 相关文件
      execSync(
        "rm -rf Dockerfile docker-compose.yml .dockerignore src/ecosystem.config.ts",
        {
          cwd: projectPath,
        },
      );
    } else {
      // Update Dockerfile template
      // 更新 docker-compose.yml 中的容器名占位符
      const dockerComposePath = path.join(projectPath, "docker-compose.yml");
      try {
        const content = readFileSync(dockerComposePath, "utf-8");
        writeFileSync(
          dockerComposePath,
          content.replace(/{{template_container_name}}/g, projectName),
          "utf-8",
        );
      } catch (e) {
        Logger.warn("Failed to configure docker-compose.yml");
      }
    }
  }
}
