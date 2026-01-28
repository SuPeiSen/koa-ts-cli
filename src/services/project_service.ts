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
  templatePath: string;
}

export class ProjectService {
  /**
   * 项目生成后的设置工作
   * 包括数据库初始化、Gitignore 更新、Docker 配置等
   */
  static setupProject(projectPath: string, options: ProjectSetupOptions) {
    const { npm_type, sql, docker, projectName, templatePath } = options;

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

  private static setupPrisma(projectPath: string, npmType: string) {
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

    Logger.info("Installing prisma...");
    execSync(`${npmType} install prisma @prisma/client`, {
      cwd: projectPath,
      stdio: "ignore",
    });

    Logger.info("Initializing prisma...");
    execSync("npx prisma init", { cwd: projectPath, stdio: "ignore" });
  }

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

  private static setupDocker(
    projectPath: string,
    useDocker: boolean,
    projectName: string,
  ) {
    if (!useDocker) {
      // Remove docker files if not needed
      execSync(
        "rm -rf Dockerfile docker-compose.yml .dockerignore src/ecosystem.config.ts",
        {
          cwd: projectPath,
        },
      );
    } else {
      // Update Dockerfile template
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
